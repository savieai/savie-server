# Enhanced Text & Transcription Storage

## Overview

We've updated the backend API to properly store both AI-enhanced text and audio transcriptions. This document describes the implementation and how the mobile frontend team should integrate with these features.

## 1. Enhanced Text Storage

### What's Changed

Previously, when you used the TextEnhancer with Quill Delta format:
- The AI would improve the text but the enhanced version was only returned to the client
- The formatting was preserved (as per our recent update) but the enhanced version wasn't stored on the backend

Now:
- The backend stores both the original and enhanced versions of the text
- Both plain text and rich text (Quill Delta) formats are supported
- The enhanced version is linked directly to the original message via `message_id`

### Database Structure

The `messages` table now has these additional fields:
- `enhanced_with_ai` (boolean): Flag indicating if the message has been enhanced
- `enhanced_text_content` (text): Enhanced version of plain text content
- `enhanced_delta_content` (jsonb): Enhanced version of rich text content (Quill Delta format)

### API Usage

#### Enhanced Text Request

```http
POST /api/ai/enhance
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Text or Delta to enhance",
  "format": "delta",          // Optional: "delta" for Quill Delta format, omit for plain text
  "message_id": "uuid-of-message"  // Required: Include to store enhanced version
}
```

#### Response

```json
{
  "enhanced": "Enhanced text or Delta object",
  "original": "Original text or Delta object",
  "format": "delta" // or "plain"
}
```

## 2. Transcription Storage

### What's Changed

Previously, when you transcribed audio:
- The transcription was only returned to the client
- No association was made between the transcription and the original message

Now:
- The transcription is stored in the database
- The transcription is linked directly to the voice message via `message_id`

### Database Structure

The `voice_messages` table now has this additional field:
- `transcription_text` (text): The transcribed text from the audio

### API Usage

#### Transcription Request

```http
POST /api/ai/transcribe
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: [audio file]
message_id: "uuid-of-message"  // Required: Include to store transcription
```

#### Response

```json
{
  "transcription": "Transcribed text from audio"
}
```

## 3. Integration Guidelines for Mobile Frontend

### Best Practices

1. **Always Include `message_id`**
   - For text enhancement: Include `message_id` in the request body
   - For audio transcription: Include `message_id` in the form data

2. **Update Logic**
   - After enhancing text, don't replace the original content in your local storage
   - Instead, store both versions and display the enhanced version to users
   - Provide an option to view the original text if needed

3. **Error Handling**
   - Check for API errors when enhancing text or transcribing audio
   - If storing on the backend fails but the enhancement/transcription succeeds, consider retrying the storage operation

### Retrieving Enhanced Content

When fetching messages, the backend will include the enhanced content if available:

```json
{
  "id": "message-uuid",
  "text_content": "Original text",
  "delta_content": { /* original Quill Delta */ },
  "enhanced_with_ai": true,
  "enhanced_text_content": "Enhanced text",
  "enhanced_delta_content": { /* enhanced Quill Delta */ }
}
```

Use `enhanced_with_ai` to check if enhanced content is available, then use either `enhanced_text_content` or `enhanced_delta_content` depending on your format.

### Voice Message Transcription

When fetching voice messages, the transcription will be included if available:

```json
{
  "message_id": "message-uuid",
  "url": "voice-message-url",
  "duration": 15.5,
  "transcription_text": "Transcribed text from the voice message"
}
```

## 4. Example Flutter Code

### Enhanced Text

```dart
Future<void> enhanceText(String messageId, dynamic content, bool isDelta) async {
  try {
    final response = await http.post(
      Uri.parse('$apiUrl/api/ai/enhance'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'content': content,
        'format': isDelta ? 'delta' : null,
        'message_id': messageId // Always include message_id
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // Update UI with enhanced content
      // The backend will automatically store the enhanced version
      return data['enhanced'];
    } else {
      throw Exception('Failed to enhance text: ${response.body}');
    }
  } catch (e) {
    // Handle errors
    print('Error enhancing text: $e');
    throw e;
  }
}
```

### Transcription

```dart
Future<String> transcribeAudio(String messageId, File audioFile) async {
  try {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$apiUrl/api/ai/transcribe'),
    );
    
    // Add authorization header
    request.headers.addAll({
      'Authorization': 'Bearer $token',
    });
    
    // Add the audio file
    request.files.add(await http.MultipartFile.fromPath(
      'file',
      audioFile.path,
    ));
    
    // Add message_id to associate with the voice message
    request.fields['message_id'] = messageId;
    
    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    
    if (response.statusCode == 200) {
      final data = jsonDecode(responseBody);
      
      // The backend will automatically store the transcription
      return data['transcription'];
    } else {
      throw Exception('Failed to transcribe audio: $responseBody');
    }
  } catch (e) {
    // Handle errors
    print('Error transcribing audio: $e');
    throw e;
  }
}
```

## 5. Testing

These features have been thoroughly tested:
- Storage of enhanced text (both plain text and Quill Delta)
- Storage of transcriptions
- Retrieval of enhanced content and transcriptions

All changes are backward compatible:
- Existing endpoints continue to work as before
- New functionality is only activated when `message_id` is provided

## 6. Conclusion

By properly storing enhanced text and transcriptions, we provide a better user experience and enable more advanced features in the future. If you have any questions or encounter any issues, please contact the backend team. 