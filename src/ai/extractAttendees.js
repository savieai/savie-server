import openai from './openai.js';

/**
 * Extract potential meeting attendees from text
 * 
 * @param {string} text - Text containing references to people
 * @param {boolean} includeDetails - Whether to include details about each person
 * @returns {Array|Object} - List of attendees or object with attendees and explanation
 */
export async function extractAttendees(text, includeDetails = false) {
  try {
    const systemPrompt = includeDetails ? 
      `Extract people mentioned in the text who might be meeting attendees. For each person, identify:
      1. Their name
      2. Their role or affiliation (if mentioned)
      3. Their relationship to the speaker (if mentioned)
      4. Contact information (if mentioned)
      
      Return a JSON object with these properties:
      {
        "attendees": [
          {
            "name": "Person's name",
            "role": "Their role or null",
            "affiliation": "Their organization or null",
            "relationship": "Their relationship to speaker or null",
            "contact": "Contact info or null"
          }
        ],
        "explanation": "Brief explanation of why you identified these people as attendees"
      }
      ` :
      `Extract people mentioned in the text who might be meeting attendees. Return a JSON array of names only.`;
    
    const response = await openai.chat.completions.create({
      model: process.env.AI_DEFAULT_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return includeDetails ? result : (result.attendees || result);
  } catch (error) {
    console.error('Error extracting attendees:', error);
    return includeDetails ? { attendees: [], explanation: 'Error processing request' } : [];
  }
} 