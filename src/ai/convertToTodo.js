import openai from './openai.js';
import { transcribeAudio } from './transcription.js';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Create client if environment variables are available, otherwise create a mock for testing
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && 
    process.env.NODE_ENV !== 'test') {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
} else {
  // Mock Supabase client for testing
  supabase = {
    from: (table) => ({
      insert: async (data) => ({ data, error: null }),
      select: async () => ({ data: [], error: null }),
      update: async (data) => ({ data, error: null }),
    })
  };
}

// Prompt for the todo extraction
const TODO_EXTRACTION_PROMPT = `
You are an AI assistant that analyzes text to identify actionable tasks and separate them from regular content.

Given the following user input text:
1. Clearly identify and extract all actionable tasks as individual to-do items
2. Separate non-task-related content as regular text
3. Be smart about identifying what is a task versus general information

Return the following JSON structure:
{
  "tasks": [
    "Task 1",
    "Task 2",
    ...
  ],
  "regular_text": "All the non-task content from the original text"
}

If no clear tasks are identified, return an empty array for tasks and place all input text into "regular_text".
`;

/**
 * Convert text or voice message to a todo list
 * 
 * @param {Object} options 
 * @param {string|Object} options.content - The content to convert (text or delta object)
 * @param {string} options.format - The format of the content ('plain' or 'delta')
 * @param {string} [options.voiceMessagePath] - Path to voice message file if transcription needed
 * @param {string} options.userId - The user ID for rate limiting and tracking
 * @returns {Object} Object containing todo list and regular text in specified format
 */
export async function convertToTodo({ content, format, voiceMessagePath, userId }) {
  try {
    let textToProcess;
    let needsTranscription = false;
    
    // Step 1: Handle voice message transcription if needed
    if (voiceMessagePath) {
      needsTranscription = true;
      const { transcription } = await transcribeAudio(voiceMessagePath, userId);
      textToProcess = transcription;
      
      // Clean up temp file if needed
      if (fs.existsSync(voiceMessagePath)) {
        fs.unlinkSync(voiceMessagePath);
      }
    } else {
      // Handle existing content based on format
      if (format === 'delta') {
        // Extract plain text from delta
        textToProcess = extractTextFromDelta(content);
      } else {
        // Plain text format
        textToProcess = content;
      }
    }
    
    if (!textToProcess || textToProcess.trim() === '') {
      return {
        success: false,
        error: 'No valid content to process',
        statusCode: 400
      };
    }
    
    // Step 2: Process with AI to extract todos
    const response = await openai.chat.completions.create({
      model: process.env.AI_TASK_DETECTION_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: TODO_EXTRACTION_PROMPT },
        { role: "user", content: textToProcess }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    // Parse response
    const content_json = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content_json);
    
    // Step 3: Convert to requested format
    let result;
    if (format === 'delta') {
      result = {
        tasks: convertTasksToQuillDelta(parsedResponse.tasks || []),
        regular_text: convertTextToQuillDelta(parsedResponse.regular_text || ""),
        format: 'delta'
      };
    } else {
      result = {
        tasks: parsedResponse.tasks || [],
        regular_text: parsedResponse.regular_text || "",
        format: 'plain'
      };
    }
    
    // Step 4: Track AI usage
    await supabase.from('ai_usage').insert({
      user_id: userId,
      feature: 'convert_to_todo',
      metadata: {
        tasks_count: (parsedResponse.tasks || []).length,
        needed_transcription: needsTranscription
      }
    });
    
    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('Error converting to todo:', error);
    return {
      success: false,
      error: `Failed to convert to todo: ${error.message}`,
      statusCode: 500
    };
  }
}

/**
 * Extract plain text from Quill Delta object
 * 
 * @param {Object} delta - Quill Delta object
 * @returns {string} Plain text extracted from delta
 */
function extractTextFromDelta(delta) {
  if (!delta || !delta.ops) {
    return '';
  }
  
  let text = '';
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      text += op.insert;
    }
  });
  
  return text;
}

/**
 * Convert plain text to Quill Delta format
 * 
 * @param {string} text - Plain text to convert
 * @returns {Object} Quill Delta object
 */
function convertTextToQuillDelta(text) {
  if (!text) {
    return { ops: [] };
  }
  
  const lines = text.split('\n');
  const ops = [];
  
  lines.forEach((line, index) => {
    if (line) {
      ops.push({ insert: line });
    }
    
    // Add line break if not the last line or if text ends with newline
    if (index < lines.length - 1 || text.endsWith('\n')) {
      ops.push({ insert: '\n' });
    }
  });
  
  return { ops };
}

/**
 * Convert array of tasks to Quill Delta format with checkbox formatting
 * 
 * @param {Array} tasks - Array of task strings
 * @returns {Object} Quill Delta object with todo list formatting
 */
function convertTasksToQuillDelta(tasks) {
  if (!tasks || tasks.length === 0) {
    return { ops: [] };
  }
  
  const ops = [];
  
  tasks.forEach((task, index) => {
    if (task) {
      ops.push({ insert: task });
    }
    
    // Add line break with todo list formatting
    ops.push({ 
      insert: '\n',
      attributes: { list: 'unchecked' }
    });
  });
  
  return { ops };
} 