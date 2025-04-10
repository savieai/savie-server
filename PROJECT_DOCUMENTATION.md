# Savie Server Project Documentation

## Overview

Savie is a note-taking and task management application with both web and mobile interfaces. Currently, the primary focus is on the mobile application development, with the backend serving both platforms. The backend provides APIs for note management, task extraction, AI-powered text enhancement, authentication, and file handling.

## Repository Structure

### `savie-server-main`
- **Purpose**: Primary development environment and source of truth for the backend
- **Content**: Contains all current API routes, services, and utilities
- **Focus**: Mobile backend integration
- **Usage**: Active development, testing, and feature implementation

### `savie-server-backup`
- **Purpose**: Backup of previous versions of the codebase
- **Content**: Historical code snapshots
- **Usage**: Reference and rollback if needed

### `heroku-deploy`
- **Purpose**: Staging and production deployment files
- **Content**: Optimized and configured files for Heroku deployment
- **Usage**: Deploying to production environment

## Workflow Processes

### Local Development

1. Make changes in `savie-server-main` directory
2. Test locally using:
   ```bash
   cd savie-server-main
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

1. After GitHub changes are finalized, push to Heroku:
   ```bash
   cd savie-server-main
   # If pushing for the first time:
   git remote add heroku https://git.heroku.com/savie-server-production.git
   
   # Push to Heroku:
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
    "content": "Text to enhance",
    "format": "delta"  // Optional, "plain" or "delta"
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

## Frontend Integration

### Mobile Application Integration
- Mobile app consumes the backend APIs
- Uses JSON for data exchange
- Delta format for rich text

### JSON Formats
For text enhancement from mobile, ensure proper format:
```json
{
  "content": "Text content or stringified Delta object",
  "format": "delta"  // Required when sending Delta objects
}
```

## Environment Setup

1. Clone repository:
   ```bash
   git clone https://github.com/savieai/savie-server.git
   ```

2. Install dependencies:
   ```bash
   cd savie-server
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
   - Ensure Delta format is properly stringified if using "format": "delta"
   - Verify content is not empty

2. **Authentication Issues**:
   - Check token expiry
   - Verify Supabase configuration

3. **Deployment Issues**:
   - Ensure environment variables are set in Heroku
   - Check logs with `heroku logs --tail` 