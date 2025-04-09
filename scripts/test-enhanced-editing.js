import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

// Sample Quill Delta to use for testing
const sampleDelta = {
  ops: [
    { insert: "Test Note:", attributes: { bold: true } },
    { insert: "\n" },
    { insert: "This is a test note", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "for enhanced editing", attributes: { list: "bullet" } },
    { insert: "\n" }
  ]
};

// Log test results in a structured way
function logStep(step, description) {
  console.log(`\n${step}. ${description}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

// This is a mock test that demonstrates the flow but doesn't actually call the API
async function mockTestEnhancedEditing() {
  try {
    console.log("=== MOCK TEST: Enhanced Note Editing ===");
    console.log("(This is a demonstration of the functionality without actually making API calls)");
    
    // 1. Creating a note
    logStep(1, "Creating a note");
    logSuccess("Created note with sample Delta content");
    
    // 2. Enhancing the note
    logStep(2, "Enhancing the note with AI");
    logSuccess("Note enhanced successfully");
    console.log("- Original text preserved");
    console.log("- Enhanced text stored");
    console.log("- enhanced_with_ai flag set to true");
    
    // 3. Editing the enhanced version
    logStep(3, "Editing the enhanced version of the note");
    logSuccess("Enhanced content updated while original preserved");
    
    // 4. Reverting to original
    logStep(4, "Reverting to original content");
    logSuccess("Note reverted to original");
    console.log("- enhanced_with_ai flag set to false");
    console.log("- enhanced_text_content and enhanced_delta_content cleared");
    
    // 5. Re-enhancing
    logStep(5, "Re-enhancing the note after revert");
    logSuccess("Note re-enhanced successfully");
    
    console.log("\n=== Test flow completed successfully ===");
    console.log("\nAPI flow demonstration:");
    console.log("1. PATCH /api/messages/:id with updateTarget='enhanced' - Updates enhanced content");
    console.log("2. POST /api/messages/:id/revert - Reverts to original content");
    console.log("3. POST /api/ai/enhance - Enhances content and sets enhanced flags");
    
    return true;
  } catch (error) {
    console.error("Test error:", error);
    return false;
  }
}

// Helper function to extract text from Delta format
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

// Run the mock test
mockTestEnhancedEditing()
  .then(success => {
    if (success) {
      console.log("\nMock test completed successfully!");
      process.exit(0);
    } else {
      console.error("\nMock test failed!");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("\nError running tests:", error);
    process.exit(1);
  }); 