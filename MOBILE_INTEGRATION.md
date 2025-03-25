# Savie Mobile Backend Integration

This document tracks the integration of AI and Google services from the web backend into the mobile backend.

## Overview

We've expanded the mobile backend with the following features:
- AI text enhancement
- Task extraction from notes
- Audio transcription
- Vector-based semantic search
- Date/time parsing
- Attendee extraction
- Google service integration (Calendar and Email)
- Task execution through Google services

## 1. Database Schema Updates

The following tables were added to the Supabase database:

```sql
-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS enhanced_with_ai BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tasks_extracted BOOLEAN DEFAULT FALSE;

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'calendar', 'email', 'reminder'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  people TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  external_id TEXT, -- For Google Calendar event ID or similar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Google service connections table
CREATE TABLE IF NOT EXISTS service_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  scope TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'enhance', 'extract_tasks', 'transcribe', 'search'
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stored function for vector search
CREATE OR REPLACE FUNCTION search_notes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  type text,
  is_ai_enhanced boolean,
  original_content text,
  is_deleted boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
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
END;
$$;
```

## 2. New API Endpoints

### AI Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/ai/enhance` | POST | Enhances text with AI | `{ "content": "Text to enhance" }` | `{ "enhanced": "Enhanced text", "original": "Original text" }` |
| `/api/ai/extract-tasks` | POST | Extracts tasks from text | `{ "content": "Text with tasks", "message_id": "optional_id" }` | `{ "tasks": [{...}] }` |
| `/api/ai/transcribe` | POST | Transcribes audio to text | Multipart form with `file` field | `{ "transcription": "Text" }` |
| `/api/ai/parse-datetime` | POST | Parses date/time from text | `{ "text": "tomorrow at 3pm" }` | `{ "parsed": true, "iso": "2023-06-15T15:00:00Z", ... }` |
| `/api/ai/extract-attendees` | POST | Extracts people from text | `{ "text": "Meet with John" }` | `{ "attendees": [{"name": "John"}] }` |

### Search Endpoint

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/search` | GET | Semantic vector search | `?q=search term` | `{ "results": [...], "type": "semantic" }` |

### Google Integration Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/services/connect/google` | GET | Initiates Google OAuth | - | `{ "redirectUrl": "https://..." }` |
| `/api/services/callback/google` | GET | OAuth callback | `?code=...` | Redirects to app |
| `/api/services` | GET | Lists connected services | - | `{ "services": [{...}] }` |

### Task Management Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/api/tasks` | GET | Lists user's tasks | Query params: `status`, `message_id` | `{ "tasks": [{...}] }` |
| `/api/tasks/:id/execute` | POST | Executes a task | - | `{ "status": "success", "details": {...} }` |

## 3. Project Structure

New files and directories added:

```
src/
  ├── ai/
  │   ├── index.js               # Export AI routes
  │   ├── openai.js              # OpenAI client setup
  │   ├── textEnhancement.js     # Text enhancement implementation
  │   ├── taskExtraction.js      # Task extraction implementation
  │   ├── transcription.js       # Audio transcription
  │   ├── parseDatetime.js       # Date/time parsing implementation
  │   ├── extractAttendees.js    # Attendee extraction implementation
  │   ├── vectorSearch.js        # Semantic search implementation
  │   └── aiRoutes.js            # AI endpoints
  ├── search/
  │   ├── index.js               # Export search routes
  │   └── searchRoutes.js        # Search API endpoints
  ├── services/
  │   ├── index.js               # Export service routes
  │   ├── google-auth.js         # Google OAuth implementation
  │   └── serviceRoutes.js       # Service endpoints
  └── tasks/
      ├── index.js               # Export task routes
      └── taskRoutes.js          # Task endpoints
```

Updated files:
- `src/routes.js` - Added new route handlers

## 4. Environment Variables

We support both development (.env) and production (.env.production) environments. Environment variables required:

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

## 5. Dependencies

Added NPM packages:
- `openai` - For OpenAI API integration
- `googleapis` - For Google API integration
- `jsonwebtoken` - For token handling
- `multer` - For file uploads (audio transcription)

## 6. Rate Limiting

Rate limits implemented (configurable via the `AI_MAX_REQUESTS_PER_DAY` environment variable):
- Text enhancement: Default 50 requests per day per user
- Task extraction: Default 50 requests per day per user
- Audio transcription: Default 50 requests per day per user
- Search: Default 50 requests per day per user
- Date/time parsing: Default 50 requests per day per user
- Attendee extraction: Default 50 requests per day per user

These limits can be adjusted by changing the `AI_MAX_REQUESTS_PER_DAY` environment variable. If not specified, each feature falls back to its own default limit.

## 7. Testing

To test the integration, you can use Postman or similar API testing tools.

### Testing with Postman

1. **Set up environment variables**:
   - `base_url`: Your backend URL (e.g., http://localhost:3000)
   - `auth_token`: JWT token obtained from Supabase

2. **Create a collection with the following requests**:

#### Authentication:
- Login: `POST {{base_url}}/auth/login`
  - Body: `{ "email": "test@example.com", "password": "password" }`
  - Save `access_token` from response

#### AI Features:
- Enhance Text: `POST {{base_url}}/api/ai/enhance`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Body: `{ "content": "This is a test text that needs improvement." }`

- Extract Tasks: `POST {{base_url}}/api/ai/extract-tasks`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Body: `{ "content": "Meet John tomorrow at 3pm to discuss the proposal." }`

- Parse DateTime: `POST {{base_url}}/api/ai/parse-datetime`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Body: `{ "text": "tomorrow at 3pm", "timezone": "America/New_York" }`

- Extract Attendees: `POST {{base_url}}/api/ai/extract-attendees`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Body: `{ "text": "Schedule a meeting with John from Marketing and Sarah." }`

- Transcribe Audio: `POST {{base_url}}/api/ai/transcribe`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Body: FormData with `file` field containing audio

#### Search:
- Semantic Search: `GET {{base_url}}/api/search?q=meeting notes`
  - Headers: `Authorization: Bearer {{auth_token}}`

#### Google Integration:
- Connect Google: `GET {{base_url}}/api/services/connect/google`
  - Headers: `Authorization: Bearer {{auth_token}}`
  - Copy the `redirectUrl` from the response and open in a browser

- Get Connected Services: `GET {{base_url}}/api/services`
  - Headers: `Authorization: Bearer {{auth_token}}`

#### Tasks:
- Get Tasks: `GET {{base_url}}/api/tasks`
  - Headers: `Authorization: Bearer {{auth_token}}`

## 8. Deployment

### Heroku Deployment

1. Create a new Heroku app or use an existing one
2. Set up environment variables in Heroku:
   ```bash
   heroku config:set SUPABASE_URL=your-value
   heroku config:set SUPABASE_SECRET_KEY=your-value
   # Add all other environment variables
   ```
3. Deploy using Git:
   ```bash
   git push heroku main
   ```

### Environment Configuration

The app uses different environment files based on NODE_ENV:
- Development: .env
- Production: .env.production

## 9. Google OAuth Configuration

For Google integration to work properly, set up your Google Cloud project with these redirect URIs:
- Development: `http://localhost:3000/api/auth/connect/google/callback`
- Production: `https://your-heroku-app.herokuapp.com/api/auth/connect/google/callback`
- Mobile App: `savie://auth/callback`

## 10. Mobile App Integration

Your mobile frontend developers should:
1. Implement JWT-based authentication
2. Handle the custom URL scheme (`savie://`) for OAuth callbacks
3. Implement API calls for the endpoints listed in Section 2
4. Handle file uploads for audio transcription
5. Implement proper error handling and rate limit feedback

## 11. Changes Made During Integration

During the integration process, we made several important adjustments:
1. Fixed database column references (using `text_content` instead of `content` for messages)
2. Removed references to non-existent fields
3. Adjusted OpenAI API calls to work with the specific models
4. Created a flexible environment configuration system

## 12. Changelog

**2023-06-24**
- Initial integration of AI features from web backend
- Added Google service integration
- Created task management system
- Added documentation

**2023-06-25**
- Added vector search functionality
- Implemented date/time parsing endpoint
- Added attendee extraction endpoint
- Updated documentation with testing instructions
- Added environment variable requirements

**2025-03-25**
- Updated AI feature implementation to use configurable environment variables
- Added AI_ENHANCEMENT_ENABLED, AI_MAX_REQUESTS_PER_DAY, AI_DEFAULT_MODEL settings
- Added AI_TASK_DETECTION_ENABLED and AI_TASK_DETECTION_MODEL settings
- Improved rate limiting with configurable thresholds
- Added testing configuration variables
- Added environment-specific configuration
- Updated deployment documentation
- Added Heroku-specific configuration

---

*Last updated: March 25, 2025* 