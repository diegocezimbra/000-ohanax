// =============================================================================
// UMAMI ANALYTICS CONFIG E FUNCOES AUXILIARES
// =============================================================================

export const UMAMI_CONFIG = {
  baseUrl: 'https://api.umami.is/v1',
  tokens: {
    // Token para auth, billing
    main: 'api_qEPOgaHG9K7EeZjgUZiVyvtkYpaADJST',
    // Token para oentregador
    oentregador: 'api_wEDDdI2afGuX3dmR2YQf2Bd34ud58fW4'
  },
  websites: {
    // Security removido - agora usa banco interno (security_analytics_events)
    auth: '032c4869-3301-4d7d-869a-2e898f1f49c7',
    billing: '2a708d6c-43ed-439e-af48-60a2c3e82f38',
    oentregador: 'c0ec15e8-98a1-4615-b586-5de88b65eba5'
  }
};

// Fetch visitors from Umami for a specific website
export async function getUmamiVisitors(websiteId, token, startDate, endDate) {
  try {
    const startAt = new Date(startDate).getTime();
    const endAt = new Date(endDate).getTime();

    const url = `${UMAMI_CONFIG.baseUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`;
    console.log(`[Umami] Fetching: ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      headers: {
        'x-umami-api-key': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Umami] API error ${response.status}: ${errorText}`);
      return { visitors: 0, pageviews: 0, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log(`[Umami] Response for ${websiteId}:`, JSON.stringify(data).substring(0, 200));

    return {
      visitors: typeof data.visitors === 'number' ? data.visitors : (data.visitors?.value || 0),
      pageviews: typeof data.pageviews === 'number' ? data.pageviews : (data.pageviews?.value || 0)
    };
  } catch (err) {
    console.error('[Umami] Fetch error:', err.message);
    return { visitors: 0, pageviews: 0, error: err.message };
  }
}

// Get total visitors across all websites (exceto Security que usa banco interno)
export async function getTotalVisitors(startDate, endDate) {
  const results = await Promise.all([
    getUmamiVisitors(UMAMI_CONFIG.websites.auth, UMAMI_CONFIG.tokens.main, startDate, endDate),
    getUmamiVisitors(UMAMI_CONFIG.websites.billing, UMAMI_CONFIG.tokens.main, startDate, endDate),
    getUmamiVisitors(UMAMI_CONFIG.websites.oentregador, UMAMI_CONFIG.tokens.oentregador, startDate, endDate)
  ]);

  return {
    visitors: results.reduce((sum, r) => sum + r.visitors, 0),
    pageviews: results.reduce((sum, r) => sum + r.pageviews, 0),
    byProject: {
      auth: results[0],
      billing: results[1],
      oentregador: results[2]
    }
  };
}

// Fetch custom events count from Umami
export async function getUmamiEventCount(websiteId, token, eventName, startDate, endDate) {
  try {
    const startAt = new Date(startDate).getTime();
    const endAt = new Date(endDate).getTime();

    // Umami API endpoint for events
    const url = `${UMAMI_CONFIG.baseUrl}/websites/${websiteId}/events?startAt=${startAt}&endAt=${endAt}`;
    console.log(`[Umami] Fetching events: ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      headers: {
        'x-umami-api-key': token,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[Umami] Events fetch failed: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    // Find specific event by name
    const event = data.find(e => e.eventName === eventName);
    return event ? event.count : 0;
  } catch (err) {
    console.error('[Umami] Events fetch error:', err.message);
    return 0;
  }
}

