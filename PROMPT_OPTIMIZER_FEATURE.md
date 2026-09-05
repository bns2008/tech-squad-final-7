# Prompt Optimizer Feature

## Overview
The **Prompt Optimizer** feature helps users refine rough or unclear prompts before sending them to the AI Assistant. It uses Mistral AI to transform casual user input into clear, specific, and technically accurate prompts.

## Location
**Tools → AI Assistant** (all modes: Chat, Explain SQL, Generate SQL)

## How It Works

### Frontend (AssistantPage.tsx)
1. **Sparkles Icon Button (✨)**: Added next to the Send button in all input modes
2. **State Management**: 
   - `isOptimizing`: tracks optimization loading state
   - Button is disabled when input is empty or during optimization
3. **optimizePrompt() Function**: 
   - Sends current input to `/api/assistant` with `mode: "optimize"`
   - Replaces input field with refined version
   - Shows toast notifications for feedback

### Backend (route.ts)
1. **New Mode**: `mode: "optimize"`
2. **optimizePromptText() Function**: 
   - Context-aware based on current mode (chat, explain, generate)
   - Instructs Mistral AI to refine the prompt
   - Rules:
     - Make prompt more specific and actionable
     - Add relevant technical details
     - Fix grammar/spelling
     - Keep core intent unchanged
     - Max 3 sentences
     - Return as-is if already excellent

## User Experience

### Before Optimization:
```
"show me users"
```

### After Optimization:
```
"Retrieve all user records from the users table, including user ID, username, email, and registration date."
```

## UI Elements

### Chat Mode
- Input field with sparkles button on the right
- Hint: "✨ Optimize = Refine prompt with AI"

### Explain & Generate Modes
- Textarea with "Optimize Prompt" button below
- Button shows loading spinner during optimization

## Button States
- **Idle**: Sparkles icon (✨) visible
- **Optimizing**: Spinner icon with "Optimizing..." text
- **Disabled**: When input is empty or already optimizing

## API Integration

### Request Format
```typescript
{
  mode: "optimize",
  input: "user's rough prompt",
  currentMode: "chat" | "explain" | "generate"
}
```

### Response Format
```typescript
{
  optimizedPrompt: "refined prompt text",
  processingTime: 1234
}
```

## Error Handling
- Shows error toast if API fails
- Falls back gracefully without breaking user flow
- Original input preserved if optimization fails

## Benefits
1. **Better Results**: More specific prompts lead to better AI responses
2. **Learning Tool**: Users see how to write better prompts
3. **Time Saving**: No need to manually refine prompts
4. **Accessibility**: Helps non-technical users communicate with AI effectively

## Technical Details

### Files Modified
- `frontend/components/pages/AssistantPage.tsx` (UI + logic)
- `frontend/app/api/assistant/route.ts` (backend handler)

### Dependencies
- Lucide React (Sparkles icon)
- Mistral AI API
- React hot-toast for notifications

### Performance
- Average optimization time: 1-2 seconds
- Fallback to original prompt on timeout/error
- No blocking of other features during optimization

## Future Enhancements
- Add optimization history
- Show before/after comparison
- Suggest multiple refined versions
- Add keyboard shortcut (e.g., Ctrl+Shift+O)
- Context-aware suggestions based on schema

## Testing Checklist
- [x] Chat mode optimizer button visible
- [x] Explain mode optimizer button visible
- [x] Generate mode optimizer button visible
- [x] Button disabled when input empty
- [x] Loading state shows spinner
- [x] Toast notifications work
- [x] Backend handles optimize mode
- [x] Error handling works
- [x] Input replaced with optimized version
- [x] Works with all schema contexts
