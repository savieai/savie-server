# Google Calendar Integration: Error Handling Guide

## Overview

This document explains how the backend communicates Google Calendar connection status and errors to the frontend.

## Connection Status Check

### 1. During Task Extraction

**Endpoint**: `/api/ai/extract-tasks`

**Response includes**:
```json
{
  "tasks": [...],
  "calendar_connected": true|false
}
```

- `calendar_connected`: Boolean indicating if user has an active Google Calendar connection
  - `true`: User has an active Google connection
  - `false`: User has no active Google connection

### 2. During Task Execution

**Endpoint**: `/api/tasks/execute` (or equivalent)

#### Scenario A: Calendar not connected
```json
{
  "status": "failed",
  "error": "Google Calendar not connected",
  "code": "google_not_connected",
  "message": "Please connect your Google account in Settings",
  "settingsUrl": "/settings"
}
```

#### Scenario B: Authentication error
```json
{
  "status": "failed",
  "error": "Google Calendar authentication error",
  "code": "google_auth_error",
  "message": "Your Google account needs to be reconnected",
  "integrationStatus": {
    "executed": false,
    "message": "Google Calendar authentication failed",
    "serviceConnected": false,
    "service": "Google Calendar"
  }
}
```

#### Scenario C: Other calendar error
```json
{
  "status": "failed",
  "error": "Failed to create calendar event",
  "message": "[Specific error message]",
  "integrationStatus": {
    "executed": false,
    "message": "[Specific error message]",
    "serviceConnected": true,
    "service": "Google Calendar",
    "details": {...}
  }
}
```

## How to Handle in Frontend

1. **Task Extraction Flow**:
   - Check `calendar_connected` field when tasks are retrieved
   - For calendar tasks, conditionally show connection prompt if `false`

2. **Task Execution Flow**:
   - Check for error codes: `google_not_connected`, `google_auth_error`
   - Redirect to settings page with appropriate parameter
   - Example: `window.location.href = '/settings?show=google_connect'`

## Error Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| `google_not_connected` | No Google connection exists | Prompt user to connect Google account |
| `google_auth_error` | Google connection exists but has auth issues | Prompt user to reconnect Google account |
| `execution_error` | Other execution errors | Show specific error message |

## Testing

You can test these errors by:
1. Temporarily disconnecting from Google in settings
2. Creating a note with a calendar task ("Meeting tomorrow at 2pm")
3. Observing the error responses

## Sample Frontend Implementation

```typescript
// Example error handling in task execution
async function executeCalendarTask(task) {
  try {
    const response = await fetch('/api/tasks/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId: task.id }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      if (data.code === 'google_not_connected') {
        showConnectionPrompt('You need to connect Google Calendar first');
        return;
      }
      
      if (data.code === 'google_auth_error') {
        showConnectionPrompt('Your Google account needs to be reconnected');
        return;
      }
      
      // Handle other errors
      showErrorMessage(data.message || 'Failed to create calendar event');
      return;
    }
    
    // Success handling
    showSuccess('Calendar event created successfully!');
    
  } catch (error) {
    showErrorMessage('An unexpected error occurred');
    console.error(error);
  }
}

// Helper to show connection prompt
function showConnectionPrompt(message) {
  // Display UI with message and connect button
  const shouldConnect = confirm(`${message}. Would you like to connect now?`);
  if (shouldConnect) {
    window.location.href = '/settings?show=google_connect';
  }
}
``` 