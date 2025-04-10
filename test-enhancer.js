// Test script for text enhancement functionality
import { extractTextFromDelta, replaceTextInDelta } from './src/utils/extractorsFromText.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEnhancer() {
  console.log('Testing text extractors:');
  
  // Test 1: Extract text from Delta
  const testDelta = {
    ops: [
      { insert: 'This is a test ' },
      { insert: 'with formatting', attributes: { bold: true } },
      { insert: '.\n' }
    ]
  };
  
  const extractedText = extractTextFromDelta(testDelta);
  console.log('Extracted Text:', extractedText);
  
  // Test 2: Replace text in Delta
  const newText = 'This is a modified test with new formatting.';
  const newDelta = replaceTextInDelta(testDelta, newText);
  console.log('Modified Delta:', JSON.stringify(newDelta, null, 2));
  
  console.log('\nTests completed!');
}

testEnhancer().catch(error => {
  console.error('Test failed:', error);
}); 