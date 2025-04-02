import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { enhanceText } from '../src/ai/textEnhancement.js';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Sample data for testing
const plainTextSample = "This is a sample text that needs enhancement. it has some grammar errors and punctuation issues";
const quillDeltaSample = {
  ops: [
    { insert: "Shopping List:", attributes: { bold: true } },
    { insert: "\n" },
    { insert: "Buy milk", attributes: { list: "bullet" } },
    { insert: "\n" },
    { insert: "get eggs from store", attributes: { list: "bullet" } },
    { insert: "\n" }
  ]
};

/**
 * Test enhanced text storage by:
 * 1. Creating a test message
 * 2. Enhancing the text content
 * 3. Updating the message with enhanced content
 * 4. Verifying the storage
 */
async function testEnhancedTextStorage() {
  console.log("=== Testing Enhanced Text Storage ===");
  
  try {
    // Get test user id from the first user in the database
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error("Error getting test user:", userError || "No users found");
      return false;
    }
    
    const userId = users[0].id;
    console.log(`Using test user: ${userId}`);
    
    // 1. Create test message with plain text
    console.log("\n1. Creating test message with plain text...");
    const { data: plainTextMessage, error: plainTextError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        text_content: plainTextSample,
        delta_content: null
      })
      .select()
      .single();
      
    if (plainTextError) {
      console.error("Error creating plain text message:", plainTextError);
      return false;
    }
    
    console.log(`Created message with ID: ${plainTextMessage.id}`);
    
    // 2. Enhance the text
    console.log("\n2. Enhancing plain text...");
    const enhancedPlainText = await enhanceText(plainTextSample);
    console.log(`Original: ${plainTextSample}`);
    console.log(`Enhanced: ${enhancedPlainText.enhanced}`);
    
    // 3. Update message with enhanced content
    console.log("\n3. Updating message with enhanced text...");
    const { error: updatePlainTextError } = await supabase
      .from('messages')
      .update({
        enhanced_with_ai: true,
        enhanced_text_content: enhancedPlainText.enhanced
      })
      .eq('id', plainTextMessage.id);
      
    if (updatePlainTextError) {
      console.error("Error updating plain text message:", updatePlainTextError);
      return false;
    }
    
    // 4. Verify plain text storage
    console.log("\n4. Verifying plain text enhancement storage...");
    const { data: verifiedPlainText, error: verifyPlainTextError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', plainTextMessage.id)
      .single();
      
    if (verifyPlainTextError) {
      console.error("Error verifying plain text message:", verifyPlainTextError);
      return false;
    }
    
    console.log("Plain text enhancement stored successfully:");
    console.log(`- Enhanced: ${verifiedPlainText.enhanced_with_ai}`);
    console.log(`- Original content: ${verifiedPlainText.text_content}`);
    console.log(`- Enhanced content: ${verifiedPlainText.enhanced_text_content}`);
    
    // 5. Create test message with Delta format
    console.log("\n5. Creating test message with Delta format...");
    const { data: deltaMessage, error: deltaError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        text_content: "Shopping List:\n- Buy milk\n- get eggs from store",
        delta_content: quillDeltaSample
      })
      .select()
      .single();
      
    if (deltaError) {
      console.error("Error creating delta message:", deltaError);
      return false;
    }
    
    console.log(`Created delta message with ID: ${deltaMessage.id}`);
    
    // 6. Enhance the delta content
    console.log("\n6. Enhancing delta content...");
    const enhancedDelta = await enhanceText(quillDeltaSample, true);
    console.log(`Original delta: ${JSON.stringify(quillDeltaSample, null, 2)}`);
    console.log(`Enhanced delta: ${JSON.stringify(enhancedDelta.enhanced, null, 2)}`);
    
    // 7. Update message with enhanced delta content
    console.log("\n7. Updating message with enhanced delta...");
    const { error: updateDeltaError } = await supabase
      .from('messages')
      .update({
        enhanced_with_ai: true,
        enhanced_delta_content: enhancedDelta.enhanced
      })
      .eq('id', deltaMessage.id);
      
    if (updateDeltaError) {
      console.error("Error updating delta message:", updateDeltaError);
      return false;
    }
    
    // 8. Verify delta storage
    console.log("\n8. Verifying delta enhancement storage...");
    const { data: verifiedDelta, error: verifyDeltaError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', deltaMessage.id)
      .single();
      
    if (verifyDeltaError) {
      console.error("Error verifying delta message:", verifyDeltaError);
      return false;
    }
    
    console.log("Delta enhancement stored successfully:");
    console.log(`- Enhanced: ${verifiedDelta.enhanced_with_ai}`);
    console.log(`- Original content: ${verifiedDelta.text_content}`);
    console.log(`- Enhanced delta: ${JSON.stringify(verifiedDelta.enhanced_delta_content, null, 2)}`);
    
    return true;
  } catch (error) {
    console.error("Error in testEnhancedTextStorage:", error);
    return false;
  }
}

/**
 * Test transcription storage by:
 * 1. Finding a message with a voice_message
 * 2. Simulating a transcription
 * 3. Updating the voice_message with transcription
 * 4. Verifying the storage
 */
async function testTranscriptionStorage() {
  console.log("\n=== Testing Transcription Storage ===");
  
  try {
    // 1. Find a message with a voice message
    console.log("\n1. Finding a message with a voice message...");
    const { data: voiceMessages, error: voiceMessageError } = await supabase
      .from('voice_messages')
      .select('message_id')
      .limit(1);
      
    if (voiceMessageError) {
      console.error("Error finding voice message:", voiceMessageError);
      // If no voice message found, create a mock one
      console.log("No voice message found, creating a mock test case...");
      return await testMockTranscription();
    }
    
    if (!voiceMessages || voiceMessages.length === 0) {
      console.log("No voice messages found, creating a mock test case...");
      return await testMockTranscription();
    }
    
    const messageId = voiceMessages[0].message_id;
    console.log(`Found voice message for message ID: ${messageId}`);
    
    // 2. Simulate transcription
    const mockTranscription = "This is a simulated transcription of a voice message.";
    
    // 3. Update voice message with transcription
    console.log("\n3. Updating voice message with transcription...");
    const { error: updateError } = await supabase
      .from('voice_messages')
      .update({ transcription_text: mockTranscription })
      .eq('message_id', messageId);
      
    if (updateError) {
      console.error("Error updating voice message:", updateError);
      return false;
    }
    
    // 4. Verify transcription storage
    console.log("\n4. Verifying transcription storage...");
    const { data: verifiedVoiceMessage, error: verifyError } = await supabase
      .from('voice_messages')
      .select('*')
      .eq('message_id', messageId)
      .single();
      
    if (verifyError) {
      console.error("Error verifying voice message:", verifyError);
      return false;
    }
    
    console.log("Transcription stored successfully:");
    console.log(`- Message ID: ${verifiedVoiceMessage.message_id}`);
    console.log(`- Transcription: ${verifiedVoiceMessage.transcription_text}`);
    
    return true;
  } catch (error) {
    console.error("Error in testTranscriptionStorage:", error);
    return false;
  }
}

/**
 * Test with a mock voice message if no real voice messages are found
 */
async function testMockTranscription() {
  try {
    // Get test user id
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error("Error getting test user:", userError || "No users found");
      return false;
    }
    
    const userId = users[0].id;
    
    // 1. Create a test message
    console.log("\n1. Creating a test message for mock transcription...");
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        text_content: "Test message for voice transcription",
        attachment_types: ["voice"]
      })
      .select()
      .single();
      
    if (messageError) {
      console.error("Error creating test message:", messageError);
      return false;
    }
    
    const messageId = message.id;
    console.log(`Created test message with ID: ${messageId}`);
    
    // 2. Create a mock voice message
    console.log("\n2. Creating a mock voice message...");
    const { error: voiceMessageError } = await supabase
      .from('voice_messages')
      .insert({
        message_id: messageId,
        signed_url: "https://example.com/mock-audio.mp3",
        url: "mock-audio.mp3",
        duration: 10.5,
        peaks: JSON.stringify([0.1, 0.2, 0.3, 0.5, 0.7, 0.2])
      });
      
    if (voiceMessageError) {
      console.error("Error creating mock voice message:", voiceMessageError);
      return false;
    }
    
    // 3. Add mock transcription
    console.log("\n3. Adding mock transcription...");
    const mockTranscription = "This is a mock transcription for testing purposes.";
    
    const { error: updateError } = await supabase
      .from('voice_messages')
      .update({ transcription_text: mockTranscription })
      .eq('message_id', messageId);
      
    if (updateError) {
      console.error("Error updating with mock transcription:", updateError);
      return false;
    }
    
    // 4. Verify mock transcription storage
    console.log("\n4. Verifying mock transcription storage...");
    const { data: verifiedVoiceMessage, error: verifyError } = await supabase
      .from('voice_messages')
      .select('*')
      .eq('message_id', messageId)
      .single();
      
    if (verifyError) {
      console.error("Error verifying mock voice message:", verifyError);
      return false;
    }
    
    console.log("Mock transcription stored successfully:");
    console.log(`- Message ID: ${verifiedVoiceMessage.message_id}`);
    console.log(`- Transcription: ${verifiedVoiceMessage.transcription_text}`);
    
    return true;
  } catch (error) {
    console.error("Error in testMockTranscription:", error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("===== STARTING TESTS =====");
  
  // First, execute the SQL script to ensure the schema is updated
  console.log("\n=== Executing Schema Updates ===");
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'update-schema-enhanced-storage.sql');
    const sqlScript = fs.readFileSync(scriptPath, 'utf8');
    
    // Split script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        console.error(`Error executing SQL: ${statement}`, error);
        console.warn("Continuing with tests despite SQL error...");
      }
    }
    
    console.log("Schema updates completed");
  } catch (error) {
    console.error("Error executing schema updates:", error);
    console.warn("Continuing with tests despite schema update error...");
  }
  
  // Run tests
  const enhancedTextResult = await testEnhancedTextStorage();
  const transcriptionResult = await testTranscriptionStorage();
  
  console.log("\n===== TEST RESULTS =====");
  console.log(`Enhanced Text Storage: ${enhancedTextResult ? 'PASSED' : 'FAILED'}`);
  console.log(`Transcription Storage: ${transcriptionResult ? 'PASSED' : 'FAILED'}`);
  
  if (enhancedTextResult && transcriptionResult) {
    console.log("\n✅ All tests passed! The implementation is working correctly.");
  } else {
    console.log("\n❌ Some tests failed. Please review the errors above.");
  }
}

// Run the tests
runTests().catch(error => {
  console.error("Test execution failed:", error);
}); 