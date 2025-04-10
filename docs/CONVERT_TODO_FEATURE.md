# Convert Notes and Voice Messages to To-Do Lists

## Feature Overview

This feature allows users to transform any note or voice message into a structured to-do list in the Quill Delta format. The system intelligently detects actionable tasks and separates regular text content from tasks.

## User Flow

1. **User Interaction**:
   - User clicks on any existing message (text or voice message)
   - Selects the option "Convert to To-Do"

2. **System Actions Behind the Scenes**:
   - If the message is a voice message and hasn't been transcribed yet, the system automatically performs speech-to-text transcription
   - Takes the resulting plain text (either transcribed or originally typed) and passes it to OpenAI
   - AI analyzes the text and identifies clear tasks, converting them into the structured to-do list format
   - Non-task-related text content remains clearly separated from tasks

3. **Final Output**:
   - Returns structured data containing two clear sections:
     - To-Do List: In Quill Delta format (with proper list formatting)
     - Regular Text: Remaining text content in plain text or Delta format

## API Usage

### Endpoint

```
POST /ai/convert-to-todo
```

### Request Format

#### Option 1: Direct Content Conversion

```json
{
  "content": "Pick up groceries tomorrow. I need milk, eggs, and bread. Also remember to call mom for her birthday.",
  "format": "plain"  // or "delta" for Quill Delta format
}
```

#### Option 2: Convert from Existing Message

```json
{
  "message_id": "message-uuid"
}
```

### Response Format (Success)

#### Plain Text Format

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

#### Delta Format

```json
{
  "success": true,
  "tasks": {
    "ops": [
      { "insert": "Pick up groceries tomorrow" },
      { "insert": "\n", "attributes": { "list": "unchecked" } },
      { "insert": "Buy milk, eggs, and bread" },
      { "insert": "\n", "attributes": { "list": "unchecked" } },
      { "insert": "Call mom for her birthday" },
      { "insert": "\n", "attributes": { "list": "unchecked" } }
    ]
  },
  "regular_text": {
    "ops": [
      { "insert": "I need to go shopping." },
      { "insert": "\n" }
    ]
  },
  "format": "delta"
}
```

### Error Responses

- **400 Bad Request**: Missing content
  ```json
  {
    "error": "Either content or message_id is required"
  }
  ```

- **400 Bad Request**: No valid content to process
  ```json
  {
    "error": "No valid content to process"
  }
  ```

- **404 Not Found**: Message not found
  ```json
  {
    "error": "Message not found"
  }
  ```

- **429 Too Many Requests**: Rate limit exceeded
  ```json
  {
    "error": "Rate limit exceeded",
    "message": "You have exceeded your daily limit for todo conversions"
  }
  ```

- **500 Internal Server Error**: Processing error
  ```json
  {
    "error": "Failed to convert to todo: [error details]"
  }
  ```

## Implementation Details

### Files Modified

1. **src/ai/convertToTodo.js**: New file implementing the core functionality
2. **src/ai/aiRoutes.js**: Added new endpoint to handle the API request
3. **Backend_API_Documentation.md**: Updated documentation
4. **PROJECT_DOCUMENTATION.md**: Added feature information
5. **test-convert-todo.js**: Test script for the feature
6. **package.json**: Added test script

### AI Prompt Used

```
You are an AI assistant that analyzes text to identify actionable tasks and separate them from regular content.

Given the following user input text:
1. Clearly identify and extract all actionable tasks as individual to-do items
2. Separate non-task-related content as regular text
3. Be smart about identifying what is a task versus general information

Return the following JSON structure:
{
  "tasks": [
    "Task 1",
    "Task 2",
    ...
  ],
  "regular_text": "All the non-task content from the original text"
}

If no clear tasks are identified, return an empty array for tasks and place all input text into "regular_text".
```

## Testing

### Automated Testing

Run the test script to verify functionality:

```bash
npm run test:convert-todo
```

The test script validates:
1. Plain text to to-do conversion
2. Delta format conversion
3. Error handling for empty content
4. Error handling for missing parameters

### Manual Testing Scenarios

1. **Text-only Message → To-do Conversion**:
   - Create a text note with clear tasks
   - Call the API to convert to to-do
   - Verify the tasks are correctly identified and formatted

2. **Voice Message Already Transcribed → To-do Conversion**:
   - Use a voice message that has been transcribed
   - Call the API with the message_id
   - Verify the tasks are extracted from the transcription

3. **Voice Message Not Transcribed → Automatic Transcription → To-do Conversion**:
   - Use a voice message that has not been transcribed
   - Call the API with the message_id
   - Verify the system transcribes the audio and then extracts tasks

4. **Message with No Clear Tasks → Proper Handling**:
   - Use a message with no actionable items
   - Call the API to convert to to-do
   - Verify an empty tasks array is returned and all content is in regular_text

## Integration with Existing Functionality

- Utilizes existing transcribe functionality for voice messages
- Maintains compatibility with the enhance functionality
- Works alongside the existing task extraction feature

## Rate Limiting

- 100 conversions per day per user
- Usage tracked in ai_usage table with feature = 'convert_to_todo' 