import openai from './openai.js';

const ENHANCEMENT_PROMPT = `
You are an AI assistant helping to enhance text notes. Your task is to:
1. Fix grammar and spelling errors
2. Improve clarity and readability
3. Organize information into paragraphs if needed
4. Maintain the original meaning and intent
5. Keep the same language as the input
6. IMPORTANT: Preserve the exact same number of paragraphs and line breaks as the original

Do NOT:
- Add new information not present in the original
- Change the style dramatically
- Make the text unnecessarily formal
- Add your own opinions or commentary
`;

export async function enhanceText(content, isQuillDelta = false) {
  try {
    console.log(`[DEBUG] enhanceText called with isQuillDelta=${isQuillDelta}`);
    
    if (!isQuillDelta) {
      // Original plain text implementation
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
        original: content,
        format: 'plain'
      };
    } else {
      // Handle Quill Delta format
      let delta = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('[DEBUG] Original delta:', JSON.stringify(delta));
      
      // Improved detection of formatted lists - check for any line with list attributes
      const isFormattedList = delta.ops && delta.ops.some(op => 
        (op.attributes && (
          op.attributes.list === 'checked' || 
          op.attributes.list === 'unchecked' || 
          op.attributes.list === 'bullet'
        )) || 
        (op.insert === '\n' && op.attributes && op.attributes.list)
      );
      
      // Detect todo embedding format
      const hasTodoEmbeds = delta.ops && delta.ops.some(op => 
        typeof op.insert === 'object' && op.insert && op.insert.todo !== undefined
      );
      
      // Enhanced detection: Count how many list items we have
      let listItemCount = 0;
      if (delta.ops) {
        delta.ops.forEach(op => {
          if (op.insert === '\n' && op.attributes && op.attributes.list) {
            listItemCount++;
            console.log(`[DEBUG] Found list item with attribute: ${op.attributes.list}`);
          }
        });
      }
      
      // Detect whether content looks like a to-do list based on text
      let plainText = '';
      if (delta.ops) {
        delta.ops.forEach(op => {
          if (typeof op.insert === 'string') {
            plainText += op.insert;
          }
        });
      }
      
      // Check if it contains todo-related keywords
      const todoKeywords = ['to do', 'todo', 'to-do', 'checklist', 'task list'];
      const looksLikeTodoList = todoKeywords.some(keyword => 
        plainText.toLowerCase().includes(keyword)
      );
      
      const shouldUseListPreservation = isFormattedList || hasTodoEmbeds || looksLikeTodoList;
      
      console.log(`[DEBUG] Detection results:
        - isFormattedList: ${isFormattedList}
        - hasTodoEmbeds: ${hasTodoEmbeds}
        - looksLikeTodoList: ${looksLikeTodoList}
        - listItemCount: ${listItemCount}
        - shouldUseListPreservation: ${shouldUseListPreservation}`);
      
      // Extract plain text and formatting info from Delta
      const { plainText: extractedText, formatMap, lineBreaks } = analyzeQuillDelta(delta);
      console.log('[DEBUG] Extracted plain text:', extractedText);
      
      // Enhance the extracted text
      const response = await openai.chat.completions.create({
        model: process.env.AI_DEFAULT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: ENHANCEMENT_PROMPT },
          { role: "user", content: extractedText }
        ],
        temperature: 0.3,
      });
      
      const enhancedText = response.choices[0].message.content;
      console.log('[DEBUG] Enhanced text:', enhancedText);
      
      // Reapply formatting while preserving line breaks
      let enhancedDelta;
      
      // Use specialized handling for lists to ensure formatting integrity
      if (shouldUseListPreservation) {
        console.log("[DEBUG] Using specialized list formatting preservation");
        enhancedDelta = preserveListFormatting(delta, enhancedText);
      } else {
        // Standard approach for regular content
        console.log("[DEBUG] Using standard reconstruction");
        enhancedDelta = reconstructQuillDelta(enhancedText, formatMap, lineBreaks);
      }
      
      console.log('[DEBUG] Final enhanced delta:', JSON.stringify(enhancedDelta));
      
      // Ensure enhancedDelta has the correct structure expected by the client
      if (!enhancedDelta.hasOwnProperty('ops')) {
        console.error('[ERROR] Enhanced delta missing ops property. Adding it.');
        enhancedDelta = { ops: Array.isArray(enhancedDelta) ? enhancedDelta : [{ insert: JSON.stringify(enhancedDelta) }] };
      }
      
      return {
        enhanced: enhancedDelta,
        original: delta,
        format: 'delta'
      };
    }
  } catch (error) {
    console.error('Error enhancing text:', error);
    throw new Error(`Failed to enhance text: ${error.message}`);
  }
}

// Extract text and analyze formatting from Delta
function analyzeQuillDelta(delta) {
  let plainText = '';
  const formatMap = [];
  const lineBreaks = [];
  let currentPosition = 0;
  
  if (!delta.ops) {
    return { plainText, formatMap, lineBreaks };
  }
  
  delta.ops.forEach(op => {
    if (typeof op.insert === 'string') {
      // Check if this is a line break
      if (op.insert === '\n') {
        lineBreaks.push({
          position: currentPosition,
          attributes: op.attributes || {}
        });
        plainText += '\n';
        currentPosition += 1;
      } else {
        // Handle normal text
        plainText += op.insert;
        
        if (op.attributes) {
          formatMap.push({
            start: currentPosition,
            end: currentPosition + op.insert.length,
            attributes: op.attributes
          });
        }
        
        currentPosition += op.insert.length;
      }
    } else if (typeof op.insert === 'object') {
      // Handle embeds like images, videos, etc.
      plainText += ' ';  // Add a space as placeholder
      formatMap.push({
        start: currentPosition,
        end: currentPosition + 1,
        embed: op.insert,
        attributes: op.attributes
      });
      currentPosition += 1;
    }
  });
  
  return { plainText, formatMap, lineBreaks };
}

// Reconstruct Quill Delta from enhanced text and formatting info
function reconstructQuillDelta(enhancedText, formatMap, lineBreaks) {
  const newDelta = { ops: [] };
  
  // First, split the text at line breaks
  const textLines = enhancedText.split('\n');
  
  // Process each line
  textLines.forEach((line, index) => {
    // Apply any formatting to this line
    let lineStart = enhancedText.indexOf(line, index === 0 ? 0 : enhancedText.indexOf(textLines[index - 1]) + textLines[index - 1].length + 1);
    let lineEnd = lineStart + line.length;
    
    // Find formats that apply to this line
    let lineFormats = formatMap.filter(format => 
      (format.start <= lineEnd && format.end >= lineStart)
    );
    
    // If we have formats, apply them
    if (lineFormats.length > 0) {
      // Split the line according to different formats
      let currentPosition = lineStart;
      
      lineFormats.sort((a, b) => a.start - b.start);
      
      lineFormats.forEach(format => {
        // Add any text before this format
        if (format.start > currentPosition) {
          const plainPart = line.substring(currentPosition - lineStart, format.start - lineStart);
          if (plainPart) {
            newDelta.ops.push({ insert: plainPart });
          }
        }
        
        // Add the formatted part
        if (format.embed) {
          newDelta.ops.push({ 
            insert: format.embed,
            attributes: format.attributes 
          });
        } else {
          const formatStart = Math.max(format.start, lineStart);
          const formatEnd = Math.min(format.end, lineEnd);
          const formattedPart = line.substring(formatStart - lineStart, formatEnd - lineStart);
          
          if (formattedPart) {
            newDelta.ops.push({ 
              insert: formattedPart,
              attributes: format.attributes 
            });
          }
        }
        
        currentPosition = Math.max(currentPosition, format.end);
      });
      
      // Add any remaining text
      if (currentPosition < lineEnd) {
        const remainingPart = line.substring(currentPosition - lineStart);
        if (remainingPart) {
          newDelta.ops.push({ insert: remainingPart });
        }
      }
    } else {
      // No formatting, add the whole line
      if (line) {
        newDelta.ops.push({ insert: line });
      }
    }
    
    // Add line break if not the last line
    if (index < textLines.length - 1 || enhancedText.endsWith('\n')) {
      // Find matching line break
      const lineBreak = index < lineBreaks.length ? lineBreaks[index] : null;
      
      if (lineBreak && Object.keys(lineBreak.attributes).length > 0) {
        newDelta.ops.push({ 
          insert: '\n',
          attributes: lineBreak.attributes
        });
      } else {
        newDelta.ops.push({ insert: '\n' });
      }
    }
  });
  
  return newDelta;
}

// Simpler function that preserves line break attributes but doesn't try to be too clever
function replaceTextInDelta(delta, newText) {
  if (!delta.ops || delta.ops.length === 0) {
    return { ops: [{ insert: newText }] };
  }
  
  // Extract line break info from original delta
  const lineBreaks = [];
  let lineInserts = [];
  let lineBreakCount = 0;
  
  for (let i = 0; i < delta.ops.length; i++) {
    const op = delta.ops[i];
    if (typeof op.insert === 'string' && op.insert === '\n') {
      lineBreaks.push({
        index: lineBreakCount++,
        attributes: op.attributes || {}
      });
    } else if (typeof op.insert === 'string') {
      // Count line breaks in text content
      const breaks = op.insert.split('\n').length - 1;
      for (let j = 0; j < breaks; j++) {
        lineBreaks.push({
          index: lineBreakCount++,
          attributes: {}  // Inline breaks have no attributes
        });
      }
      
      // If this contains text content, gather for replacement
      if (op.insert.trim()) {
        lineInserts.push({
          text: op.insert,
          attributes: op.attributes
        });
      }
    }
  }
  
  // Split enhanced text by line breaks
  const enhancedLines = newText.split('\n');
  
  // Create new delta with enhanced text and preserved line breaks
  const newDelta = { ops: [] };
  
  enhancedLines.forEach((line, index) => {
    if (line) {
      newDelta.ops.push({
        insert: line,
        attributes: lineInserts.length > index % lineInserts.length 
          ? lineInserts[index % lineInserts.length].attributes 
          : undefined
      });
    }
    
    // Add line break if not the last line or if original ends with line break
    if (index < enhancedLines.length - 1 || newText.endsWith('\n')) {
      const lineBreak = lineBreaks[index] || { attributes: {} };
      
      if (Object.keys(lineBreak.attributes).length > 0) {
        newDelta.ops.push({ 
          insert: '\n',
          attributes: lineBreak.attributes
        });
      } else {
        newDelta.ops.push({ insert: '\n' });
      }
    }
  });
  
  return newDelta;
}

// Special function to preserve list formatting after enhancement
export function preserveListFormatting(originalDelta, enhancedText) {
  // Extract the list formatting attributes from the original delta
  const listAttributes = [];
  let nonListOps = [];
  let defaultListAttribute = null;
  
  // First pass: collect formatting info and find the dominant list type
  if (originalDelta.ops) {
    // Count attribute types to determine the default
    let checkedCount = 0;
    let uncheckedCount = 0;
    let bulletCount = 0;
    let orderedCount = 0;
    
    originalDelta.ops.forEach(op => {
      if (op.attributes && op.attributes.list) {
        if (op.attributes.list === 'checked') {
          checkedCount++;
        } else if (op.attributes.list === 'unchecked') {
          uncheckedCount++;
        } else if (op.attributes.list === 'bullet') {
          bulletCount++;
        } else if (op.attributes.list === 'ordered') {
          orderedCount++;
        }
        
        listAttributes.push({ ...op.attributes });
      } else {
        nonListOps.push(op);
      }
    });
    
    // Determine the default list attribute based on frequency
    if (checkedCount > 0 || uncheckedCount > 0) {
      defaultListAttribute = { list: checkedCount > uncheckedCount ? 'checked' : 'unchecked' };
    } else if (bulletCount > 0 || orderedCount > 0) {
      defaultListAttribute = { list: bulletCount > orderedCount ? 'bullet' : 'ordered' };
    }
  }
  
  // Split enhanced text into lines
  const lines = enhancedText.split('\n');
  
  // Determine if this is a list at all
  const isList = defaultListAttribute !== null;
  
  // Find title line (line without list formatting)
  let titleLineIndex = -1;
  if (isList && nonListOps.length > 0) {
    const firstLine = nonListOps.map(op => op.insert || '').join('').split('\n')[0];
    if (firstLine && firstLine.trim()) {
      titleLineIndex = 0;
    }
  }
  
  // Create a new delta with the enhanced text but preserve formatting
  const newDelta = { ops: [] };
  
  // For each line in the enhanced text
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const isLastLine = index === lines.length - 1;
    
    // We'll handle things differently for the last line
    if (!isLastLine) {
      // Regular line break handling (no change)
      if (isList && index > titleLineIndex) {
        // This line should have list formatting
        
        // First add the text content
        newDelta.ops.push({ insert: line });
        
        // Then add the formatting for this line
        let attributeToUse = defaultListAttribute;
        if (index - (titleLineIndex >= 0 ? 1 : 0) < listAttributes.length) {
          attributeToUse = listAttributes[index - (titleLineIndex >= 0 ? 1 : 0)];
        }
        
        newDelta.ops.push({
          insert: '\n',
          attributes: attributeToUse
        });
      } else {
        // Regular text without special formatting
        newDelta.ops.push({ insert: line + '\n' });
      }
    } 
    // Always handle the last line specially if it's part of a list
    else if (isList && line.trim() && index > titleLineIndex) {
      // First add the text content if we haven't already
      newDelta.ops.push({ insert: line });
      
      // Then always add the formatting for the last line
      let attributeToUse = defaultListAttribute;
      if (index - (titleLineIndex >= 0 ? 1 : 0) < listAttributes.length) {
        attributeToUse = listAttributes[index - (titleLineIndex >= 0 ? 1 : 0)];
      }
      
      newDelta.ops.push({
        insert: '\n',
        attributes: attributeToUse
      });
    }
    else if (line.trim() || isLastLine) {
      // Handle the last line, which might be empty
      newDelta.ops.push({ insert: line + (isLastLine && !line.trim() ? '' : '\n') });
    }
  }
  
  return newDelta;
} 