import { useState, useEffect, useCallback } from "react";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";
import type { WebContainer } from "@webcontainer/api";

interface UseWebContainerProps {
  templateData: TemplateFolder;
}

interface UseWebContaierReturn {
  serverUrl: string | null;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  destory: () => void;
}

export const useWebContainer = ({
  templateData,
}: UseWebContainerProps): UseWebContaierReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeWebContainer() {
      try {
        if (typeof window === "undefined") return;

        console.log("🛠️ Initializing WebContainer...");
        
        const win = window as any;
        
        // 1. Definition check for globalThis (should be handled by layout script already)
        if (!win.globalThis) {
           win.globalThis = win;
        }

        // 2. Singleton boot logic
        if (!win.__webcontainerInstance) {
          console.log("⚡ Booting new WebContainer instance...");
          const { WebContainer } = await import("@webcontainer/api");
          
          try {
            // HACK: Intercept Object.defineProperty to prevent internal bootstrapper from crashing 
            // on 'globalThis' redefinition if it's already defined as non-configurable.
            const originalDefineProperty = Object.defineProperty;
            (Object as any).defineProperty = function(obj: any, prop: string, descriptor: any) {
              if ((obj === window || obj === globalThis) && prop === 'globalThis') {
                console.warn("🛡️ Intercepted globalThis redefinition attempt");
                return obj;
              }
              return originalDefineProperty.apply(this, arguments as any);
            };

            win.__webcontainerInstance = await WebContainer.boot();
            
            // Restore original defineProperty
            (Object as any).defineProperty = originalDefineProperty;
            
            console.log("✅ WebContainer boot successful");
          } catch (bootErr) {
            console.error("❌ WebContainer boot failed:", bootErr);
            // Don't cache a failed instance
            delete win.__webcontainerInstance;
            throw bootErr;
          }
        } else {
          console.log("♻️ Using existing WebContainer instance");
        }

        if (!mounted) return;

        const webcontainerInstance = win.__webcontainerInstance;
        setInstance(webcontainerInstance);
        
        // Only set loading to false if we have a valid instance
        if (webcontainerInstance) {
          setIsLoading(false);
          setError(null);
        } else {
          throw new Error("WebContainer instance is null after boot");
        }

      } catch (err) {
        console.error("🚨 Failed to initialize WebContainer:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    initializeWebContainer();

    return () => {
      mounted = false;
      // Note: We don't nullify the instance here as it's a singleton on the window
    };
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!instance) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await instance.fs.mkdir(folderPath, { recursive: true }); // Create folder structure recursively
        }

        await instance.fs.writeFile(path, content);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to write file";
        console.error(`Failed to write file at ${path}:`, err);
        throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
      }
    },
    [instance]
  );

  const destory = useCallback(()=>{
    if(instance){
        instance.teardown()
        setInstance(null);
        setServerUrl(null)
    }
  },[instance])

  return {serverUrl , isLoading , error , instance , writeFileSync , destory}
};
