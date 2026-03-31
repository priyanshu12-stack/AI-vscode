import { db } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { NextRequest, NextResponse } from "next/server";

interface SuggestionUpdateRequest {
  suggestionId: string;
  isApplied?: boolean;
  rating?: number;
  feedback?: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SuggestionUpdateRequest = await req.json();
    const { suggestionId, isApplied, rating, feedback } = body;

    if (!suggestionId) {
      return NextResponse.json(
        { error: "Suggestion ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingSuggestion = await db.suggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!existingSuggestion || existingSuggestion.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (isApplied !== undefined) updateData.isApplied = isApplied;
    if (isApplied) updateData.appliedAt = new Date();
    if (rating !== undefined) updateData.rating = rating;
    if (feedback !== undefined) updateData.feedback = feedback;

    const updatedSuggestion = await db.suggestion.update({
      where: { id: suggestionId },
      data: updateData,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        isApplied: true,
        rating: true,
        feedback: true,
        appliedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      suggestion: updatedSuggestion,
    });
  } catch (error) {
    console.error("Update suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a suggestion
export async function DELETE(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const suggestionId = searchParams.get("id");

    if (!suggestionId) {
      return NextResponse.json(
        { error: "Suggestion ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const suggestion = await db.suggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion || suggestion.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.suggestion.delete({
      where: { id: suggestionId },
    });

    return NextResponse.json({
      success: true,
      message: "Suggestion deleted successfully",
    });
  } catch (error) {
    console.error("Delete suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to delete suggestion" },
      { status: 500 }
    );
  }
}
