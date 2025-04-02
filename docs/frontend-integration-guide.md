# Calendar Connection Status: Frontend Integration Guide

## Overview

We've added a new `calendar_connected` boolean field to the `/api/ai/extract-tasks` endpoint response. This allows the frontend to immediately know whether a user has Google Calendar connected when calendar tasks are detected, without making additional API calls.

## API Changes

The `/api/ai/extract-tasks` endpoint now returns:

```json
{
  "tasks": [
    {
      "title": "Meeting title",
      "type": "calendar|email|todo",
      "details": { ... },
      "people": [ ... ]
    }
  ],
  "calendar_connected": true|false
}
```

The `calendar_connected` boolean indicates:
- `true`: User has an active Google Calendar connection
- `false`: User does not have an active Google Calendar connection

## Implementation Guidelines

### Step 1: Update your API client

If you have typed API responses, update your TypeScript interface:

```typescript
interface TaskExtractionResponse {
  tasks: Task[];
  calendar_connected: boolean; // New field
}
```

### Step 2: Update task handling logic

When displaying detected tasks:

```typescript
// Example component handling task extraction results
function TaskList({ tasks, calendarConnected }) {
  return (
    <div>
      {tasks.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          {task.type === 'calendar' && (
            <>
              {calendarConnected ? (
                <button onClick={() => executeTask(task)}>
                  Add to Calendar
                </button>
              ) : (
                <div className="calendar-connection-needed">
                  <p>Google Calendar connection required</p>
                  <a href="/settings?show=google_connect" className="connect-button">
                    Connect Google Calendar
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Step 3: Update your API call code

```typescript
async function extractTasks(content) {
  const response = await fetch('/api/ai/extract-tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error('Failed to extract tasks');
  }

  const data = await response.json();
  
  // Use the new field
  const { tasks, calendar_connected } = data;
  
  // Now you can use calendar_connected to show appropriate UI
  return { tasks, calendarConnected: calendar_connected };
}
```

### Step 4: Update your task execution workflow

```typescript
function TaskItem({ task, calendarConnected }) {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);
  
  const handleExecute = async () => {
    if (task.type === 'calendar' && !calendarConnected) {
      // Prompt to connect Google Calendar instead of attempting execution
      if (confirm('Google Calendar is not connected. Connect now?')) {
        window.location.href = '/settings?show=google_connect';
      }
      return;
    }
    
    try {
      setExecuting(true);
      setError(null);
      await executeTask(task.id);
      // Success handling
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };
  
  return (
    <div className="task-item">
      {/* Task display */}
      
      {task.type === 'calendar' && !calendarConnected ? (
        <div className="connect-required">
          <span>Calendar not connected</span>
          <button onClick={() => window.location.href = '/settings?show=google_connect'}>
            Connect
          </button>
        </div>
      ) : (
        <button 
          onClick={handleExecute} 
          disabled={executing}
        >
          {executing ? 'Processing...' : 'Execute Task'}
        </button>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Benefits

This enhancement:
1. Improves UX by showing connection status immediately
2. Reduces unnecessary API calls that would fail
3. Provides clear guidance to users when calendar connection is needed
4. Prevents users from attempting to create calendar events when not connected

## Testing

To test this integration:

1. **With calendar connected**:
   - Create notes with calendar-related content
   - Verify the "Add to Calendar" button appears
   - Verify execution works

2. **Without calendar connected**:
   - Disconnect Google Calendar in settings
   - Create notes with calendar-related content
   - Verify the "Connect Google Calendar" button appears
   - Verify clicking it redirects to settings page

## Need Help?

If you encounter any issues with this integration, please contact the backend team for assistance. 