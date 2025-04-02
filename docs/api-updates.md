# API Updates

## Task Extraction API Update: Calendar Connection Status

**Date:** Current Date

### Overview

The `/api/ai/extract-tasks` endpoint has been enhanced to provide information about the user's Google Calendar connection status, making it easier for the frontend to show appropriate UI elements when calendar tasks are detected.

### Changes

- Added a new `calendar_connected` boolean field to the response object.
- This field indicates whether the user has an active Google Calendar connection.
- The existing response structure remains unchanged for backward compatibility.

### Example Response

```json
{
  "tasks": [
    {
      "title": "Meeting with John",
      "type": "calendar",
      "details": {
        "start_time": "2023-06-15T14:00:00Z",
        "location": "Office"
      },
      "people": ["John"]
    }
  ],
  "calendar_connected": true
}
```

### Frontend Implementation Guidelines

When a calendar task is detected, use the `calendar_connected` value to:

1. **If `calendar_connected` is `true`:**
   - Show a "Create Event" button that directly executes the task
   - Proceed with normal calendar task execution flow

2. **If `calendar_connected` is `false`:**
   - Show a "Connect Google Calendar" button/notice
   - Provide a link to `/settings?show=google_connect` for easy connection setup
   - Disable the task execution functionality for calendar tasks
   - Optionally, show a tooltip explaining that Google Calendar connection is required

This change allows providing immediate feedback to users about calendar task availability without requiring a separate API call or waiting until task execution to discover connection issues.

### Testing

A new test script has been added at `scripts/test-task-extraction.js` to verify this functionality.

To run the test:
```
node scripts/test-task-extraction.js
``` 