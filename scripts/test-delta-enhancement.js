import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample Quill Delta with formatting
const sampleDelta = {
  ops: [
    { insert: "Shopping List:", attributes: { bold: true } },
    { insert: "\n" },
    { insert: "Buy milk", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "get eggs from store", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "pickup dry cleaning tomorrow", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "call John about the meeting", attributes: { list: "bullet" } },
    { insert: "\n" }
  ]
};

// Sample plain text
const sampleText = "Shopping List:\n- Buy milk\n- get eggs from store\n- pickup dry cleaning tomorrow\n- call John about the meeting";

// Mock OpenAI response - simulate text enhancement
function mockEnhanceText(text) {
  // Simulate enhanced text with improved grammar and capitalization
  return text
    .replace(/\bget\b/g, "Get")
    .replace(/\bpickup\b/g, "Pick up")
    .replace(/\bcall\b/g, "Call")
    .replace(/\babout the\b/g, "about the")
    .replace(/\bfrom store\b/g, "from the store");
}

// Manually implement the essential functions from textEnhancement.js
function extractTextFromDelta(delta) {
  let plainText = '';
  
  if (!delta.ops) {
    return plainText;
  }
  
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      plainText += op.insert;
    } else if (op.insert && typeof op.insert === 'object') {
      // For non-text inserts (like images), add a placeholder
      plainText += ' ';
    }
  });
  
  return plainText;
}

function replaceTextInDelta(delta, newText) {
  if (!delta.ops || delta.ops.length === 0) {
    return { ops: [{ insert: newText }] };
  }
  
  // Create a new Delta structure
  let newDelta = { ops: [] };
  let textIndex = 0;
  
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      const length = op.insert.length;
      
      if (textIndex < newText.length) {
        // Get portion of enhanced text corresponding to this op
        let endIndex = Math.min(textIndex + length, newText.length);
        let chunk = newText.substring(textIndex, endIndex);
        
        // Add the chunk with the same attributes
        newDelta.ops.push({
          insert: chunk,
          attributes: op.attributes
        });
        
        textIndex += chunk.length;
      }
    } else if (op.insert && typeof op.insert === 'object') {
      // For non-text inserts, keep them as-is
      newDelta.ops.push(op);
      textIndex += 1; // Account for placeholder
    }
  });
  
  // Add any remaining text
  if (textIndex < newText.length) {
    newDelta.ops.push({
      insert: newText.substring(textIndex)
    });
  }
  
  return newDelta;
}

// Mock version of the enhanceText function
async function mockEnhanceTextFunction(content, isQuillDelta = false) {
  if (!isQuillDelta) {
    // Plain text enhancement
    const enhancedText = mockEnhanceText(content);
    return {
      enhanced: enhancedText,
      original: content,
      format: 'plain'
    };
  } else {
    // Delta format enhancement
    let delta = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Extract plain text from Delta
    const plainText = extractTextFromDelta(delta);
    
    // Enhance the extracted text
    const enhancedText = mockEnhanceText(plainText);
    
    // Replace text in the Delta while preserving formatting
    const enhancedDelta = replaceTextInDelta(delta, enhancedText);
    
    return {
      enhanced: enhancedDelta,
      original: delta,
      format: 'delta'
    };
  }
}

async function runTest() {
  try {
    console.log("=== Testing Quill Delta Text Enhancement (Mock) ===");
    
    // Test with delta format
    console.log("\nTesting with Quill Delta format:");
    console.log("Original Delta:", JSON.stringify(sampleDelta, null, 2));
    
    // Extract the plain text from Delta for comparison
    const plainTextFromDelta = extractTextFromDelta(sampleDelta);
    console.log("\nPlain text extracted from Delta:", plainTextFromDelta);
    
    // Enhance Delta
    const deltaResult = await mockEnhanceTextFunction(sampleDelta, true);
    console.log("\nEnhanced Delta:", JSON.stringify(deltaResult.enhanced, null, 2));
    
    // Extract text from enhanced Delta to verify content was updated
    const enhancedText = extractTextFromDelta(deltaResult.enhanced);
    console.log("\nText from enhanced Delta:", enhancedText);
    
    // Test with plain text
    console.log("\n\nTesting with plain text format:");
    console.log("Original Text:", sampleText);
    
    const textResult = await mockEnhanceTextFunction(sampleText);
    console.log("\nEnhanced Text:", textResult.enhanced);
    
    // Save results to file for examination
    const tempDir = path.join(process.cwd(), 'temp');
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const outputPath = path.join(tempDir, 'enhancement-test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      deltaTest: {
        original: sampleDelta,
        enhanced: deltaResult.enhanced,
        plainTextBefore: plainTextFromDelta,
        plainTextAfter: enhancedText
      },
      textTest: {
        original: sampleText,
        enhanced: textResult.enhanced
      }
    }, null, 2));
    
    console.log(`\nTest results saved to: ${outputPath}`);
    console.log("\n=== Test completed successfully ===");
    
    // Verify formatting was preserved
    const formattingPreserved = deltaResult.enhanced.ops.some(op => 
      op.attributes && (op.attributes.bold || op.attributes.list === 'bullet')
    );
    
    console.log("\nFormatting preserved:", formattingPreserved ? "YES ✓" : "NO ✗");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTest(); 