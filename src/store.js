import fs from 'node:fs/promises';
import path from 'node:path';

export function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** A tiny vector store backed by one JSON file. Fine for a few thousand chunks. */
export class JsonVectorStore {
  constructor(items = [], meta = {}) {
    this.items = items;
    this.meta = meta;
  }

  static async load(filePath) {
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return new JsonVectorStore(raw.items || [], raw.meta || {});
  }

  async save(filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ meta: this.meta, items: this.items }));
  }

  search(queryVector, topK = 4) {
    return this.items
      .map((item) => ({ ...item, score: cosineSimilarity(queryVector, item.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ vector, ...rest }) => rest);
  }
}
