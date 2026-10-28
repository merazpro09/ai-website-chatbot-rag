import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { chunkText, chunkPages } from '../src/chunk.js';
import { JsonVectorStore, cosineSimilarity } from '../src/store.js';

describe('chunkText', () => {
  it('creates overlapping chunks', () => {
    const words = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    const chunks = chunkText(words, { size: 10, overlap: 2 });
    expect(chunks).toHaveLength(3);
    expect(chunks[1].startsWith('w8 w9')).toBe(true);
  });

  it('rejects overlap >= size', () => {
    expect(() => chunkText('a b c', { size: 2, overlap: 2 })).toThrow();
  });

  it('keeps page metadata on chunks', () => {
    const [c] = chunkPages([{ url: 'https://a.test/', title: 'Home', text: 'hello world' }], { size: 10, overlap: 2 });
    expect(c).toEqual({ id: 'https://a.test/#0', url: 'https://a.test/', title: 'Home', text: 'hello world' });
  });
});

describe('JsonVectorStore', () => {
  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('saves, loads and searches', async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'rag-')), 'v.json');
    const store = new JsonVectorStore([
      { id: 'a', text: 'A', vector: [1, 0] },
      { id: 'b', text: 'B', vector: [0, 1] },
    ]);
    await store.save(file);
    const loaded = await JsonVectorStore.load(file);
    const [top] = loaded.search([0.9, 0.1], 1);
    expect(top.id).toBe('a');
    expect(top.vector).toBeUndefined();
  });
});
