// Test script for API endpoints
// Run with: node scripts/test-api.js
import "dotenv/config";
import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

// Ensure we have an auth token
if (!AUTH_TOKEN) {
  console.error('TEST_AUTH_TOKEN environment variable is required');
  process.exit(1);
}

// Helper for API requests
async function callApi(endpoint, method = 'GET', body = null, isFormData = false) {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  };
  
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }
  
  console.log(`Calling ${method} ${endpoint}...`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return { status: 500, error: error.message };
  }
}

// Test functions
async function testTextEnhancement() {
  console.log('\n--- Testing Text Enhancement ---');
  const result = await callApi('/ai/enhance', 'POST', {
    content: 'this is a simple text that could use some improvement. it has spelling errorrs and bad grammar.'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testTaskExtraction() {
  console.log('\n--- Testing Task Extraction ---');
  const result = await callApi('/ai/extract-tasks', 'POST', {
    content: 'I need to meet John tomorrow at 2pm to discuss the proposal. Also, send an email to Sarah about the marketing plan by Friday.'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testDatetimeParsing() {
  console.log('\n--- Testing Date/Time Parsing ---');
  const result = await callApi('/ai/parse-datetime', 'POST', {
    text: 'tomorrow at 3pm',
    timezone: 'America/New_York'
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testAttendeeExtraction() {
  console.log('\n--- Testing Attendee Extraction ---');
  const result = await callApi('/ai/extract-attendees', 'POST', {
    text: 'Schedule a meeting with John from Marketing and Dr. Thompson',
    include_details: true
  });
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testSearch() {
  console.log('\n--- Testing Semantic Search ---');
  const result = await callApi('/search?q=meeting notes&limit=2');
  
  console.log(`Status: ${result.status}`);
  console.log('Results count:', result.data.results?.length || 0);
  console.log('Search type:', result.data.type);
  return result;
}

async function testAudioTranscription() {
  console.log('\n--- Testing Audio Transcription ---');
  
  // Check if test audio file exists
  const testAudioPathMp3 = path.join(__dirname, 'test-audio.mp3');
  const testAudioPathWav = path.join(__dirname, 'test-audio.wav');
  
  let audioPath = null;
  if (fs.existsSync(testAudioPathMp3)) {
    audioPath = testAudioPathMp3;
  } else if (fs.existsSync(testAudioPathWav)) {
    audioPath = testAudioPathWav;
  }
  
  if (!audioPath) {
    console.log('Test audio file not found. Skipping transcription test.');
    return { status: 'skipped' };
  }
  
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  
  const result = await callApi('/ai/transcribe', 'POST', form, true);
  
  console.log(`Status: ${result.status}`);
  console.log('Response:', JSON.stringify(result.data, null, 2));
  return result;
}

async function testGetTasks() {
  console.log('\n--- Testing Get Tasks ---');
  const result = await callApi('/tasks');
  
  console.log(`Status: ${result.status}`);
  console.log('Tasks count:', result.data.tasks?.length || 0);
  return result;
}

// Main test function
async function runTests() {
  console.log('Starting API tests...');
  
  try {
    // AI features
    await testTextEnhancement();
    await testTaskExtraction();
    await testDatetimeParsing();
    await testAttendeeExtraction();
    await testSearch();
    await testAudioTranscription();
    
    // Tasks
    await testGetTasks();
    
    console.log('\n--- All tests completed ---');
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Run the tests
runTests(); 