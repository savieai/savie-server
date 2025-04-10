# Convert to To-Do Feature Implementation

## Feature Summary

The "Convert to To-Do" feature allows users to transform any note or voice message into a structured to-do list. The feature intelligently detects actionable tasks and separates regular text content from tasks, returning both in the format requested (plain text or Quill Delta).

## Implementation Details

### Files Created/Modified:

1. **src/ai/convertToTodo.js** - Core functionality
2. **src/ai/aiRoutes.js** - API endpoint
3. **Backend_API_Documentation.md** - API documentation
4. **PROJECT_DOCUMENTATION.md** - Project feature documentation
5. **test-convert-todo.js** - Test script
6. **package.json** - Added test command
7. **docs/CONVERT_TODO_FEATURE.md** - Detailed documentation

## API Usage

### Endpoint
```
POST /ai/convert-to-todo
```

### Example Request (Direct Content)
```json
{
  "content": "Pick up groceries tomorrow. I need milk, eggs, and bread. Also remember to call mom for her birthday.",
  "format": "plain"
}
```

### Example Request (Using Message ID)
```json
{
  "message_id": "message-uuid"
}
```

### Example Success Response
```json
{
  "success": true,
  "tasks": [
    "Pick up groceries tomorrow",
    "Buy milk, eggs, and bread",
    "Call mom for her birthday"
  ],
  "regular_text": "I need to go shopping.",
  "format": "plain"
}
```

## Testing

1. Run the automated test script:
   ```
   npm run test:convert-todo
   ```

2. Check detailed test scenarios in `docs/CONVERT_TODO_FEATURE.md`

## Deployment Steps

1. Review all code changes
2. Run tests locally
3. Stage deployment
4. Test in staging
5. Deploy to production

## AI Integration

This feature uses OpenAI's API to analyze text and identify actionable tasks. The optimized prompt separates tasks from regular content. 