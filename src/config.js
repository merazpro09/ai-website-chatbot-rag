const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export function loadConfig(env = process.env) {
  return {
    openaiApiKey: env.OPENAI_API_KEY || '',
    embeddingModel: env.EMBEDDING_MODEL || 'text-embedding-3-small',
    chatModel: env.CHAT_MODEL || 'gpt-4o-mini',

    sitemapUrl: env.SITEMAP_URL || '',
    maxPages: num(env.MAX_PAGES, 50),
    crawlDelayMs: num(env.CRAWL_DELAY_MS, 1000),
    includePatterns: list(env.INCLUDE_PATTERNS),
    excludePatterns: list(env.EXCLUDE_PATTERNS),

    chunkSizeWords: num(env.CHUNK_SIZE_WORDS, 220),
    chunkOverlapWords: num(env.CHUNK_OVERLAP_WORDS, 40),

    topK: num(env.TOP_K, 4),
    minScore: num(env.MIN_SCORE, 0.3),
    vectorStorePath: env.VECTOR_STORE_PATH || 'data/vectors.json',

    bookingUrl: env.BOOKING_URL || '',
    maxAnswerTokens: num(env.MAX_ANSWER_TOKENS, 350),

    port: num(env.PORT, 3001),
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    rateLimitPerMinute: num(env.RATE_LIMIT_PER_MINUTE, 10),
  };
}
