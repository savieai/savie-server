import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration - explicitly use port 3001 where test server is running
const API_URL = 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key'; // Use a test API key if available

// Test data
const TEST_CONTENT = `
Tomorrow, I need to call Mike about the contract. Then, pick up groceries after work - milk, eggs, and bread.
Also, remind me about the weekend event and prepare presentation for Monday's meeting. 
The weather looks good for Saturday, should be fun.
`;

async function runTests() {
  console.log('Running Convert to To-Do feature tests against API...');
  console.log(`Testing against: ${API_URL}`);
  
  // Test 1: Plain text conversion
  console.log('\nTest 1: Plain text conversion');
  try {
    const response = await fetch(`${API_URL}/ai/convert-to-todo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
      },
      body: JSON.stringify({
        content: TEST_CONTENT,
        format: 'plain'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Test 1 passed');
    } else {
      console.log('❌ Test 1 failed');
    }
  } catch (error) {
    console.error('❌ Test 1 error:', error.message);
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
    
    const response = await fetch(`${API_URL}/ai/convert-to-todo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
      },
      body: JSON.stringify({
        content: deltaContent,
        format: 'delta'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.format === 'delta') {
      console.log('✅ Test 2 passed');
    } else {
      console.log('❌ Test 2 failed');
    }
  } catch (error) {
    console.error('❌ Test 2 error:', error.message);
  }
  
  // Test 3: Error handling - empty content
  console.log('\nTest 3: Error handling - empty content');
  try {
    const response = await fetch(`${API_URL}/ai/convert-to-todo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
      },
      body: JSON.stringify({
        content: '',
        format: 'plain'
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Test 3 passed - Properly detected empty content');
    } else {
      console.log('❌ Test 3 failed - Should return 400 for empty content');
    }
  } catch (error) {
    console.error('❌ Test 3 error:', error.message);
  }
  
  // Test 4: Error handling - missing required parameters
  console.log('\nTest 4: Error handling - missing required parameters');
  try {
    const response = await fetch(`${API_URL}/ai/convert-to-todo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY ? `Bearer ${API_KEY}` : undefined
      },
      body: JSON.stringify({
        // No content or message_id
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.status === 400) {
      console.log('✅ Test 4 passed - Properly detected missing parameters');
    } else {
      console.log('❌ Test 4 failed - Should return 400 for missing parameters');
    }
  } catch (error) {
    console.error('❌ Test 4 error:', error.message);
  }
  
  console.log('\n📊 Test summary completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
}); 