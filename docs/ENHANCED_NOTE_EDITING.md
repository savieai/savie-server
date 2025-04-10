# Enhanced Note Editing

## Overview

This document describes the enhancements made to the note editing functionality, specifically related to AI-enhanced content. These improvements allow for better handling of enhanced notes, with the ability to edit enhanced content directly, revert to original content, and re-enhance as needed.

## Key Features

1. **Edit Enhanced Content**: Users can now directly edit the enhanced version of a note, without affecting the original content.
2. **Revert to Original**: Users can revert an enhanced note back to its original content.
3. **Re-Enhancement Control**: Notes can only be enhanced once unless explicitly forced or reverted first.
4. **State Tracking**: The API properly tracks which version of the content is active.

## API Endpoints

### 1. Update Note with Target Control

```http
PATCH /api/messages/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "text_content": "New content text",
  "delta_content": { /* new Quill Delta object */ },
  "updateTarget": "enhanced" // or "original" (default)
}
```

The `updateTarget` parameter controls which version of the content gets updated:
- `"original"`: Updates the original content (default behavior)
- `"enhanced"`: Updates the enhanced version of the content

### 2. Revert to Original

```http
POST /api/messages/:id/revert
Authorization: Bearer <token>
```

This endpoint reverts an enhanced note back to its original content by:
- Setting `enhanced_with_ai` to `false`
- Clearing `enhanced_text_content` and `enhanced_delta_content`
- Making the original content active again

### 3. Enhanced Enhancement Control

```http
POST /api/ai/enhance
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Text or Delta to enhance",
  "format": "delta",          // Optional: "delta" for Quill Delta format, omit for plain text
  "message_id": "uuid-of-message",  // Required: Include to store enhanced version
  "force": true               // Optional: Force re-enhancement of already enhanced content
}
```

- Added validation to prevent re-enhancing already enhanced content
- Added `force` parameter to explicitly allow re-enhancement

## Data Model

The message objects in API responses indicate the enhancement state:

```json
{
  "id": "message-uuid",
  "text_content": "Original content",
  "delta_content": { /* original delta */ },
  "enhanced_with_ai": true,
  "enhanced_text_content": "Enhanced content",
  "enhanced_delta_content": { /* enhanced delta */ }
}
```

## Workflow Examples

### Editing Enhanced Content

1. User views an enhanced note
2. User makes edits to the enhanced version
3. App sends PATCH request with `updateTarget: "enhanced"`
4. Only the enhanced content is updated, original is preserved

### Reverting to Original

1. User views an enhanced note
2. User chooses "Revert to Original"
3. App sends POST to `/api/messages/:id/revert`
4. Enhanced content is cleared, `enhanced_with_ai` set to false

### Re-Enhancing Content

1. After reverting to original, user can enhance again
2. App sends POST to `/api/ai/enhance` with note content
3. Note is enhanced as if for the first time

## Best Practices

1. Always specify `updateTarget` explicitly when updating content
2. Check `enhanced_with_ai` flag to determine which content to display/edit
3. Use the revert endpoint to clear enhanced state
4. Avoid using `force=true` unless necessary as it may be confusing to users 