function deltaToPlainText(delta) {
  return delta.ops.reduce((text, op) => {
    if (typeof op.insert === "string") {
      return text + op.insert;
    }
    return text;
  }, "");
}

function plainToDelta(text) {
  return {
    ops: [
      {
        insert: text || "",
      },
    ],
  };
}

export function textConversions({ textContent, deltaContent }) {
  // user passes only text content or deltaContent, should work even if both are passed
  let text_content = textContent;
  let delta_content = deltaContent;

  if (deltaContent && !textContent) {
    text_content = deltaToPlainText(deltaContent);
  } else if (textContent && !deltaContent) {
    delta_content = plainToDelta(textContent);
  }

  return { text_content, delta_content };
}
