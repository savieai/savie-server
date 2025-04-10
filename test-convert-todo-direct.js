// Set test environment variables first
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-key';

// Now import the modules
import { convertToTodo } from './src/ai/convertToTodo.js';
import dotenv from 'dotenv';

// Load environment variables (in case there are any additional ones in .env)
dotenv.config();

// Test data
const TEST_CONTENT = `
Tomorrow, I need to call Mike about the contract. Then, pick up groceries after work - milk, eggs, and bread.
Also, remind me about the weekend event and prepare presentation for Monday's meeting. 
The weather looks good for Saturday, should be fun.
`;

// Replace supabase insert with mock
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://test.supabase.co',
  process.env.SUPABASE_SECRET_KEY || 'test-key'
);
// Mock supabase insert
const originalFrom = supabase.from;
supabase.from = () => ({
  insert: async () => ({ data: {}, error: null })
});

async function runTests() {
  console.log('Running Convert to To-Do direct function tests...\n');
  
  // Test 1: Plain text conversion
  console.log('Test 1: Plain text conversion');
  try {
    const result = await convertToTodo({
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
    
    const result = await convertToTodo({
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
    const result = await convertToTodo({
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
  
  // Restore original implementation
  supabase.from = originalFrom;
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
}); 