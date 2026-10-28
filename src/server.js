import { loadConfig } from './config.js';
import { createOpenAIClient } from './openai.js';
import { JsonVectorStore } from './store.js';
import { createApp } from './app.js';

const config = loadConfig();
const client = createOpenAIClient(config.openaiApiKey);

let store;
try {
  store = await JsonVectorStore.load(config.vectorStorePath);
} catch {
  console.error(`No vector store at ${config.vectorStorePath}. Run "npm run ingest" first.`);
  process.exit(1);
}

if (store.meta.embeddingModel && store.meta.embeddingModel !== config.embeddingModel) {
  console.error(
    `Vector store was built with ${store.meta.embeddingModel} but EMBEDDING_MODEL is ${config.embeddingModel}. Re-run ingest.`,
  );
  process.exit(1);
}

createApp({ client, store, config }).listen(config.port, () => {
  console.log(`Chatbot API on http://localhost:${config.port} (${store.items.length} chunks). Demo: /demo.html`);
});
