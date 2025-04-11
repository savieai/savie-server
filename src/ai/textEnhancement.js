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
      
      // Check if this is a to-do list or bullet list Delta (special handling)
      const isFormattedList = delta.ops && delta.ops.some(op => 
        op.attributes && (
          op.attributes.list === 'checked' || 
          op.attributes.list === 'unchecked' || 
          op.attributes.list === 'bullet'
        )
      );
      
      // Enhanced detection: Count how many list items we have
      let listItemCount = 0;
      if (delta.ops) {
        delta.ops.forEach(op => {
          if (op.insert === '\n' && op.attributes && op.attributes.list) {
            listItemCount++;
          }
        });
      }
      
      console.log(`Detected formatted list: ${isFormattedList}, list item count: ${listItemCount}`);
      
      // Extract plain text and formatting info from Delta
      const { plainText, formatMap, lineBreaks } = analyzeQuillDelta(delta);
      
      // Enhance the extracted text
      const response = await openai.chat.completions.create({
        model: process.env.AI_DEFAULT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: ENHANCEMENT_PROMPT },
          { role: "user", content: plainText }
        ],
        temperature: 0.3,
      });
      
      const enhancedText = response.choices[0].message.content;
      
      // Reapply formatting while preserving line breaks
      let enhancedDelta;
      
      // Use specialized handling for lists with 2+ items to ensure formatting integrity
      if (isFormattedList && listItemCount >= 1) {
        console.log("Using specialized list formatting preservation");
        enhancedDelta = preserveListFormatting(delta, enhancedText);
      } else {
        // Standard approach for regular content
        enhancedDelta = reconstructQuillDelta(enhancedText, formatMap, lineBreaks);
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
function preserveListFormatting(originalDelta, enhancedText) {
  // Extract the list formatting attributes from the original delta
  const listAttributes = [];
  let nonListOps = [];
  let defaultListAttribute = null;
  
  // Add debug logging
  console.log("Original Delta:", JSON.stringify(originalDelta));
  console.log("Enhanced Text:", enhancedText);
  
  // First pass: collect formatting info and find the dominant list type
  if (originalDelta.ops) {
    // Count attribute types to determine the default
    let checkedCount = 0;
    let uncheckedCount = 0;
    let bulletCount = 0;
    
    originalDelta.ops.forEach((op, index) => {
      if (typeof op.insert === 'string') {
        if (op.insert === '\n' && op.attributes && op.attributes.list) {
          // This is a list item line break (bullet, todo, etc)
          listAttributes.push(op.attributes);
          console.log(`Found list attribute at index ${index}:`, op.attributes);
          
          // Count by type
          if (op.attributes.list === 'checked') checkedCount++;
          if (op.attributes.list === 'unchecked') uncheckedCount++;
          if (op.attributes.list === 'bullet') bulletCount++;
        } else if (op.insert !== '\n') {
          // Collect non-list ops for additional formatting
          if (op.attributes) {
            nonListOps.push({
              text: op.insert,
              attributes: op.attributes
            });
          }
        }
      }
    });
    
    // Determine default list attribute for consistency
    if (uncheckedCount >= checkedCount && uncheckedCount >= bulletCount) {
      defaultListAttribute = { list: 'unchecked' };
    } else if (bulletCount >= uncheckedCount && bulletCount >= checkedCount) {
      defaultListAttribute = { list: 'bullet' };
    } else if (checkedCount > 0) {
      defaultListAttribute = { list: 'checked' };
    }
    
    console.log("Default list attribute:", defaultListAttribute);
  }
  
  console.log(`Found ${listAttributes.length} list attributes`);
  
  // Split the enhanced text into lines
  const enhancedLines = enhancedText.split('\n');
  console.log(`Enhanced text has ${enhancedLines.length} lines`);
  
  const newDelta = { ops: [] };
  
  // Create new Delta with preserved list formatting
  enhancedLines.forEach((line, index) => {
    // Skip empty lines at the beginning
    if (index === 0 && !line.trim()) {
      return;
    }
    
    // Add the text content
    if (line) {
      // Check if we have any text formatting to apply to this line
      const matchingFormat = nonListOps.find(op => line.includes(op.text));
      if (matchingFormat) {
        newDelta.ops.push({ 
          insert: line,
          attributes: matchingFormat.attributes
        });
      } else {
        newDelta.ops.push({ insert: line });
      }
    }
    
    // Critical fix: Ensure list formatting is applied to all lines
    // Each non-empty line should get a list attribute if available
    if (index < enhancedLines.length - 1 || enhancedText.endsWith('\n')) {
      // Find appropriate list attribute - ensure we don't run out
      let attributeToUse;
      
      if (listAttributes.length > 0) {
        // If we have attributes, use them in order, wrapping around if needed
        const attributeIndex = index % listAttributes.length;
        attributeToUse = listAttributes[attributeIndex];
      } else if (defaultListAttribute) {
        // Fall back to default if we ran out
        attributeToUse = defaultListAttribute;
      }
      
      // Only apply list attributes to non-empty lines or the last line
      if (attributeToUse && (line.trim() || index === enhancedLines.length - 1)) {
        // Apply list formatting to this line
        newDelta.ops.push({
          insert: '\n',
          attributes: attributeToUse
        });
        console.log(`Applied list attribute to line ${index}:`, attributeToUse);
      } else {
        // Regular line break
        newDelta.ops.push({ insert: '\n' });
        console.log(`No list attribute for line ${index}`);
      }
    }
  });
  
  // Final check: make sure we have at least one list attribute applied
  const hasListAttributes = newDelta.ops.some(op => 
    op.attributes && op.attributes.list
  );
  
  if (!hasListAttributes && defaultListAttribute && newDelta.ops.length > 0) {
    // No list attributes applied but we should have them - apply to all lines
    console.log("No list attributes applied - fixing");
    
    const fixedDelta = { ops: [] };
    
    for (let i = 0; i < newDelta.ops.length; i++) {
      const op = newDelta.ops[i];
      
      if (op.insert === '\n') {
        // Apply default list attribute to all line breaks
        fixedDelta.ops.push({
          insert: '\n',
          attributes: defaultListAttribute
        });
      } else {
        fixedDelta.ops.push(op);
      }
    }
    
    return fixedDelta;
  }
  
  console.log("Result Delta:", JSON.stringify(newDelta));
  return newDelta;
} 