import express from 'express';
import { searchByEmbedding, generateEmbedding } from '../ai/vectorSearch.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Search endpoint
router.get('/', async (req, res) => {
  try {
    const { currentUser } = res.locals;
    const { 
      q, 
      limit = 20, 
      offset = 0, 
      types, 
      min_similarity = 0.1 
    } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.status(400).json({ 
        error: 'Invalid query',
        message: 'Search query is required'
      });
    }
    
    // Rate limit check
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('ai_usage')
      .select('*', { count: 'exact' })
      .eq('user_id', currentUser.sub)
      .eq('feature', 'search')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
      
    if (count >= 100) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many search requests, please try again later'
      });
    }
    
    // Parse types if provided
    let parsedTypes = null;
    if (types && typeof types === 'string') {
      parsedTypes = types.split(',').map(t => t.trim());
    }
    
    // Perform semantic search
    const searchResults = await searchByEmbedding(q, currentUser.sub, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      minSimilarity: parseFloat(min_similarity),
      types: parsedTypes
    });
    
    // Track search usage
    await supabase.from('ai_usage').insert({
      user_id: currentUser.sub,
      feature: 'search',
      successful: true,
      metadata: {
        query_length: q.length,
        result_count: searchResults.results.length,
        search_type: searchResults.type
      }
    });
    
    // Prepare response with highlighting
    const results = searchResults.results.map(result => {
      const content = result.text_content || '';
      
      // Simple highlighting for text matches
      let highlights = [];
      if (searchResults.type === 'text') {
        const lowerContent = content.toLowerCase();
        const lowerQuery = q.toLowerCase();
        let startIndex = 0;
        
        while (startIndex < content.length) {
          const foundIndex = lowerContent.indexOf(lowerQuery, startIndex);
          if (foundIndex === -1) break;
          
          highlights.push({
            start: foundIndex,
            end: foundIndex + lowerQuery.length
          });
          
          startIndex = foundIndex + lowerQuery.length;
        }
      }
      
      return {
        ...result,
        highlights
      };
    });
    
    return res.status(200).json({
      results,
      type: searchResults.type,
      originalQuery: q,
      processedQuery: q, // In a more advanced implementation, this could be expanded
      count: results.length,
      total: searchResults.total,
      hasMore: parseInt(offset) + results.length < searchResults.total
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

export default router; 