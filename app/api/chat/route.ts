/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  mode?: "chat" | "review" | "fix" | "optimize";
  generateSuggestions?: boolean;
  playgroundId?: string;
  codeContext?: string;
}

async function generateAIResponse(messages: ChatMessage[]): Promise<string> {
  const systemPrompt = `You are a helpful AI coding assistant. You help developers with:
- Code explanations and debugging
- Best practices and architecture advice  
- Writing clean, efficient code
- Troubleshooting errors
- Code reviews and optimizations

Always provide clear, practical answers. Use proper code formatting when showing examples.`;

  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];

  const prompt = fullMessages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n\n");

  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    console.log("🛠️ Chat API Diagnostic:", { 
      hasKey: !!GEMINI_KEY, 
      keyLength: GEMINI_KEY?.length,
      keyPrefix: GEMINI_KEY?.substring(0, 7),
      nodeEnv: process.env.NODE_ENV
    });

    if (GEMINI_KEY && GEMINI_KEY !== "YOUR_GEMINI_API_KEY" && !GEMINI_KEY.includes("YOUR")) {
      try {
        const modelName = "gemini-2.5-flash";
        console.log(`⚡ Attempting Gemini API with model: ${modelName}`);
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent([{ text: prompt }]);
        const response = await result.response;
        const text = await response.text();

        if (text) {
          console.log("✅ Gemini response successful");
          return text.trim();
        }
      } catch (geminiErr) {
        const err = geminiErr as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("❌ Gemini generation failed:", {
          message: err?.message,
          stack: err?.stack?.split('\n')[0],
          status: err?.status,
          statusText: err?.statusText
        });
        
        // Silent fallback for the user if 2.5-flash is invalid
        if (err?.message?.includes("404") || err?.message?.includes("not found")) {
            console.log("🔄 404 detected for 2.5-flash, trying 1.5-flash as a silent fallback...");
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent([{ text: prompt }]);
                const response = await result.response;
                return (await response.text()).trim();
            } catch (fallbackErr) {
                console.error("❌ Silent fallback also failed:", fallbackErr);
            }
        }
      }
    } else {
      console.log("⚠ Gemini API key not configured or is a placeholder");
    }

    // Try local Ollama-style endpoint as fallback
    try {
      console.log("Attempting local Ollama at localhost:11434...");
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "codellama:latest",
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 0.9,
          },
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data?.response) {
        console.log("✓ Ollama response successful");
        return data.response.trim();
      }
      console.warn("⚠ Ollama returned no response:", data);
    } catch (localErr) {
      console.error("✗ Local Ollama failed:", localErr instanceof Error ? localErr.message : localErr);
    }

    // Try OpenAI as final fallback
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_KEY && OPENAI_KEY !== "YOUR_OPENAI_API_KEY_HERE" && !OPENAI_KEY.includes("YOUR")) {
      try {
        console.log("Attempting OpenAI API...");
        const messages = [{ role: "user" as const, content: prompt }];
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`OpenAI HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          console.log("✓ OpenAI response successful");
          return text.trim();
        }
      } catch (openaiErr) {
        console.error("❌ OpenAI failed:", openaiErr instanceof Error ? openaiErr.message : String(openaiErr));
      }
    } else {
      console.log("⚠ OpenAI API key not configured");
    }

    console.log("No AI backend successful, throwing error");
    throw new Error("No AI backend available. Please configure at least one: Gemini API, Local Ollama (localhost:11434), or OpenAI API");
  } catch (error) {
    console.error("AI generation exception:", error);
    throw error;
  }
}

async function shouldGenerateSuggestions(messages: ChatMessage[], mode?: string): Promise<boolean> {
  // Suggest if specifically in review/fix/optimize mode or if code is present
  if (mode === "review" || mode === "fix" || mode === "optimize") {
    return true;
  }

  // Check if latest message contains code indicators
  const lastMessage = messages[messages.length - 1]?.content || "";
  const codeIndicators = [
    "```",
    "function",
    "const ",
    "let ",
    "var ",
    "class ",
    "import",
    "export",
    "return",
    "{",
    "}",
  ];

  return codeIndicators.some((indicator) => lastMessage.includes(indicator));
}

async function generateAutoSuggestions(
  codeContext: string,
  mode?: string,
  language?: string
): Promise<Array<{ title: string; content: string }>> {
  try {
    const type = mode === "review" ? "CODE_REVIEW" : mode === "fix" ? "ERROR_FIX" : mode === "optimize" ? "OPTIMIZATION" : "SUGGESTION";

    const systemPrompt = `You are an AI code suggestion expert. Generate 2-3 specific, actionable code suggestions.
Respond ONLY with a JSON array. Example format:
[{"title": "Suggestion 1", "content": "Details..."}, {"title": "Suggestion 2", "content": "Details..."}]`;

    const userPrompt = `${
      type === "CODE_REVIEW"
        ? "Code review suggestions for:"
        : type === "ERROR_FIX"
        ? "Error fixes for:"
        : type === "OPTIMIZATION"
        ? "Performance optimizations for:"
        : "Improvements for:"
    }

${codeContext}

Generate 2-3 suggestions only.`;

    // Try Gemini first (primary AI backend)
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY && GEMINI_KEY !== "YOUR_GEMINI_API_KEY" && !GEMINI_KEY.includes("YOUR")) {
      try {
        console.log("Attempting Gemini for suggestions...");
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const result = await model.generateContent([
          {
            text: `${systemPrompt}\n\n${userPrompt}`
          }
        ]);
        
        const response = await result.response;
        const text = await response.text();
        
        if (text) {
          try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = text;
            if (jsonStr.includes("```json")) {
              jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
            } else if (jsonStr.includes("```")) {
              jsonStr = jsonStr.replace(/```\n?/g, "");
            }
            
            const suggestions = JSON.parse(jsonStr.trim());
            console.log("✓ Gemini suggestions successful");
            return Array.isArray(suggestions) ? suggestions : [];
          } catch (parseErr) {
            console.warn("Failed to parse Gemini response:", parseErr);
            return [];
          }
        }
      } catch (geminiErr) {
        console.warn("❌ Gemini suggestion generation failed:", geminiErr instanceof Error ? geminiErr.message : String(geminiErr));
      }
    } else {
      console.log("⚠ Gemini API key not configured for suggestions");
    }

    // Fallback to OpenAI
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!OPENAI_KEY || OPENAI_KEY.includes("YOUR")) {
      console.log("⚠ OpenAI key not configured for suggestions");
      return [];
    }

    try {
      console.log("Attempting OpenAI for suggestions...");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;

      if (content) {
        try {
          // Clean the response (in case it has markdown code blocks)
          let cleanContent = content;
          if (cleanContent.includes("```json")) {
            cleanContent = cleanContent.replace(/```json\n?/g, "").replace(/```\n?/g, "");
          }
          const suggestions = JSON.parse(cleanContent);
          console.log("✓ OpenAI suggestions successful");
          return Array.isArray(suggestions) ? suggestions : [];
        } catch (parseErr) {
          console.warn("Failed to parse OpenAI response:", parseErr);
          return [];
        }
      }
    } catch (openaiErr) {
      console.error("✗ OpenAI suggestion generation failed:", openaiErr instanceof Error ? openaiErr.message : openaiErr);
    }

    return [];
  } catch (error) {
    console.error("Error in generateAutoSuggestions:", error);
    return [];
  }
}

export async function POST(req: NextRequest) {
  console.log("POST /api/chat started");
  try {
    const user = await currentUser();
    console.log("Current user:", user?.id || "not logged in");
    const body: ChatRequest = await req.json();
    console.log("Chat request body:", JSON.stringify(body).slice(0, 500));
    const {
      message,
      history = [],
      mode,
      generateSuggestions = true,
      playgroundId,
      codeContext,
    } = body;

    // Validate input
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate history format
    const validHistory = Array.isArray(history)
      ? history.filter(
          (msg) =>
            msg &&
            typeof msg === "object" &&
            typeof msg.role === "string" &&
            typeof msg.content === "string" &&
            ["user", "assistant"].includes(msg.role)
        )
      : [];

    const recentHistory = validHistory.slice(-10);

    const messages: ChatMessage[] = [
      ...recentHistory,
      { role: "user", content: message },
    ];

    // Generate AI response
    const aiResponse = await generateAIResponse(messages);

    // Store chat message in database if user is logged in
    if (user) {
      try {
        await db.chatMessage.create({
          data: {
            userId: user.id!,
            role: "user",
            content: message,
            playgroundId: playgroundId || undefined,
          },
        });

        await db.chatMessage.create({
          data: {
            userId: user.id!,
            role: "assistant",
            content: aiResponse,
            playgroundId: playgroundId || undefined,
          },
        });
      } catch (dbErr) {
        console.warn("Failed to store chat message:", dbErr);
      }
    }

    // Generate suggestions if enabled
    let suggestions: Array<{ title: string; content: string }> = [];
    if (generateSuggestions && (codeContext || (await shouldGenerateSuggestions(messages, mode)))) {
      try {
        const contextToAnalyze = codeContext || message;
        suggestions = await generateAutoSuggestions(
          contextToAnalyze.substring(0, 3000), // Limit to 3000 chars
          mode,
          "JavaScript/TypeScript"
        );

        // Store suggestions in database if user is logged in
        if (user && suggestions.length > 0) {
          const lastChatMessages = await db.chatMessage.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 1,
          });

          const chatMessageId = lastChatMessages[0]?.id;

          for (const suggestion of suggestions) {
            try {
              await db.suggestion.create({
                data: {
                  userId: user.id!,
                  type: mode === "review" ? "CODE_REVIEW" : mode === "fix" ? "ERROR_FIX" : mode === "optimize" ? "OPTIMIZATION" : "SUGGESTION",
                  title: suggestion.title || "Suggestion",
                  content: suggestion.content || "",
                  codeContext: contextToAnalyze.substring(0, 1000),
                  chatMessageId: chatMessageId,
                  playgroundId: playgroundId || undefined,
                },
              });
            } catch (suggestionErr) {
              console.warn("Failed to store suggestion:", suggestionErr);
            }
          }
        }
      } catch (suggestErr) {
        console.warn("Failed to generate suggestions:", suggestErr);
      }
    }

    return NextResponse.json({
      response: aiResponse,
      suggestions: suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
