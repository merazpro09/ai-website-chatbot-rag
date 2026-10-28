const sleepDefault = (ms) => new Promise((r) => setTimeout(r, ms));
const USER_AGENT = 'ai-website-chatbot-rag/1.0 (+https://github.com/merazpro09/ai-website-chatbot-rag)';

const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

/** Extracts <loc> URLs from a sitemap or sitemap index. */
export function parseSitemap(xml) {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  return { isIndex, urls: locs };
}

/** Very small HTML-to-text converter. Good enough for marketing pages. */
export function htmlToText(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim() : '';

  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|section|article|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const text = decodeEntities(body)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return { title, text };
}

export function filterUrls(urls, { includePatterns = [], excludePatterns = [], maxPages = 50 } = {}) {
  const unique = [...new Set(urls)];
  return unique
    .filter((u) => /^https?:\/\//i.test(u))
    .filter((u) => !includePatterns.length || includePatterns.some((p) => u.includes(p)))
    .filter((u) => !excludePatterns.some((p) => u.includes(p)))
    .slice(0, maxPages);
}

async function getText(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Crawls the pages listed in a sitemap (following one level of sitemap index),
 * waiting `crawlDelayMs` between requests to be polite to the server.
 */
export async function crawlSitemap(sitemapUrl, options = {}) {
  const { crawlDelayMs = 1000, fetchImpl = globalThis.fetch, sleep = sleepDefault, logger = console } = options;
  if (!sitemapUrl) throw new Error('SITEMAP_URL is required.');

  const root = parseSitemap(await getText(sitemapUrl, fetchImpl));
  let pageUrls = root.urls;

  if (root.isIndex) {
    pageUrls = [];
    for (const child of root.urls) {
      await sleep(crawlDelayMs);
      try {
        pageUrls.push(...parseSitemap(await getText(child, fetchImpl)).urls);
      } catch (err) {
        logger.warn?.(`Skipping sitemap ${child}: ${err.message}`);
      }
    }
  }

  const targets = filterUrls(pageUrls, options);
  const pages = [];
  for (const [i, url] of targets.entries()) {
    if (i > 0) await sleep(crawlDelayMs);
    try {
      const { title, text } = htmlToText(await getText(url, fetchImpl));
      if (text.length > 50) pages.push({ url, title, text });
      logger.info?.(`Crawled ${i + 1}/${targets.length}: ${url}`);
    } catch (err) {
      logger.warn?.(`Skipping ${url}: ${err.message}`);
    }
  }
  return pages;
}
