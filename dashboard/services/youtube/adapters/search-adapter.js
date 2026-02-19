/**
 * Web Search Adapter - Tavily + Serper abstraction.
 * Provides unified web search for content enrichment.
 */

/**
 * Execute a web search query.
 * @param {Object} opts
 * @param {string} opts.provider - 'tavily' | 'serper'
 * @param {string} opts.apiKey
 * @param {string} opts.query
 * @param {number} opts.maxResults - default 5
 * @returns {Promise<Array<{ title: string, url: string, content: string, score: number }>>}
 */
// --- Provider Registry ---
const SEARCH_PROVIDERS = {
  tavily: callTavily,
  serper: callSerper,
};

export async function webSearch({ provider, apiKey, query, maxResults = 5 }) {
  const handler = SEARCH_PROVIDERS[provider];
  if (!handler) {
    throw new Error(`Unknown search provider: '${provider}'. Available: ${Object.keys(SEARCH_PROVIDERS).join(', ')}`);
  }
  return handler({ apiKey, query, maxResults });
}

// --- Internal providers ---

async function callTavily({ apiKey, query, maxResults }) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'advanced',
      include_raw_content: true,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Tavily: ${data.error}`);
  }

  return (data.results || []).map(r => ({
    title: r.title || '',
    url: r.url || '',
    content: r.raw_content || r.content || '',
    score: r.score ? Math.round(r.score * 10) : 5,
  }));
}

async function callSerper({ apiKey, query, maxResults }) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Serper: ${data.error}`);
  }

  const results = (data.organic || []).map(r => ({
    title: r.title || '',
    url: r.link || '',
    content: r.snippet || '',
    score: 5,
  }));

  // Serper returns snippets only; fetch full content for top results
  const enriched = await Promise.all(
    results.slice(0, 3).map(async (r) => {
      try {
        const page = await fetchPageContent(r.url);
        return { ...r, content: page || r.content };
      } catch {
        return r;
      }
    })
  );

  return [...enriched, ...results.slice(3)];
}

/**
 * Fetch and extract main text content from a URL.
 */
async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OhanaXBot/1.0)' },
    });
    clearTimeout(timeout);

    const html = await response.text();
    // Basic text extraction: strip tags, collapse whitespace
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 10000); // Cap at 10k chars
  } catch {
    return null;
  }
}
