import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.compose'
  ];
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  
  return url;
}

export async function handleCallback(code, userId) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in database
    await supabase
      .from('service_connections')
      .upsert({
        user_id: userId,
        service: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        expires_at: new Date(Date.now() + tokens.expiry_date).toISOString(),
      });
      
    return { success: true };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return { error: error.message };
  }
}

export async function getOAuth2Client(userId) {
  try {
    // Get tokens from database
    const { data, error } = await supabase
      .from('service_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('service', 'google')
      .single();
      
    if (error || !data) {
      throw new Error('Google account not connected');
    }
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    
    // Handle token refresh if needed
    if (new Date(data.expires_at) < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update tokens in database
      await supabase
        .from('service_connections')
        .update({
          access_token: credentials.access_token,
          expires_at: new Date(Date.now() + credentials.expiry_date).toISOString(),
        })
        .eq('id', data.id);
    }
    
    return oauth2Client;
  } catch (error) {
    console.error('Error getting OAuth client:', error);
    throw new Error(`Failed to get OAuth client: ${error.message}`);
  }
} 