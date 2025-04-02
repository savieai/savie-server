# Quill Delta Format Support in TextEnhancer

## Overview

We've updated the TextEnhancer feature to support the Quill Delta format used by our Flutter mobile app. This enhancement ensures that when text is improved through the AI, all rich-text formatting (including bold text, bullet points, lists, etc.) is preserved.

## Problem Solved

Previously, when applying TextEnhancer to content in Quill Delta format:
- The rich-text formatting was lost
- Only the plain text was enhanced
- Any styling, lists, or other formatting was stripped

The new implementation preserves all formatting while still enhancing the text content.

## Implementation Details

The TextEnhancer now:
1. Detects whether the input is plain text or Quill Delta format
2. For Quill Delta input:
   - Extracts the plain text while mapping format attributes
   - Sends only the text content to OpenAI for enhancement
   - Reconstructs the Delta with enhanced text while preserving all formatting attributes

## API Usage

### Request

```http
POST /api/ai/enhance
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": {
    "ops": [
      { "insert": "Shopping List:", "attributes": { "bold": true } },
      { "insert": "\n" },
      { "insert": "Buy milk", "attributes": { "list": "bullet" } },
      { "insert": "\n" }
      // ... more delta operations
    ]
  },
  "format": "delta"
}
```

### Response

```json
{
  "enhanced": {
    "ops": [
      { "insert": "Shopping List:", "attributes": { "bold": true } },
      { "insert": "\n" },
      { "insert": "Buy milk", "attributes": { "list": "bullet" } },
      { "insert": "\n" }
      // ... enhanced content with preserved formatting
    ]
  },
  "original": { /* original delta object */ },
  "format": "delta"
}
```

## Integration for Mobile App

The Flutter app needs to:

1. Send the `format: "delta"` parameter in the API request
2. Send the Quill Delta JSON in the `content` field
3. Parse the enhanced Delta from the response

Example Flutter code:

```dart
// Example function to enhance text with Delta format
Future<Map<String, dynamic>> enhanceTextWithDelta(dynamic deltaJson) async {
  try {
    final response = await http.post(
      Uri.parse('$apiUrl/api/ai/enhance'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'content': deltaJson,
        'format': 'delta'
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to enhance text: ${response.body}');
    }
  } catch (e) {
    throw Exception('Error enhancing text: $e');
  }
}

// Example usage
final result = await enhanceTextWithDelta(quillController.document.toDelta().toJson());
// result['enhanced'] contains the enhanced Delta
quillController.document = Document.fromJson(result['enhanced']);
```

## Technical Implementation Notes

1. The enhancement works by carefully mapping the original formatting structure and applying it back to the enhanced text
2. Line break attributes (crucial for lists) are preserved
3. Text within each formatting segment is enhanced independently
4. Special handling is in place for embedded objects (images, etc.)

## Testing

We've added a script that tests this functionality:

```
node scripts/test-delta-enhancement.js
```

The test verifies that:
- Text content is enhanced correctly
- Formatting attributes are preserved
- Line breaks and their attributes (list formatting) are maintained

## Backward Compatibility

The implementation is fully backward compatible with plain text enhancement. If `format: "delta"` is not specified, the endpoint behaves exactly as before. 