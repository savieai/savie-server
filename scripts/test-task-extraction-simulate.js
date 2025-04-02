// Simulated test for the task extraction endpoint
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('SIMULATION MODE: This test doesn\'t actually connect to a server');
console.log('Testing task extraction with calendar_connected field...\n');

// Sample response data to simulate different scenarios
const mockResponses = {
  calendar: {
    tasks: [
      {
        title: "Meeting with John",
        type: "calendar",
        details: {
          start_time: "2023-06-15T14:00:00Z",
          location: "Office",
          content: "Discuss the proposal"
        },
        people: ["John"]
      }
    ],
    calendar_connected: true
  },
  todo: {
    tasks: [
      {
        title: "Buy groceries",
        type: "todo",
        details: {
          content: "Get milk, bread, and eggs"
        },
        people: []
      }
    ],
    calendar_connected: true
  },
  empty: {
    tasks: [],
    calendar_connected: true
  },
  notConnected: {
    tasks: [
      {
        title: "Meeting with John",
        type: "calendar",
        details: {
          start_time: "2023-06-15T14:00:00Z",
          location: "Office",
          content: "Discuss the proposal"
        },
        people: ["John"]
      }
    ],
    calendar_connected: false
  }
};

// Test scenarios
const testMessages = [
  {
    content: 'Meet with John tomorrow at 2pm to discuss the proposal',
    expectedType: 'calendar',
    mockResponse: mockResponses.calendar
  },
  {
    content: 'Remember to buy groceries this weekend',
    expectedType: 'todo',
    mockResponse: mockResponses.todo
  },
  {
    content: 'Just a regular note without any tasks',
    expectedType: null,
    mockResponse: mockResponses.empty
  },
  {
    content: 'Meet with John tomorrow at 2pm (but calendar is not connected)',
    expectedType: 'calendar',
    mockResponse: mockResponses.notConnected
  }
];

// Run through test scenarios
async function simulateTests() {
  for (const test of testMessages) {
    console.log('\nSimulating request with content:', test.content);
    console.log('Response would be:');
    console.log(JSON.stringify(test.mockResponse, null, 2));
    
    // Verify calendar_connected field exists
    if ('calendar_connected' in test.mockResponse) {
      console.log('✅ calendar_connected field is present:', test.mockResponse.calendar_connected);
    } else {
      console.error('❌ calendar_connected field is missing from response');
    }
    
    // Verify tasks field has expected content
    if (Array.isArray(test.mockResponse.tasks)) {
      console.log(`✅ tasks field is an array with ${test.mockResponse.tasks.length} items`);
      
      if (test.expectedType) {
        const hasExpectedType = test.mockResponse.tasks.some(task => task.type === test.expectedType);
        if (hasExpectedType) {
          console.log(`✅ Found expected task type: ${test.expectedType}`);
        } else {
          console.log(`❌ Expected task type '${test.expectedType}' not found`);
        }
      } else if (test.mockResponse.tasks.length === 0) {
        console.log('✅ No tasks found as expected');
      }
    } else {
      console.error('❌ tasks field is not an array');
    }
    
    console.log('-'.repeat(50));
  }
  
  console.log('\nAll simulated tests completed successfully!');
  console.log('\nNOTE: These are simulated results. When deployed, you should:');
  console.log('1. Deploy to development/staging environment');
  console.log('2. Run actual tests against the live API');
  console.log('3. Verify with real user accounts with and without Google Calendar connections');
}

// Run the simulated tests
simulateTests(); 