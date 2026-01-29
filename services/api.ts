
import { Pool, NewsItem } from '../types.ts';
import { API_ENDPOINTS, STABLECOINS, MIN_TVL } from '../constants.ts';

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
    title: "DeFi stablecoin yields outpace traditional savings as market volatility returns",
    published_at: new Date(Date.now() - 300000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "Blockworks", domain: "blockworks.co" },
    kind: "news"
  },
  {
    id: 3,
    title: "Poll: Which yield strategy are you using for USDC right now? #DeFi #Yield",
    published_at: new Date(Date.now() - 600000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "Reddit /r/DeFi", domain: "reddit.com" },
    kind: "social"
  },
  {
    id: 4,
    title: "Sky Finance governance proposal to increase USD1 debt ceiling passes",
    published_at: new Date(Date.now() - 3600000).toISOString(),
    url: "https://cryptopanic.com",
    source: { title: "The Block", domain: "theblock.co" },
    kind: "news"
  },
  {
    id: 5,
    title: "Massive inflow of $PYUSD detected on DEXes. Yield farming season is back?",
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
      if (p.project && KNOWN_AUDITED_PROJECTS.some(k => p.project.toLowerCase().includes(k))) {
        isAudit = true;
      }
      return { ...p, isAudit };
    });
  } catch (error) {
    console.error('Error fetching DeFiLlama pools:', error);
    return [];
  }
};

/**
 * Attempts to fetch data using a specified proxy
 */
async function fetchViaProxy(url: string, proxyType: 'allorigins' | 'codetabs' = 'allorigins'): Promise<any> {
  const proxyUrl = proxyType === 'allorigins' 
    ? `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    : `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`Proxy ${proxyType} failed: ${response.status}`);
  
  if (proxyType === 'allorigins') {
    const resJson = await response.json();
    if (!resJson.contents) throw new Error('AllOrigins returned empty content');
    // Check if contents looks like HTML
    if (resJson.contents.trim().startsWith('<')) {
      throw new Error('AllOrigins returned HTML (blocked)');
    }
    return JSON.parse(resJson.contents);
  } else {
    // codetabs returns raw body
    return await response.json();
  }
}

export const fetchCryptoPanicAll = async (apiKey: string, filterType: 'stablecoins' | 'all' = 'all'): Promise<NewsItem[]> => {
  if (!apiKey || apiKey === 'YOUR_CRYPTOPANIC_API_KEY') {
    return getMockCryptoPanicData();
  }

  // Reduce currency list length to avoid long URL detection by WAFs
  const topStables = STABLECOINS.slice(0, 8);
  const currencyFilter = filterType === 'stablecoins' ? `&currencies=${topStables.join(',')}` : '';
  const targetUrl = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}${currencyFilter}&regions=en`;

  try {
    // Primary attempt: AllOrigins
    try {
      const data = await fetchViaProxy(targetUrl, 'allorigins');
      if (data.results) return data.results.map(formatNewsItem);
    } catch (e) {
      console.warn('Primary proxy failed, trying fallback...', e);
    }

    // Secondary attempt: CodeTabs Proxy
    try {
      const data = await fetchViaProxy(targetUrl, 'codetabs');
      if (data.results) return data.results.map(formatNewsItem);
    } catch (e) {
      console.warn('Secondary proxy failed.', e);
    }

    throw new Error('All proxies failed');
  } catch (error) {
    console.warn('CryptoPanic API totally inaccessible. Using high-quality mock data.', error);
    return getMockCryptoPanicData();
  }
};

function formatNewsItem(item: any): NewsItem {
  const domain = item.source?.domain?.toLowerCase() || '';
  const isSocial = domain.includes('twitter') || domain.includes('reddit') || domain.includes('t.me');
  return {
    id: item.id,
    title: item.title,
    published_at: item.published_at,
    url: sanitizeUrl(item.url),
    source: {
      title: item.source?.title || 'Unknown Source',
      domain: domain
    },
    kind: isSocial ? 'social' : 'news'
  };
}
