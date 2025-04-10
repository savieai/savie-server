// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-key';

import express from 'express';
import bodyParser from 'body-parser';
import { convertToTodo } from './src/ai/convertToTodo.js';

// Create a simple express app for testing
const app = express();
const PORT = 3001;

// Add middleware
app.use(bodyParser.json());

// Mock authentication middleware
app.use((req, res, next) => {
  res.locals.currentUser = { sub: 'test-user-id' };
  next();
});

// Add the convert-to-todo endpoint directly, bypassing the full aiRoutes.js module
app.post('/ai/convert-to-todo', async (req, res) => {
  try {
    const { content, format, message_id } = req.body;
    const { currentUser } = res.locals;
    
    if (!content && !message_id) {
      return res.status(400).json({ error: 'Either content or message_id is required' });
    }
    
    // For testing, we'll skip message_id handling and just use direct content
    if (!content) {
      return res.status(400).json({ error: 'For testing, content is required' });
    }
    
    // Process the content directly
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

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/ai/convert-to-todo`);
  console.log(`\nPress Ctrl+C to stop`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down test server');
  server.close();
  process.exit(0);
}); 