# Backend API Documentation

## Introduction to Savie

Savie is an AI-powered personal assistant application that helps users capture, organize, and act on their thoughts, notes, and tasks. The core value proposition is to reduce cognitive load by making it easy to record information and then automatically extract actionable items.

### For Users, Savie offers:
- Voice notes that automatically convert to text
- Enhanced readability of notes through AI
- Automatic extraction of tasks from notes
- Execution of tasks through integrations (calendar, email, etc.)
- Powerful semantic search across all notes

### For Developers:
This documentation provides comprehensive information for both backend developers maintaining the API and Flutter mobile developers integrating with the backend. It focuses on the integration points, API specifications, and implementation guidelines to ensure a smooth connection between the Flutter mobile app and the Node.js/Supabase backend.

## 1. Project Overview

This documentation covers the backend infrastructure for our web application that will be integrated with our Flutter-based mobile app. The backend is built using Node.js, Supabase, and OpenAI APIs, providing several core features:

### Core Features

- **Speech-to-Text (Voice Notes Transcription)**  
  A fully implemented feature that converts audio recordings into text using the OpenAI Whisper API. The system supports both direct audio uploads and processing audio URLs, with optional AI enhancement of the transcribed text. The transcription process includes hallucination filtering to improve accuracy on short audio clips and can handle large audio files by processing them in chunks.

- **Context-Aware Semantic Search**  
  An implemented feature using OpenAI embeddings and Supabase pgvector for semantic similarity search across notes. Includes fallback to traditional text search when vector search fails or returns no results. The search functionality also processes natural language queries, incorporates synonyms and related terms, and supports category-based expansions (e.g., "cars" will also search for specific car brands).

- **Text Enhancement (using OpenAI GPT API)**  
  A fully implemented feature that improves the quality of text using OpenAI's GPT models. This feature can enhance notes, tasks, and transcriptions to make them more professional and readable. It preserves the original meaning and formatting while improving grammar, clarity, and readability. The system tracks usage metrics and maintains the original content for reference.

- **Input-to-Execution (Beta Phase)**  
  An experimental feature that detects actionable tasks in notes (such as calendar events, reminders, emails) and executes them by interfacing with external services. This feature is still under development and requires special attention during integration. The system can currently handle:
  
  - **Calendar events**: Creates Google Calendar events with appropriate time parsing
  - **Email tasks**: Prepares email content with recipients (full execution pending)
  - **Reminders**: Detects and structures reminder information (integration pending)
  
  The feature includes email collection for meeting attendees and handles OAuth-based connections with Google services.

## 2. Project File Structure and Architecture

### Main Directories

- **/app**: Contains the Next.js application code
  - **/api**: Backend API endpoints organized by feature
    - **/ai**: AI-related endpoints (extraction, parsing, enhancement)
      - **/extract-attendees**: Extracts attendee information from text
      - **/parse-datetime**: Parses date and time information from text
      - **/enhance**: Text enhancement endpoint
    - **/auth**: Authentication endpoints for user management and service connections
      - **/connect/google**: Google OAuth connection endpoints
    - **/notes**: Note management endpoints, including audio transcription
      - **/[id]/transcribe**: Transcription for existing notes
      - **/[id]/transcribe-direct**: Direct transcription with streaming updates
      - **/audio**: Audio file upload and processing
    - **/search**: Search functionality endpoints
    - **/tasks**: Task management and execution endpoints
      - **/detect**: Task detection from note content
      - **/execute**: Task execution with service integrations
      - **/[taskId]**: Task management endpoints

- **/components**: Frontend React components
  - **/notes**: Note-related components (cards, inputs, etc.)
  - **/todo**: Todo list components

- **/lib**: Core functionality and services
  - **/api**: Backend API utility functions
    - **ai.ts**: AI-related functions (enhancement, embeddings)
    - **notes.ts**: Note management functions
    - **tasks-server.ts**: Server-side task execution logic
    - **task-detection.ts**: Task detection logic
  - **/services**: Integration with external services
    - **google-auth.ts**: Google authentication
    - **google-calendar.ts**: Google Calendar integration
    - **google-mail.ts**: Google Mail integration

- **/savie**: Application-specific code
  - Contains duplicated components and implementations for staged development
  - Used for testing new features before merging into main codebase

- **/supabase**: Supabase configuration and database scripts
  - Database schema definitions and migrations

- **/scripts**: Utility scripts for maintenance and testing
  - Testing calendar integrations
  - Database maintenance
  - OAuth connection debugging

### Key Files

- **/lib/api/ai.ts**: Core AI functionality including text enhancement, embedding generation, and transcription
- **/lib/api/notes.ts**: Note management functionality
- **/lib/api/tasks-server.ts**: Server-side task execution logic
- **/app/api/notes/audio/route.ts**: Audio transcription endpoint
- **/app/api/notes/[id]/transcribe/route.ts**: Note transcription endpoint
- **/app/api/ai/enhance/route.ts**: Text enhancement endpoint
- **/app/api/search/route.ts**: Semantic search endpoint
- **/app/api/tasks/execute/route.ts**: Task execution endpoint
- **/lib/db-schema.sql**: Database schema definition
- **/lib/services/google-calendar.ts**: Google Calendar integration service
- **/components/notes/note-card.tsx**: Note display component with task execution UI

## 3. API Endpoints

### Authentication

Authentication is handled through Supabase's JWT-based auth system, which is fully integrated with the backend API.

#### Authentication Flow

```
┌──────────┐                      ┌────────────┐                     ┌─────────────┐
│  Client  │                      │ Backend API│                     │  Supabase   │
└────┬─────┘                      └──────┬─────┘                     └──────┬──────┘
     │                                   │                                  │
     │  POST /api/auth/signup            │                                  │
     │  or POST /api/auth/login          │                                  │
     │ ─────────────────────────────────>                                   │
     │                                   │                                  │
     │                                   │  auth.signUp() or auth.signIn()  │
     │                                   │ ─────────────────────────────────>
     │                                   │                                  │
     │                                   │        JWT + Refresh Token       │
     │                                   │ <─────────────────────────────────
     │                                   │                                  │
     │      JWT + Refresh Token          │                                  │
     │ <─────────────────────────────────                                   │
     │                                   │                                  │
     │ GET /api/notes                    │                                  │
     │ Authorization: Bearer {JWT}       │                                  │
     │ ─────────────────────────────────>                                   │
     │                                   │       Verify JWT                 │
     │                                   │ ─────────────────────────────────>
     │                                   │                                  │
     │                                   │       Valid/Invalid              │
     │                                   │ <─────────────────────────────────
     │                                   │                                  │
     │         API Response              │                                  │
     │ <─────────────────────────────────                                   │
     │                                   │                                  │
```

#### Security Considerations

- **Token Storage**: Store tokens securely in HttpOnly cookies or secure storage
- **Token Expiration**: Access tokens expire after 1 hour, refresh tokens after 7 days
- **CORS Protection**: API endpoints implement proper CORS headers
- **Rate Limiting**: Authentication endpoints are rate-limited to prevent brute force attacks
- **Session Invalidation**: Available through the logout endpoint
- **Token Rotation**: Refresh tokens are rotated on each use

#### Supabase JWT Structure

```json
{
  "aud": "authenticated",
  "exp": 1672531200,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "session_id": "session-uuid"
}
```

#### POST /api/auth/signup
- **Purpose**: Register a new user account
- **Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }
  ```
- **Response (Success)** - 201 Created:
  ```json
  {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_at": 1672531200
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid email format or weak password
    ```json
    {
      "error": "Invalid credentials",
      "message": "Password must be at least 8 characters"
    }
    ```
  - 409 Conflict: Email already exists
    ```json
    {
      "error": "User already exists",
      "message": "This email is already registered"
    }
    ```
- **Security**: CSRF protection, rate limiting

#### POST /api/auth/login
- **Purpose**: Authenticate user with email and password
- **Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_at": 1672531200
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing credentials
    ```json
    {
      "error": "Missing credentials",
      "message": "Email and password are required"
    }
    ```
  - 401 Unauthorized: Invalid credentials
    ```json
    {
      "error": "Invalid credentials",
      "message": "Email or password is incorrect"
    }
    ```
  - 429 Too Many Requests: Rate limit exceeded
    ```json
    {
      "error": "Rate limit exceeded",
      "message": "Too many login attempts, please try again later"
    }
    ```
- **Security**: Uses Supabase Auth, JWT tokens, rate limiting

#### POST /api/auth/logout
- **Purpose**: End the current user session
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Response (Success)** - 200 OK:
  ```json
  {
    "success": true,
    "message": "Successfully logged out"
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid or expired token
    ```json
    {
      "error": "Unauthorized",
      "message": "Invalid or expired token"
    }
    ```
- **Security**: JWT token required

#### POST /api/auth/refresh
- **Purpose**: Refresh the access token using a refresh token
- **Request**:
  ```json
  {
    "refresh_token": "refresh-token"
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "access_token": "new-jwt-token",
    "refresh_token": "new-refresh-token",
    "expires_at": 1672531200
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid refresh token
    ```json
    {
      "error": "Invalid refresh token",
      "message": "The refresh token is invalid or expired"
    }
    ```
- **Security**: Refresh token validation, token rotation

#### POST /api/auth/connect/google
- **Purpose**: Initialize Google OAuth connection flow
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Response (Success)** - 200 OK:
  ```json
  {
    "url": "https://accounts.google.com/o/oauth2/auth?client_id=...",
    "state": "csrf-state-token"
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: User not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "User must be logged in to connect Google account"
    }
    ```
  - 500 Internal Server Error: OAuth configuration error
    ```json
    {
      "error": "Configuration error",
      "message": "Google OAuth is not properly configured"
    }
    ```
- **Security**: JWT token required, CSRF state token protection

#### GET /api/auth/connect/google/callback
- **Purpose**: Handle OAuth callback from Google
- **Query Parameters**: 
  - `code`: OAuth authorization code
  - `state`: CSRF state token
- **Response (Success)**: Redirects to application with connected account
- **Error Responses**:
  - 400 Bad Request: Invalid state parameter (CSRF protection)
    ```json
    {
      "error": "Invalid state",
      "message": "The state parameter does not match"
    }
    ```
  - 401 Unauthorized: Authorization code error
    ```json
    {
      "error": "Authorization failed",
      "message": "Failed to exchange code for token"
    }
    ```
- **Security**: Validates state parameter to prevent CSRF

#### GET /api/auth/user
- **Purpose**: Get current user information
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Response (Success)** - 200 OK:
  ```json
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2023-01-01T00:00:00Z"
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
- **Security**: JWT token required, RLS enforced

### Notes

#### GET /api/notes
- **Purpose**: Retrieve all notes for the authenticated user
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Query Parameters**: 
  - `limit`: Maximum number of notes to return (default: 20, max: 100)
  - `offset`: Pagination offset (default: 0)
  - `type`: Filter by note type ('text', 'todo', 'voice', optional)
  - `is_deleted`: Include deleted notes (default: false)
  - `sort`: Sort field ('created_at', 'updated_at', default: 'updated_at')
  - `order`: Sort order ('asc', 'desc', default: 'desc')
- **Response (Success)** - 200 OK:
  ```json
  {
    "notes": [
      {
        "id": "note-uuid",
        "content": "Note content",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "type": "text",
        "is_ai_enhanced": false,
        "metadata": {
          "transcription_status": "completed",
          "is_audio_note": false
        }
      }
    ],
    "count": 1,
    "total": 50,
    "hasMore": true
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 400 Bad Request: Invalid parameters
    ```json
    {
      "error": "Invalid parameters",
      "message": "The limit parameter must be between 1 and 100"
    }
    ```
- **Security**: JWT token required, RLS enforced

#### POST /api/notes
- **Purpose**: Create a new note
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "content": "Note content",
    "type": "text",
    "metadata": {
      "custom_field": "value"
    },
    "is_ai_enhanced": false
  }
  ```
- **Response (Success)** - 201 Created:
  ```json
  {
    "note": {
      "id": "new-note-uuid",
      "content": "Note content",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "type": "text",
      "is_ai_enhanced": false,
      "metadata": {
        "custom_field": "value"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid content
    ```json
    {
      "error": "Invalid content",
      "message": "Content is required and cannot be empty"
    }
    ```
  - 400 Bad Request: Invalid type
    ```json
    {
      "error": "Invalid type",
      "message": "Type must be one of: text, todo, voice"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 413 Payload Too Large: Content exceeds maximum size
    ```json
    {
      "error": "Content too large",
      "message": "Note content exceeds maximum allowed size of 100KB"
    }
    ```
- **Security**: JWT token required, RLS enforced, content validation

#### GET /api/notes/:id
- **Purpose**: Retrieve a specific note by ID
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Path Parameters**:
  - `id`: Note UUID
- **Response (Success)** - 200 OK:
  ```json
  {
    "note": {
      "id": "note-uuid",
      "content": "Note content",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "type": "text",
      "is_ai_enhanced": false,
      "original_content": null,
      "metadata": {
        "custom_field": "value"
      }
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized", 
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: Not authorized to access the note
    ```json
    {
      "error": "Forbidden",
      "message": "You don't have permission to access this note"
    }
    ```
  - 404 Not Found: Note doesn't exist or is deleted
    ```json
    {
      "error": "Not found",
      "message": "Note not found"
    }
    ```
- **Security**: JWT token required, RLS enforced

#### PATCH /api/notes/:id
- **Purpose**: Update an existing note
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Path Parameters**:
  - `id`: Note UUID
- **Request**:
  ```json
  {
    "content": "Updated content",
    "is_ai_enhanced": true,
    "original_content": "Original content",
    "metadata": {
      "updated_field": "new value"
    }
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "note": {
      "id": "note-uuid",
      "content": "Updated content",
      "is_ai_enhanced": true,
      "original_content": "Original content",
      "updated_at": "2023-01-03T00:00:00Z",
      "metadata": {
        "custom_field": "value",
        "updated_field": "new value"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid content
    ```json
    {
      "error": "Invalid content",
      "message": "Content cannot be empty"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: Not authorized to update the note
    ```json
    {
      "error": "Forbidden",
      "message": "You don't have permission to update this note"
    }
    ```
  - 404 Not Found: Note doesn't exist
    ```json
    {
      "error": "Not found",
      "message": "Note not found"
    }
    ```
  - 409 Conflict: Note already deleted
    ```json
    {
      "error": "Conflict",
      "message": "Cannot update a deleted note"
    }
    ```
- **Security**: JWT token required, RLS enforced, content validation

#### DELETE /api/notes/:id
- **Purpose**: Delete a note (soft delete)
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Path Parameters**:
  - `id`: Note UUID
- **Query Parameters**:
  - `permanent`: Boolean flag for permanent deletion (default: false)
- **Response (Success)** - 200 OK:
  ```json
  {
    "id": "note-uuid",
    "is_deleted": true,
    "deleted_at": "2023-01-03T00:00:00Z"
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: Not authorized to delete the note
    ```json
    {
      "error": "Forbidden",
      "message": "You don't have permission to delete this note"
    }
    ```
  - 404 Not Found: Note doesn't exist
    ```json
    {
      "error": "Not found",
      "message": "Note not found"
    }
    ```
  - 409 Conflict: Note already deleted
    ```json
    {
      "error": "Conflict",
      "message": "Note is already deleted"
    }
    ```
- **Security**: JWT token required, RLS enforced

#### POST /api/notes/audio
- **Purpose**: Upload and transcribe audio file
- **Request**: FormData with audio file
  - `file`: Audio file (webm, mp3, m4a, wav)
  - `enhanceWithAI`: Boolean flag for AI enhancement
  - `fastTrack`: Boolean flag for quick transcription
- **Response (Success)**:
  ```json
  {
    "noteId": "new-note-uuid",
    "status": "processing"
  }
  ```
- **Security**: JWT token required, RLS enforced

#### POST /api/notes/[id]/transcribe
- **Purpose**: Transcribe audio from a URL for an existing note
- **Request**:
  ```json
  {
    "audioUrl": "https://example.com/audio.webm",
    "enhanceWithAI": true,
    "fastTrack": false
  }
  ```
- **Response (Success)**:
  ```json
  {
    "status": "processing",
    "noteId": "note-uuid"
  }
  ```
- **Security**: JWT token required, RLS enforced

#### GET /api/notes/[id]/status
- **Purpose**: Check transcription status of a note
- **Response (Success)**:
  ```json
  {
    "status": "completed",
    "progress": 100,
    "content": "Transcribed text"
  }
  ```
- **Security**: JWT token required, RLS enforced

### AI Enhancement

#### POST /api/ai/enhance
- **Purpose**: Enhance text using AI
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "content": "Text to enhance",
    "model": "gpt-4o-mini",
    "preserve_formatting": true
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "enhancedText": "Enhanced text with improved grammar and clarity",
    "originalText": "Text to enhance",
    "model": "gpt-4o-mini",
    "usage": {
      "tokens": 65,
      "cost": 0.0008
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing or empty content
    ```json
    {
      "error": "Invalid content",
      "message": "Content is required and cannot be empty"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: AI usage limit exceeded
    ```json
    {
      "error": "Usage limit exceeded",
      "message": "You have reached your daily AI usage limit"
    }
    ```
  - 413 Payload Too Large: Content exceeds maximum size
    ```json
    {
      "error": "Content too large",
      "message": "Text exceeds maximum allowed size of 10KB"
    }
    ```
  - 503 Service Unavailable: AI service not available
    ```json
    {
      "error": "Service unavailable",
      "message": "AI enhancement service is temporarily unavailable"
    }
    ```
- **Security**: JWT token required, RLS enforced, rate limiting, content validation

#### POST /api/ai/parse-datetime
- **Purpose**: Parse date and time from natural language
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "text": "Let's meet tomorrow at 3pm",
    "reference_time": "2023-06-14T12:00:00Z",
    "timezone": "America/New_York"
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "parsed": true,
    "iso": "2023-06-15T15:00:00.000Z",
    "components": {
      "year": 2023,
      "month": 6,
      "day": 15,
      "hour": 15,
      "minute": 0,
      "second": 0
    },
    "original": "tomorrow at 3pm",
    "formatted": "Thursday, June 15, 2023 at 3:00 PM"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing or invalid text
    ```json
    {
      "error": "Invalid text",
      "message": "Text is required and must be a string"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 422 Unprocessable Entity: No date/time found
    ```json
    {
      "error": "Parsing failed",
      "message": "Could not identify a date or time in the provided text",
      "parsed": false
    }
    ```
- **Security**: JWT token required, rate limiting

#### POST /api/ai/extract-attendees
- **Purpose**: Extract attendee names from text
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "text": "Schedule a meeting with John and Sarah from Marketing",
    "include_details": true
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "attendees": [
      {
        "name": "John",
        "details": null
      },
      {
        "name": "Sarah",
        "details": "Marketing"
      }
    ],
    "count": 2
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing or invalid text
    ```json
    {
      "error": "Invalid text",
      "message": "Text is required and must be a string"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 422 Unprocessable Entity: No attendees found
    ```json
    {
      "error": "Extraction failed",
      "message": "Could not identify any attendees in the provided text",
      "attendees": []
    }
    ```
- **Security**: JWT token required, rate limiting

### Search

#### GET /api/search
- **Purpose**: Search notes using semantic or text-based search
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Query Parameters**: 
  - `q`: Search query (required)
  - `limit`: Maximum results to return (default: 20, max: 100)
  - `offset`: Pagination offset (default: 0)
  - `types`: Comma-separated note types to search (e.g., 'text,todo')
  - `include_deleted`: Include deleted notes (default: false)
  - `min_similarity`: Minimum similarity threshold for semantic search (default: 0.1)
- **Response (Success)** - 200 OK:
  ```json
  {
    "results": [
      {
        "id": "note-uuid",
        "content": "Note content matching search terms",
        "created_at": "2023-01-01T00:00:00Z",
        "type": "text",
        "similarity": 0.85
      }
    ],
    "type": "semantic",
    "originalQuery": "search query",
    "processedQuery": "search query related terms",
    "count": 1,
    "total": 5,
    "hasMore": false
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing or empty query
    ```json
    {
      "error": "Invalid query",
      "message": "Search query is required"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 429 Too Many Requests: Rate limit exceeded
    ```json
    {
      "error": "Rate limit exceeded",
      "message": "Too many search requests, please try again later"
    }
    ```
- **Security**: JWT token required, RLS enforced, rate limiting

### Tasks (Beta)

#### POST /api/tasks/detect
- **Purpose**: Detect potential tasks in note content
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "content": "Schedule a meeting with John tomorrow at 2pm",
    "noteId": "note-uuid",
    "save": true
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "detected": true,
    "task": {
      "id": "task-uuid",
      "type": "calendar",
      "title": "Meeting with John",
      "details": {
        "start_time": "2023-06-15T14:00:00",
        "end_time": "2023-06-15T15:00:00",
        "attendees": ["John"],
        "location": null
      },
      "people": ["John"],
      "time": "tomorrow at 2pm"
    },
    "noteId": "note-uuid",
    "confidence": 0.92,
    "saved": true
  }
  ```
- **Response (No Task Detected)** - 200 OK:
  ```json
  {
    "detected": false,
    "message": "No actionable tasks found in the content"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing content
    ```json
    {
      "error": "Invalid content",
      "message": "Content is required for task detection"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 404 Not Found: Note not found (if noteId is provided)
    ```json
    {
      "error": "Not found",
      "message": "The specified note was not found"
    }
    ```
  - 429 Too Many Requests: Rate limit exceeded
    ```json
    {
      "error": "Rate limit exceeded",
      "message": "Too many task detection requests, please try again later"
    }
    ```
- **Security**: JWT token required, RLS enforced, rate limiting

#### POST /api/tasks/execute
- **Purpose**: Execute a detected task
- **Headers**: 
  - `Authorization: Bearer jwt-token`
  - `Content-Type: application/json`
- **Request**:
  ```json
  {
    "taskId": "task-uuid"
  }
  ```
- **Response (Success)** - 200 OK:
  ```json
  {
    "status": "executed",
    "taskId": "task-uuid",
    "externalId": "external-service-id",
    "integrationStatus": {
      "executed": true,
      "serviceConnected": true,
      "service": "Google Calendar",
      "details": {
        "eventUrl": "https://calendar.google.com/event?eid=..."
      }
    },
    "updatedNote": {
      "id": "note-uuid",
      "metadata": {
        "task_executed": true,
        "execution_time": "2023-06-14T15:30:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Missing task ID
    ```json
    {
      "error": "Invalid request",
      "message": "Task ID is required"
    }
    ```
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: Not authorized to execute the task
    ```json
    {
      "error": "Forbidden",
      "message": "You don't have permission to execute this task"
    }
    ```
  - 404 Not Found: Task not found
    ```json
    {
      "error": "Not found",
      "message": "Task not found"
    }
    ```
  - 409 Conflict: Task already executed
    ```json
    {
      "error": "Conflict",
      "message": "Task has already been executed",
      "status": "executed",
      "executedAt": "2023-06-14T14:25:00Z"
    }
    ```
  - 422 Unprocessable Entity: Task cannot be executed
    ```json
    {
      "error": "Execution failed",
      "message": "Task cannot be executed in its current state",
      "details": "Missing required information: attendee emails"
    }
    ```
  - 424 Failed Dependency: Service connection required
    ```json
    {
      "error": "Service connection required",
      "code": "google_not_connected",
      "message": "Google Calendar connection required to execute this task",
      "service": "Google Calendar",
      "settingsUrl": "/settings"
    }
    ```
- **Security**: JWT token required, RLS enforced, service authentication

#### POST /api/tasks/:taskId/ignore
- **Purpose**: Mark a detected task as ignored
- **Headers**: 
  - `Authorization: Bearer jwt-token`
- **Path Parameters**:
  - `taskId`: Task UUID
- **Response (Success)** - 200 OK:
  ```json
  {
    "status": "ignored",
    "taskId": "task-uuid",
    "updatedNote": {
      "id": "note-uuid",
      "metadata": {
        "task_ignored": true,
        "ignored_at": "2023-06-14T15:30:00Z"
      }
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
    ```json
    {
      "error": "Unauthorized",
      "message": "Authentication required"
    }
    ```
  - 403 Forbidden: Not authorized to ignore the task
    ```json
    {
      "error": "Forbidden",
      "message": "You don't have permission to modify this task"
    }
    ```
  - 404 Not Found: Task not found
    ```json
    {
      "error": "Not found",
      "message": "Task not found"
    }
    ```
  - 409 Conflict: Task already processed
    ```json
    {
      "error": "Conflict",
      "message": "Cannot ignore a task that has already been executed or rejected",
      "status": "executed"
    }
    ```
- **Security**: JWT token required, RLS enforced

## 4. External Integrations

### OpenAI GPT API

- **Purpose**: Used for text enhancement, task detection, and semantic search
- **Implementation**:
  - Text enhancement: `/lib/api/ai.ts` (enhanceNoteWithAI function)
  - Task detection: Uses GPT API to parse natural language into structured task data
  - Semantic search: Generates embeddings for vector similarity search
- **Authentication**: Uses OPENAI_API_KEY environment variable
- **Models Used**:
  - GPT-4o-mini (default model for text enhancement)
  - GPT-4o (for complex task detection)
  - text-embedding-ada-002 (for generating embeddings)
- **Rate Limiting**:
  - Configured through AI_MAX_REQUESTS_PER_DAY environment variable
  - Default: 50 requests per day per user
  - Tracked in ai_usage table

### OpenAI Whisper API

- **Purpose**: Used for speech-to-text transcription of audio files
- **Implementation**: `/app/api/notes/audio/route.ts` and `/app/api/notes/[id]/transcribe/route.ts`
- **Authentication**: Uses OPENAI_API_KEY environment variable
- **Model Used**: whisper-1
- **Features**:
  - Supports chunking for large audio files (>25MB)
  - Implements fallback to direct fetch method if OpenAI client fails
  - Configurable temperature for accuracy/speed tradeoff
  - Special handling for short audio clips (fast track mode)
  - Hallucination detection and filtering

### Google APIs (Beta)

- **Purpose**: Used for calendar event creation and email tasks
- **Implementation**:
  - `/lib/services/google-auth.ts`: OAuth authentication
  - `/lib/services/google-calendar.ts`: Calendar event creation
  - `/lib/services/google-mail.ts`: Email preparation
- **Authentication**:
  - OAuth 2.0 flow with refresh tokens
  - Stored in service_connections table
  - User-granted scopes for specific services
- **Required Scopes**:
  - Calendar: `https://www.googleapis.com/auth/calendar`
  - Email: `https://www.googleapis.com/auth/gmail.compose`
- **Connection Status**: Service connection status checked before task execution

### Supabase

- **Authentication**: User authentication and session management
- **Database**: PostgreSQL database for data storage
- **Storage**: File storage for audio files
  - Audio notes stored in `/audio-notes/{user_id}/{filename}` bucket path
  - Public access controlled through signed URLs
- **Real-time**: Real-time subscriptions for immediate updates
  - Used for transcription status updates
- **Vector Database**: Uses pgvector extension for semantic search
  - Embeddings stored in notes table (VECTOR type)
  - Cosine similarity search via custom SQL function
- **Implementation**: Database client initialized in `/utils/supabase/server.ts` and `/utils/supabase/client.ts`
- **Authentication**: Uses SUPABASE_URL and SUPABASE_ANON_KEY environment variables

## 5. Database Schema (Supabase)

### Tables

#### profiles
- `id` (UUID, PK): References auth.users(id)
- `email` (TEXT): User's email
- `full_name` (TEXT): User's full name
- `avatar_url` (TEXT): URL to user's avatar
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- **Purpose**: Extends the auth.users table with additional profile data
- **Relationships**:
  - One-to-one with auth.users
  - One-to-many with notes, tasks, ai_usage, and service_connections

#### user_preferences
- `user_id` (UUID, PK): References profiles(id)
- `theme` (TEXT): UI theme preference ('light', 'dark', 'system')
- `notifications_enabled` (BOOLEAN): Whether notifications are enabled
- `ai_enhancement_enabled` (BOOLEAN): Whether AI enhancement is enabled
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- **Purpose**: Stores user-specific settings and preferences
- **Relationships**: One-to-one with profiles

#### notes
- `id` (UUID, PK): Note ID
- `user_id` (UUID): References auth.users(id)
- `content` (TEXT): Note content
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `type` (TEXT): Note type ('text', 'todo', 'voice')
- `is_ai_enhanced` (BOOLEAN): Whether the note was enhanced with AI
- `original_content` (TEXT): Original content before AI enhancement
- `metadata` (JSONB): Flexible metadata storage with the following structure:
  ```json
  {
    "is_audio_note": boolean,
    "audio_url": string,           // URL to audio file
    "filename": string,            // Storage filename
    "transcription_status": string, // "pending", "processing", "completed", "error"
    "processing_started_at": string, // ISO timestamp
    "processing_completed_at": string, // ISO timestamp
    "error_message": string,       // Error message if failed
    "task_detected": boolean,      // Whether a task was detected
    "task_id": string,             // Reference to detected task
    "task_type": string,           // Type of detected task
    "task_executed": boolean       // Whether task was executed
  }
  ```
- `is_deleted` (BOOLEAN): Soft delete flag
- `embedding` (VECTOR(1536)): Vector embedding for semantic search
- **Purpose**: Core storage for all user notes
- **Relationships**:
  - Many-to-one with profiles
  - One-to-many with todo_items
  - One-to-many with tasks
- **Indexes**:
  - `notes_user_id_idx`: Index on user_id for faster user-specific queries
  - `notes_type_idx`: Index on type for filtering by note type
  - `notes_embedding_idx`: Vector index for similarity search (IVFFlat with 100 lists)

#### todo_items
- `id` (UUID, PK): Todo item ID
- `note_id` (UUID): References notes(id)
- `content` (TEXT): Todo item content
- `is_completed` (BOOLEAN): Whether the todo is completed
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `position` (INTEGER): For ordering todos within a note
- **Purpose**: Stores individual todo items for todo-type notes
- **Relationships**: Many-to-one with notes
- **Indexes**: `todo_items_note_id_idx`: Index on note_id for faster lookups

#### tasks
- `id` (UUID, PK): Task ID
- `user_id` (UUID): References profiles(id)
- `note_id` (UUID): References notes(id)
- `type` (TEXT): Task type ('calendar', 'email', 'reminder', 'other')
- `status` (TEXT): Task status ('detected', 'suggested', 'approved', 'executed', 'failed', 'rejected')
- `details` (JSONB): Flexible task details storage with the following structure:
  ```json
  {
    "title": string,              // Task title
    "description": string,        // Task description
    "start_time": string,         // ISO timestamp for start time
    "end_time": string,           // ISO timestamp for end time
    "location": string,           // Location information
    "attendees": string[],        // List of attendee names
    "emails": string[],           // List of attendee emails
    "peopleWithEmails": [         // Structured people data
      {
        "name": string,
        "email": string
      }
    ],
    "execution_status": string,   // "pending", "in_progress", "completed", "error"
    "execution_error": string,    // Error message if failed
    "original_detection": {       // Original detection data
      "time": string,             // Original time string
      "people": string[]          // Original people mentions
    }
  }
  ```
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `executed_at` (TIMESTAMP): When the task was executed
- `external_id` (TEXT): Reference to external system (e.g., Google Calendar event ID)
- `execution_status` (TEXT): Top-level execution status for easier querying
- **Purpose**: Stores tasks detected and executed from note content
- **Relationships**:
  - Many-to-one with profiles
  - Many-to-one with notes
- **Indexes**:
  - `tasks_user_id_idx`: Index on user_id
  - `tasks_status_idx`: Index on status
  - `tasks_execution_status_idx`: Index on execution_status

#### ai_usage
- `id` (UUID, PK): Usage record ID
- `user_id` (UUID): References profiles(id)
- `feature` (TEXT): AI feature used ('text_enhancement', 'task_detection', 'embedding', 'transcription', 'transcription_enhancement')
- `created_at` (TIMESTAMP): Usage timestamp
- `request_size` (INTEGER): Size of request in tokens or bytes
- `response_size` (INTEGER): Size of response in tokens or bytes
- `successful` (BOOLEAN): Whether the request was successful
- `metadata` (JSONB): Additional info with the following structure:
  ```json
  {
    "model": string,      // AI model used
    "duration_ms": number, // Processing time in milliseconds
    "error": string       // Error details if unsuccessful
  }
  ```
- **Purpose**: Tracks AI feature usage for limiting and analytics
- **Relationships**: Many-to-one with profiles
- **Indexes**: `ai_usage_user_id_feature_idx`: Compound index on user_id and feature

#### user_subscriptions
- `id` (UUID, PK): Subscription ID
- `user_id` (UUID): References profiles(id)
- `is_premium` (BOOLEAN): Whether user has premium access
- `subscription_type` (TEXT): Type of subscription
- `started_at` (TIMESTAMP): Subscription start date
- `expires_at` (TIMESTAMP): Subscription expiration date
- `is_active` (BOOLEAN): Whether subscription is active
- `payment_provider` (TEXT): Payment provider
- `payment_id` (TEXT): Payment ID
- `metadata` (JSONB): Additional metadata
- **Purpose**: Manages user subscription status for premium features
- **Relationships**: One-to-one with profiles
- **Indexes**: `user_subscriptions_user_id_idx`: Index on user_id

#### service_connections
- `id` (UUID, PK): Connection ID
- `user_id` (UUID): References profiles(id)
- `service` (TEXT): Service type ('calendar', 'email', etc.)
- `provider` (TEXT): Provider ('google', 'microsoft', etc.)
- `access_token` (TEXT): OAuth access token
- `refresh_token` (TEXT): OAuth refresh token
- `expires_at` (TIMESTAMP): Token expiration timestamp
- `scopes` (TEXT[]): Array of authorized scopes
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp
- `is_active` (BOOLEAN): Whether connection is active
- `metadata` (JSONB): Additional metadata with the following structure:
  ```json
  {
    "email": string,           // Connected account email
    "profile_image": string,   // Profile image URL
    "last_used": string,       // ISO timestamp
    "usage_count": number,     // Number of times used
    "last_error": string       // Last error encountered
  }
  ```
- **Purpose**: Stores OAuth connections to external services
- **Relationships**: Many-to-one with profiles
- **Constraints**: UNIQUE(user_id, service, provider, is_active)
- **Indexes**: `service_connections_user_service_idx`: Compound index on user_id and service

### Database Functions

#### search_notes
- **Purpose**: Finds notes by vector similarity
- **Parameters**:
  - `query_embedding` (VECTOR): The embedding vector to search against
  - `match_threshold` (FLOAT): Minimum similarity threshold (0.0-1.0)
  - `match_count` (INT): Maximum number of results to return
  - `user_id` (UUID): User ID to restrict search to
- **Returns**: Table of note records with similarity scores
- **Implementation**:
  ```sql
  SELECT
    notes.id, notes.content, notes.user_id, notes.created_at,
    notes.updated_at, notes.type, notes.is_ai_enhanced,
    notes.original_content, notes.is_deleted,
    1 - (notes.embedding <=> query_embedding) AS similarity
  FROM notes
  WHERE 
    notes.user_id = search_notes.user_id
    AND notes.is_deleted = false
    AND notes.embedding IS NOT NULL
    AND (1 - (notes.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
  ```

#### update_updated_at_column
- **Purpose**: Trigger function to update timestamps automatically
- **Implementation**: Sets NEW.updated_at to current timestamp
- **Usage**: Attached as BEFORE UPDATE trigger on multiple tables

#### handle_new_user
- **Purpose**: Creates profile and preferences for new users
- **Implementation**: 
  - Inserts record into profiles using auth.users data
  - Inserts default preferences record
- **Usage**: Attached as AFTER INSERT trigger on auth.users

### Row Level Security (RLS) Policies

#### profiles_policy
- **Purpose**: Ensures users can only access their own profile
- **Policy**: `auth.uid() = id`

#### user_preferences_policy
- **Purpose**: Ensures users can only access their own preferences
- **Policy**: `auth.uid() = user_id`

#### notes_policy
- **Purpose**: Ensures users can only access their own notes
- **Policy**: `auth.uid() = user_id`

#### todo_items_policy
- **Purpose**: Ensures users can only access todo items from their own notes
- **Policy**: `note_id IN (SELECT id FROM public.notes WHERE user_id = auth.uid())`

#### tasks_policy
- **Purpose**: Ensures users can only access their own tasks
- **Policy**: `auth.uid() = user_id`

#### ai_usage_policy
- **Purpose**: Ensures users can only access their own AI usage records
- **Policy**: `auth.uid() = user_id`

#### user_subscriptions_policy
- **Purpose**: Ensures users can only access their own subscription data
- **Policy**: `auth.uid() = user_id`

#### service_connections_policy
- **Purpose**: Ensures users can only access their own service connections
- **Policy**: `auth.uid() = user_id`

## 6. AI Prompts Documentation

### Text Enhancement Prompt
```
You are Savie's professional writing assistant. Your task is to improve the text while preserving the original meaning and voice.

Focus on these specific improvements:
1. Fix grammar, spelling, and punctuation errors
2. Improve clarity by restructuring confusing sentences
3. Make the text more concise without losing important information
4. Enhance formality and professionalism where appropriate
5. Maintain the original tone, voice, and personality
6. Preserve all original formatting (lists, paragraphs, bullet points, etc.)

Important: Output ONLY the improved text without explanations, comments, or metadata.
```

### Transcription Enhancement Prompt
```
You are Savie's professional transcription editor. Your task is to improve the raw transcription of an audio recording while preserving the original meaning. This is speech-to-text that needs to be properly formatted.

Focus on these specific improvements:
1. Add proper paragraphs where appropriate, based on natural topic breaks
2. Fix grammar, spelling, punctuation, and capitalization errors
3. Remove filler words and repetitions that don't add meaning (um, uh, like, you know, etc.)
4. If speakers are detected, add appropriate speaker markers like "Speaker 1:" and "Speaker 2:"
5. Format lists as proper numbered or bulleted lists when detected
6. Keep the overall structure concise and readable

The goal is to make the transcription clean, properly formatted, and easier to read than the raw transcription, while preserving the complete meaning of the original recording.

Important: Output ONLY the improved text without explanations, comments, or metadata.
```

### Task Detection Prompt (part of Input-to-Execution feature, beta)
```
You are Savie's task detection assistant. Your job is to analyze note content and identify actionable tasks that the user might want to execute.

Focus on detecting these types of tasks:
1. Calendar events - meetings, appointments, calls, etc.
2. Email tasks - messages that need to be sent to specific people
3. Reminders - things the user needs to remember at a specific time
4. Review tasks - items that need to be reviewed or checked later

For each detected task, extract the following information:
- Task type (calendar, email, reminder, review)
- Title or subject
- Time and date information 
- People involved
- Location (if any)
- Any other relevant details

Format your response as a structured JSON object with these fields.

Example for calendar event:
{
  "detected": true,
  "type": "calendar",
  "title": "Team Meeting",
  "time": "tomorrow at 2pm",
  "people": ["John", "Sarah"],
  "location": "Conference Room B",
  "details": "Discuss Q3 planning"
}

Only detect clear, actionable tasks. If no task is detected, respond with:
{
  "detected": false
}

Important: Return ONLY the JSON object without any additional text.
```

### Date-Time Parsing Prompt (for calendar events)
```
You are Savie's date-time parsing assistant. Your job is to extract and interpret time expressions from natural language text.

Given a text that contains a time reference like "tomorrow at 3pm" or "next Monday at 10am", convert this to:
1. An ISO 8601 formatted date-time string
2. A structured object with date components
3. A human-readable interpretation

The current timestamp is: {{CURRENT_TIMESTAMP}}

Format your response as a JSON object with these fields:
{
  "parsed": true,
  "iso": "YYYY-MM-DDTHH:MM:SS.sssZ",
  "components": {
    "year": 2023,
    "month": 6,
    "day": 15,
    "hour": 15,
    "minute": 0,
    "second": 0
  },
  "interpretation": "June 15, 2023 at 3:00 PM",
  "original": "tomorrow at 3pm"
}

If you cannot parse the time expression, respond with:
{
  "parsed": false,
  "reason": "No time expression found" 
}

Important: Return ONLY the JSON object without any additional text.
```

### People/Attendee Extraction Prompt
```
You are Savie's attendee extraction assistant. Your job is to identify people mentioned in a text who might be attendees for a meeting or event.

Given a text like "Let's schedule a meeting with John, Sarah from Marketing, and Dr. Thompson", extract:
1. All people mentioned by name
2. Any organizational details (like departments, titles, or companies)

Format your response as a JSON object with these fields:
{
  "attendees": [
    {
      "name": "John",
      "details": null
    },
    {
      "name": "Sarah",
      "details": "Marketing"
    },
    {
      "name": "Dr. Thompson",
      "details": null
    }
  ]
}

If no attendees are detected, respond with:
{
  "attendees": []
}

Important: Return ONLY the JSON object without any additional text.
```

## 7. Integration with Flutter Mobile App

The backend APIs are designed to be compatible with Flutter-based mobile clients through the following considerations:

### Authentication Flow

- Use Supabase's cross-platform authentication library
- JWT tokens for API request authorization
- Shared token storage between web and mobile

### API Endpoint Design

- RESTful conventions for consistent access patterns
- JSON request/response format for cross-platform compatibility
- Structured error responses for reliable error handling

### File Handling

- Direct file uploads for audio recordings
- Support for mobile audio formats (m4a, aac)
- Streaming transcription updates via polling status endpoint

### Offline Support Considerations

- Unique IDs for offline-created content
- Timestamp tracking for conflict resolution
- Status tracking for async operations

### Flutter Integration Points

- Supabase Flutter SDK for database and authentication
- HTTP client for API endpoints
- Audio recording and file management
- Real-time updates for collaborative features

### Mobile-Specific Optimizations

- Pagination support for resource-constrained devices
- Bandwidth-efficient response formats
- Background processing support with notification callbacks 

## Flutter Integration Guide

### Integration Architecture

The Flutter mobile app will connect to the backend through RESTful API endpoints, authenticated with JWT tokens provided by Supabase. The main integration points are:

```
┌─────────────────┐       ┌──────────────────┐      ┌──────────────────┐
│                 │       │                  │      │                  │
│  Flutter App    │◄────►│  Node.js Backend  │◄────►│  External APIs   │
│                 │       │                  │      │  (OpenAI, etc.)  │
└─────────────────┘       └──────────────────┘      └──────────────────┘
                                   ▲
                                   │
                                   ▼
                           ┌──────────────────┐
                           │                  │
                           │    Supabase      │
                           │    (Database)    │
                           │                  │
                           └──────────────────┘
```

### Mobile-Specific Authentication Flow

1. **Login**: The Flutter app authenticates through Supabase using PKCE auth flow
2. **Token Storage**: Store JWT securely using Flutter Secure Storage
3. **API Authorization**: Include JWT in all API requests as a Bearer token

```dart
// Required dependencies
// supabase_flutter: ^1.10.9
// flutter_secure_storage: ^8.0.0

// PKCE auth flow initialization
await Supabase.initialize(
  url: 'https://your-supabase-url.supabase.co',
  anonKey: 'your-anon-key',
  authFlowType: AuthFlowType.pkce, // Mobile-specific auth flow
);

// Access client anywhere in your app
final supabase = Supabase.instance.client;
```

### Key Mobile Integration Points

#### 1. Audio Recording & Transcription

Flutter apps should:
1. Record audio using native plugins (e.g., `record: ^4.4.4`)
2. Upload audio to `/api/notes/audio` as multipart form data
3. Process the returned transcription and note ID

```dart
// Sample multipart upload implementation
Future<Map<String, dynamic>> uploadAudio(File audioFile) async {
  final request = http.MultipartRequest(
    'POST',
    Uri.parse('$apiBaseUrl/api/notes/audio'),
  );
  
  request.headers['Authorization'] = 'Bearer ${supabase.auth.currentSession?.accessToken}';
  request.files.add(await http.MultipartFile.fromPath('file', audioFile.path));
  request.fields['enhanceWithAI'] = 'true';
  
  final response = await request.send();
  final responseData = await response.stream.bytesToString();
  return jsonDecode(responseData);
}
```

#### 2. Handling AI Rate Limits

The backend implements rate limiting for AI features. Mobile apps should:
1. Track usage counts locally
2. Handle 429 responses gracefully
3. Show appropriate UI messaging for rate limits

#### 3. Offline Support Strategy

Flutter apps should implement:
1. Local storage for notes (e.g., using Hive or SQLite)
2. Background sync when connectivity is restored
3. Conflict resolution for edited notes

#### 4. Error Handling for Mobile

Common error patterns to handle:
- 401: Redirect to login screen and clear credentials
- 424: Prompt to connect required service (e.g., Google)
- 429: Show rate limit message with retry option
- Network errors: Queue operations for later retry

#### 5. Permission Requirements

The Flutter app requires these permissions:
- Microphone: For voice recording
- Internet: For API communication
- Storage: For temporary file storage

### Testing the Integration

Before releasing, test:
1. Authentication flow with app backgrounding/foregrounding
2. Audio recording on different Android and iOS devices
3. Transcription of recordings at different lengths
4. Offline creation and syncing when connection is restored
5. AI enhancement with poor network conditions

### Mobile AI Integration

#### OpenAI Integration Details

The backend handles all OpenAI API calls, so mobile developers don't need to include OpenAI keys in the app. However, understanding the AI workflow is important:

1. **Text Enhancement**
   - The backend uses GPT-4 for enhancing text notes
   - Enhancement preserves original meaning while improving clarity
   - The mobile app should indicate when enhancement is in progress
   - Consider allowing users to toggle enhancement on/off

2. **Task Extraction**
   - Tasks are extracted from note content using AI
   - The mobile app should display extracted tasks with confirmation UI
   - Users should be able to accept/reject extracted tasks
   - Task types include: calendar events, reminders, emails

3. **Audio Transcription**
   - Transcription uses OpenAI Whisper model
   - The backend handles chunking for long audio files
   - Mobile apps should show progress indicators for long files
   - Audio files are processed on the server, not stored long-term

#### Usage Tracking and Rate Limits

- Each user has daily limits for AI features (configurable per environment)
- Default limits:
  - 50 transcriptions per day
  - 100 text enhancements per day
  - 100 task extractions per day
- Mobile apps should track usage locally to provide accurate UI feedback

```dart
// Sample rate limit tracking in mobile app
class AIUsageTracker {
  final _prefs = SharedPreferences.getInstance();
  
  Future<bool> canUseAIFeature(String feature) async {
    final prefs = await _prefs;
    final usageCountKey = 'ai_usage_${feature}_${DateFormat('yyyy-MM-dd').format(DateTime.now())}';
    final usageCount = prefs.getInt(usageCountKey) ?? 0;
    final maxUsage = prefs.getInt('ai_max_usage_$feature') ?? 50;
    
    return usageCount < maxUsage;
  }
  
  Future<void> trackUsage(String feature) async {
    final prefs = await _prefs;
    final usageCountKey = 'ai_usage_${feature}_${DateFormat('yyyy-MM-dd').format(DateTime.now())}';
    final usageCount = prefs.getInt(usageCountKey) ?? 0;
    
    await prefs.setInt(usageCountKey, usageCount + 1);
  }
}
```

### Task Execution Workflow (Beta)

Task execution is a beta feature that requires careful implementation:

#### Task Execution Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│            │     │            │     │            │     │            │     │            │
│  Extract   │────►│  Display   │────►│  Confirm   │────►│  Execute   │────►│  Update    │
│  Tasks     │     │  Tasks     │     │  Tasks     │     │  Tasks     │     │  Status    │
│            │     │            │     │            │     │            │     │            │
└────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘
```

#### Mobile Implementation Guidelines

1. **Displaying Extracted Tasks**
   - Show tasks with appropriate icons based on task type
   - Display key details (time, location, participants)
   - Allow editing of task details before execution
   - Provide clear UI to distinguish between different task types

2. **Task Confirmation UI**
   - Confirm with users before executing tasks
   - Example confirmation dialog:

```dart
void showTaskConfirmation(Task task) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Execute Task?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Type: ${task.type}'),
          Text('Title: ${task.title}'),
          if (task.type == 'calendar')
            Text('Time: ${DateFormat('MMM d, h:mm a').format(DateTime.parse(task.details['start_time']))}'),
          if (task.people.isNotEmpty)
            Text('People: ${task.people.join(", ")}'),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            executeTask(task.id);
            Navigator.pop(context);
          },
          child: Text('Execute'),
        ),
      ],
    ),
  );
}
```

3. **Handling Service Connections**
   - Tasks requiring external services (like Google Calendar) need OAuth authentication
   - Direct users to connect their accounts when needed
   - The backend handles the OAuth flow, the mobile app just needs to open the provided URL

4. **Failure Handling**
   - Show appropriate error messages for failed task executions
   - Provide retry options for tasks that can be retried
   - Store task history for user reference

### Voice Notes Workflow

The voice note creation workflow is a key feature for mobile users:

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│            │     │            │     │            │     │            │     │            │
│  Record    │────►│  Upload    │────►│ Transcribe │────►│  Enhance   │────►│  Extract   │
│  Audio     │     │  Audio     │     │  Audio     │     │  Text      │     │  Tasks     │
│            │     │            │     │            │     │            │     │            │
└────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘
```

#### Key Implementation Points:

1. **Recording Interface**
   - Provide visual feedback during recording (waveform visualization recommended)
   - Show recording duration
   - Allow playback review before uploading

2. **Processing States**
   - Implement clear UI states for:
     - Recording in progress
     - Processing audio (uploading/transcribing)
     - Enhancing text
     - Extracting tasks
   - Show appropriate progress indicators for each state

3. **Optimizing for Mobile**
   - Use M4A format for audio with appropriate compression
   - Consider chunking long recordings client-side
   - Implement upload retry logic for unreliable connections

```dart
// Sample recording implementation
class AudioRecorder {
  final record = Record();
  String? _path;
  
  Future<bool> hasPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }
  
  Future<void> startRecording() async {
    if (await hasPermission()) {
      final dir = await getTemporaryDirectory();
      _path = '${dir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';
      
      await record.start(
        path: _path,
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        samplingRate: 44100,
      );
    }
  }
  
  Future<String?> stopRecording() async {
    final path = await record.stop();
    return path;
  }
}
```

### Mobile Error Handling

The mobile app should implement robust error handling to provide a good user experience even when things go wrong. Here's a comprehensive approach to error handling:

#### Error Types to Handle

1. **Authentication Errors**
   - Invalid credentials
   - Expired tokens
   - Unauthorized access

2. **Network Errors**
   - No connectivity
   - Request timeouts
   - Server unavailable

3. **AI Processing Errors**
   - Rate limits exceeded
   - Processing failures
   - Invalid input format

4. **Service Integration Errors**
   - Missing service connection
   - Permission denied by service
   - Service API limitations

#### Error Handling Implementation

```dart
// Comprehensive error handler for mobile
class ApiErrorHandler {
  static void handleError(dynamic error, BuildContext context) {
    // Log all errors for analytics
    logError(error);
    
    if (error is DioError) {
      // Handle HTTP errors
      final statusCode = error.response?.statusCode;
      final errorData = error.response?.data;
      
      switch(statusCode) {
        case 401:
          // Auth error - redirect to login
          _handleAuthError(context);
          break;
        case 424:
          // Service dependency error
          _handleServiceDependencyError(errorData, context);
          break;
        case 429:
          // Rate limiting
          _showRateLimitError(errorData, context);
          break;
        case 413:
          // File too large
          _showFileTooLargeError(context);
          break;
        case 400:
          // Bad request - show specific message
          _showErrorMessage(errorData['message'] ?? 'Invalid request', context);
          break;
        case 500:
        case 502:
        case 503:
          // Server errors
          _showServerError(context);
          break;
        default:
          // General error
          _showGeneralError(context);
      }
    } else if (error is SocketException || error is TimeoutException) {
      // Network connectivity issues
      _showNetworkError(context);
    } else {
      // Unknown/unexpected errors
      _showGeneralError(context);
    }
  }
  
  // Implementation of specific error handlers...
}
```

#### Offline Error Recovery

For offline scenarios, implement these recovery strategies:

1. **Queue operations when offline**
   - Store pending operations in local database
   - Attempt to replay when connection is restored
   - Track sync status for UI feedback

2. **Graceful degradation**
   - Allow viewing cached content when offline
   - Disable AI-dependent features when offline
   - Provide clear UI indicators for offline mode

3. **Background sync**
   - Implement background sync when app is in background
   - Notify users when sync completes
   - Handle sync conflicts with user-friendly resolution

### Required Flutter Dependencies

For successful integration with the Savie backend, include these dependencies in your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Supabase Authentication & Database
  supabase_flutter: ^1.10.9
  
  # Networking
  dio: ^5.3.2         # HTTP client with interceptors
  connectivity_plus: ^4.0.2  # Network connectivity detection
  
  # Audio Recording & Playback
  record: ^4.4.4      # Audio recording
  just_audio: ^0.9.34 # Audio playback
  
  # Storage
  path_provider: ^2.1.1        # File system access
  flutter_secure_storage: ^8.0.0 # Secure token storage
  hive: ^2.2.3                 # Local database
  hive_flutter: ^1.1.0         # Hive Flutter integration
  
  # Utilities
  intl: ^0.18.1        # Date formatting
  uuid: ^3.0.7         # UUID generation
  flutter_dotenv: ^5.1.0 # Environment configuration
  
  # Permissions
  permission_handler: ^10.4.3  # Permission management
  
  # UI Components
  flutter_markdown: ^0.6.17     # Markdown rendering
  
  # State Management (choose one)
  provider: ^6.0.5            # Provider pattern
  # OR
  # flutter_bloc: ^8.1.3     # BLoC pattern
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.6      # Code generation
  hive_generator: ^2.0.0    # Hive model generation
  flutter_lints: ^2.0.3     # Linting rules
```

### Mobile Implementation Checklist

Before finalizing your integration, ensure you have implemented:

✅ **Authentication**
- PKCE auth flow with Supabase
- Secure token storage
- Token refresh handling
- Login/registration screens

✅ **Note Management**
- Create, read, update, delete notes
- Offline support with local database
- Background sync
- Search functionality

✅ **Voice Notes**
- Audio recording with permissions
- Audio upload with progress indicator
- Transcription display
- Error handling for failed transcriptions

✅ **Task Management**
- Display extracted tasks
- Task confirmation UI
- Task execution with service connections
- Task status tracking

✅ **Error Handling**
- Comprehensive error handling for all API calls
- Offline mode support
- User-friendly error messages
- Retry mechanisms for transient errors

✅ **Performance Optimization**
- Efficient image loading
- Pagination for note lists
- Caching of frequently accessed data
- Background processing for heavy operations

### Implementing Context-Aware Search in Mobile

The Savie backend provides powerful semantic search capabilities that go beyond keyword matching. Here's how to implement it in the Flutter app:

#### Search API Endpoint

**Endpoint**: `/api/search`  
**Method**: GET  
**Parameters**: 
- `q`: The search query text  
- `limit` (optional): Maximum results to return (default: 20)  
- `offset` (optional): Pagination offset (default: 0)  

**Response**:
```json
{
  "results": [
    {
      "id": "note-uuid",
      "content": "Note content with highlighted matches",
      "created_at": "2023-10-15T12:34:56Z",
      "type": "text",
      "similarity": 0.89,
      "highlights": [{"start": 10, "end": 25}]
    }
  ],
  "total": 42,
  "type": "semantic"
}
```

#### How Semantic Search Works

1. **Vector Embeddings**: Notes are encoded as vector embeddings using OpenAI's embedding model
2. **Query Processing**: Search queries are similarly converted to embeddings
3. **Similarity Matching**: Results are found based on semantic similarity, not just keyword matches
4. **Fallback Mechanism**: If vector search fails, the system falls back to traditional text search

#### Mobile Implementation

```dart
class SearchService {
  final Dio _dio;
  final String _baseUrl;
  
  SearchService(this._dio, this._baseUrl);
  
  Future<SearchResults> search(String query, {int limit = 20, int offset = 0}) async {
    try {
      final response = await _dio.get(
        '$_baseUrl/api/search',
        queryParameters: {
          'q': query,
          'limit': limit,
          'offset': offset,
        },
      );
      
      return SearchResults.fromJson(response.data);
    } catch (e) {
      throw SearchException('Search failed: ${e.toString()}');
    }
  }
}

// Search result display with highlights
class SearchResultItem extends StatelessWidget {
  final SearchResult result;
  final String query;
  
  const SearchResultItem({Key? key, required this.result, required this.query}) 
    : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Display the note content with highlighted matches
            if (result.highlights.isNotEmpty)
              HighlightedText(
                text: result.content,
                highlights: result.highlights,
                highlightStyle: const TextStyle(
                  backgroundColor: Colors.yellow,
                  fontWeight: FontWeight.bold,
                ),
              )
            else
              Text(result.content),
            
            // Display metadata
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  DateFormat.yMMMd().format(result.createdAt),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const Spacer(),
                if (result.similarity != null)
                  // Show relevance score for semantic search
                  Text(
                    'Relevance: ${(result.similarity! * 100).toStringAsFixed(0)}%',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

#### Search UI Recommendations

1. **Real-time search**
   - Implement debounced search as user types
   - Show loading indicator during search
   - Provide clear empty state when no results found

2. **Search highlighting**
   - Highlight matched terms in results
   - Use the `highlights` array from API response
   - Consider semantic matches may not be exact keyword matches

3. **Search history**
   - Store recent searches locally
   - Allow users to quickly repeat previous searches
   - Implement clear search history option

4. **Search filters**
   - Allow filtering by note type (text, voice)
   - Support date range filtering
   - Consider supporting tag-based filtering if implemented

#### Search Performance Optimization

1. **Paginated loading**
   - Load initial results (15-20)
   - Implement infinite scrolling for more results
   - Cache search results for faster back navigation

2. **Offline search**
   - Implement local search on cached notes
   - Clearly indicate when showing offline results
   - Sync with backend search when online

3. **Connection-aware search**
   - Detect connection status before search
   - Fall back to local search when offline
   - Retry with online search when connection restored

### Google Services Integration for Mobile

The Input-to-Execution feature requires integration with external services like Google Calendar and Gmail. Here's how the integration works:

#### Google Authentication Flow

The backend handles OAuth authentication with Google. The mobile app only needs to:
1. Initiate the connection request
2. Open the provided URL in a browser
3. Handle the callback

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│             │          │             │          │             │          │             │
│  Mobile App │──(1)────►│  Backend    │──(2)────►│  Google     │──(3)────►│  Backend    │
│             │          │             │          │  OAuth      │          │             │
└──────┬──────┘          └──────┬──────┘          └─────────────┘          └──────┬──────┘
       │                        │                                                 │
       │                        │                                                 │
       │                        │                                                 │
       │                        │                                                 │
       │◄───(6)────────────────(5)◄───────────────────────────────────────────(4)┘
       │                        │
       │                        │
       ▼                        ▼
  Connect UI                Execute Tasks
  Updates                  using Google Services
```

1. Mobile app calls `/api/services/connect/google`
2. Backend generates OAuth URL with proper scopes
3. Mobile app opens URL (using browser or WebView)
4. User authorizes the app on Google's site
5. Google redirects to the backend callback URL
6. Backend stores tokens and notifies app of success

#### Token Storage and Management

The backend securely handles all Google OAuth tokens:

1. **Token Storage**:
   - Access and refresh tokens are stored in the `service_connections` table
   - All tokens are encrypted at rest in the database
   - Tokens are associated with the user account

2. **Token Refresh**:
   - The backend automatically refreshes tokens when they expire
   - Refresh tokens are rotated according to Google's policy
   - The mobile app never sees or handles the actual tokens

3. **Security**:
   - Tokens are never exposed to the frontend or mobile app
   - API requests requiring Google services authenticate via the user's JWT
   - The backend maps the user JWT to their stored Google tokens

#### Google Calendar Integration

For creating calendar events from extracted tasks:

1. **Calendar Event Creation Endpoint**:
   - **POST `/api/tasks/execute`** with task ID
   - Backend translates task data to Google Calendar format
   - Returns success/failure with event details

2. **Calendar Event Data**:
   - Events include title, description, start/end times
   - Location data if included in the task
   - Attendees with proper email formatting
   - Time zone handling based on user's settings

3. **Event Error Handling**:
   - `GOOGLE_NOT_CONNECTED`: User needs to connect Google account
   - `CALENDAR_PERMISSION_DENIED`: Insufficient permissions
   - `INVALID_ATTENDEE`: Problem with attendee email format
   - `SCHEDULING_CONFLICT`: Time slot conflicts with existing events

#### Gmail Integration

For creating email drafts from extracted tasks:

1. **Email Creation Endpoint**:
   - **POST `/api/tasks/execute`** with task ID
   - Backend creates email draft in user's Gmail account
   - Returns success/failure with draft details

2. **Email Data**:
   - Subject derived from task title
   - Body content from task details
   - Recipients from people mentioned in task
   - Optional attachments can be included

3. **Email Error Handling**:
   - `GOOGLE_NOT_CONNECTED`: User needs to connect Google account
   - `GMAIL_PERMISSION_DENIED`: Insufficient permissions
   - `INVALID_RECIPIENT`: Problem with email addresses
   - `DRAFT_CREATION_FAILED`: Failed to create draft

#### Mobile Implementation Guidelines

1. **Connection Status Check**:
   - Before allowing task execution, check connection status
   - **GET `/api/services`** returns connected services
   - Prompt user to connect if needed

```dart
Future<bool> isGoogleConnected() async {
  try {
    final response = await _dio.get('$_baseUrl/api/services');
    final services = response.data['services'] as List;
    
    return services.any((service) => 
      service['service'] == 'google' && service['connected'] == true);
  } catch (e) {
    return false;
  }
}
```

2. **Initiating Google Connection**:
   - Call connect endpoint and open resulting URL
   - Handle success/failure appropriately

```dart
Future<void> connectGoogle() async {
  try {
    final response = await _dio.post('$_baseUrl/api/services/connect/google');
    final url = response.data['redirectUrl'];
    
    // Open URL in browser or WebView
    await launchUrl(Uri.parse(url));
    
    // Show message to user about completing auth in browser
    _showConnectionInProgressDialog();
  } catch (e) {
    throw ServiceConnectionException('Failed to start Google connection: ${e.toString()}');
  }
}
```

3. **Handling Connection Callback**:
   - The backend handles the OAuth callback
   - Mobile app can poll connection status or wait for push notification
   - Update UI based on connection result

4. **Executing Tasks with Google Services**:
   - Before executing tasks, verify connection status
   - Provide appropriate feedback for connection errors
   - Show progress UI during service execution
   - Handle and display service-specific errors

#### Testing Google Integration

To test Google integration:

1. **Connection Flow**:
   - Test connecting from a freshly installed app
   - Test reconnecting after token expiration
   - Test connection with different Google accounts

2. **Calendar Events**:
   - Test creating events with different time formats
   - Test including attendees
   - Test handling conflicts

3. **Email Creation**:
   - Test creating drafts with various recipient combinations
   - Test email content formatting
   - Test handling of invalid email addresses

## Conclusion and Next Steps

### Summary

This documentation provides comprehensive guidelines for integrating the Flutter mobile app with the Savie backend. Key aspects covered include:

1. **Authentication**: Secure JWT-based authentication via Supabase with PKCE flow for mobile
2. **Note Management**: Creating, reading, updating, and deleting notes, with offline support
3. **Voice Notes**: Recording, uploading, and transcribing audio notes with AI enhancement
4. **Task Extraction**: Identifying and executing tasks from note content
5. **Search**: Implementing context-aware semantic search in the mobile app
6. **Error Handling**: Robust error handling strategies for different scenarios
7. **Performance**: Optimizations for mobile devices and network conditions

### Implementation Timeline Recommendation

For successful mobile integration, we recommend following this phased approach:

**Phase 1: Core Functionality (2-3 weeks)**
- Authentication and user management
- Basic note CRUD operations
- Offline mode and sync

**Phase 2: AI Integration (2-3 weeks)**
- Voice recording and transcription
- Text enhancement
- Search implementation

**Phase 3: Task Execution (3-4 weeks)**
- Task extraction UI
- Service connections (Google, etc.)
- Task execution workflows

**Phase 4: Polish and Optimization (2 weeks)**
- Performance improvements
- UI refinements
- Edge case handling

### Contact Information

For technical support during implementation, contact:

- Backend API Support: backend@savie-app.com
- Mobile Integration Support: mobile@savie-app.com
- Developer Documentation Updates: docs@savie-app.com

Regular sync meetings are recommended during integration to address any issues that arise.

### API Status and Versioning

The current API version is v1. All endpoints in this documentation are stable unless marked as beta. 

Future API changes will follow semantic versioning principles:
- **PATCH changes**: Backward compatible bug fixes
- **MINOR changes**: New functionality in a backward compatible manner
- **MAJOR changes**: Incompatible API changes (with advance notice)

All breaking changes will include a minimum 60-day deprecation period with dual support.

## Text Enhancement

The text enhancement feature utilizes OpenAI's GPT models to improve the quality of text notes and messages.

### Configuration

The AI enhancement feature can be configured through the following environment variables:

- **AI_ENHANCEMENT_ENABLED**: Enable/disable AI enhancement (default: true)
- **AI_MAX_REQUESTS_PER_DAY**: Maximum number of AI requests per user per day (default: 50)
- **AI_DEFAULT_MODEL**: OpenAI model to use for text enhancement (default: gpt-4o-mini)
- **AI_TASK_DETECTION_ENABLED**: Enable/disable task detection (default: true)
- **AI_TASK_DETECTION_MODEL**: OpenAI model to use for task detection (default: gpt-4o)

These settings can be adjusted without code changes to control feature availability, rate limits, and model selection. The system implements graceful fallbacks when variables are not set.

### Technical Details

- **Authentication**: Uses OPENAI_API_KEY environment variable
- **Rate Limiting**: Implemented to prevent excessive API usage
  - Configured through AI_MAX_REQUESTS_PER_DAY environment variable
  - Per-user, per-feature daily limits
  - Tracked in ai_usage table
- **Model Selection**: Configurable via AI_DEFAULT_MODEL
  - Default model is gpt-4o-mini for better cost efficiency
  - Context window handles notes up to 24,000 tokens

## Environment Configuration

The server now supports multiple environments through a flexible configuration system:

### Development vs Production

- **Development**: Uses `.env` file (default when running `npm run dev`)
- **Production**: Uses `.env.production` file (default when running `npm start`)

This is handled by the new `setup.js` file which loads the appropriate environment variables based on NODE_ENV.

### Required Environment Variables

```
# Supabase Configuration
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SUPABASE_DB_URL=
INVITE_ONLY=
REVIEWER_ACCOUNTS=

# OpenAI API
OPENAI_API_KEY=

# AI Feature Settings (all optional with defaults)
AI_ENHANCEMENT_ENABLED=true
AI_MAX_REQUESTS_PER_DAY=50
AI_DEFAULT_MODEL=gpt-4o-mini
AI_TASK_DETECTION_ENABLED=true
AI_TASK_DETECTION_MODEL=gpt-4o

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Mobile app URL scheme
MOBILE_APP_URL=savie://

# Testing configuration
API_URL=
TEST_AUTH_TOKEN=
```

## Deployment Instructions

### Heroku Deployment

1. Set environment variables in Heroku:
   ```bash
   heroku config:set SUPABASE_URL=your-value
   heroku config:set SUPABASE_SECRET_KEY=your-value
   # Add all other environment variables
   ```

2. Deploy using Git:
   ```bash
   git push heroku main
   ```

### Local Development

1. Clone the repository
2. Create a `.env` file with required variables
3. Install dependencies: `npm install`
4. Run in development mode: `npm run dev`
5. Run tests: `npm run test:api`

## Mobile Integration Notes

The backend architecture has been updated to support both web and mobile clients. Key changes:

1. Database schema adjusted to work with the `messages` table structure
2. Fixed references to use `text_content` instead of `content` for message data
3. Removed references to non-existent fields
4. Implemented environment-specific configuration for development/production
5. Updated OpenAI API calls to work with current models
6. Added comprehensive test suite for all endpoints