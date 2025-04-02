import openai from './openai.js';

// Template for the task extraction prompt
const TASK_EXTRACTION_PROMPT = `
You are an AI assistant that analyzes text to identify actionable tasks. Look for any explicit or implicit tasks in the input.

For each task you identify, extract:
1. A brief title
2. The type of task (calendar for events/meetings, email for messages to send, todo for action items)
3. Important details about the task
4. People involved (if any)

Return the tasks as a JSON array of objects with fields:
- title: Short task description
- type: "calendar", "email", or "todo"
- details: Any relevant information about the task
- people: Array of people involved (or empty array if none)

If no tasks are found, return an empty array.
`;

/**
 * Extract tasks from text using OpenAI
 * 
 * @param {string} text The text to extract tasks from
 * @returns {Array} Array of tasks
 * 
 * Note: When this function is called from the /api/ai/extract-tasks endpoint,
 * the response will include:
 * - tasks: Array of extracted tasks with details
 * - calendar_connected: Boolean indicating if the user has an active Google Calendar connection
 * 
 * Example response:
 * {
 *   "tasks": [
 *     {
 *       "title": "Meeting with John",
 *       "type": "calendar",
 *       "details": {
 *         "start_time": "2023-06-15T14:00:00Z",
 *         "location": "Office"
 *       },
 *       "people": ["John"]
 *     }
 *   ],
 *   "calendar_connected": true
 * }
 */
export async function extractTasks(text) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_TASK_DETECTION_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: TASK_EXTRACTION_PROMPT },
        { role: "user", content: text }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    // Parse response
    const content = response.choices[0].message.content;
    try {
      const parsedResponse = JSON.parse(content);
      return parsedResponse.tasks || [];
    } catch (error) {
      console.error("Error parsing task extraction response:", error);
      return [];
    }
  } catch (error) {
    console.error("Error extracting tasks:", error);
    throw new Error(`Failed to extract tasks: ${error.message}`);
  }
} 