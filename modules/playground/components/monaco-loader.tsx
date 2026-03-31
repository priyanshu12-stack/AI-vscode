"use client";

import { loader } from "@monaco-editor/react";
import { useEffect } from "react";

export function MonacoLoader() {
  useEffect(() => {
    // Configure Monaco loader to use the CDN for workers
    // This is safer than setting window.MonacoEnvironment directly in Next.js
    loader.config({
      paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
      },
    });
  }, []);

  return null;
}
