import express from 'express';
import { getAuthUrl, handleCallback } from './google-auth.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Connect to Google
router.get('/connect/google', async (req, res) => {
  try {
    const url = getAuthUrl();
    return res.json({ redirectUrl: url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Google OAuth callback
router.get('/callback/google', async (req, res) => {
  try {
    const { code } = req.query;
    const { currentUser } = res.locals;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const result = await handleCallback(code, currentUser.sub);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    
    // Redirect to app with success
    res.redirect(`${process.env.MOBILE_APP_URL || 'savie://'}/settings?googleConnected=true`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

// Get connected services
router.get('/', async (req, res) => {
  try {
    const { currentUser } = res.locals;
    
    const { data } = await supabase
      .from('service_connections')
      .select('service, created_at')
      .eq('user_id', currentUser.sub);
      
    const services = data.map(item => ({
      service: item.service,
      connected: true,
      connected_at: item.created_at
    }));
    
    return res.json({ services });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

export default router; 