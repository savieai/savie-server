import openai from './openai.js';

const ENHANCEMENT_PROMPT = `
You are an AI assistant helping to enhance text notes. Your task is to:
1. Fix grammar and spelling errors
2. Improve clarity and readability
3. Organize information into paragraphs if needed
4. Maintain the original meaning and intent
5. Keep the same language as the input

Do NOT:
- Add new information not present in the original
- Change the style dramatically
- Make the text unnecessarily formal
- Add your own opinions or commentary
`;

export async function enhanceText(content) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: ENHANCEMENT_PROMPT },
        { role: "user", content: content }
      ],
      temperature: 0.3,
    });
    
    return {
      enhanced: response.choices[0].message.content,
      original: content
    };
  } catch (error) {
    console.error('Error enhancing text:', error);
    throw new Error(`Failed to enhance text: ${error.message}`);
  }
} 