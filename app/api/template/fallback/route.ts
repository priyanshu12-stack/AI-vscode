import { templatePaths } from "@/lib/template";
import path from "path";
import { readTemplateStructureFromJson, saveTemplateStructureToJson } from "@/modules/playground/lib/path-to-json";
import fs from "fs/promises";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Pick a default template (REACT) if available
    const templateKey = Object.keys(templatePaths)[0] as keyof typeof templatePaths;
    const templatePath = templatePaths[templateKey];

    const inputPath = path.resolve(process.cwd(), templatePath);
    const outputFile = path.resolve(process.cwd(), `output/${templateKey}.json`);
    console.log("Fallback template inputPath:", inputPath);
    try {
      await saveTemplateStructureToJson(inputPath, outputFile);
      const result = await readTemplateStructureFromJson(outputFile);
      await fs.unlink(outputFile).catch(() => {});

      return NextResponse.json({ success: true, templateJson: result.items || [] }, { status: 200 });
    } catch (innerErr) {
      console.warn("Template directory not found or failed to generate; returning minimal in-memory template", innerErr);
      const minimal = {
        folderName: "Root",
        items: [
          { filename: "main", fileExtension: "js", content: "console.log('Hello from fallback template')\n" },
          { filename: "README", fileExtension: "md", content: "# Fallback Template\nThis is a minimal starter template." },
        ],
      };

      return NextResponse.json({ success: true, templateJson: minimal.items }, { status: 200 });
    }
  } catch (error) {
    console.error("Fallback template error:", error);
    return NextResponse.json({ success: false, templateJson: [] }, { status: 500 });
  }
}
