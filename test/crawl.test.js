import { describe, it, expect, vi } from 'vitest';
import { parseSitemap, htmlToText, filterUrls, crawlSitemap } from '../src/crawl.js';

const page = (title, body) => `<html><head><title>${title}</title><script>var x=1</script></head>
<body><nav>Menu</nav><h1>${title}</h1><p>${body}</p><footer>Footer</footer></body></html>`;

describe('parseSitemap', () => {
  it('reads urls and detects sitemap indexes', () => {
    expect(parseSitemap('<urlset><url><loc>https://a.test/x</loc></url></urlset>')).toEqual({ isIndex: false, urls: ['https://a.test/x'] });
    expect(parseSitemap('<sitemapindex><sitemap><loc>https://a.test/s.xml</loc></sitemap></sitemapindex>').isIndex).toBe(true);
  });
});

describe('htmlToText', () => {
  it('drops scripts, nav and footer and keeps content', () => {
    const { title, text } = htmlToText(page('Services', 'We build fast websites &amp; chatbots.'));
    expect(title).toBe('Services');
    expect(text).toContain('We build fast websites & chatbots.');
    expect(text).not.toContain('var x');
    expect(text).not.toContain('Menu');
    expect(text).not.toContain('Footer');
  });
});

describe('filterUrls', () => {
  it('dedupes, filters and limits', () => {
    const urls = ['https://a.test/a', 'https://a.test/a', 'https://a.test/tag/x', 'https://a.test/b', 'https://a.test/c'];
    expect(filterUrls(urls, { excludePatterns: ['/tag/'], maxPages: 2 })).toEqual(['https://a.test/a', 'https://a.test/b']);
  });
});

describe('crawlSitemap', () => {
  it('follows a sitemap index and waits between requests', async () => {
    const long = 'We build fast WordPress websites for local businesses with SEO included.';
    const responses = {
      'https://a.test/sitemap.xml': '<sitemapindex><sitemap><loc>https://a.test/pages.xml</loc></sitemap></sitemapindex>',
      'https://a.test/pages.xml': '<urlset><url><loc>https://a.test/</loc></url><url><loc>https://a.test/missing</loc></url></urlset>',
      'https://a.test/': page('Home', long),
    };
    const fetchImpl = vi.fn(async (url) =>
      responses[url] ? { ok: true, status: 200, text: async () => responses[url] } : { ok: false, status: 404 },
    );
    const sleep = vi.fn(async () => {});

    const pages = await crawlSitemap('https://a.test/sitemap.xml', { fetchImpl, sleep, crawlDelayMs: 250, logger: {} });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ url: 'https://a.test/', title: 'Home' });
    expect(sleep).toHaveBeenCalledWith(250);
    expect(sleep).toHaveBeenCalledTimes(2); // before child sitemap + between the two pages
  });
});
