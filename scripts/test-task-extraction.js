// Test script for the task extraction endpoint with calendar_connected field
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.test file
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('API_KEY is required in .env file');
  process.exit(1);
}

async function testTaskExtraction() {
  console.log('Testing task extraction with calendar_connected field...');
  
  const testMessages = [
    {
      content: 'Meet with John tomorrow at 2pm to discuss the proposal',
      expectedType: 'calendar'
    },
    {
      content: 'Remember to buy groceries this weekend',
      expectedType: 'todo'
    },
    {
      content: 'Just a regular note without any tasks',
      expectedType: null
    }
  ];
  
  for (const test of testMessages) {
    try {
      const response = await fetch(`${API_URL}/api/ai/extract-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          content: test.content
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Log the full response
      console.log('\nResponse for:', test.content);
      console.log(JSON.stringify(result, null, 2));
      
      // Verify calendar_connected field exists
      if ('calendar_connected' in result) {
        console.log('✅ calendar_connected field is present:', result.calendar_connected);
      } else {
        console.error('❌ calendar_connected field is missing from response');
      }
      
      // Verify tasks field has expected content
      if (Array.isArray(result.tasks)) {
        console.log(`✅ tasks field is an array with ${result.tasks.length} items`);
        
        if (test.expectedType) {
          const hasExpectedType = result.tasks.some(task => task.type === test.expectedType);
          if (hasExpectedType) {
            console.log(`✅ Found expected task type: ${test.expectedType}`);
          } else {
            console.log(`❌ Expected task type '${test.expectedType}' not found`);
          }
        } else if (result.tasks.length === 0) {
          console.log('✅ No tasks found as expected');
        }
      } else {
        console.error('❌ tasks field is not an array');
      }
      
      console.log('-'.repeat(50));
    } catch (error) {
      console.error(`Error testing with content: ${test.content}`);
      console.error(error);
    }
  }
}

// Run the test
testTaskExtraction().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 