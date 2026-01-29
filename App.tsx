import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  Activity, 
  ExternalLink, 
  RefreshCcw,
  Zap,
  Twitter,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Info,
  X,
  BookOpen,
  Scale,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Globe,
  LayoutGrid,
  Newspaper
} from 'lucide-react';
import { Pool, NewsItem } from './types';
import { fetchStablecoinPools, fetchCryptoPanicAll } from './services/api';
import { STABLECOINS, MOCK_API_KEY } from './constants';

type SortKey = 'apy' | 'apyMean30d' | 'tvlUsd' | 'safety';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const PAGE_SIZE = 30;

const SafetyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="p-5 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white leading-none">Safety Scoring</h2>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Sentinel Engine v1.2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 md:p-8 overflow-y-auto space-y-8 scrollbar-thin">
          <section>
            <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" />
              1. 审计加分 (权重 50%)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed pl-6 border-l-2 border-emerald-500/30">
              系统会自动检测协议是否通过顶级安全公司审计。已审计协议获得基础安全评分。
            </p>
          </section>

          <section>
            <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4" />
              2. 资金规模 (权重 30%)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed pl-6 border-l-2 border-blue-500/30">
              高 TVL 代表更深的流动性和更高的市场信任度。使用对数增长公式计算分值。
            </p>
          </section>

          <section>
            <h3 className="text-rose-400 font-bold flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" />
              3. 收益率惩罚 (负权重 20%)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed pl-6 border-l-2 border-rose-500/30">
              极高的收益通常伴随高风险。系统会对显著偏离基准利率的池子进行降分处理。
            </p>
          </section>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button onClick={onClose} className="w-full md:w-auto px-8 py-3 bg-emerald-500 text-slate-950 rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-lg">
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [allPosts, setAllPosts] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStable, setSelectedStable] = useState<string | null>(null);
  const [newsFilter, setNewsFilter] = useState<'stablecoins' | 'all'>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'apy', direction: 'desc' });
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'yields' | 'intel'>('yields');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [poolData, postData] = await Promise.all([
      fetchStablecoinPools(),
      fetchCryptoPanicAll(MOCK_API_KEY, newsFilter)
    ]);
    setPools(poolData);
    setAllPosts(postData);
    setLoading(false);
  }, [newsFilter]);

  const newsList = useMemo(() => allPosts.filter(p => p.kind !== 'social'), [allPosts]);
  const socialList = useMemo(() => allPosts.filter(p => p.kind === 'social'), [allPosts]);

  const stablecoinTvlMap = useMemo(() => {
    const map: Record<string, number> = {};
    pools.forEach(p => {
      const symbols = p.symbol.split(/[-/]/).map(s => s.toUpperCase().trim());
      symbols.forEach(s => {
        if (STABLECOINS.includes(s)) {
          map[s] = (map[s] || 0) + p.tvlUsd;
        }
      });
    });
    return map;
  }, [pools]);

  const sortedStableTags = useMemo(() => {
    return Object.keys(stablecoinTvlMap)
      .filter(coin => STABLECOINS.includes(coin))
      .sort((a, b) => stablecoinTvlMap[b] - stablecoinTvlMap[a]);
  }, [stablecoinTvlMap]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    setCurrentPage(1);
  };

  const getSafetyScore = (pool: Pool) => {
    const auditBonus = pool.isAudit ? 100 : 0;
    const tvlFactor = Math.min(Math.log10(pool.tvlUsd / 1000000) * 15, 60); 
    const apyPenalty = Math.min(pool.apy * 1.5, 40); 
    return (auditBonus * 0.5) + tvlFactor - apyPenalty;
  };

  const filteredAndSortedPools = useMemo(() => {
    const filtered = pools.filter(p => {
      const matchesSearch = p.project.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStable = selectedStable ? p.symbol.toUpperCase().includes(selectedStable) : true;
      return matchesSearch && matchesStable;
    });

    return filtered.sort((a, b) => {
      let valA = sortConfig.key === 'safety' ? getSafetyScore(a) : (a[sortConfig.key as keyof Pool] as number || 0);
      let valB = sortConfig.key === 'safety' ? getSafetyScore(b) : (b[sortConfig.key as keyof Pool] as number || 0);
      return sortConfig.direction === 'desc' ? valB - valA : valA - valB;
    });
  }, [pools, searchTerm, selectedStable, sortConfig]);

  const paginatedPools = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedPools.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedPools, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedPools.length / PAGE_SIZE);

  const stats = useMemo(() => {
    if (pools.length === 0) return { avgApy: '0.00', topApy: '0.00', topProject: 'N/A' };
    const avgApy = pools.reduce((acc, curr) => acc + curr.apy, 0) / pools.length;
    const topPool = [...pools].sort((a, b) => b.apy - a.apy)[0];
    return {
      avgApy: avgApy.toFixed(2),
      topApy: topPool?.apy.toFixed(2),
      topProject: topPool?.project
    };
  }, [pools]);

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3 ml-1 text-emerald-400" /> : <ChevronUp className="w-3 h-3 ml-1 text-emerald-400" />;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col selection:bg-emerald-500/30 pb-20 lg:pb-0">
      <SafetyModal isOpen={isSafetyModalOpen} onClose={() => setIsSafetyModalOpen(false)} />
      
      {/* 1. Header & Market Status Bar */}
      <div className="sticky top-0 z-[110] bg-[#020617]">
        <header className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800/50 bg-[#020617]/95 backdrop-blur-lg">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-1.5 md:p-2 rounded-xl shadow-lg shadow-emerald-500/10">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-none">StableYield Sentinel</h1>
                <p className="hidden md:block text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] font-bold">Terminal Interface</p>
              </div>
            </div>
            <button 
              onClick={loadData}
              className="md:hidden p-2 bg-slate-900 border border-slate-800 rounded-lg active:scale-95 transition-transform"
            >
              <RefreshCcw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400" />
              <input 
                type="text" 
                placeholder="Filter protocol..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <button 
              onClick={loadData}
              className="hidden md:flex p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              <RefreshCcw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="bg-[#0f172a] border-b border-slate-800/50 py-2.5 px-4 md:px-6">
          <div className="flex gap-6 items-center overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">MARKET APY:</span>
              <span className="text-xs text-emerald-400 font-bold mono">{stats.avgApy}%</span>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-700/50 pl-6 whitespace-nowrap">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">TOP ALPHA:</span>
              <span className="text-xs text-blue-400 font-bold mono uppercase">{stats.topProject} ({stats.topApy}%)</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <section className={`flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin ${activeTab === 'intel' ? 'hidden lg:block' : 'block'}`}>
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide py-1">
              <button 
                onClick={() => { setSelectedStable(null); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 border ${!selectedStable ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-900/50 text-slate-500 border-slate-800'}`}
              >
                ALL
              </button>
              {sortedStableTags.map(coin => (
                <button 
                  key={coin}
                  onClick={() => { setSelectedStable(coin); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap flex-shrink-0 border ${selectedStable === coin ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-900/50 text-slate-400 border-slate-800'}`}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead className="bg-slate-900/90 sticky top-0 z-[60]">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="px-6 py-4 text-left border-b border-slate-800">Protocol</th>
                    <th className="px-4 py-4 text-left border-b border-slate-800">Asset</th>
                    <th className="px-4 py-4 text-right border-b border-slate-800 cursor-pointer" onClick={() => handleSort('apy')}>
                      <div className="flex items-center justify-end">Current APY <SortIndicator column="apy" /></div>
                    </th>
                    <th className="px-4 py-4 text-right border-b border-slate-800 cursor-pointer" onClick={() => handleSort('apyMean30d')}>
                      <div className="flex items-center justify-end gap-1">30D AVG <SortIndicator column="apyMean30d" /></div>
                    </th>
                    <th className="px-4 py-4 text-right border-b border-slate-800 cursor-pointer" onClick={() => handleSort('tvlUsd')}>
                      <div className="flex items-center justify-end">TVL <SortIndicator column="tvlUsd" /></div>
                    </th>
                    <th className="px-4 py-4 text-center border-b border-slate-800 cursor-pointer" onClick={() => handleSort('safety')}>
                      <div className="flex items-center justify-center gap-1.5 group">
                        <span>SAFETY</span>
                        <div className="relative flex items-center">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsSafetyModalOpen(true); }}
                            className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-emerald-400"
                            title="Safety Methodology"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <SortIndicator column="safety" />
                      </div>
                    </th>
                    <th className="px-4 py-4 border-b border-slate-800"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {paginatedPools.map((pool) => (
                    <tr key={pool.pool} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[10px] border border-slate-700 text-slate-400">
                            {pool.project.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-slate-100">{pool.project}</span>
                              {pool.isAudit ? <Shield className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-medium">{pool.chain}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="mono text-[11px] font-bold text-blue-400 px-2.5 py-1 bg-blue-500/5 rounded border border-blue-500/10">
                          {pool.symbol}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`mono font-bold text-sm ${pool.apy > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {pool.apy.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="mono text-xs text-slate-400">
                          {pool.apyMean30d ? `${pool.apyMean30d.toFixed(2)}%` : '--'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="mono text-xs text-slate-300 font-medium">
                          ${pool.tvlUsd >= 1000000000 ? `${(pool.tvlUsd / 1000000000).toFixed(1)}B` : `${(pool.tvlUsd / 1000000).toFixed(1)}M`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${pool.apy < 8 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : pool.apy < 15 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {pool.apy < 8 ? 'ROBUST' : pool.apy < 15 ? 'MODERATE' : 'HIGH RISK'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <a href={`https://defillama.com/yields/pool/${pool.pool}`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-800 rounded-lg inline-block text-slate-500">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col divide-y divide-slate-800">
              {paginatedPools.map((pool) => (
                <div key={pool.pool} className="p-4 bg-slate-900/30">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs border border-slate-700 text-slate-300">
                        {pool.project.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-white">{pool.project}</h4>
                          {pool.isAudit && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{pool.chain}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-black mono ${pool.apy > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {pool.apy.toFixed(2)}%
                      </div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">CURRENT APY</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">TOTAL TVL</p>
                      <p className="text-xs font-bold text-slate-200 mono">
                        ${pool.tvlUsd >= 1000000000 ? `${(pool.tvlUsd / 1000000000).toFixed(1)}B` : `${(pool.tvlUsd / 1000000).toFixed(0)}M`}
                      </p>
                    </div>
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                      <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">ASSET PAIRS</p>
                      <p className="text-xs font-bold text-blue-400 mono truncate">{pool.symbol}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-lg border ${pool.apy < 8 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : pool.apy < 15 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                      {pool.apy < 8 ? 'ROBUST' : pool.apy < 15 ? 'MODERATE' : 'HIGH RISK'}
                    </span>
                    <a 
                      href={`https://defillama.com/yields/pool/${pool.pool}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-100 border border-slate-700 active:bg-slate-700"
                    >
                      VIEW DETAILS <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <div className="flex items-center gap-3">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo(0, 0); }}
                  className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-20 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="mono text-slate-400 text-[10px]">P.{currentPage} / {totalPages || 1}</span>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo(0, 0); }}
                  className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-20 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mono text-[10px] text-slate-600 hidden sm:block">
                {filteredAndSortedPools.length} POOLS DETECTED
              </div>
            </div>
          </div>
        </section>

        <aside className={`w-full lg:w-96 border-l border-slate-800/50 bg-[#020617] flex flex-col ${activeTab === 'yields' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-5 border-b border-slate-800 bg-slate-900/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <MessageSquare className="w-4 h-4" />
                <h2 className="text-[10px] uppercase tracking-widest font-black">SOCIAL PULSE</h2>
              </div>
            </div>
            <div className="space-y-4">
              {socialList.slice(0, 4).map(post => (
                <div key={post.id} className="p-4 bg-slate-900/40 border border-slate-800/50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400">{post.source.title}</span>
                    <span className="text-[9px] text-slate-600 font-mono">NEW</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">{post.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin pb-24 lg:pb-5">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-[#020617] pb-2 z-10 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400">
                <Globe className="w-4 h-4" />
                <h2 className="text-[10px] uppercase tracking-widest font-black">MARKET INTELLIGENCE</h2>
              </div>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button 
                  onClick={() => setNewsFilter('all')} 
                  className={`text-[9px] font-black px-3 py-1 rounded-md ${newsFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setNewsFilter('stablecoins')} 
                  className={`text-[9px] font-black px-3 py-1 rounded-md ${newsFilter === 'stablecoins' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                >
                  USD
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {newsList.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block group pb-5 border-b border-slate-800/30">
                  <h3 className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 leading-relaxed mb-2">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 uppercase font-bold">
                    <span>{item.source.title}</span>
                    <span>{new Date(item.published_at).toLocaleDateString()}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </aside>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 border-t border-slate-800 backdrop-blur-xl p-3 flex items-center justify-around z-[150]">
          <button 
            onClick={() => setActiveTab('yields')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'yields' ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Yields</span>
          </button>
          <button 
            onClick={() => setActiveTab('intel')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'intel' ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Intel</span>
          </button>
          <button 
            onClick={() => setIsSafetyModalOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-500 active:text-amber-400"
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Safety</span>
          </button>
        </nav>
      </main>

      <footer className="hidden md:flex bg-slate-900 border-t border-slate-800 py-3 px-6 text-[9px] text-slate-600 justify-between items-center mono uppercase font-bold tracking-[0.15em]">
        <div className="flex items-center gap-5">
          <span>&copy; 2026 Sentinel Terminal v2.6.0</span>
          <span className="text-emerald-500/60 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            Status: Operational
          </span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-emerald-400 transition-colors">Risk Disclaimer</a>
        </div>
      </footer>
    </div>
  );
};

export default App;