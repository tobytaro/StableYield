
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

export const fetchCryptoPanicAll = async (apiKey: string, filterType: 'stablecoins' | 'all' = 'all'): Promise<NewsItem[]> => {
  if (!apiKey || apiKey === 'YOUR_CRYPTOPANIC_API_KEY') {
    return getMockCryptoPanicData();
  }

  try {
    // 修正 1: 根据文档，过滤币种应使用 currencies 参数
    // 修正 2: 仅获取英文内容以保证质量
    const currencyFilter = filterType === 'stablecoins' ? `&currencies=${STABLECOINS.join(',')}` : '';
    const targetUrl = `${API_ENDPOINTS.CRYPTOPANIC_NEWS}${apiKey}${currencyFilter}&public=true&regions=en`;
    
    // 修正 3: 使用 corsproxy.io，它比 allorigins 对 Cloudflare 部署更友好
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid API Response structure');
    }

    return data.results.map((item: any) => {
      // 修正 4: 识别社交媒体来源
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
    });
  } catch (error) {
    console.warn('CryptoPanic API fetch failed. Using fallback data.', error);
    return getMockCryptoPanicData();
  }
};
