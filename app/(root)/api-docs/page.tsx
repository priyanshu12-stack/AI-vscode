import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Code, Terminal, Zap, Bot, Layers, ShieldCheck, Copy, Check, Info, Server, Send } from "lucide-react";
import Link from "next/link";

export default function ApiDocsPage() {
  const endpoints = [
    {
      method: "POST",
      path: "/api/chat",
      description: "Send a message to the AI assistant and get a response with context-aware suggestions.",
      params: [
        { name: "message", type: "string", required: true, desc: "The user message to send to the AI." },
        { name: "history", type: "Array<Message>", required: false, desc: "Previous chat history for context." },
        { name: "mode", type: "string", required: false, desc: "Mode of interaction: 'chat', 'review', 'fix', 'optimize'." },
        { name: "codeContext", type: "string", required: false, desc: "Relevant code snippets for better AI understanding." }
      ],
      response: `{
  "response": "AI generated message...",
  "suggestions": [
     { "title": "Refactor logic", "content": "Better way to write this..." }
  ],
  "timestamp": "2024-03-31T20:00:00Z"
}`
    },
    {
      method: "POST",
      path: "/api/code-completion",
      description: "Trigger intelligent code completions based on the current editor state and cursor position.",
      params: [
        { name: "fileContent", type: "string", required: true, desc: "Full content of the current file." },
        { name: "cursorLine", type: "number", required: true, desc: "Zero-indexed line number of the cursor." },
        { name: "cursorColumn", type: "number", required: true, desc: "Zero-indexed column number of the cursor." },
        { name: "suggestionType", type: "string", required: true, desc: "Type of suggestion to generate (e.g., 'inline')." }
      ],
      response: `{
  "suggestion": "const result = await process();",
  "metadata": {
    "language": "TypeScript",
    "framework": "Next.js",
    "generatedAt": "2024-03-31T20:00:00Z"
  }
}`
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-24">
      {/* Header */}
      <section className="space-y-4">
        <Badge variant="outline" className="px-4 py-1 text-sm border-emerald-200 dark:border-emerald-900 text-emerald-600 font-medium rounded-full">
            API Reference
        </Badge>
        <h1 className="text-5xl font-extrabold tracking-tight">VibeCode Developer API</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Integrate VibeCode's AI capabilities and runtime environment into your own workflows.
        </p>
      </section>

      {/* Authentication */}
      <section className="p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-6">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold">Authentication</h2>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
            VibeCode uses <strong>NextAuth session-based authentication</strong>. All API requests must include a valid session cookie. 
            When calling from the browser on the same domain, authentication is handled automatically.
        </p>
        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
                Ensure you are logged in via the web interface before testing API endpoints. For server-to-server communication, a bearer token strategy is currently in development.
            </p>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-12">
        <h2 className="text-3xl font-bold flex items-center gap-2">
            <Server className="w-8 h-8 text-rose-500" />
            Endpoints
        </h2>

        {endpoints.map((endpoint, idx) => (
            <div key={idx} className="space-y-6 border-b border-zinc-100 dark:border-zinc-800 pb-12 last:border-0">
                <div className="flex items-center gap-3">
                    <Badge className={endpoint.method === "POST" ? "bg-blue-500" : "bg-emerald-500"}>
                        {endpoint.method}
                    </Badge>
                    <code className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{endpoint.path}</code>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 max-w-3xl">{endpoint.description}</p>

                <div className="grid lg:grid-cols-2 gap-8 mt-8">
                    {/* Parameters Table */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-zinc-500">Parameters</h4>
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-900">
                                    <tr>
                                        <th className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 font-medium">Name</th>
                                        <th className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 font-medium">Type</th>
                                        <th className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 font-medium">Required</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                                    {endpoint.params.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{p.name}</td>
                                            <td className="px-4 py-2 text-blue-600 dark:text-blue-400">{p.type}</td>
                                            <td className="px-4 py-2">{p.required ? <Badge variant="destructive" className="scale-75">YES</Badge> : "No"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Example Tabs */}
                    <div className="space-y-4 ">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-zinc-500">Example Usage</h4>
                            <div className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer transition-colors">
                                <Copy className="w-3 h-3" />
                                Copy Code
                            </div>
                        </div>
                        <Tabs defaultValue="fetch" className="w-full">
                            <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1">
                                <TabsTrigger value="fetch">Fetch</TabsTrigger>
                                <TabsTrigger value="axios">Axios</TabsTrigger>
                            </TabsList>
                            <TabsContent value="fetch" className="mt-0">
                                <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-300 text-xs font-mono overflow-x-auto border border-zinc-800">
                                    {`fetch("${endpoint.path}", {
  method: "${endpoint.method}",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ${endpoint.params.filter(p => p.required).map(p => `"${p.name}": "..."`).join(",\n    ")}
  })
})
.then(res => res.json())
.then(data => console.log(data));`}
                                </pre>
                            </TabsContent>
                            <TabsContent value="axios" className="mt-0">
                                <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-300 text-xs font-mono overflow-x-auto border border-zinc-800">
                                    {`import axios from 'axios';

const { data } = await axios.post("${endpoint.path}", {
  ${endpoint.params.filter(p => p.required).map(p => `"${p.name}": "..."`).join(",\n  ")}
});

console.log(data);`}
                                </pre>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Response Code */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="response" className="border-zinc-200 dark:border-zinc-800">
                        <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">
                            <div className="flex items-center gap-2">
                                <Send className="w-4 h-4 text-emerald-500" />
                                View Response Schema
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <pre className="p-4 rounded-xl bg-zinc-900/50 dark:bg-black/50 text-zinc-400 text-xs font-mono border border-zinc-200 dark:border-zinc-800">
                                {endpoint.response}
                            </pre>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        ))}
      </section>

      {/* Templates Section */}
      <section className="space-y-8">
        <div className="space-y-4">
            <h2 className="text-3xl font-bold flex items-center gap-2">
                <Layers className="w-8 h-8 text-amber-500" />
                Templates
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
                You can also query available templates to initialize the editor with specific stack configurations.
            </p>
        </div>
        <Card className="bg-zinc-50/50 dark:bg-zinc-900/50 border-double border-4 border-zinc-200 dark:border-zinc-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">GET</Badge>
                    <code className="bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-sm">/api/template</code>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Returns a list of all available project starters (React, Next.js, Vue, etc.)</p>
                <div className="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-green-400">
                    {`status: 200 OK
content-type: application/json`}
                </div>
            </CardContent>
        </Card>
      </section>

      <div className="py-20 text-center">
        <p className="text-zinc-500 text-sm">© 2024 VibeCode Editor. All rights reserved.</p>
      </div>
    </div>
  );
}
