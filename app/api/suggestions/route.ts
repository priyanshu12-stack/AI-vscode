import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type SuggestionRequest = {
  codeContext: string;
  type?: string;
  playgroundId?: string | null;
  chatMessageId?: string | null;
  language?: string;
  framework?: string;
};

let cachedGeminiModelSuggestions: string | null = null;

async function discoverGeminiModelForSuggestions(apiKey: string): Promise<string | null> {
  if (!apiKey) return null;
  if (cachedGeminiModelSuggestions) return cachedGeminiModelSuggestions;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const json = await resp.json();
    const models = json?.models || json?.model || [];
    if (Array.isArray(models) && models.length > 0) {
      // Prefer models with 'gemini' in the name, otherwise pick first
      const found = models.find((m: any) => String(m.name || m.model || m.id || "").toLowerCase().includes("gemini"));
      const id = (found && (found.name || found.id || found.model)) || (models[0].name || models[0].id || models[0].model);
      if (id) {
        cachedGeminiModelSuggestions = id;
        return id;
      }
    }
  } catch (err) {
    console.warn("discoverGeminiModelForSuggestions failed:", err);
  }

  return null;
}

export async function generateAISuggestions(
  codeContext: string,
  type: string,
  language?: string,
  framework?: string
): Promise<string[]> {
  const systemPrompt = `You are an expert AI coding assistant specialized in providing code suggestions and recommendations.\nYou analyze code and provide multiple specific, actionable suggestions for improvement.\n\nFor each suggestion:\n1. Be specific and actionable\n2. Explain the benefit\n3. Show the improved code when relevant\n4. Keep suggestions concise but informative\n\nRespond with a JSON array of suggestion objects with this format:\n[\n  {\n    "title": "Brief title (5-10 words)",\n    "content": "Detailed suggestion with explanation and code example if needed",\n    "priority": "high|medium|low"\n  }\n]`;

  const userPrompt = `${type === "CODE_REVIEW" ? "Perform a comprehensive code review and suggest improvements for:" : type === "ERROR_FIX" ? "Analyze this code for errors and suggest fixes:" : type === "OPTIMIZATION" ? "Suggest performance optimizations for:" : "Analyze this code and provide suggestions for improvement:"}\n\nLanguage: ${language || "JavaScript/TypeScript"}\nFramework/Library: ${framework || "General"}\n\nCode:\n${codeContext}\n\nProvide between 3-5 specific, actionable suggestions.`;

  try {
    // Try Gemini first (primary AI backend) if key is present
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY) {
      try {
        const modelId = (await discoverGeminiModelForSuggestions(GEMINI_KEY)) || "gemini-1.5-flash";
        const genAI: any = new GoogleGenerativeAI(GEMINI_KEY);
        const model: any = genAI.getGenerativeModel({ model: modelId });

        const result: any = await model.generateContent({ input: [{ text: `${systemPrompt}\n\n${userPrompt}` }] });
        const response = result?.response;
        const text = response ? await response.text() : null;

        if (text) {
          try {
            let jsonStr = text;
            if (jsonStr.includes("```json")) {
              jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
            } else if (jsonStr.includes("```")) {
              jsonStr = jsonStr.replace(/```\n?/g, "");
            }

            const suggestions = JSON.parse(jsonStr.trim());
            if (Array.isArray(suggestions)) {
              return suggestions.map((s: any) => s.content || JSON.stringify(s));
            }
          } catch (err) {
            return [text.trim()];
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini suggestion generation failed, trying alternative backends:", geminiErr);
      }
    }

    // Try local Ollama endpoint as fallback
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "codellama:latest",
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9,
          },
        }),
      });

      const data = await response.json();
      if (data?.response) {
        try {
          const suggestions = JSON.parse(data.response);
          if (Array.isArray(suggestions)) {
            return suggestions.map((s: any) => s.content || JSON.stringify(s));
          }
        } catch {
          return [data.response.trim()];
        }
      }
    } catch (localErr) {
      console.warn("Local model fetch failed, trying OpenAI:", localErr);
    }

    // Fallback to OpenAI
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (OPENAI_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            max_tokens: 2000,
            temperature: 0.7,
          }),
        });

        const json = await response.json();
        const content = json?.choices?.[0]?.message?.content;
        if (content) {
          try {
            const suggestions = JSON.parse(content);
            if (Array.isArray(suggestions)) {
              return suggestions.map((s: any) => s.content || JSON.stringify(s));
            }
          } catch {
            return [content.trim()];
          }
        }
      } catch (openaiErr) {
        console.warn("OpenAI fallback failed:", openaiErr);
      }
    }

    return ["Unable to generate suggestions at this time. Please try again."];
  } catch (error) {
    console.error("AI suggestion generation error:", error);
    return ["Error generating suggestions"];
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SuggestionRequest = await req.json();
    const { codeContext, type, playgroundId, chatMessageId, language, framework } = body;

    if (!codeContext || typeof codeContext !== "string") {
      return NextResponse.json(
        { error: "CodeContext is required and must be a string" },
        { status: 400 }
      );
    }

    // Generate AI suggestions
    const suggestionTexts = await generateAISuggestions(
      codeContext,
      type || "GENERAL",
      language,
      framework
    );

    // Store suggestions in database
    const storedSuggestions = await Promise.all(
      suggestionTexts.map((content) =>
        db.suggestion.create({
          data: {
            userId: user.id!,
            type: (type as any) || "GENERAL",
            content: content,
            codeContext: codeContext.substring(0, 5000), // Store code context (limit to 5000 chars)
            playgroundId: playgroundId || undefined,
            chatMessageId: chatMessageId || undefined,
            title: content.split("\n")[0].substring(0, 100), // Use first line as title
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      suggestions: storedSuggestions.map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        type: s.type,
        createdAt: s.createdAt,
      })),
      count: storedSuggestions.length,
    });
  } catch (error) {
    console.error("Suggestions API Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        detail: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's suggestions
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const playgroundId = searchParams.get("playgroundId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");

    const whereCondition: any = {
      userId: user.id,
    };

    if (playgroundId) whereCondition.playgroundId = playgroundId;
    if (type) whereCondition.type = type;

    const suggestions = await db.suggestion.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        isApplied: true,
        rating: true,
        createdAt: true,
        playgroundId: true,
      },
    });

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error("Fetch suggestions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
