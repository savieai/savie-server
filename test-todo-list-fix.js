import { enhanceText, preserveListFormatting } from './src/ai/textEnhancement.js';

// Sample todo list with multiple items (similar to the real data)
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

// Mock OpenAI response with MORE items than the original (this is the issue case)
const mockEnhancedText = 
`My To-Do List:
Buy groceries from the supermarket
Finish quarterly report for the team
Call mom about her birthday
Send email follow-up`;  // Note: This has 4 items but original only had 3

// Test function to verify our fix
async function testPreserveListFormatting() {
  console.log("=== Testing To-Do List Fix ===");
  
  // Count original list items
  let originalListItemCount = 0;
  todoListDelta.ops.forEach(op => {
    if (op.insert === '\n' && op.attributes && op.attributes.list === 'unchecked') {
      originalListItemCount++;
    }
  });
  
  console.log(`Original list items: ${originalListItemCount}`);
  console.log(`Enhanced text has ${mockEnhancedText.split('\n').length - 1} potential list items`);
  
  // Test direct preservation function
  const enhancedDelta = preserveListFormatting(todoListDelta, mockEnhancedText);
  
  // Count enhanced list items
  let enhancedListItemCount = 0;
  enhancedDelta.ops.forEach(op => {
    if (op.insert === '\n' && op.attributes && op.attributes.list === 'unchecked') {
      enhancedListItemCount++;
      console.log(`Found list item: ${JSON.stringify(op)}`);
    }
  });
  
  console.log(`\nEnhanced list items: ${enhancedListItemCount}`);
  console.log(`Problem fixed: ${enhancedListItemCount === mockEnhancedText.split('\n').length - 1 ? '✅ YES' : '❌ NO'}`);
  
  // Full comparison of input and output Deltas
  console.log("\nOriginal Delta:");
  console.log(JSON.stringify(todoListDelta, null, 2));
  
  console.log("\nEnhanced Delta:");
  console.log(JSON.stringify(enhancedDelta, null, 2));
}

// Run the test
testPreserveListFormatting()
  .then(() => console.log("\n=== Test completed ==="))
  .catch(err => console.error("Test failed:", err)); 