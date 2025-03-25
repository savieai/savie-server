import openai from './openai.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Generate embedding for a text string
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: normalizeText(text),
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

// Search messages by vector similarity 
export async function searchByEmbedding(query, userId, options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      minSimilarity = 0.1,
      types = null
    } = options;
    
    // Generate embedding for search query
    const embedding = await generateEmbedding(query);
    
    // Direct vector search without stored procedure
    let dbQuery = supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId);
    
    if (types && Array.isArray(types) && types.length > 0) {
      dbQuery = dbQuery.in('type', types);
    }
    
    // Execute search (without vector search for now)
    const { data: results, error, count } = await dbQuery
      .limit(limit)
      .offset(offset)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
    
    // Fall back to text search since vector search isn't available
    return await fallbackToTextSearch(query, userId, options);
  } catch (error) {
    console.error('Search error:', error);
    
    // Fall back to text search if vector search fails
    return await fallbackToTextSearch(query, userId, options);
  }
}

// Fallback text search if vector search fails or returns no results
async function fallbackToTextSearch(query, userId, options = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      types = null
    } = options;
    
    let dbQuery = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .ilike('text_content', `%${query}%`);
    
    if (types && Array.isArray(types) && types.length > 0) {
      dbQuery = dbQuery.in('type', types);
    }
    
    const { data: results, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw new Error(`Text search failed: ${error.message}`);
    }
    
    // Add a fake similarity score for consistency
    const resultsWithSimilarity = results.map(result => ({
      ...result,
      similarity: 0.5 // Default similarity for text search
    }));
    
    return {
      results: resultsWithSimilarity,
      count,
      total: count,
      type: 'text',
      originalQuery: query
    };
  } catch (error) {
    console.error('Text search fallback error:', error);
    throw error;
  }
}

// Normalize text for more consistent embeddings
function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

// Add embedding to a message in the database
export async function addEmbeddingToNote(noteId, content) {
  try {
    const embedding = await generateEmbedding(content);
    
    const { error } = await supabase
      .from('messages')
      .update({ embedding })
      .eq('id', noteId);
    
    if (error) {
      throw new Error(`Failed to add embedding to message: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding embedding to message:', error);
    throw error;
  }
} 