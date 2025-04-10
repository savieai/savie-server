import express from 'express';
import { enhanceText } from './textEnhancement.js';
import { extractTasks } from './taskExtraction.js';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import { transcribeAudio } from './transcription.js';
import { parseDateTime } from './parseDatetime.js';
import { extractAttendees } from './extractAttendees.js';
import { convertToTodo } from './convertToTodo.js';
import fs from 'fs';

const router = express.Router();

// Create client if environment variables are available, otherwise create a mock for testing
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && 
    process.env.NODE_ENV !== 'test') {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
} else {
  // Mock Supabase client for testing
  supabase = {
    from: (table) => ({
      insert: async (data) => ({ data, error: null }),
      select: function(columns, options) {
        const mockSelectObject = {
          data: [],
          error: null,
          count: 0,
          eq: function(field, value) {
            return {
              eq: function(field2, value2) {
                return {
                  maybeSingle: async () => ({ data: null, error: null }),
                  select: function(columns) {
                    return {
                      maybeSingle: async () => ({ data: null, error: null })
                    };
                  }
                };
              },
              maybeSingle: async () => ({ data: null, error: null }),
              gte: function(date) {
                return {
                  lte: function(date) {
                    return { count: 0, data: [], error: null };
                  }
                };
              }
            };
          }
        };
        
        // Add count property for exact count queries
        if (options && options.count === 'exact') {
          return { 
            ...mockSelectObject,
            eq: mockSelectObject.eq,
            count: 0
          };
        }
        
        return mockSelectObject;
      },
      update: async (data) => ({ data, error: null }),
      eq: function(field, value) {
        return {
          eq: function(field2, value2) {
            return {
              maybeSingle: async () => ({ data: null, error: null })
            };
          },
          maybeSingle: async () => ({ data: null, error: null })
        };
      }
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/mock-url' }, error: null })
      })
    }
  };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Enhance text endpoint
router.post('/enhance', async (req, res) => {
  try {
    const { content, format, message_id, force = false } = req.body;
    const { currentUser } = res.locals;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check if the format is Quill Delta
    const isQuillDelta = format === 'delta';
    
    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'enhance')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    const maxRequests = parseInt(process.env.AI_MAX_REQUESTS_PER_DAY || '100');
    if (count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have exceeded your daily limit for text enhancement'
      });
    }
    
    // If message_id is provided, check if it's already enhanced unless force=true
    if (message_id && !force) {
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('enhanced_with_ai')
        .eq('id', message_id)
        .eq('user_id', currentUser.sub)
        .maybeSingle();
      
      if (existingMessage && existingMessage.enhanced_with_ai) {
        return res.status(400).json({
          error: 'Already enhanced',
          message: 'This message has already been enhanced. Use force=true to override.'
        });
      }
    }
    
    // Enhance text with format awareness
    const enhanced = await enhanceText(content, isQuillDelta);
    
    // If message_id is provided, store the enhanced version in the database
    if (message_id) {
      const updateData = {
        enhanced_with_ai: true
      };
      
      if (isQuillDelta) {
        updateData.enhanced_delta_content = enhanced.enhanced;
      } else {
        updateData.enhanced_text_content = enhanced.enhanced;
      }
      
      const { error: updateError } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', message_id)
        .eq('user_id', currentUser.sub);
        
      if (updateError) {
        console.error('Error updating message with enhanced content:', updateError);
        // Continue with the response even if update fails
      }
    }
    
    // Track usage
    await supabase.from('ai_usage').insert({
      user_id: currentUser.sub,
      feature: 'enhance',
    });
    
    return res.json(enhanced);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Extract tasks endpoint
router.post('/extract-tasks', async (req, res) => {
  try {
    const { content, message_id } = req.body;
    const { currentUser } = res.locals;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'extract_tasks')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    const maxRequests = parseInt(process.env.AI_MAX_REQUESTS_PER_DAY || '100');
    if (count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have exceeded your daily limit for task extraction'
      });
    }
    
    // Extract tasks
    const tasks = await extractTasks(content);
    
    // Track usage
    await supabase.from('ai_usage').insert({
      user_id: currentUser.sub,
      feature: 'extract_tasks',
    });
    
    // Save tasks to database if message_id is provided
    if (message_id && tasks.length > 0) {
      const tasksToInsert = tasks.map(task => ({
        user_id: currentUser.sub,
        message_id,
        title: task.title,
        type: task.type,
        details: task.details,
        people: task.people || [],
      }));
      
      await supabase.from('tasks').insert(tasksToInsert);
      
      // Update message
      await supabase
        .from('messages')
        .update({ tasks_extracted: true })
        .eq('id', message_id);
    }
    
    // Check if user has an active Google Calendar connection
    const { data: connections, error: connError } = await supabase
      .from('service_connections')
      .select('*')
      .eq('user_id', currentUser.sub)
      .eq('provider', 'google')
      .eq('is_active', true);
    
    // Set calendar_connected to true if any active Google connection exists
    // This matches the logic in hasServiceConnection function for calendar service
    const calendar_connected = connections && connections.length > 0;
    
    return res.json({ 
      tasks,
      calendar_connected
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Transcribe audio endpoint
router.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { message_id } = req.body;
    const { currentUser } = res.locals;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'transcribe')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    if (count >= 50) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have exceeded your daily limit for audio transcription'
      });
    }
    
    // Transcribe audio
    const { transcription } = await transcribeAudio(file.path, currentUser.sub);
    
    // If message_id is provided, store the transcription in the database
    if (message_id) {
      // Check if there's a voice message associated with this message
      const { data: voiceMessage, error: voiceMessageError } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('message_id', message_id)
        .maybeSingle();
      
      if (voiceMessageError) {
        console.error('Error finding voice message:', voiceMessageError);
      } else if (voiceMessage) {
        // Update the voice message with the transcription
        const { error: updateError } = await supabase
          .from('voice_messages')
          .update({ transcription_text: transcription })
          .eq('message_id', message_id);
          
        if (updateError) {
          console.error('Error updating voice message with transcription:', updateError);
        }
      } else {
        // No voice message found for this message_id
        console.warn(`No voice message found for message_id: ${message_id}`);
      }
    }
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    return res.json({ transcription });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Parse date and time from text
router.post('/parse-datetime', async (req, res) => {
  try {
    const { text, reference_time, timezone } = req.body;
    const { currentUser } = res.locals;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid text',
        message: 'Text is required and must be a string'
      });
    }
    
    // Rate limit check
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'parse_datetime')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    if (count >= 100) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many parsing requests, please try again later'
      });
    }
    
    // Parse reference time if provided
    let refTime = new Date();
    if (reference_time) {
      try {
        refTime = new Date(reference_time);
        if (isNaN(refTime.getTime())) {
          return res.status(400).json({
            error: 'Invalid reference time',
            message: 'Reference time must be a valid ISO date string'
          });
        }
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid reference time',
          message: 'Reference time must be a valid ISO date string'
        });
      }
    }
    
    // Call the parser
    const result = await parseDateTime(text, refTime, timezone || 'UTC');
    
    // Track usage
    await supabase.from('ai_usage').insert({
      user_id: currentUser.sub,
      feature: 'parse_datetime',
      metadata: {
        text_length: text.length,
        parsed: result.parsed
      }
    });
    
    if (!result.parsed) {
      return res.status(422).json({
        error: 'Parsing failed',
        message: result.reason || 'Could not identify a date or time in the provided text',
        parsed: false
      });
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Date-time parsing error:', error);
    return res.status(500).json({ 
      error: 'Parsing failed',
      message: error.message
    });
  }
});

// Extract attendees from text
router.post('/extract-attendees', async (req, res) => {
  try {
    const { text, include_details = true } = req.body;
    const { currentUser } = res.locals;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid text',
        message: 'Text is required and must be a string'
      });
    }
    
    // Rate limit check
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'extract_attendees')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    if (count >= 100) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many extraction requests, please try again later'
      });
    }
    
    // Call the extractor
    const result = await extractAttendees(text, include_details);
    
    // Track usage
    await supabase.from('ai_usage').insert({
      user_id: currentUser.sub,
      feature: 'extract_attendees',
      metadata: {
        text_length: text.length,
        attendee_count: result.count
      }
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Attendee extraction error:', error);
    return res.status(500).json({ 
      error: 'Extraction failed',
      message: error.message 
    });
  }
});

// Convert to Todo List endpoint
router.post('/convert-to-todo', async (req, res) => {
  try {
    const { content, format, message_id } = req.body;
    const { currentUser } = res.locals;
    
    if (!content && !message_id) {
      return res.status(400).json({ error: 'Either content or message_id is required' });
    }
    
    // Check rate limits
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'convert_to_todo')
      .gte('used_at', `${today}T00:00:00`)
      .lte('used_at', `${today}T23:59:59`);
      
    const maxRequests = parseInt(process.env.AI_MAX_REQUESTS_PER_DAY || '100');
    if (count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'You have exceeded your daily limit for todo conversions'
      });
    }
    
    // Handle message-based request
    if (message_id && !content) {
      // Check if it's a text message or voice message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('id, text_content, delta_content')
        .eq('id', message_id)
        .eq('user_id', currentUser.sub)
        .maybeSingle();
      
      if (messageError) {
        console.error('Error fetching message:', messageError);
        return res.status(500).json({ error: 'Failed to fetch message' });
      }
      
      if (!message) {
        // Check if it's a voice message
        const { data: voiceMessage, error: voiceError } = await supabase
          .from('voice_messages')
          .select('message_id, transcription_text, voice_url')
          .eq('message_id', message_id)
          .maybeSingle();
        
        if (voiceError) {
          console.error('Error fetching voice message:', voiceError);
          return res.status(500).json({ error: 'Failed to fetch voice message' });
        }
        
        if (!voiceMessage) {
          return res.status(404).json({ error: 'Message not found' });
        }
        
        // If voice message is already transcribed, use that
        if (voiceMessage.transcription_text) {
          const result = await convertToTodo({
            content: voiceMessage.transcription_text,
            format: 'plain',
            userId: currentUser.sub
          });
          
          if (!result.success) {
            return res.status(result.statusCode || 500).json({ error: result.error });
          }
          
          return res.json(result);
        } else if (voiceMessage.voice_url) {
          // Need to transcribe first
          // Get the audio file
          const { data: signedUrl } = await supabase.storage
            .from('voice-messages')
            .createSignedUrl(voiceMessage.voice_url.split('/').pop(), 60);
          
          if (!signedUrl || !signedUrl.signedUrl) {
            return res.status(500).json({ error: 'Failed to access voice message file' });
          }
          
          // Download and save temporarily
          const response = await fetch(signedUrl.signedUrl);
          const buffer = await response.arrayBuffer();
          
          const tempDir = path.join(process.cwd(), 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFile = path.join(tempDir, `${Date.now()}.mp3`);
          fs.writeFileSync(tempFile, Buffer.from(buffer));
          
          // Process with transcription
          const result = await convertToTodo({
            voiceMessagePath: tempFile,
            format: 'plain',
            userId: currentUser.sub
          });
          
          if (!result.success) {
            return res.status(result.statusCode || 500).json({ error: result.error });
          }
          
          // If successful, update the voice message with the transcription
          await supabase
            .from('voice_messages')
            .update({ transcription_text: result.success ? extractTextFromVoiceResult(result) : '' })
            .eq('message_id', message_id);
          
          return res.json(result);
        } else {
          return res.status(400).json({ error: 'Voice message has no content to process' });
        }
      }
      
      // Handle text message
      const messageContent = message.delta_content || message.text_content;
      const messageFormat = message.delta_content ? 'delta' : 'plain';
      
      if (!messageContent) {
        return res.status(400).json({ error: 'Message has no content to process' });
      }
      
      const result = await convertToTodo({
        content: messageContent,
        format: messageFormat,
        userId: currentUser.sub
      });
      
      if (!result.success) {
        return res.status(result.statusCode || 500).json({ error: result.error });
      }
      
      return res.json(result);
    }
    
    // Handle direct content
    const result = await convertToTodo({
      content,
      format: format || 'plain',
      userId: currentUser.sub
    });
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({ error: result.error });
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper function to extract plain text from voice message result
function extractTextFromVoiceResult(result) {
  if (result.format === 'plain') {
    const regularText = result.regular_text || '';
    const tasks = Array.isArray(result.tasks) ? result.tasks.join('\n') : '';
    return tasks ? `${regularText}\n\n${tasks}` : regularText;
  }
  return '';
}

export default router; 