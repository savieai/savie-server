import express from 'express';
import { parseDateTime } from './parseDatetime.js';
import { extractAttendees } from './extractAttendees.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

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
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
      
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
      successful: result.parsed,
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
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
      
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
      successful: true,
      metadata: {
        text_length: text.length,
        attendee_count: result.count
      }
    });
    
    if (result.attendees.length === 0) {
      return res.status(422).json({
        error: 'Extraction failed',
        message: 'Could not identify any attendees in the provided text',
        attendees: []
      });
    }
    
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