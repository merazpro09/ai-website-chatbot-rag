import { vi } from 'vitest';

/**
 * Fake OpenAI client. Embeddings are deterministic keyword vectors so
 * retrieval can be tested without calling the API.
 */
const VOCAB = ['website', 'price', 'seo', 'chatbot', 'booking', 'weather'];
export function fakeEmbedding(text) {
  const t = text.toLowerCase();
  return VOCAB.map((w) => (t.includes(w) ? 1 : 0)).concat([0.01]);
}

export function createFakeClient(answer = 'Websites start from $999 [1].') {
  return {
    embeddings: {
      create: vi.fn(async ({ input }) => ({
        data: input.map((text, index) => ({ index, embedding: fakeEmbedding(text) })),
      })),
    },
    chat: {
      completions: {
        create: vi.fn(async () => ({ choices: [{ message: { content: answer } }] })),
      },
    },
  };
}

export const baseConfig = {
  embeddingModel: 'text-embedding-3-small',
  chatModel: 'gpt-4o-mini',
  topK: 3,
  minScore: 0.3,
  bookingUrl: 'https://example.com/book/',
  maxAnswerTokens: 200,
  allowedOrigins: ['https://example.com'],
  rateLimitPerMinute: 3,
};
