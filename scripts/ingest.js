import { loadConfig } from '../src/config.js';
import { crawlSitemap } from '../src/crawl.js';
import { chunkPages } from '../src/chunk.js';
import { createOpenAIClient, embedTexts } from '../src/openai.js';
import { JsonVectorStore } from '../src/store.js';
import { pathToFileURL } from 'node:url';

/** Crawl -> chunk -> embed -> save. Exported for tests. */
export async function ingest({ config, client, fetchImpl, sleep, logger = console }) {
  const pages = await crawlSitemap(config.sitemapUrl, { ...config, fetchImpl, sleep, logger });
  const chunks = chunkPages(pages, { size: config.chunkSizeWords, overlap: config.chunkOverlapWords });

  const approxTokens = Math.round(chunks.reduce((n, c) => n + c.text.split(/\s+/).length, 0) * 1.35);
  logger.info?.(`${pages.length} pages → ${chunks.length} chunks (~${approxTokens} tokens to embed)`);

  const vectors = await embedTexts(client, chunks.map((c) => c.text), { model: config.embeddingModel });
  const store = new JsonVectorStore(
    chunks.map((c, i) => ({ ...c, vector: vectors[i] })),
    { embeddingModel: config.embeddingModel, sitemapUrl: config.sitemapUrl, builtAt: new Date().toISOString() },
  );
  await store.save(config.vectorStorePath);
  logger.info?.(`Saved ${store.items.length} vectors to ${config.vectorStorePath}`);
  return store;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const config = loadConfig();
  ingest({ config, client: createOpenAIClient(config.openaiApiKey) }).catch((err) => {
    console.error(`Ingest failed: ${err.message}`);
    process.exit(1);
  });
}
