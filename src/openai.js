import OpenAI from 'openai';

export function createOpenAIClient(apiKey) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required.');
  return new OpenAI({ apiKey });
}

/** Embeds texts in batches. Returns one vector per input, in order. */
export async function embedTexts(client, texts, { model, batchSize = 96 } = {}) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await client.embeddings.create({ model, input: batch });
    const sorted = [...res.data].sort((a, b) => a.index - b.index);
    vectors.push(...sorted.map((d) => d.embedding));
  }
  return vectors;
}
