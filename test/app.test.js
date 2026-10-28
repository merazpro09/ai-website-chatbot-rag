import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { JsonVectorStore } from '../src/store.js';
import { createFakeClient, fakeEmbedding, baseConfig } from './helpers.js';

const store = new JsonVectorStore([
  { id: '0', url: 'https://a.test/seo/', title: 'SEO', text: 'Local SEO for small business.', vector: fakeEmbedding('seo') },
]);
const silent = { error: () => {} };

describe('POST /chat', () => {
  it('returns an answer with sources', async () => {
    const app = createApp({ client: createFakeClient('We offer local SEO [1].'), store, config: baseConfig, logger: silent });
    const res = await request(app).post('/chat').send({ question: 'Do you do SEO?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('We offer local SEO [1].');
    expect(res.body.sources[0].url).toBe('https://a.test/seo/');
  });

  it('validates the question', async () => {
    const app = createApp({ client: createFakeClient(), store, config: baseConfig, logger: silent });
    expect((await request(app).post('/chat').send({})).status).toBe(400);
    expect((await request(app).post('/chat').send({ question: 'x'.repeat(501) })).status).toBe(400);
  });

  it('rate limits per client', async () => {
    const app = createApp({ client: createFakeClient(), store, config: baseConfig, logger: silent });
    for (let i = 0; i < 3; i++) await request(app).post('/chat').send({ question: 'seo?' });
    const res = await request(app).post('/chat').send({ question: 'seo?' });
    expect(res.status).toBe(429);
  });

  it('returns 503 with booking link when OpenAI fails', async () => {
    const client = createFakeClient();
    client.embeddings.create.mockRejectedValue(new Error('quota exceeded'));
    const app = createApp({ client, store, config: baseConfig, logger: silent });
    const res = await request(app).post('/chat').send({ question: 'seo?' });
    expect(res.status).toBe(503);
    expect(res.body.bookingUrl).toBe('https://example.com/book/');
  });

  it('only allows configured CORS origins', async () => {
    const app = createApp({ client: createFakeClient(), store, config: baseConfig, logger: silent });
    const good = await request(app).options('/chat').set('Origin', 'https://example.com');
    const bad = await request(app).options('/chat').set('Origin', 'https://evil.test');
    expect(good.headers['access-control-allow-origin']).toBe('https://example.com');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves the widget', async () => {
    const app = createApp({ client: createFakeClient(), store, config: baseConfig, logger: silent });
    const res = await request(app).get('/widget.js');
    expect(res.status).toBe(200);
    expect(res.text).toContain('rag-bubble');
  });
});
