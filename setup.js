// setup.js
import fs from 'fs';

// Load env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env';

if (fs.existsSync(envFile)) {
  console.log(`Loading environment from ${envFile}`);
  require('dotenv').config({ path: envFile });
} else {
  console.log('Using default .env file');
  require('dotenv').config();
}

// Continue with normal server startup
import('./src/server.js'); 