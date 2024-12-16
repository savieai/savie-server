// import util from "util";
import { extractLinks, extractLinksFromDelta } from "./links.js";

function deltaToPlainText(delta) {
  return delta.ops.reduce((text, op) => {
    if (typeof op.insert === "string") {
      // If this insert has a link attribute, use the link URL
      if (op.attributes?.link) {
        return text + op.attributes.link;
      }
      return text + op.insert;
    }
    return text;
  }, "");
}

export function plainToDelta(text) {
  const linkRegex = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  const ops = [];
  let lastIndex = 0;

  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    // Add any text before the link
    if (match.index > lastIndex) {
      ops.push({
        insert: text.slice(lastIndex, match.index),
      });
    }

    ops.push({
      insert: match[0],
      attributes: {
        link: match[0],
      },
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    ops.push({
      insert: text.slice(lastIndex),
    });
  }

  if (ops.length === 0) {
    ops.push({
      insert: "",
    });
  }

  return { ops };
}

export function textConversions({ textContent, deltaContent }) {
  // user passes only text content or deltaContent
  let text_content = textContent;
  let delta_content = deltaContent;
  let links = [];

  if (deltaContent) {
    text_content = deltaToPlainText(deltaContent);
    links = extractLinksFromDelta(deltaContent);
  } else if (textContent) {
    delta_content = plainToDelta(textContent);
    links = extractLinks(textContent);
  }

  return { text_content, delta_content, links };
}

// const text = "Check out example.com and visit https://test.com also www.another.com";
// const delta = plainToDelta(text);
// const deltaLinks = extractLinksFromDelta(delta);
// const plainText = deltaToPlainText(delta);
// console.log(util.inspect(delta, false, null, true));
// console.log({ deltaLinks });
// console.log({ plainText });
