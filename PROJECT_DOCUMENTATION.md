# Savie Server Project Documentation

## Overview

Savie is a note-taking and task management application with both web and mobile interfaces. Currently, the primary focus is on the mobile application development, with the backend serving both platforms. The backend provides APIs for note management, task extraction, AI-powered text enhancement, authentication, and file handling.

## Repository Structure

### `savie-mobile-backend` (this repository)
- **Purpose**: Primary development environment for the mobile backend
- **Content**: Contains all current API routes, services, and utilities
- **Focus**: Mobile application backend services
- **Usage**: Active development, testing, and feature implementation

### Archive/Reference Repositories (not active development)
- `savie-server-backup`: Historical code snapshots for reference
- `savie-server-main`: Legacy repository with older versions

### `heroku-deploy`
- **Purpose**: Staging and production deployment files
- **Content**: Optimized and configured files for Heroku deployment
- **Usage**: Previous deployment mechanism (now deprecated)

## Workflow Processes

### Local Development

1. Make changes in the `savie-mobile-backend` directory
2. Test locally using:
   ```bash
   cd savie-mobile-backend
   npm run dev
   ```
3. Verify functionality before pushing to GitHub

### GitHub Workflow

1. Commit changes to appropriate branch:
   ```bash
   git add .
   git commit -m "Descriptive message about changes"
   ```
2. Push to GitHub:
   ```bash
   git push origin main
   ```
3. For new features, consider using feature branches:
   ```bash
   git checkout -b feature/new-feature
   # make changes
   git push origin feature/new-feature
   # create PR in GitHub
   ```

### Heroku Deployment

1. After GitHub changes are finalized, push directly to Heroku:
   ```bash
   # From savie-mobile-backend directory:
   git push heroku main
   ```
2. For full redeployment:
   ```bash
   git push -f heroku main
   ```

## Key Features

### Note Management
- Create, read, update, delete notes
- Support for Quill Delta format
- Rich text formatting

### AI Features
- Text enhancement (improves grammar, clarity)
- Speech-to-text transcription
- Task extraction from notes
- Date/time parsing
- Convert to To-Do list (transforms notes/voice messages into structured to-do lists)

### User Management
- Authentication
- User profiles
- Invite codes system

## API Endpoints Reference

### Text Enhancement
- **Endpoint**: POST `/ai/enhance`
- **Purpose**: Enhances text for clarity, grammar, structure
- **Request Format**:
  ```json
  {
    "content": {"ops": [...]},  // Delta object directly
    "format": "delta"           // Required when sending Delta objects
  }
  ```
  
  OR for plain text:
  ```json
  {
    "content": "Text to enhance",
    "format": "plain"           // Optional, defaults to plain
  }
  ```
  
- **Response Format**:
  ```json
  {
    "enhanced": "Enhanced text or delta object",
    "original": "Original text or delta object",
    "format": "plain" or "delta"
  }
  ```

### Speech-to-Text
- **Endpoint**: POST `/ai/transcribe`
- **Purpose**: Transcribes audio files to text
- **Request Format**: Multipart form with audio file

### Convert to To-Do
- **Endpoint**: POST `/ai/convert-to-todo`
- **Purpose**: Transforms note or voice message content into a structured to-do list
- **Request Format**:
  ```json
  {
    "content": "Your note content here",
    "format": "plain"  // or "delta" for Quill Delta format
  }
  ```
  
  OR using message_id:
  ```json
  {
    "message_id": "existing-message-id"
  }
  ```
  
- **Response Format**:
  ```json
  {
    "success": true,
    "tasks": [
      "Task 1",
      "Task 2",
      "Task 3"
    ],
    "regular_text": "Non-task content",
    "format": "plain"  // or "delta"
  }
  ```

## Frontend Integration

### Mobile Application Integration
- Mobile app consumes the backend APIs
- Uses JSON for data exchange
- Delta format for rich text

### JSON Formats
For text enhancement from mobile, ensure proper format:
```json
{
  "content": {"ops": [...]},  // Delta object directly
  "format": "delta"           // Required when sending Delta objects
}
```

## Environment Setup

1. Clone repository:
   ```bash
   git clone https://github.com/savieai/savie-server.git savie-mobile-backend
   ```

2. Install dependencies:
   ```bash
   cd savie-mobile-backend
   npm install
   ```

3. Set up environment variables (create `.env` file):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SECRET_KEY=your_supabase_key
   OPENAI_API_KEY=your_openai_key
   ```

4. Run the server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Common Issues

1. **400/500 errors on text enhancement**:
   - Check JSON format for proper structure
   - Ensure Delta format is properly sent as an object when using "format": "delta"
   - Verify content is not empty

2. **Authentication Issues**:
   - Check token expiry
   - Verify Supabase configuration

3. **Deployment Issues**:
   - Ensure environment variables are set in Heroku
   - Check logs with `heroku logs --tail` 