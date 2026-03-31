/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";


interface CodeSuggestionRequest {
  fileContent: string;
  cursorLine: number;
  cursorColumn: number;
  suggestionType: string;
  fileName?: string;
}

interface CodeContext {
  language: string;
  framework: string;
  beforeContext: string;
  currentLine: string;
  afterContext: string;
  cursorPosition: { line: number; column: number };
  isInFunction: boolean;
  isInClass: boolean;
  isAfterComment: boolean;
  incompletePatterns: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CodeSuggestionRequest = await request.json();
    console.log("/api/code-completion request body:", JSON.stringify(body).slice(0, 2000));

    const { fileContent, cursorLine, cursorColumn, suggestionType, fileName } =
      body;

    // Validate input (allow empty fileContent string)
    if (typeof fileContent !== "string") {
      return NextResponse.json({ error: "Invalid input: fileContent must be a string" }, { status: 400 });
    }
    if (!Number.isInteger(cursorLine) || cursorLine < 0) {
      return NextResponse.json({ error: "Invalid input: cursorLine must be a non-negative integer" }, { status: 400 });
    }
    if (!Number.isInteger(cursorColumn) || cursorColumn < 0) {
      return NextResponse.json({ error: "Invalid input: cursorColumn must be a non-negative integer" }, { status: 400 });
    }
    if (!suggestionType || typeof suggestionType !== "string") {
      return NextResponse.json({ error: "Invalid input: suggestionType is required" }, { status: 400 });
    }

    const context = analyzeCodeContext(
      fileContent,
      cursorLine,
      cursorColumn,
      fileName
    );

    const prompt = buildPrompt(context, suggestionType);

    const suggestion = await generateSuggestion(prompt);

    return NextResponse.json({
      suggestion,
      context,
      metadata: {
        language: context.language,
        framework: context.framework,
        position: context.cursorPosition,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Context analysis error:", error);
    const message =
  error instanceof Error ? error.message : "Unknown error";

return NextResponse.json(
  { error: "Internal server error", message },
  { status: 500 }
);
  }
}

function analyzeCodeContext(
  content: string,
  line: number,
  column: number,
  fileName?: string
): CodeContext {
  const lines = content.split("\n");
  const currentLine = lines[line] || "";

  // Get surrounding context (10 lines before and after)
  const contextRadius = 10;
  const startLine = Math.max(0, line - contextRadius);
  const endLine = Math.min(lines.length, line + contextRadius);

  const beforeContext = lines.slice(startLine, line).join("\n");
  const afterContext = lines.slice(line + 1, endLine).join("\n");

  // Detect language and framework
  const language = detectLanguage(content, fileName);
  const framework = detectFramework(content);

  // Analyze code patterns
  const isInFunction = detectInFunction(lines, line);
  const isInClass = detectInClass(lines, line);
  const isAfterComment = detectAfterComment(currentLine, column);
  const incompletePatterns = detectIncompletePatterns(currentLine, column);

  return {
    language,
    framework,
    beforeContext,
    currentLine,
    afterContext,
    cursorPosition: { line, column },
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  };
}

function buildPrompt(context: CodeContext, suggestionType: string): string {
  return `You are an expert code completion assistant. Generate a ${suggestionType} suggestion.

Language: ${context.language}
Framework: ${context.framework}

Context:
${context.beforeContext}
${context.currentLine.substring(
  0,
  context.cursorPosition.column
)}|CURSOR|${context.currentLine.substring(context.cursorPosition.column)}
${context.afterContext}

Analysis:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Incomplete Patterns: ${context.incompletePatterns.join(", ") || "None"}

Instructions:
1. Provide only the code that should be inserted at the cursor
2. Maintain proper indentation and style
3. Follow ${context.language} best practices
4. Make the suggestion contextually appropriate

Generate suggestion:`;
}

async function generateSuggestion(prompt: string): Promise<string> {
  try {
    // Try local model first
    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "codellama:latest",
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 300,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const suggestion = data.response;
        if (suggestion) return sanitizeSuggestion(suggestion);
      } else {
        console.warn("Local model returned non-ok status for code completion", response.status);
      }
    } catch (localErr) {
      console.warn("Local model fetch failed for code completion:", localErr);
    }
    
    // Try Gemini (recommended primary backend)
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    console.log("🛠️ Code-Completion Diagnostic:", { hasKey: !!GEMINI_KEY });

    if (GEMINI_KEY && GEMINI_KEY !== "YOUR_GEMINI_API_KEY" && !GEMINI_KEY.includes("YOUR")) {
      try {
        const modelName = "gemini-1.5-flash";
        console.log(`⚡ Attempting Gemini code completion with model: ${modelName}`);
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([{ text: prompt }]);
        const response = await result.response;
        const text = await response.text();
        if (text) return sanitizeSuggestion(text);
      } catch (geminiErr) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        console.error("❌ Gemini code completion failed:", errMsg);
        
        // Silent fallback
        if (errMsg.includes("404") || errMsg.includes("not found")) {
            console.log("🔄 404 detected, trying 1.5-flash fallback...");
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent([{ text: prompt }]);
                const response = await result.response;
                const text = await response.text();
                if (text) return sanitizeSuggestion(text);
            } catch (fallbackErr) {
                console.error("❌ Fallback failed:", fallbackErr);
            }
        }
      }
    }

    // Fallback to OpenAI if configured
    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (OPENAI_KEY) {
      try {
        const resp = await fetch("https://api.openai.com/v1/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({ model: "text-davinci-003", prompt, max_tokens: 300, temperature: 0.2 }),
        });

        const json = await resp.json();
        const text = json?.choices?.[0]?.text;
        if (text) return sanitizeSuggestion(text);
      } catch (openErr) {
        console.warn("OpenAI fallback failed for code completion:", openErr);
      }
    }

    // Fallback to context-based suggestions
    return generateContextBasedSuggestion(prompt);
  } catch (error) {
    console.error("AI generation error:", error);
    return generateContextBasedSuggestion("");
  }
}

function generateContextBasedSuggestion(prompt: string): string {
  // Provide basic suggestions based on patterns when AI is unavailable
  if (prompt.includes("function") || prompt.includes("const ")) {
    return "{\n  // Implementation here\n}";
  }
  if (prompt.includes("return")) {
    return "return null;";
  }
  if (prompt.includes("import")) {
    return 'import {} from "";';
  }
  if (prompt.includes(".then")) {
    return ".then((data) => {\n  // Handle response\n})";
  }
  if (prompt.includes("=>")) {
    return "=> {\n  // Your code here\n}";
  }
  if (prompt.includes("catch")) {
    return ".catch((error) => {\n  console.error(error);\n})";
  }
  if (prompt.includes("if")) {
    return "{\n  // Condition true\n}";
  }
  // Default generic suggestion
  return "// Continue implementation";
}

function sanitizeSuggestion(suggestion: string) {
  let s = suggestion;
  if (s.includes("```")) {
    const codeMatch = s.match(/```[\w]*\n?([\s\S]*?)```/);
    s = codeMatch ? codeMatch[1].trim() : s;
  }
  return s;
}

// Helper functions for code analysis
function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      go: "Go",
      rs: "Rust",
      php: "PHP",
    };
    if (ext && extMap[ext]) return extMap[ext];
  }

  // Content-based detection
  if (content.includes("interface ") || content.includes(": string"))
    return "TypeScript";
  if (content.includes("def ") || content.includes("import ")) return "Python";
  if (content.includes("func ") || content.includes("package ")) return "Go";

  return "JavaScript";
}

function detectFramework(content: string): string {
  if (content.includes("import React") || content.includes("useState"))
    return "React";
  if (content.includes("import Vue") || content.includes("<template>"))
    return "Vue";
  if (content.includes("@angular/") || content.includes("@Component"))
    return "Angular";
  if (content.includes("next/") || content.includes("getServerSideProps"))
    return "Next.js";

  return "None";
}

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/))
      return true;
    if (line?.match(/^\s*}/)) break;
  }
  return false;
}

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.match(/^\s*(class|interface)\s+/)) return true;
  }
  return false;
}

function detectAfterComment(line: string, column: number): boolean {
  const beforeCursor = line.substring(0, column);
  return /\/\/.*$/.test(beforeCursor) || /#.*$/.test(beforeCursor);
}

function detectIncompletePatterns(line: string, column: number): string[] {
  const beforeCursor = line.substring(0, column);
  const patterns: string[] = [];

  if (/^\s*(if|while|for)\s*\($/.test(beforeCursor.trim()))
    patterns.push("conditional");
  if (/^\s*(function|def)\s*$/.test(beforeCursor.trim()))
    patterns.push("function");
  if (/\{\s*$/.test(beforeCursor)) patterns.push("object");
  if (/\[\s*$/.test(beforeCursor)) patterns.push("array");
  if (/=\s*$/.test(beforeCursor)) patterns.push("assignment");
  if (/\.\s*$/.test(beforeCursor)) patterns.push("method-call");

  return patterns;
}
