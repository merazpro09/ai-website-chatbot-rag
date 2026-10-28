/**
 * Splits text into overlapping word windows so each chunk keeps some context.
 */
export function chunkText(text, { size = 220, overlap = 40 } = {}) {
  if (overlap >= size) throw new Error('Chunk overlap must be smaller than chunk size.');
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let start = 0; start < words.length; start += size - overlap) {
    chunks.push(words.slice(start, start + size).join(' '));
    if (start + size >= words.length) break;
  }
  return chunks;
}

export function chunkPages(pages, options) {
  return pages.flatMap((page) =>
    chunkText(page.text, options).map((text, i) => ({
      id: `${page.url}#${i}`,
      url: page.url,
      title: page.title,
      text,
    })),
  );
}
