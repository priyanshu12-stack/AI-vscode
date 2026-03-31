# AI Suggestions Feature - Implementation Guide

## Overview
The AI chatbot can now give intelligent suggestions and recommendations directly from the chat interface. Suggestions are automatically generated based on the mode (Review, Fix, Optimize) and are stored for future reference.

## What Was Added

### 1. **Database Schema (`prisma/schema.prisma`)**
A new `Suggestion` model was added to store all AI-generated suggestions:

```prisma
model Suggestion {
  id              String    @id @default(cuid()) @map("_id")
  userId          String
  playgroundId    String?
  chatMessageId   String?
  type            SuggestionType @default(SUGGESTION)
  title           String?
  content         String
  codeContext     String?
  isApplied       Boolean   @default(false)
  appliedAt       DateTime?
  rating          Int?      // 1-5 rating
  feedback        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum SuggestionType {
  SUGGESTION
  CODE_REVIEW
  ERROR_FIX
  OPTIMIZATION
  GENERAL
}
```

**Primary Key**: `id` (CUID - cryptographically unique identifier)

**Key Features**:
- Auto-timestamps for tracking
- User ownership verification
- Playground context association
- Rating and feedback support
- Applied/tracking capability

### 2. **API Endpoints**

#### POST `/api/suggestions`
Generate new suggestions and store them in the database

**Request**:
```json
{
  "codeContext": "// your code here",
  "type": "CODE_REVIEW|ERROR_FIX|OPTIMIZATION|SUGGESTION|GENERAL",
  "playgroundId": "optional-playground-id",
  "chatMessageId": "optional-message-id",
  "language": "JavaScript/TypeScript",
  "framework": "React/Vue/etc"
}
```

**Response**:
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "suggestion-id",
      "title": "Suggestion Title",
      "content": "Detailed suggestion content",
      "type": "CODE_REVIEW",
      "createdAt": "2024-02-12T..."
    }
  ],
  "count": 3
}
```

#### GET `/api/suggestions?playgroundId=xxx&type=xxx&limit=20`
Fetch suggestions for a specific context

**Query Parameters**:
- `playgroundId` (optional): Filter by playground
- `type` (optional): Filter by suggestion type
- `limit` (default: 20): Maximum results

#### PATCH `/api/suggestions/[id]`
Update suggestion status, rating, or feedback

**Request**:
```json
{
  "isApplied": true,
  "rating": 5,
  "feedback": "This was helpful!"
}
```

#### DELETE `/api/suggestions/[id]?id=xxx`
Delete a specific suggestion

### 3. **Updated Chat API (`/api/chat/route.ts`)**

**New Features**:
- Automatically generates suggestions based on chat mode
- Stores chat messages in database for history
- Detects code patterns and triggers suggestions
- Returns suggestions along with chat response

**Updated Request Format**:
```json
{
  "message": "user message",
  "history": [...],
  "mode": "chat|review|fix|optimize",
  "generateSuggestions": true,
  "playgroundId": "optional",
  "codeContext": "optional code"
}
```

**Response**:
```json
{
  "response": "Chat response text",
  "suggestions": [
    { "title": "...", "content": "..." }
  ],
  "timestamp": "..."
}
```

### 4. **UI Components**

#### New Tabs in AI Chat Panel
- **Messages Tab**: Shows conversation history
- **Suggestions Tab**: Shows all generated suggestions

#### Suggestions Panel (`suggestions-panel.tsx`)
Displays suggestions with:
- Type indicator (Code Review, Error Fix, Optimization)
- Title and detailed content
- Creation timestamp
- Quick actions:
  - Apply suggestion
  - Copy to clipboard
  - Delete suggestion
  - Rate/feedback (if rating exists)

#### Custom Hook (`useSuggestions.ts`)
Manages all suggestion operations:
- `fetchSuggestions()`: Load suggestions
- `applySuggestion()`: Mark as applied
- `rateSuggestion()`: Add rating and feedback
- `deleteSuggestion()`: Remove suggestion

## How to Use

### For Developers Using the Chat

1. **Open AI Chat Panel** - Click the chat icon
2. **Select a Mode**:
   - **Chat**: General questions
   - **Review**: Get comprehensive code review
   - **Fix**: Get bug fixes and solutions
   - **Optimize**: Get performance improvements

3. **Paste Code or Ask Question** - Enter your code/question

4. **Receive Suggestions** - AI will generate suggestions automatically

5. **View All Suggestions** - Click the "Suggestions" tab to see all past suggestions

6. **Interact with Suggestions**:
   - ✓ Apply - Mark as applied and track
   - 📋 Copy - Copy to clipboard
   - ⭐ Rate - Give feedback
   - 🗑️ Delete - Remove

### For Integration

```typescript
// In any component with access to playground code
const handleGetSuggestions = async (code: string) => {
  const response = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codeContext: code,
      type: "CODE_REVIEW",
      playgroundId: "playground-id",
      language: "JavaScript",
      framework: "React"
    }),
  });
  const data = await response.json();
  return data.suggestions;
};
```

## Database Migration

The following were created:
- `Suggestion` collection in MongoDB
- Three indexes for performance:
  - `userId` - For user-specific queries
  - `playgroundId` - For playground context
  - `chatMessageId` - For message linkage

## Key Features Summary

| Feature | Details |
|---------|---------|
| **Auto-Generation** | Suggestions auto-generate when analyzing code |
| **Context-Aware** | Knows about playground, code context, language |
| **Persistence** | All suggestions stored in database for history |
| **Tracking** | Can mark suggestions as applied |
| **Feedback** | Users can rate and provide feedback |
| **Organization** | Organized by type and timestamp |
| **Security** | User-owned - users can only see their own |

## AI Backends Supported

The system tries multiple AI backends in order:
1. **Local Ollama** (`http://localhost:11434`) - codellama model
2. **OpenAI API** - gpt-4o-mini model
3. **Fallback** - Default text response

## Configuration

Set these environment variables:
```env
# For OpenAI suggestions
OPENAI_API_KEY=sk-...
# or
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Database connection
DATABASE_URL=mongodb+srv://...
```

## Next Steps & Enhancements

Possible future improvements:
1. ✅ Bulk suggestion operations
2. ✅ Suggestion categories/tags
3. ✅ Collaborative suggestions
4. ✅ AI model selection interface
5. ✅ Suggestion templates
6. ✅ Smart suggestion deduplication
7. ✅ Suggestion batch applies
8. ✅ Analytics on suggestion usage

## Troubleshooting

### Suggestions not appearing?
- Check if AI backend is running (Ollama or OpenAI key set)
- Verify code context is being sent
- Check browser console for errors

### Database errors?
- Ensure Prisma migration ran successfully
- Check MongoDB connection string
- Verify user is authenticated

### No suggestions for code?
- Try with 'Review' or 'Optimize' mode for better results
- Add more context or code to analyze
- Check AI backend logs

---

**Status**: ✅ Complete and Ready for Use
**Primary Key Type**: CUID (Cryptographically Unique Identifier)
**Database**: MongoDB
