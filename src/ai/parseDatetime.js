import openai from './openai.js';

/**
 * Parse date and time from natural language text
 *
 * @param {string} text - Natural language text containing date-time information
 * @param {Date} referenceTime - Reference date to use as context 
 * @param {string} timezone - User's timezone (e.g., 'America/New_York')
 * @returns {Object} - Parsed date-time information
 */
export async function parseDateTime(text, referenceTime = new Date(), timezone = 'UTC') {
  const refDate = referenceTime.toISOString();
  
  const prompt = `
You are a datetime parsing assistant. Extract date and time information from the given text.
  
Instructions:
1. Identify dates, times, or datetime expressions in the text
2. Convert relative dates (like "tomorrow" or "next week") to absolute dates
3. Return the information in a structured JSON format like this:
{
  "parsed": true,
  "iso": "2023-04-25T15:00:00Z", 
  "components": {
    "year": 2023,
    "month": 4,
    "day": 25,
    "hour": 15,
    "minute": 0,
    "second": 0
  },
  "formatted": "April 25, 2023 at 3:00 PM"
}

Or if no date is found:
{
  "parsed": false,
  "reason": "No date or time found in text"
}

4. If no date or time is found, return that the parsing failed
5. If multiple dates are found, prioritize the most specific or salient one
6. Only consider dates within a reasonable future time frame (typically within 1 year)

Current Reference Time: ${refDate}
User's Timezone: ${timezone}
  `;
  
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: text
        }
      ]
    });
    
    try {
      const result = JSON.parse(completion.choices[0].message.content);
      
      // Enhance the result with the original text
      result.original_text = text;
      
      return result;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return {
        parsed: false,
        reason: 'Error parsing the AI response'
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to parse date-time: ${error.message}`);
  }
} 