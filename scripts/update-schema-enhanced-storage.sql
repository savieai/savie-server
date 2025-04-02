-- Add fields to store enhanced content in messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS enhanced_text_content TEXT,
ADD COLUMN IF NOT EXISTS enhanced_delta_content JSONB;

-- Add field to store transcription in voice_messages table
ALTER TABLE voice_messages
ADD COLUMN IF NOT EXISTS transcription_text TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_enhanced_with_ai ON messages(enhanced_with_ai);
CREATE INDEX IF NOT EXISTS idx_voice_messages_message_id ON voice_messages(message_id);

-- Update comments for clarity
COMMENT ON COLUMN messages.enhanced_text_content IS 'AI-enhanced version of the plain text content';
COMMENT ON COLUMN messages.enhanced_delta_content IS 'AI-enhanced version of the rich text content (Quill Delta format)';
COMMENT ON COLUMN voice_messages.transcription_text IS 'Transcribed text from the voice message audio'; 