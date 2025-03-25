import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { getOAuth2Client } from '../services/google-auth.js';
import { google } from 'googleapis';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Get tasks
router.get('/', async (req, res) => {
  try {
    const { currentUser } = res.locals;
    const { status, message_id } = req.query;
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.sub);
      
    if (status) {
      query = query.eq('status', status);
    }
    
    if (message_id) {
      query = query.eq('message_id', message_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.json({ tasks: data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Execute task
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentUser } = res.locals;
    
    // Get task
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', currentUser.sub)
      .single();
      
    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if Google is connected
    try {
      const oauth2Client = await getOAuth2Client(currentUser.sub);
      
      // Execute based on task type
      switch (task.type) {
        case 'calendar':
          const result = await createCalendarEvent(oauth2Client, task);
          
          // Update task status
          await supabase
            .from('tasks')
            .update({ 
              status: 'completed',
              external_id: result.id 
            })
            .eq('id', id);
            
          return res.json({ 
            status: 'success',
            message: 'Calendar event created',
            details: result
          });
          
        case 'email':
          const draft = await createEmailDraft(oauth2Client, task);
          
          // Update task status
          await supabase
            .from('tasks')
            .update({ 
              status: 'completed',
              external_id: draft.id 
            })
            .eq('id', id);
            
          return res.json({ 
            status: 'success',
            message: 'Email draft created',
            details: { 
              id: draft.id,
              url: `https://mail.google.com/mail/#drafts/${draft.id}` 
            }
          });
          
        default:
          return res.status(400).json({ 
            error: 'Unsupported task type',
            message: `Task type '${task.type}' is not supported yet`
          });
      }
    } catch (error) {
      if (error.message === 'Google account not connected') {
        return res.status(424).json({ 
          error: 'Google account not connected',
          code: 'google_not_connected',
          service: 'Google'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Helper function to create calendar event
async function createCalendarEvent(auth, task) {
  const calendar = google.calendar({ version: 'v3', auth });
  
  const event = {
    summary: task.title,
    description: task.details.content || '',
    start: {
      dateTime: task.details.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: task.details.end_time || new Date(new Date(task.details.start_time).getTime() + 60*60*1000).toISOString(),
      timeZone: 'UTC',
    },
    location: task.details.location || '',
  };
  
  // Add attendees if present
  if (task.people && task.people.length > 0) {
    event.attendees = task.people.map(person => {
      // Simple check if it's an email
      if (person.includes('@')) {
        return { email: person };
      }
      // Otherwise assume it's a name
      return { displayName: person };
    });
  }
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });
  
  return response.data;
}

// Helper function to create email draft
async function createEmailDraft(auth, task) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  let to = '';
  if (task.people && task.people.length > 0) {
    to = task.people.map(person => {
      if (person.includes('@')) {
        return person;
      }
      return '';
    }).filter(email => email !== '').join(',');
  }
  
  const subject = task.title;
  const body = task.details.content || '';
  
  // Create email in RFC 2822 format
  const email = [
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    'Content-Transfer-Encoding: 7bit',
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');
  
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const response = await gmail.users.drafts.create({
    userId: 'me',
    resource: {
      message: {
        raw: encodedEmail
      }
    }
  });
  
  return response.data;
}

export default router; 