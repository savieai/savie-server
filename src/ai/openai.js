import OpenAI from 'openai';

// Handle missing API key for testing
const apiKey = process.env.OPENAI_API_KEY || 'sk-test-key';

// If the key starts with 'sk-test' or we're in a test environment, create a mock
const isMockKey = apiKey.startsWith('sk-test') || process.env.NODE_ENV === 'test';

let openai;

if (isMockKey) {
  // Create a mock OpenAI instance for testing
  openai = {
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  tasks: [
                    "Call Mike about the contract",
                    "Pick up groceries after work - milk, eggs, and bread",
                    "Remind about the weekend event",
                    "Prepare presentation for Monday's meeting"
                  ],
                  regular_text: "Tomorrow. The weather looks good for Saturday, should be fun."
                })
              }
            }
          ]
        })
      }
    },
    audio: {
      transcriptions: {
        create: async () => "Transcribed audio content for testing."
      }
    }
  };
} else {
  // Create actual OpenAI instance
  openai = new OpenAI({
    apiKey: apiKey,
  });
}

export default openai; 