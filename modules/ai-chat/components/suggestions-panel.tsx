import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Trash2,
  Star,
  AlertCircle,
  Zap,
  Code,
  Sparkles,
  Loader2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSuggestions } from "../hooks/useSuggestions";

interface SuggestionsPanelProps {
  playgroundId?: string;
  onClose?: () => void;
}

const SuggestionTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case "CODE_REVIEW":
      return <Code className="h-4 w-4 text-blue-400" />;
    case "ERROR_FIX":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case "OPTIMIZATION":
      return <Zap className="h-4 w-4 text-yellow-400" />;
    default:
      return <Sparkles className="h-4 w-4 text-purple-400" />;
  }
};

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  playgroundId,
  onClose,
}) => {
  const {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    applySuggestion,
    rateSuggestion,
    deleteSuggestion,
  } = useSuggestions();

  useEffect(() => {
    fetchSuggestions(playgroundId);
  }, [playgroundId, fetchSuggestions]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <span>Loading suggestions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Sparkles className="h-8 w-8 mb-3 text-zinc-600" />
        <p className="text-sm mb-2">No suggestions yet</p>
        <p className="text-xs text-zinc-600">
          Send code to the AI chat to get suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 max-h-[600px] overflow-y-auto">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className={cn(
            "p-4 rounded-lg border transition-colors",
            suggestion.isApplied
              ? "bg-green-900/10 border-green-800/30"
              : "bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/50"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-2 mb-2">
            <SuggestionTypeIcon type={suggestion.type} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-zinc-100 truncate">
                {suggestion.title}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {new Date(suggestion.createdAt).toLocaleDateString()}
              </p>
            </div>
            {suggestion.isApplied && (
              <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            )}
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-sm max-w-none mb-3 text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {suggestion.content.substring(0, 300)}
              {suggestion.content.length > 300 ? "..." : ""}
            </ReactMarkdown>
          </div>

          {/* Rating */}
          {suggestion.rating !== null && suggestion.rating !== undefined && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-3 w-3",
                    star <= (suggestion.rating || 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-zinc-700"
                  )}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
            {!suggestion.isApplied && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-green-400 hover:bg-green-900/20"
                onClick={() => applySuggestion(suggestion.id)}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Apply
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-blue-400 hover:bg-blue-900/20"
              onClick={() => navigator.clipboard.writeText(suggestion.content)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-400 hover:bg-red-900/20 ml-auto"
              onClick={() => deleteSuggestion(suggestion.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
