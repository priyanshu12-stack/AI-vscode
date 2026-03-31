"use client";
import React, { useEffect, useState, useRef } from "react";

import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// WebContainer is imported dynamically in the hook; avoid importing it at module-evaluation time here.
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import TerminalComponent from "./terminal";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: any | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean; // Optional prop to force re-setup
}
const WebContainerPreview = ({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  writeFileSync,
  forceResetup = false,
}: WebContainerPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const setupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const terminalRef = useRef<any>(null);

  // Reset setup state when forceResetup changes
  useEffect(() => {
    if (forceResetup) {
      handleRetry();
    }
  }, [forceResetup]);

  const handleRetry = () => {
    console.log("🔄 Manually retrying WebContainer setup...");
    setIsSetupComplete(false);
    setIsSetupInProgress(false);
    setPreviewUrl("");
    setCurrentStep(0);
    setSetupError(null);
    setShowRetry(false);
    setLoadingState({
      transforming: false,
      mounting: false,
      installing: false,
      starting: false,
      ready: false,
    });
    if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
  };

  useEffect(() => {
    let mounted = true;
    async function setupContainer() {
      if (!instance || isSetupComplete || isSetupInProgress) return;

      try {
        console.log("🏗️ setupContainer starting...");
        setIsSetupInProgress(true);
        setSetupError(null);
        setShowRetry(false);

        // Set a global timeout for the whole setup
        setupTimeoutRef.current = setTimeout(() => {
          if (!isSetupComplete && mounted) {
            console.warn("⚠️ Setup is taking unusually long...");
            setShowRetry(true);
          }
        }, 120000); // 120 seconds timeout for UI feedback (increased from 45s)

        try {
          console.log("🧐 Checking for existing package.json...");
          // Reduced timeout for fs operations
          const checkPromise = instance.fs.readFile("package.json", "utf8");
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Filesystem check timeout")), 5000)
          );
          
          const packageJsonExists = await Promise.race([checkPromise, timeoutPromise]);

          if (packageJsonExists) {
            console.log("📦 package.json found, skipping some steps.");
            // ... (rest of shortcut logic)
          }
        } catch (error) {
          console.log("ℹ️ No existing package.json or check timed out, proceeding with full setup.");
        }

        // Step-1 transform data
        console.log("🛠️ Step 1: Transforming template data...");
        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("🔄 Transforming template data...\r\n");
        }

        const files = transformToWebContainerFormat(templateData as any);
        console.log("✅ Data transformed:", files);
        
        setLoadingState((prev) => ({
          ...prev,
          transforming: false,
          mounting: true,
        }));
        setCurrentStep(2);

        // Step-2 Mount Files
        console.log("📁 Step 2: Mounting files...");
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("📁 Mounting files to WebContainer...\r\n");
        }
        
        await instance.mount(files);
        console.log("✅ Files mounted successfully");

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("✅ Files mounted successfully\r\n");
        }
        setLoadingState((prev) => ({
          ...prev,
          mounting: false,
          installing: true,
        }));
        setCurrentStep(3);

        // Step-3 Install dependencies

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "📦 Installing dependencies...\r\n"
          );
        }

        try {
          const installProcess = await instance.spawn("npm", ["install"]);

          installProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );

          // Add 60-second timeout for npm install
          const installTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("npm install timeout - taking too long")), 180000)
          );

          const installExitCode = await Promise.race([
            installProcess.exit,
            installTimeout,
          ]);

          if (installExitCode !== 0) {
            throw new Error(
              `Failed to install dependencies. Exit code: ${installExitCode}`
            );
          }
        } catch (err) {
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(
              `⚠️ npm install warning: ${err instanceof Error ? err.message : "Unknown error"}\r\n`
            );
          }
          // Continue anyway - trying npm start
        }

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "✅ Dependencies processed\r\n"
          );
        }

        setLoadingState((prev) => ({
          ...prev,
          installing: false,
          starting: true,
        }));
        setCurrentStep(4);

        // STEP-4 Start The Server

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(
            "🚀 Starting development server...\r\n"
          );
        }

        try {
          // Try dev server first (more appropriate for a live playground)
          let started = false;
          const tryStart = async (cmd: string[], timeoutMs: number) => {
            try {
              const proc = await instance.spawn(cmd[0], cmd.slice(1));
              proc.output.pipeTo(
                new WritableStream({
                  write(data) {
                    if (terminalRef.current?.writeToTerminal) {
                      terminalRef.current.writeToTerminal(data);
                    }
                  },
                })
              );

              const serverReadyTimeout = new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Server startup timeout")), timeoutMs)
              );

              const serverReadyPromise = new Promise<string>((resolve) => {
                const handler = (port: number, url: string) => {
                  if (terminalRef.current?.writeToTerminal) {
                    terminalRef.current.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
                  }
                  instance.off("server-ready", handler);
                  resolve(url);
                };
                instance.on("server-ready", handler);
              });

              try {
                const url = await Promise.race([serverReadyPromise, serverReadyTimeout]);
                setPreviewUrl(url);
                started = true;
              } catch (err) {
                // timeout or no server-ready event, let caller decide
                throw err;
              }
            } catch (err) {
              // Re-throw so caller can try fallback
              throw err;
            }
          };

          // prefer dev for live preview; allow longer timeout
          try {
            await tryStart(["npm", "run", "dev"], 180000); // 3 mins timeout
          } catch (devErr) {
            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal(
                `⚠️ npm run dev failed: ${devErr instanceof Error ? devErr.message : String(devErr)}\r\nTrying npm run start...\r\n`
              );
            }

            // fallback to start (production) with shorter timeout
            try {
              await tryStart(["npm", "run", "start"], 30000);
            } catch (startErr) {
              if (terminalRef.current?.writeToTerminal) {
                terminalRef.current.writeToTerminal(
                  `❌ All start attempts failed: ${startErr instanceof Error ? startErr.message : String(startErr)}\r\nCheck your package.json scripts or network connection.\r\n`
                );
              }
            }
          }

          // If not started, don't fallback to localhost (it hits the main app dashboard)
          if (!previewUrl) {
            console.warn("⚠️ No preview URL established after start attempts.");
          }

          setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
          setIsSetupComplete(true);
        } catch (startErr) {
          // Surface error to terminal/UI
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(`❌ Server start error: ${startErr instanceof Error ? startErr.message : String(startErr)}\r\n`);
          }
          // No fallback to localhost:3000
          setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
          setIsSetupComplete(true);
        }
      } catch (err) {
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        }
        setSetupError(errorMessage);
        setIsSetupInProgress(false);
        setLoadingState({
          transforming: false,
          mounting: false,
          installing: false,
          starting: false,
          ready: false,
        });
      }
    }

    setupContainer();

    return () => {
      if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
    };
  }, [instance, templateData, isSetupComplete, isSetupInProgress]);

  useEffect(() => {
    return () => {};
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm whitespace-pre-wrap">{error || setupError}</p>
          <div className="mt-3 text-xs text-gray-700 dark:text-gray-300">
            <strong>Debug:</strong>
            <div>Preview URL: {previewUrl || "(none)"}</div>
            <div>Instance: {instance ? "available" : "not available"}</div>
            <div>Current step: {currentStep}</div>
          </div>
          <details className="mt-2 text-xs text-gray-600 dark:text-gray-400 p-2 bg-white/5 rounded">
            <summary className="cursor-pointer">Show stack / debug info</summary>
            <pre className="whitespace-pre-wrap text-xs mt-2">{String(error || setupError)}</pre>
          </details>
        </div>
      </div>
    );
  }
  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;

    return (
      <span
        className={`text-sm font-medium ${
          isComplete
            ? "text-green-600"
            : isActive
            ? "text-blue-600"
            : "text-gray-500"
        }`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>

            {showRetry && (
               <div className="mt-6 text-center">
                 <p className="text-xs text-amber-600 mb-2 font-medium">Setup is taking longer than expected.</p>
                 <button 
                   onClick={handleRetry}
                   className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm transition-colors shadow-sm font-medium"
                 >
                   Retry Setup
                 </button>
               </div>
            )}
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
            />
          </div>

          <div className="h-64 border-t">
            <TerminalComponent
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;
