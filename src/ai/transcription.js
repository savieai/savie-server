import fs from 'fs';
import openai from './openai.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function transcribeAudio(filePath, userId) {
  try {
    // Read the file as a stream
    const audioFile = fs.createReadStream(filePath);
    
    // Transcribe using OpenAI
    const transcript = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });
    
    // Track AI usage
    await supabase.from('ai_usage').insert({
      user_id: userId,
      feature: 'transcribe',
    });
    
    return {
      transcription: transcript,
      success: true
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
} 