import { describe, it, expect, vi } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ingest } from '../scripts/ingest.js';
import { createFakeClient, baseConfig } from './helpers.js';

describe('ingest', () => {
  it('crawls, chunks, embeds and saves a vector file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-'));
    const html = '<html><title>Services</title><body><p>' + 'We build website and chatbot projects. '.repeat(20) + '</p></body></html>';
    const responses = {
      'https://a.test/sitemap.xml': '<urlset><url><loc>https://a.test/services/</loc></url></urlset>',
      'https://a.test/services/': html,
    };
    const fetchImpl = vi.fn(async (url) => ({ ok: true, status: 200, text: async () => responses[url] }));
    const client = createFakeClient();
    const config = {
      ...baseConfig,
      sitemapUrl: 'https://a.test/sitemap.xml',
      maxPages: 10,
      crawlDelayMs: 0,
      chunkSizeWords: 50,
      chunkOverlapWords: 10,
      vectorStorePath: path.join(dir, 'vectors.json'),
    };

    const store = await ingest({ config, client, fetchImpl, sleep: async () => {}, logger: {} });
    expect(store.items.length).toBeGreaterThan(1);
    expect(client.embeddings.create).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(await fs.readFile(config.vectorStorePath, 'utf8'));
    expect(saved.meta.embeddingModel).toBe('text-embedding-3-small');
    expect(saved.items[0].vector.length).toBeGreaterThan(0);
  });
});
