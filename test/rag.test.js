import { describe, it, expect, vi } from 'vitest';
import { answerQuestion } from '../src/rag.js';
import { JsonVectorStore } from '../src/store.js';
import { createFakeClient, fakeEmbedding, baseConfig } from './helpers.js';

// Make sure nothing can reach the real OpenAI SDK
vi.mock('openai', () => ({ default: vi.fn(() => ({ fake: true })) }));

const docs = [
  { url: 'https://a.test/pricing/', title: 'Pricing', text: 'Website price starts at $999.' },
  { url: 'https://a.test/ai/', title: 'AI', text: 'Our chatbot answers questions and handles booking.' },
];
const store = new JsonVectorStore(docs.map((d, i) => ({ ...d, id: String(i), vector: fakeEmbedding(d.text) })));

describe('answerQuestion', () => {
  it('answers from retrieved context with citations', async () => {
    const client = createFakeClient('A new website price starts at $999 [1].');
    const result = await answerQuestion('What is the website price?', { client, store, config: baseConfig });

    expect(result.fallback).toBe(false);
    expect(result.answer).toContain('[1]');
    expect(result.sources).toEqual([{ n: 1, url: 'https://a.test/pricing/', title: 'Pricing' }]);

    const call = client.chat.completions.create.mock.calls[0][0];
    expect(call.model).toBe('gpt-4o-mini');
    expect(call.max_tokens).toBe(200);
    expect(call.messages[1].content).toContain('Website price starts at $999.');
  });

  it('falls back to the booking link when nothing relevant is found', async () => {
    const client = createFakeClient();
    const result = await answerQuestion("What's the weather?", { client, store, config: baseConfig });

    expect(result.fallback).toBe(true);
    expect(result.answer).toContain('https://example.com/book/');
    expect(client.chat.completions.create).not.toHaveBeenCalled();
  });

  it('uses the configured embedding model', async () => {
    const client = createFakeClient();
    await answerQuestion('chatbot?', { client, store, config: { ...baseConfig, embeddingModel: 'text-embedding-3-large' } });
    expect(client.embeddings.create).toHaveBeenCalledWith({ model: 'text-embedding-3-large', input: ['chatbot?'] });
  });

  it('creates the real client only through the (mocked) SDK', async () => {
    const { createOpenAIClient } = await import('../src/openai.js');
    expect(() => createOpenAIClient('')).toThrow(/OPENAI_API_KEY/);
    expect(createOpenAIClient('sk-test')).toEqual({ fake: true });
  });
});
