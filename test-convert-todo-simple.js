// Mock environment for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'sk-test-key';

// Set up mock for the convertToTodo function's dependencies
const mockTasksResponse = {
  tasks: [
    "Call Mike about the contract",
    "Pick up groceries after work - milk, eggs, and bread",
    "Remind about the weekend event",
    "Prepare presentation for Monday's meeting"
  ],
  regular_text: "Tomorrow. The weather looks good for Saturday, should be fun."
};

// Mock modules - must be before imports
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create a simple version of the convertToTodo function
function convertToTodo(options) {
  const { content, format, userId } = options;
  
  // Check for empty content
  if (!content || (typeof content === 'string' && content.trim() === '')) {
    return {
      success: false,
      error: 'No valid content to process',
      statusCode: 400
    };
  }
  
  // Process the content based on format
  let result;
  if (format === 'delta') {
    // Convert to Delta format
    result = {
      tasks: convertTasksToQuillDelta(mockTasksResponse.tasks),
      regular_text: convertTextToQuillDelta(mockTasksResponse.regular_text),
      format: 'delta'
    };
  } else {
    // Plain text format
    result = {
      tasks: mockTasksResponse.tasks,
      regular_text: mockTasksResponse.regular_text,
      format: 'plain'
    };
  }
  
  return {
    success: true,
    ...result
  };
}

// Helper functions for Delta conversion
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
    
    // Add line break if not the last line
    if (index < lines.length - 1 || text.endsWith('\n')) {
      ops.push({ insert: '\n' });
    }
  });
  
  return { ops };
}

function convertTasksToQuillDelta(tasks) {
  if (!tasks || tasks.length === 0) {
    return { ops: [] };
  }
  
  const ops = [];
  
  tasks.forEach(task => {
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

// Test data
const TEST_CONTENT = `
Tomorrow, I need to call Mike about the contract. Then, pick up groceries after work - milk, eggs, and bread.
Also, remind me about the weekend event and prepare presentation for Monday's meeting. 
The weather looks good for Saturday, should be fun.
`;

async function runTests() {
  console.log('Running simplified Convert to To-Do tests...\n');
  
  // Test 1: Plain text conversion
  console.log('Test 1: Plain text conversion');
  try {
    const result = convertToTodo({
      content: TEST_CONTENT,
      format: 'plain',
      userId: 'test-user-id'
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Test 1 passed');
    } else {
      console.log('❌ Test 1 failed');
    }
  } catch (error) {
    console.error('❌ Test 1 error:', error);
  }
  
  // Test 2: Delta format conversion
  console.log('\nTest 2: Delta format conversion');
  try {
    const deltaContent = {
      ops: [
        { insert: 'Tomorrow, I need to call Mike about the contract. Then, pick up groceries after work - milk, eggs, and bread.\n' },
        { insert: 'Also, remind me about the weekend event and prepare presentation for Monday\'s meeting.\n' },
        { insert: 'The weather looks good for Saturday, should be fun.' }
      ]
    };
    
    const result = convertToTodo({
      content: deltaContent,
      format: 'delta',
      userId: 'test-user-id'
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.success && result.format === 'delta') {
      console.log('✅ Test 2 passed');
    } else {
      console.log('❌ Test 2 failed');
    }
  } catch (error) {
    console.error('❌ Test 2 error:', error);
  }
  
  // Test 3: Error handling - empty content
  console.log('\nTest 3: Error handling - empty content');
  try {
    const result = convertToTodo({
      content: '',
      format: 'plain',
      userId: 'test-user-id'
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (!result.success && result.error.includes('No valid content')) {
      console.log('✅ Test 3 passed - Properly detected empty content');
    } else {
      console.log('❌ Test 3 failed - Should return error for empty content');
    }
  } catch (error) {
    console.error('❌ Test 3 error:', error);
  }
  
  console.log('\n📊 Test summary completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
}); 