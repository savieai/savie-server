import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

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

// Mock OpenAI enhancement
function mockEnhanceText(text) {
  // Simulate enhanced text with improved grammar and capitalization
  return text
    .replace(/\bget\b/g, "Get")
    .replace(/\bfinish\b/g, "Finish")
    .replace(/\bcall\b/g, "Call")
    .replace(/\babout the\b/g, "regarding the")
    .replace(/\bschedule\b/g, "Schedule")
    .replace(/\breview\b/g, "Review")
    .replace(/\bprepare\b/g, "Prepare");
}

// Mock version of analyzeQuillDelta function
function analyzeQuillDelta(delta) {
  let plainText = '';
  const formatMap = [];
  const lineBreaks = [];
  let currentPosition = 0;
  
  // First additional validation
  if (!delta.ops) {
    console.error('analyzeQuillDelta: Delta missing ops array');
    return { plainText, formatMap, lineBreaks };
  }
  
  // Track if we've found any actual text content
  let hasTextContent = false;
  
  delta.ops.forEach((op, index) => {
    console.log(`Processing op[${index}]:`, JSON.stringify(op).substring(0, 100));
    
    if (typeof op.insert === 'string') {
      // Check if this is a line break
      if (op.insert === '\n') {
        lineBreaks.push({
          position: currentPosition,
          attributes: op.attributes || {}
        });
        plainText += '\n';
        currentPosition += 1;
      } else {
        // Found actual text content
        if (op.insert.trim() !== '') {
          hasTextContent = true;
        }
        
        // Handle normal text
        plainText += op.insert;
        
        if (op.attributes) {
          formatMap.push({
            start: currentPosition,
            end: currentPosition + op.insert.length,
            attributes: op.attributes
          });
        }
        
        currentPosition += op.insert.length;
      }
    } else if (typeof op.insert === 'object') {
      // Handle embeds like images, videos, etc.
      plainText += ' ';  // Add a space as placeholder
      formatMap.push({
        start: currentPosition,
        end: currentPosition + 1,
        embed: op.insert,
        attributes: op.attributes
      });
      currentPosition += 1;
    }
  });
  
  if (!hasTextContent && plainText.trim() === '') {
    console.error('analyzeQuillDelta: No actual text content found in Delta');
  }
  
  return { plainText, formatMap, lineBreaks };
}

// Mock version of reconstructQuillDelta function
function reconstructQuillDelta(enhancedText, formatMap, lineBreaks) {
  const newDelta = { ops: [] };
  
  // First, split the text at line breaks
  const textLines = enhancedText.split('\n');
  
  // Process each line
  textLines.forEach((line, index) => {
    // Apply any formatting to this line
    let lineStart = enhancedText.indexOf(line, index === 0 ? 0 : enhancedText.indexOf(textLines[index - 1]) + textLines[index - 1].length + 1);
    let lineEnd = lineStart + line.length;
    
    // Find formats that apply to this line
    let lineFormats = formatMap.filter(format => 
      (format.start <= lineEnd && format.end >= lineStart)
    );
    
    // If we have formats, apply them
    if (lineFormats.length > 0) {
      // Split the line according to different formats
      let currentPosition = lineStart;
      
      lineFormats.sort((a, b) => a.start - b.start);
      
      lineFormats.forEach(format => {
        // Add any text before this format
        if (format.start > currentPosition) {
          const plainPart = line.substring(currentPosition - lineStart, format.start - lineStart);
          if (plainPart) {
            newDelta.ops.push({ insert: plainPart });
          }
        }
        
        // Add the formatted part
        if (format.embed) {
          newDelta.ops.push({ 
            insert: format.embed,
            attributes: format.attributes 
          });
        } else {
          const formatStart = Math.max(format.start, lineStart);
          const formatEnd = Math.min(format.end, lineEnd);
          const formattedPart = line.substring(formatStart - lineStart, formatEnd - lineStart);
          
          if (formattedPart) {
            newDelta.ops.push({ 
              insert: formattedPart,
              attributes: format.attributes 
            });
          }
        }
        
        currentPosition = Math.max(currentPosition, format.end);
      });
      
      // Add any remaining text
      if (currentPosition < lineEnd) {
        const remainingPart = line.substring(currentPosition - lineStart);
        if (remainingPart) {
          newDelta.ops.push({ insert: remainingPart });
        }
      }
    } else {
      // No formatting, add the whole line
      if (line) {
        newDelta.ops.push({ insert: line });
      }
    }
    
    // Add line break if not the last line
    if (index < textLines.length - 1 || enhancedText.endsWith('\n')) {
      // Find matching line break
      const lineBreak = index < lineBreaks.length ? lineBreaks[index] : null;
      
      if (lineBreak && Object.keys(lineBreak.attributes).length > 0) {
        newDelta.ops.push({ 
          insert: '\n',
          attributes: lineBreak.attributes
        });
      } else {
        newDelta.ops.push({ insert: '\n' });
      }
    }
  });
  
  return newDelta;
}

// Mock the enhanceText function to avoid requiring OpenAI
async function mockEnhanceTextFunction(content, isQuillDelta = false) {
  try {
    if (!isQuillDelta) {
      // Plain text implementation
      if (!content || typeof content !== 'string' || content.trim() === '') {
        console.error('Error enhancing text: Empty or invalid plain text content provided');
        throw new Error('Content is empty or invalid');
      }
      
      // Mock enhancement
      const enhancedText = mockEnhanceText(content);
      
      return {
        enhanced: enhancedText,
        original: content,
        format: 'plain'
      };
    } else {
      // Handle Quill Delta format
      let delta;
      
      // Parse content if it's a string
      if (typeof content === 'string') {
        try {
          console.log('Parsing Delta JSON from string');
          delta = JSON.parse(content);
        } catch (parseError) {
          console.error('Error parsing Delta JSON:', parseError);
          throw new Error('Invalid Delta format: Could not parse JSON');
        }
      } else {
        delta = content;
      }
      
      // Validate delta structure
      if (!delta || typeof delta !== 'object') {
        console.error('Error enhancing text: Delta is not an object', delta);
        throw new Error('Invalid Delta format: Not a valid object');
      }
      
      if (!delta.ops || !Array.isArray(delta.ops)) {
        console.error('Error enhancing text: Delta missing ops array', delta);
        throw new Error('Invalid Delta format: Missing ops array');
      }
      
      if (delta.ops.length === 0) {
        console.error('Error enhancing text: Delta has empty ops array', delta);
        throw new Error('Invalid Delta format: Empty ops array');
      }
      
      console.log('Processing Quill Delta format:', JSON.stringify(delta, null, 2).substring(0, 200) + '...');
      
      // Extract plain text and formatting info from Delta
      const { plainText, formatMap, lineBreaks } = analyzeQuillDelta(delta);
      
      // Validate extracted text
      if (!plainText || plainText.trim() === '') {
        console.error('Error enhancing text: No text content extracted from Delta', delta);
        throw new Error('No text content found in Delta to enhance');
      }
      
      console.log('Extracted plain text from Delta (first 100 chars):', plainText.substring(0, 100));
      
      // Mock enhancement
      const enhancedText = mockEnhanceText(plainText);
      console.log('Mock enhanced text (first 100 chars):', enhancedText.substring(0, 100));
      
      // Reapply formatting while preserving line breaks
      const enhancedDelta = reconstructQuillDelta(enhancedText, formatMap, lineBreaks);
      
      return {
        enhanced: enhancedDelta,
        original: delta,
        format: 'delta'
      };
    }
  } catch (error) {
    console.error('Error enhancing text:', error);
    throw new Error(`Failed to enhance text: ${error.message}`);
  }
}

// Test function
async function testDeltaEnhancement(delta, name, expectSuccess = true) {
  console.log(`\n=== Testing enhancement for ${name} ===`);
  
  try {
    // Call enhanceText directly (using our mock version)
    const result = await mockEnhanceTextFunction(delta, true);
    
    console.log(`✅ Enhancement successful for ${name}`);
    
    const originalText = extractTextFromDelta(delta);
    const enhancedText = extractTextFromDelta(result.enhanced);
    
    console.log("Original text:", originalText);
    console.log("Enhanced text:", enhancedText);
    
    // Check if text was actually enhanced (basic verification)
    const wasEnhanced = originalText !== enhancedText;
    console.log("Text was enhanced:", wasEnhanced ? "YES ✓" : "NO ✗");
    
    // Verify formatting was preserved
    let formattingPreserved = false;
    
    // Check for bullet list formatting
    if (delta.ops.some(op => op.attributes && op.attributes.list === 'bullet')) {
      formattingPreserved = result.enhanced.ops.some(op => 
        op.attributes && op.attributes.list === 'bullet'
      );
      console.log("Bullet formatting preserved:", formattingPreserved ? "YES ✓" : "NO ✗");
    }
    
    // Check for checkbox formatting
    if (delta.ops.some(op => op.attributes && (op.attributes.list === 'checked' || op.attributes.list === 'unchecked'))) {
      const checkboxFormatPreserved = result.enhanced.ops.some(op => 
        op.attributes && (op.attributes.list === 'checked' || op.attributes.list === 'unchecked')
      );
      console.log("Checkbox formatting preserved:", checkboxFormatPreserved ? "YES ✓" : "NO ✗");
      formattingPreserved = formattingPreserved || checkboxFormatPreserved;
    }
    
    return {
      success: true,
      result,
      originalText,
      enhancedText,
      wasEnhanced,
      formattingPreserved
    };
  } catch (error) {
    if (!expectSuccess) {
      console.log(`✅ Enhancement failed as expected for ${name}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        expectedFailure: true
      };
    } else {
      console.error(`❌ Error enhancing ${name}:`, error.message);
      return {
        success: false,
        error: error.message,
        expectedFailure: false
      };
    }
  }
}

// Main test function
async function runTests() {
  console.log("=== DIRECT QUILL DELTA TODO LIST ENHANCEMENT TEST ===");
  
  // Store results
  const results = {
    todoList: null,
    emptyTodoList: null,
    brokenDelta: null,
    checklistDelta: null
  };
  
  // Test normal todo list (should succeed)
  results.todoList = await testDeltaEnhancement(todoListDelta, "Normal Todo List");
  
  // Test empty todo list (should fail with proper error)
  results.emptyTodoList = await testDeltaEnhancement(emptyTodoListDelta, "Empty Todo List", false);
  
  // Test broken Delta (should fail with proper error)
  results.brokenDelta = await testDeltaEnhancement(brokenDelta, "Broken Delta", false);
  
  // Test checklist format (should succeed)
  results.checklistDelta = await testDeltaEnhancement(checklistDelta, "Checklist Delta");
  
  // Save results for inspection
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const outputPath = path.join(tempDir, 'direct-enhancement-test-results.json');
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
  
  // Final summary
  console.log("\n=== TEST SUMMARY ===");
  
  // Check if normal todo list enhancement worked properly
  if (results.todoList?.success && results.todoList?.formattingPreserved) {
    console.log("✅ Normal todo list enhancement: SUCCESS");
  } else {
    console.log("❌ Normal todo list enhancement: FAILED");
  }
  
  // Check if validations for empty todo list worked
  if (results.emptyTodoList?.expectedFailure) {
    console.log("✅ Empty todo list validation: SUCCESS");
  } else {
    console.log("❌ Empty todo list validation: FAILED");
  }
  
  // Check if validations for broken delta worked
  if (results.brokenDelta?.expectedFailure) {
    console.log("✅ Broken delta validation: SUCCESS");
  } else {
    console.log("❌ Broken delta validation: FAILED");
  }
  
  // Check if checklist format enhancement worked properly
  if (results.checklistDelta?.success && results.checklistDelta?.formattingPreserved) {
    console.log("✅ Checklist format enhancement: SUCCESS");
  } else {
    console.log("❌ Checklist format enhancement: FAILED");
  }
  
  console.log("\n=== Test completed ===");
}

// Run the tests
runTests(); 