import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Code, Terminal, Zap, Bot, Layers, Layout, Cpu, Globe, Rocket, ShieldCheck, Keyboard } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  const features = [
    {
      title: "AI suggestions with Ollama",
      description: "Get real-time code completions from local LLMs running via Docker. Supports Ctrl + Space and Double Enter.",
      icon: <Bot className="w-5 h-5 text-indigo-500" />,
    },
    {
      title: "WebContainers Integration",
      description: "Boot full-stack development environments directly in your browser. No local setup required.",
      icon: <Layers className="w-5 h-5 text-blue-500" />,
    },
    {
      title: "Monaco Editor",
      description: "The same professional editor that powers VS Code, with full syntax highlighting and formatting.",
      icon: <Code className="w-5 h-5 text-rose-500" />,
    },
    {
      title: "Interactive Terminal",
      description: "Full xterm.js terminal experience for running npm scripts, git commands, and more.",
      icon: <Terminal className="w-5 h-5 text-emerald-500" />,
    },
    {
        title: "Project Templates",
        description: "Zero-config templates for React, Next.js, Express, Vue, Angular, and Hono.",
        icon: <Rocket className="w-5 h-5 text-amber-500" />,
    },
    {
        title: "OAuth Authentication",
        description: "Secure login via Google and GitHub built with NextAuth.",
        icon: <ShieldCheck className="w-5 h-5 text-cyan-500" />,
    }
  ];

  const shortcuts = [
    { key: "Ctrl + Space", action: "Trigger AI Code Completion" },
    { key: "Double Enter", action: "Trigger AI Code Completion (Secondary)" },
    { key: "Tab", action: "Accept AI Suggestion" },
    { key: "Ctrl + S", action: "Save Current File" },
    { key: "Ctrl + P", action: "Quick File Search" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-24">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <Badge variant="outline" className="px-4 py-1 text-sm border-rose-200 dark:border-rose-900 text-rose-600 font-medium rounded-full">
            Documentation
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-red-500 to-pink-500">
            Getting Started with VibeCode
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            VibeCode is a professional AI-integrated web IDE designed for high-performance development in the browser.
        </p>
        <div className="flex justify-center gap-4 pt-4">
            <Link href="/dashboard">
                <Button variant="brand" size="lg">Explore Dashboard</Button>
            </Link>
            <Link href="/api-docs">
                <Button variant="outline" size="lg">API Reference</Button>
            </Link>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="space-y-8">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-2">
                <Cpu className="w-8 h-8 text-rose-500" />
                Browser-First Architecture
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
                VibeCode leverages cutting-edge web technologies to deliver a desktop-class experience.
            </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm">
                <CardHeader>
                    <Globe className="w-10 h-10 mb-2 text-blue-500" />
                    <CardTitle>Next.js 15</CardTitle>
                    <CardDescription>Server-side rendering and efficient routing for lightning-fast loads.</CardDescription>
                </CardHeader>
            </Card>
            <Card className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm">
                <CardHeader>
                    <Layers className="w-10 h-10 mb-2 text-indigo-500" />
                    <CardTitle>WebContainers</CardTitle>
                    <CardDescription>A Node.js runtime that runs entirely inside your browser tab.</CardDescription>
                </CardHeader>
            </Card>
            <Card className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm">
                <CardHeader>
                    <Bot className="w-10 h-10 mb-2 text-rose-500" />
                    <CardTitle>Local Ollama</CardTitle>
                    <CardDescription>Privacy-focused AI suggestions powered by local LLM orchestration.</CardDescription>
                </CardHeader>
            </Card>
        </div>
      </section>

      {/* Core Features */}
      <section className="space-y-8">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold">Comprehensive Feature Set</h2>
            <p className="text-zinc-600 dark:text-zinc-400">Everything you need to build, test, and deploy applications.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
                <div key={idx} className="flex gap-4 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="mt-1 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg h-fit">
                        {feature.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{feature.title}</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{feature.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Installation Guide */}
      <section className="space-y-8">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-2 text-rose-600">
                <Layout className="w-8 h-8" />
                Installation
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 italic">For developers wanting to host their own instance.</p>
        </div>
        
        <div className="space-y-6">
            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white text-xs">1</span>
                    Clone the Project
                </h3>
                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-sm border border-zinc-800">
                    git clone https://github.com/your-username/vibecode-editor.git<br/>
                    cd vibecode-editor
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white text-xs">2</span>
                    Set Environment Variables
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">Copy the example file and fill in your OAuth credentials.</p>
                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-sm border border-zinc-800">
                    cp .env.example .env.local
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500 text-white text-xs">3</span>
                    Initialize Subsystems
                </h3>
                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-sm border border-zinc-800">
                    npm install<br/>
                    ollama run codellama<br/>
                    npm run dev
                </div>
            </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="space-y-8 pb-12 text-zinc-400">
        <div className="space-y-2">
            <h2 className="text-3xl font-bold flex items-center gap-2 text-white">
                <Keyboard className="w-8 h-8 text-rose-500 " />
                Keyboard Shortcuts
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">Master the editor with these essential shortcuts.</p>
        </div>
        
        <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                        <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Command</th>
                        <th className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {shortcuts.map((s, i) => (
                        <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                            <td className="px-6 py-4">
                                <kbd className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs text-zinc-700 dark:text-zinc-300">{s.key}</kbd>
                            </td>
                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{s.action}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>
    </div>
  );
}
