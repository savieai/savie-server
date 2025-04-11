import { enhanceText } from './src/ai/textEnhancement.js';

// Sample todo list with multiple items
const todoListDelta = {
  ops: [
    { insert: "My To-Do List:" },
    { insert: "\n" },
    { insert: "Buy groceries" },
    { insert: "\n", attributes: { list: "unchecked" }},
    { insert: "Finish report" },
    { insert: "\n", attributes: { list: "unchecked" }},
    { insert: "Call mom" },
    { insert: "\n", attributes: { list: "unchecked" }}
  ]
};

// Sample bullet list
const bulletListDelta = {
  ops: [
    { insert: "Shopping List:" },
    { insert: "\n" },
    { insert: "Apples" },
    { insert: "\n", attributes: { list: "bullet" }},
    { insert: "Bananas" },
    { insert: "\n", attributes: { list: "bullet" }},
    { insert: "Oranges" },
    { insert: "\n", attributes: { list: "bullet" }}
  ]
};

// Mock OpenAI response - this allows us to test without API calls
jest.mock('./src/ai/openai.js', () => ({
  __esModule: true,
  default: {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (options) => {
          // Simple enhancement: capitalize first letter of each word
          const enhancedText = options.messages[1].content
            .split('\n')
            .map(line => line.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            )
            .join('\n');
            
          return {
            choices: [
              {
                message: {
                  content: enhancedText
                }
              }
            ]
          };
        })
      }
    }
  }
}));

// Test function to check if all items maintain their formatting
async function testListFormatting() {
  console.log("=== Testing List Formatting Preservation ===");
  
  // Test to-do list formatting
  console.log("\nTesting to-do list formatting...");
  try {
    const result = await enhanceText(todoListDelta, true);
    
    // Check if all to-do items still have the correct attributes
    let uncheckedCount = 0;
    result.enhanced.ops.forEach(op => {
      if (op.insert === '\n' && op.attributes && op.attributes.list === 'unchecked') {
        uncheckedCount++;
      }
    });
    
    console.log(`Original to-do items: 3, Enhanced to-do items: ${uncheckedCount}`);
    console.log(`To-do formatting preserved: ${uncheckedCount === 3 ? "✅ YES" : "❌ NO"}`);
    
    // Print the result for inspection
    console.log("\nEnhanced to-do Delta:");
    console.log(JSON.stringify(result.enhanced, null, 2));
  } catch (error) {
    console.error("Error testing to-do list:", error);
  }
  
  // Test bullet list formatting
  console.log("\nTesting bullet list formatting...");
  try {
    const result = await enhanceText(bulletListDelta, true);
    
    // Check if all bullet items still have the correct attributes
    let bulletCount = 0;
    result.enhanced.ops.forEach(op => {
      if (op.insert === '\n' && op.attributes && op.attributes.list === 'bullet') {
        bulletCount++;
      }
    });
    
    console.log(`Original bullet items: 3, Enhanced bullet items: ${bulletCount}`);
    console.log(`Bullet formatting preserved: ${bulletCount === 3 ? "✅ YES" : "❌ NO"}`);
    
    // Print the result for inspection
    console.log("\nEnhanced bullet Delta:");
    console.log(JSON.stringify(result.enhanced, null, 2));
  } catch (error) {
    console.error("Error testing bullet list:", error);
  }
}

// Run the test
testListFormatting()
  .then(() => console.log("\n=== Test completed ==="))
  .catch(err => console.error("Test failed:", err)); 