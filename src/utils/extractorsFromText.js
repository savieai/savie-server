/**
 * Utility functions for extracting and manipulating text from Delta format
 */

/**
 * Extracts plain text from a Quill Delta object
 * @param {Object} delta - A Quill Delta object
 * @returns {string} The extracted plain text
 */
export function extractTextFromDelta(delta) {
    let plainText = '';
    
    if (!delta || !delta.ops) {
      return plainText;
    }
    
    delta.ops.forEach(op => {
      if (typeof op.insert === 'string') {
        plainText += op.insert;
      } else if (op.insert && typeof op.insert === 'object') {
        // For non-text inserts (like images), add a placeholder
        plainText += ' ';
      }
    });
    
    return plainText;
  }
  
  /**
   * Replaces text content in a Delta while preserving formatting
   * @param {Object} delta - Original Quill Delta
   * @param {string} newText - New text to insert
   * @returns {Object} New Delta with replaced text but preserved formatting
   */
  export function replaceTextInDelta(delta, newText) {
    if (!delta.ops || delta.ops.length === 0) {
      return { ops: [{ insert: newText }] };
    }
    
    // Create a new Delta structure
    let newDelta = { ops: [] };
    let textIndex = 0;
    
    delta.ops.forEach(op => {
      if (typeof op.insert === 'string') {
        const length = op.insert.length;
        
        if (textIndex < newText.length) {
          // Get portion of enhanced text corresponding to this op
          let endIndex = Math.min(textIndex + length, newText.length);
          let chunk = newText.substring(textIndex, endIndex);
          
          // Add the chunk with the same attributes
          newDelta.ops.push({
            insert: chunk,
            attributes: op.attributes
          });
          
          textIndex += chunk.length;
        }
      } else if (op.insert && typeof op.insert === 'object') {
        // For non-text inserts, keep them as-is
        newDelta.ops.push(op);
        textIndex += 1; // Account for placeholder
      }
    });
    
    // Add any remaining text
    if (textIndex < newText.length) {
      newDelta.ops.push({
        insert: newText.substring(textIndex)
      });
    }
    
    return newDelta;
  }