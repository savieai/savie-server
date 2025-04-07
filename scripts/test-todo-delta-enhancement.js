import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample Todo List in Quill Delta format
const todoListDelta = {
  ops: [
    { insert: "My To-Do List:", attributes: { bold: true } },
    { insert: "\n" },
    { insert: "Buy groceries", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "finish report for work", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "call mom about the birthday party", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "schedule dentist appointment", attributes: { list: "bullet" } },
    { insert: "\n" }
  ]
};

// Sample Todo List without text content (just formatting)
const emptyTodoListDelta = {
  ops: [
    { insert: "\n", attributes: { list: "bullet" } },
    { insert: "\n", attributes: { list: "bullet" } },
    { insert: "\n", attributes: { list: "bullet" } }
  ]
};

// Sample broken Delta (no ops array)
const brokenDelta = {
  noOps: "This is not a valid Delta"
};

// Sample Todo List with checklist format
const checklistDelta = {
  ops: [
    { insert: "Checklist:", attributes: { bold: true } },
    { insert: "\n" },
    { insert: "Complete project proposal", attributes: { list: "checked" } },
    { insert: "\n" },
    { insert: "review team feedback", attributes: { list: "unchecked" } },
    { insert: "\n" },
    { insert: "prepare presentation slides", attributes: { list: "unchecked" } },
    { insert: "\n" }
  ]
};

// API endpoint to test - read from environment or use a default
const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN || ''; // Add your test token here

// Function to test enhancement
async function testEnhancement(delta, name) {
  console.log(`\n=== Testing enhancement for ${name} ===`);
  
  try {
    const response = await fetch(`${API_URL}/api/ai/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        content: delta,
        format: 'delta'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Enhancement successful for ${name}`);
      return {
        success: true,
        data
      };
    } else {
      console.log(`❌ Enhancement failed for ${name}: ${data.error}`);
      return {
        success: false,
        error: data.error
      };
    }
  } catch (error) {
    console.error(`❌ Error testing ${name}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Extract text content from Delta (for verification)
function extractTextFromDelta(delta) {
  if (!delta || !delta.ops) return '';
  
  let text = '';
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      text += op.insert;
    }
  });
  
  return text;
}

// Main test function
async function runTests() {
  console.log("=== QUILL DELTA TODO LIST ENHANCEMENT TEST ===");
  console.log(`Testing with API URL: ${API_URL}`);
  
  // Store results
  const results = {
    todoList: null,
    emptyTodoList: null,
    brokenDelta: null,
    checklistDelta: null
  };
  
  // Test normal todo list
  results.todoList = await testEnhancement(todoListDelta, "Normal Todo List");
  if (results.todoList.success) {
    const originalText = extractTextFromDelta(todoListDelta);
    const enhancedText = extractTextFromDelta(results.todoList.data.enhanced);
    
    console.log("Original text:", originalText);
    console.log("Enhanced text:", enhancedText);
    
    // Verify formatting was preserved
    const formattingPreserved = results.todoList.data.enhanced.ops.some(op => 
      op.attributes && (op.attributes.list === 'bullet')
    );
    
    console.log("Formatting preserved:", formattingPreserved ? "YES ✓" : "NO ✗");
  }
  
  // Test empty todo list (should fail with proper error)
  results.emptyTodoList = await testEnhancement(emptyTodoListDelta, "Empty Todo List");
  
  // Test broken Delta (should fail with proper error)
  results.brokenDelta = await testEnhancement(brokenDelta, "Broken Delta");
  
  // Test checklist format
  results.checklistDelta = await testEnhancement(checklistDelta, "Checklist Delta");
  if (results.checklistDelta.success) {
    const originalText = extractTextFromDelta(checklistDelta);
    const enhancedText = extractTextFromDelta(results.checklistDelta.data.enhanced);
    
    console.log("Original text:", originalText);
    console.log("Enhanced text:", enhancedText);
    
    // Verify formatting was preserved
    const checkboxFormatPreserved = results.checklistDelta.data.enhanced.ops.some(op => 
      op.attributes && (op.attributes.list === 'checked' || op.attributes.list === 'unchecked')
    );
    
    console.log("Checkbox formatting preserved:", checkboxFormatPreserved ? "YES ✓" : "NO ✗");
  }
  
  // Save results for inspection
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const outputPath = path.join(tempDir, 'todo-enhancement-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    results,
    samples: {
      todoListDelta,
      emptyTodoListDelta,
      brokenDelta,
      checklistDelta
    }
  }, null, 2));
  
  console.log(`\nTest results saved to: ${outputPath}`);
  console.log("\n=== Test completed ===");
}

// Run the tests
runTests(); 