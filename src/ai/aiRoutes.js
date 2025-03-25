import express from 'express';
import { enhanceText } from './textEnhancement.js';
import { extractTasks } from './taskExtraction.js';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import { transcribeAudio } from './transcription.js';
import { parseDateTime } from './parseDatetime.js';
import { extractAttendees } from './extractAttendees.js';
import fs from 'fs';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

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
    const { content } = req.body;
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
    
    // Enhance text
    const enhanced = await enhanceText(content);
    
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
    
    return res.json({ tasks });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Transcribe audio endpoint
router.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
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

export default router; 