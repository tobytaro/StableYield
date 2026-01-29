
import { Pool, NewsItem } from '../types';
import { API_ENDPOINTS, STABLECOINS, MIN_TVL } from '../constants';

const KNOWN_AUDITED_PROJECTS = [
  'aave', 'makerdao', 'curve', 'convex', 'lido', 'ethena', 'stargate', 
  'morpho', 'spark', 'compound', 'venus', 'flux', 'justlend', 'hyperion',
  'uniswap', 'pancakeswap', 'mountain-protocol', 'ethena-labs', 'pendle',
  'beefy', 'yearn', 'instadapp', 'frax', 'eigenlayer', 'ether.fi', 'puffer'
];

const sanitizeUrl = (url: string): string => {
  if (!url || url === '#' || url === '' || url.includes('javascript:')) return 'https://cryptopanic.com';
  let cleanUrl = url;
  if (url.startsWith('//')) {
    cleanUrl = `https:${url}`;
  } else if (!url.startsWith('http')) {
    cleanUrl = `https://${url}`;
  }
  try {
    return decodeURIComponent(cleanUrl);
  } catch {
    return cleanUrl;
  }
};

/**
 * Returns a set of high-quality mock data for CryptoPanic
 * Used when the API is not configured or if the request fails (CORS/Network)
 */
const getMockCryptoPanicData = (): NewsItem[] => [
  {
    id: 1,
    title: "Ethena (USDE) achieves $3B TVL milestone as cross-chain support expands",
    published_at: new Date().toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "CoinTelegraph", domain: "cointelegraph.com" },
    kind: "news"
  },
  {
    id: 2,
    title: "Poll: Which yield strategy are you using for USDC right now? #DeFi #Yield",
    published_at: new Date(Date.now() - 600000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "Reddit /r/DeFi", domain: "reddit.com" },
    kind: "social"
  },
  {
    id: 3,
    title: "Sky Finance governance proposal to increase USD1 debt ceiling passes",
    published_at: new Date(Date.now() - 3600000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "The Block", domain: "theblock.co" },
    kind: "news"
  },
  {
    id: 4,
    title: "Massive inflow of $PYUSD detected on Solana DEXes. Yield farming season is back?",
    published_at: new Date(Date.now() - 120000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "Twitter / DeFi_Whale", domain: "twitter.com" },
    kind: "social"
  }
];

export const fetchStablecoinPools = async (): Promise<Pool[]> => {
  try {
    const response = await fetch(API_ENDPOINTS.DEFILLAMA_POOLS);
    if (!response.ok) throw new Error('Failed to fetch pools');
    const data = await response.json();
    
    const filteredPools = data.data.filter((pool: any) => {
      const symbols = pool.symbol.split(/[-/]/).map((s: string) => s.toUpperCase().trim());
      const isPureStable = symbols.every((s: string) => STABLECOINS.includes(s));
      return isPureStable && pool.tvlUsd >= MIN_TVL;
    });

    return filteredPools.map((p: any) => {
      let isAudit = false;
      const auditVal = p.audits;
      if (auditVal === true || String(auditVal).toLowerCase() === 'yes' || String(auditVal).toLowerCase() === 'true') {
        isAudit = true;
      } else if (typeof auditVal === 'string' && !isNaN(parseInt(auditVal))) {
        isAudit = parseInt(auditVal) > 0;
      } else if (typeof auditVal === 'number') {
        isAudit = auditVal > 0;
      }
      if (!isAudit && p.project) {
        const projectSlug = p.project.toLowerCase().replace(/\s+/g, '-');
        if (KNOWN_AUDITED_PROJECTS.some(k => projectSlug.includes(k) || k.includes(projectSlug))) {
          isAudit = true;
        }
      }
      return { 
        ...p, 
        isAudit: isAudit,
        apyMean7d: p.apyMean7d,
        apyMean30d: p.apyMean30d
      };
    });
  } catch (error) {
    console.error('Error fetching DeFiLlama pools:', error);
    return [];
  }
};

export const fetchCryptoPanicAll = async (apiKey: string, filter: 'stablecoins' | 'all' = 'all'): Promise<NewsItem[]> => {
  // If no API key or default placeholder is used, return mock data
  if (!apiKey || apiKey === 'YOUR_CRYPTOPANIC_API_KEY') {
    return getMockCryptoPanicData();
  }

  try {
    const filterParam = filter === 'stablecoins' ? '&filter=stablecoins' : '';
    const targetUrl = `${API_ENDPOINTS.CRYPTOPANIC_NEWS}${apiKey}${filterParam}`;
    
    /**
     * NOTE: CryptoPanic API does not support CORS for client-side browser requests.
     * We use AllOrigins proxy. We use the /get endpoint which returns a JSON wrapper.
     */
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Proxy network error: ${response.status}`);
    }
    
    const proxyData = await response.json();
    const contents = proxyData.contents;

    if (!contents) {
      throw new Error('Proxy returned empty contents');
    }

    // Check if contents is HTML (common for 403/404/Cloudflare errors returned as strings)
    if (contents.trim().startsWith('<!DOCTYPE') || contents.trim().startsWith('<html')) {
      throw new Error('Proxy returned HTML instead of JSON. The target URL might be blocked or the API key is invalid.');
    }

    try {
      const data = JSON.parse(contents);
      return (data.results || []).map((item: any) => ({
        ...item,
        url: sanitizeUrl(item.url)
      }));
    } catch (parseError) {
      console.warn('Failed to parse CryptoPanic JSON contents. Falling back to mock data.');
      return getMockCryptoPanicData();
    }
  } catch (error) {
    // Suppress heavy logging if it's a known fetch error, just return mock
    console.warn('CryptoPanic fetch failed (CORS/Network/Key). Using offline mock data.');
    return getMockCryptoPanicData();
  }
};
