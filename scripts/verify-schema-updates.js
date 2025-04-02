import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

/**
 * Verifies that the database schema updates have been applied
 */
async function verifySchemaUpdates() {
  console.log("===== VERIFYING DATABASE SCHEMA UPDATES =====");
  
  // Check that messages table has the new columns
  try {
    console.log("\nChecking messages table...");
    
    // Create a test message to check if new columns exist
    const testMessage = {
      user_id: process.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000000",
      text_content: "Test message for schema verification",
      enhanced_with_ai: true,
      enhanced_text_content: "Enhanced test message",
      enhanced_delta_content: { ops: [{ insert: "Enhanced test" }] }
    };
    
    const { data: message, error } = await supabase
      .from('messages')
      .insert(testMessage)
      .select()
      .single();
      
    if (error) {
      console.error("❌ Error inserting test message:", error);
      if (error.message.includes("enhanced_text_content") || 
          error.message.includes("enhanced_delta_content")) {
        console.error("❌ New columns do not exist in messages table!");
      }
      return false;
    }
    
    // Check if all columns exist
    const hasEnhancedWithAI = typeof message.enhanced_with_ai !== 'undefined';
    const hasEnhancedTextContent = typeof message.enhanced_text_content !== 'undefined';
    const hasEnhancedDeltaContent = typeof message.enhanced_delta_content !== 'undefined';
    
    if (hasEnhancedWithAI && hasEnhancedTextContent && hasEnhancedDeltaContent) {
      console.log("✅ Messages table has all required columns");
    } else {
      console.error("❌ Messages table is missing columns:");
      if (!hasEnhancedWithAI) console.error("  - enhanced_with_ai");
      if (!hasEnhancedTextContent) console.error("  - enhanced_text_content");
      if (!hasEnhancedDeltaContent) console.error("  - enhanced_delta_content");
      return false;
    }
    
    // Clean up the test message
    await supabase.from('messages').delete().eq('id', message.id);
    
  } catch (error) {
    console.error("❌ Error checking messages table:", error);
    return false;
  }
  
  // Check that voice_messages table has the new column
  try {
    console.log("\nChecking voice_messages table...");
    
    // Create a test message first
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: process.env.TEST_USER_ID || "00000000-0000-0000-0000-000000000000",
        text_content: "Test message for voice_message verification"
      })
      .select()
      .single();
      
    if (messageError) {
      console.error("❌ Error creating test message for voice_message:", messageError);
      return false;
    }
    
    // Create a test voice_message to check if new column exists
    const testVoiceMessage = {
      message_id: message.id,
      url: "test-url.mp3",
      signed_url: "https://example.com/test-url.mp3",
      duration: 10.5,
      peaks: [0.1, 0.2, 0.3, 0.5, 0.7, 0.2],
      transcription_text: "This is a test transcription"
    };
    
    const { data: voiceMessage, error } = await supabase
      .from('voice_messages')
      .insert(testVoiceMessage)
      .select()
      .single();
      
    if (error) {
      console.error("❌ Error inserting test voice_message:", error);
      if (error.message.includes("transcription_text")) {
        console.error("❌ New column does not exist in voice_messages table!");
      }
      
      // Clean up test message
      await supabase.from('messages').delete().eq('id', message.id);
      return false;
    }
    
    // Check if transcription_text column exists
    const hasTranscriptionText = typeof voiceMessage.transcription_text !== 'undefined';
    
    if (hasTranscriptionText) {
      console.log("✅ voice_messages table has transcription_text column");
    } else {
      console.error("❌ voice_messages table is missing transcription_text column");
      
      // Clean up test message and voice_message
      await supabase.from('voice_messages').delete().eq('message_id', message.id);
      await supabase.from('messages').delete().eq('id', message.id);
      return false;
    }
    
    // Clean up test message and voice_message
    await supabase.from('voice_messages').delete().eq('message_id', message.id);
    await supabase.from('messages').delete().eq('id', message.id);
    
  } catch (error) {
    console.error("❌ Error checking voice_messages table:", error);
    return false;
  }
  
  console.log("\n✅ All database schema updates have been successfully applied!");
  return true;
}

// Main function
async function main() {
  console.log("Verifying schema updates...");
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.error("❌ Error: SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required");
    console.error("Please create a .env file with these variables or set them in your environment");
    process.exit(1);
  }
  
  try {
    const success = await verifySchemaUpdates();
    
    if (!success) {
      console.log("\n❌ Schema verification failed. You can apply the updates manually using the update-schema-enhanced-storage.sql script.");
      process.exit(1);
    }
    
    console.log("\n✅ All schema updates verified successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during verification:", error);
    process.exit(1);
  }
}

// Run the main function
main(); 