export function extractLinks(text) {
  const linkRegex = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  return text?.match(linkRegex) || [];
}

export function transformLinks({ links, messageId }) {
  return links.map((link) => ({
    url: link,
    message_id: messageId,
  }));
}

export function extractLinksFromDelta(delta) {
  const links = [];

  // Get links from link attributes
  delta.ops.forEach((op) => {
    if (op.attributes?.link) {
      links.push(op.attributes.link);
    }

    // Also check for links in the text content itself
    if (typeof op.insert === "string") {
      const linkRegex =
        /\b(?:https?:\/\/)?(?:www\.)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
      const matches = op.insert.match(linkRegex);
      if (matches) {
        links.push(...matches);
      }
    }
  });

  return [...new Set(links)];
}
