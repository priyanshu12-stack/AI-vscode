import { useCallback, useState } from "react";

export interface Suggestion {
  id: string;
  title: string;
  content: string;
  type: string;
  isApplied: boolean;
  rating?: number;
  createdAt: string;
  playgroundId?: string;
}

export const useSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(
    async (
      playgroundId?: string,
      type?: string,
      limit: number = 20
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (playgroundId) params.append("playgroundId", playgroundId);
        if (type) params.append("type", type);
        params.append("limit", limit.toString());

        const response = await fetch(`/api/suggestions?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch suggestions");

        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error fetching suggestions";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const applySuggestion = useCallback(async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApplied: true }),
      });

      if (!response.ok) throw new Error("Failed to apply suggestion");

      const data = await response.json();
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                isApplied: true,
              }
            : s
        )
      );

      return data.suggestion;
    } catch (err) {
      console.error("Error applying suggestion:", err);
      throw err;
    }
  }, []);

  const rateSuggestion = useCallback(
    async (suggestionId: string, rating: number, feedback?: string) => {
      try {
        const response = await fetch(`/api/suggestions/${suggestionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, feedback }),
        });

        if (!response.ok) throw new Error("Failed to rate suggestion");

        const data = await response.json();
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? {
                  ...s,
                  rating: data.suggestion.rating,
                }
              : s
          )
        );

        return data.suggestion;
      } catch (err) {
        console.error("Error rating suggestion:", err);
        throw err;
      }
    },
    []
  );

  const deleteSuggestion = useCallback(async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}?id=${suggestionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete suggestion");

      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (err) {
      console.error("Error deleting suggestion:", err);
      throw err;
    }
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    applySuggestion,
    rateSuggestion,
    deleteSuggestion,
  };
};
