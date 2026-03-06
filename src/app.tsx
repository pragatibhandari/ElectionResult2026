import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, Users, Map as MapIcon, ChevronRight, Info, RefreshCw, LayoutDashboard, X, BarChart3, PieChart as PieChartIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import initialData from './data.json';

// --- CONFIGURATION ---
const PARTY_SHEET_ID = '118Vp0vkT-HJcasjASMhm6oLmVizf2xWGjxhTHT2adyI';
const BATTLES_SHEET_ID = '1z2mjEB-ckxZUIgaT4CBubGbhQUb6X4NFtlWmNqWWB4E';
const SAMANUPATHIK_SHEET_ID = '118Vp0vkT-HJcasjASMhm6oLmVizf2xWGjxhTHT2adyI';
const REFRESH_INTERVAL = 30000; // 30 seconds

type Language = 'en' | 'ne';

const translations = {
  en: {
    title: 'Election 2026',
    subtitle: 'Main Battle Dashboard',
    searchPlaceholder: 'Search candidate name or district...',
    lastUpdated: 'Last Updated',
    partyStanding: 'Party Standing',
    party: 'Party',
    leading: 'Leading',
    won: 'Won',
    totalSeats: 'Total Seats',
    majority: 'Majority',
    mainBattles: 'Main Battles',
    constituency: 'Constituency',
    prob: 'Prob.',
    leadMargin: 'Lead Margin',
    totalVotes: 'Total Votes',
    noResults: 'No results found',
    tryAdjusting: 'Try adjusting your search or filters',
    dataSource: 'Data source: Election Commission of Nepal',
    results: 'results',
    voteDistribution: 'Vote Distribution',
    voteShare: 'Vote Share',
    back: 'Back to Dashboard',
    candidate: 'Candidate',
    votes: 'Votes',
    share: 'Share',
    parties: 'Parties',
    proportionalVotes: 'Proportional Votes',
    directSeats: 'Direct Seats',
    parliament: 'Parliament'
  },
  ne: {
    title: 'निर्वाचन २०२६',
    subtitle: 'मुख्य प्रतिस्पर्धा ड्यासबोर्ड',
    searchPlaceholder: 'उम्मेदवारको नाम वा जिल्ला खोज्नुहोस्...',
    lastUpdated: 'अन्तिम अपडेट',
    partyStanding: 'दलगत अवस्था',
    party: 'दल',
    leading: 'अग्रता',
    won: 'जित',
    totalSeats: 'कुल सिट',
    majority: 'बहुमत',
    mainBattles: 'मुख्य प्रतिस्पर्धाहरू',
    constituency: 'निर्वाचन क्षेत्र',
    prob: 'सम्भावना',
    leadMargin: 'अग्रता मतान्तर',
    totalVotes: 'कुल मत',
    noResults: 'कुनै नतिजा भेटिएन',
    tryAdjusting: 'आफ्नो खोज वा फिल्टरहरू समायोजन गर्ने प्रयास गर्नुहोस्',
    dataSource: 'डाटा स्रोत: नेपाल निर्वाचन आयोग',
    results: 'नतिजाहरू',
    voteDistribution: 'मत वितरण',
    voteShare: 'मत हिस्सा',
    back: 'ड्यासबोर्डमा फर्कनुहोस्',
    candidate: 'उम्मेदवार',
    votes: 'मत',
    share: 'हिस्सा',
    parties: 'पार्टीहरू',
    proportionalVotes: 'सामानुपातिक मत',
    directSeats: 'प्रत्यक्ष सिट',
    parliament: 'संसद'
  }
};

interface Candidate {
  province: string;
  district: string;
  constituency: number;
  candidateName: string;
  partyName: string;
  votes: number;
  candidatePicture: string;
  partyIcon: string;
  partyColor: string;
  status?: 'Leading' | 'Won'; // New field for status
}

interface ConstituencyResult {
  province: string;
  district: string;
  constituency: number;
  leader: Candidate;
  runnerUp: Candidate | null;
  topCandidates: Candidate[];
  totalVotes: number;
  lead: number;
  winProbability: number;
}

// Helper to convert numbers to Nepali numerals
const toNepaliNumerals = (num: number) => {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return num.toString().split('').map(digit => nepaliDigits[parseInt(digit)] || digit).join('');
};

// Parliament Chart Component
const ParliamentChart = ({ data, totalSeats = 165, language }: { data: any[], totalSeats?: number, language: Language }) => {
  const rows = 7;
  const seatsPerRow = [14, 18, 22, 26, 30, 34, 38]; // Total 182, we'll trim to 165
  
  const points = useMemo(() => {
    const pts: { x: number; y: number; color: string }[] = [];
    let seatIndex = 0;
    
    // Flatten party data into a list of colors for each seat
    const seatColors: string[] = [];
    data.forEach(([party, stats]) => {
      const partySeats = stats.won; // ONLY declared wins
      for (let i = 0; i < partySeats; i++) {
        seatColors.push(stats.color || '#cbd5e1');
      }
    });
    
    // Fill remaining seats with gray
    while (seatColors.length < totalSeats) {
      seatColors.push('#e2e8f0');
    }

    const innerRadius = 60;
    const rowSpacing = 20;

    for (let r = 0; r < rows; r++) {
      const radius = innerRadius + r * rowSpacing;
      const count = seatsPerRow[r];
      for (let i = 0; i < count; i++) {
        if (seatIndex >= totalSeats) break;
        
        const angle = Math.PI + (i / (count - 1)) * Math.PI;
        const x = 150 + radius * Math.cos(angle);
        const y = 180 + radius * Math.sin(angle);
        
        pts.push({ x, y, color: seatColors[seatIndex] });
        seatIndex++;
      }
      if (seatIndex >= totalSeats) break;
    }
    return pts;
  }, [data, totalSeats]);

  const declaredWins = data.reduce((sum, [_, stats]) => sum + stats.won, 0);
  const remaining = totalSeats - declaredWins;

  return (
    <div className="relative w-full aspect-[1.8/1] flex flex-col items-center justify-center bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <svg viewBox="0 0 300 200" className="w-full h-full max-w-[280px]">
        {points.map((pt, i) => (
          <motion.circle
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.002 }}
            cx={pt.x}
            cy={pt.y}
            r="3.5"
            fill={pt.color}
            className="transition-colors duration-500"
          />
        ))}
        <text x="150" y="165" textAnchor="middle" className="text-3xl font-black fill-slate-800">
          {language === 'ne' ? toNepaliNumerals(totalSeats) : totalSeats}
        </text>
        <text x="150" y="185" textAnchor="middle" className="text-[10px] font-bold fill-slate-400 uppercase tracking-widest">
          {language === 'ne' ? 'प्रत्यक्ष सिट' : 'Direct Seats'}
        </text>
      </svg>
      
      {/* Legend-like summary below chart */}
      <div className="grid grid-cols-1 gap-2 w-full mt-4">
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl text-white">
          <div>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Declared</p>
            <p className="text-lg font-black">
              {language === 'ne' ? toNepaliNumerals(declaredWins) : declaredWins}/165 {language === 'ne' ? 'घोषित' : 'Declared'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{language === 'ne' ? 'बाँकी' : 'Remaining'}</p>
            <p className="text-lg font-black">{language === 'ne' ? toNepaliNumerals(remaining) : remaining}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          {data.slice(0, 6).map(([party, stats]) => (
            <div key={party} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2 h-6 rounded-sm shrink-0" style={{ backgroundColor: stats.color || '#0ea5e9' }} />
                <span className="text-[10px] font-bold text-slate-700 truncate">{party}</span>
              </div>
              <span className="text-[10px] font-black text-slate-900">
                {language === 'ne' ? toNepaliNumerals(stats.won) : stats.won}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [searchTerm, setSearchTerm] = useState('');
  const [battlesData, setBattlesData] = useState<Candidate[]>(initialData);
  const [partyData, setPartyData] = useState<Candidate[]>(initialData);
  const [samanupathikData, setSamanupathikData] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null);
  const [selectedParty, setSelectedParty] = useState<any | null>(null);

  const t = translations[language];

  const formatNumber = (num: number) => {
    if (language === 'ne') return toNepaliNumerals(num);
    return num.toLocaleString();
  };

  const resetFilters = () => {
    setSearchTerm('');
  };

  // Auto-sync logic
  const syncData = async () => {
    setIsSyncing(true);
    try {
      const fetchSheet = async (sheetId: string) => {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch spreadsheet: ${sheetId}`);
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) return [] as any[];
        
        const rawData = XLSX.utils.sheet_to_json(sheet);
        // Trim keys to handle potential whitespace in headers
        return rawData.map((row: any) => {
          const trimmedRow: any = {};
          Object.keys(row).forEach(key => {
            trimmedRow[key.trim()] = row[key];
          });
          return trimmedRow;
        });
      };

      const [pDataRaw, bDataRaw, sDataRaw] = await Promise.all([
        fetchSheet(PARTY_SHEET_ID),
        fetchSheet(BATTLES_SHEET_ID),
        fetchSheet(SAMANUPATHIK_SHEET_ID)
      ]);

      const mapCandidate = (item: any) => ({
        ...item,
        constituency: parseInt(item.constituency) || 0,
        votes: parseInt(item.votes) || 0,
        province: String(item.province || ''),
        district: String(item.district || ''),
        candidateName: String(item.candidateName || ''),
        partyName: String(item.partyName || ''),
        candidatePicture: String(item.candidatePicture || ''),
        partyIcon: String(item.partyIcon || ''),
        partyColor: String(item.partyColor || ''),
        status: item.status ? String(item.status) : undefined
      });

      const pDataMapped = pDataRaw.map(mapCandidate);
      const bDataMapped = bDataRaw.map(mapCandidate);

      // Create party icon map from party data to sync icons
      const partyIconMap: Record<string, string> = {};
      pDataMapped.forEach(c => {
        if (c.partyName && c.partyIcon && !partyIconMap[c.partyName]) {
          partyIconMap[c.partyName] = c.partyIcon;
        }
      });

      // Apply party icons to battles data if missing
      const bData = bDataMapped.map(c => ({
        ...c,
        partyIcon: c.partyIcon || partyIconMap[c.partyName] || ''
      }));

      const pData = pDataMapped;
      
      if (pData.length > 0) setPartyData(pData);
      if (bData.length > 0) setBattlesData(bData);
      if (sDataRaw.length > 0) setSamanupathikData(sDataRaw);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to sync with Google Sheets:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Process data for Main Battles
  const processedBattlesData = useMemo(() => {
    const constituencies: Record<string, Candidate[]> = {};
    
    battlesData.forEach((c: Candidate) => {
      const key = `${c.province}-${c.district}-${c.constituency}`;
      if (!constituencies[key]) constituencies[key] = [];
      constituencies[key].push(c);
    });

    return Object.entries(constituencies).map(([key, candidates]) => {
      const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
      const leader = sorted[0];
      if (!leader) return null;
      
      const runnerUp = sorted[1] || null;
      const topCandidates = sorted.slice(0, 4);
      const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
      const lead = runnerUp ? leader.votes - runnerUp.votes : leader.votes;
      
      const winProbability = (leader.status?.toLowerCase() === 'won' || !runnerUp)
        ? 100
        : (leader.votes + runnerUp.votes === 0 ? 50 : Math.min(99, Math.round(50 + (lead / (leader.votes + runnerUp.votes)) * 100)));

      return {
        province: leader.province || 'Unknown',
        district: leader.district || 'Unknown',
        constituency: leader.constituency || 0,
        leader,
        runnerUp,
        topCandidates,
        totalVotes,
        lead,
        winProbability
      } as ConstituencyResult;
    }).filter((res): res is ConstituencyResult => res !== null);
  }, [battlesData]);

  // Process data for Party Standings
  const processedPartyData = useMemo(() => {
    const constituencies: Record<string, Candidate[]> = {};
    
    partyData.forEach((c: Candidate) => {
      const key = `${c.province}-${c.district}-${c.constituency}`;
      if (!constituencies[key]) constituencies[key] = [];
      constituencies[key].push(c);
    });

    return Object.entries(constituencies).map(([key, candidates]) => {
      const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
      const leader = sorted[0];
      if (!leader) return null;
      const runnerUp = sorted[1] || null;
      const lead = runnerUp ? leader.votes - runnerUp.votes : leader.votes;
      const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
      const winProbability = (leader.status?.toLowerCase() === 'won' || !runnerUp)
        ? 100
        : (totalVotes === 0 ? 50 : Math.min(99, Math.round(50 + (lead / totalVotes) * 100)));

      return { leader, winProbability };
    }).filter(res => res !== null);
  }, [partyData]);

  // Party Totals for Sidebar
  const partyTotals = useMemo(() => {
    const totals: Record<string, { count: number; won: number; color: string; icon: string; samanupathik: number; prSeats: number }> = {};
    
    // Process Samanupathik Data first
    samanupathikData.forEach(item => {
      const parseVotes = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/,/g, '');
        const parsed = parseInt(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const party = item.partyName || item.party || item.Party || item['Party Name'] || item.Party_Name || 'Unknown';
      const votes = parseVotes(item.Pr_votes || item.Pr_Votes || item.votes || item.samanupathik || item.Votes || item.Samanupathik || item['Samanupathik Votes']);
      
      if (!totals[party]) {
        totals[party] = { count: 0, won: 0, color: '#cbd5e1', icon: '', samanupathik: votes, prSeats: 0 };
      } else {
        totals[party].samanupathik += votes;
      }
    });

    // Check if the data is already aggregated
    const hasAggregatedData = partyData.some(c => 
      (c as any).leading !== undefined || (c as any).won !== undefined
    );

    if (hasAggregatedData) {
      partyData.forEach(c => {
        const party = c.partyName || 'Unknown';
        const leading = parseInt((c as any).leading || (c as any).Leading) || 0;
        const won = parseInt((c as any).won || (c as any).Won) || 0;
        
        if (!totals[party]) {
          totals[party] = {
            count: leading,
            won: won,
            color: c.partyColor || '#cbd5e1',
            icon: c.partyIcon || '',
            samanupathik: 0,
            prSeats: 0
          };
        } else {
          totals[party].count += leading;
          totals[party].won += won;
          if (c.partyColor) totals[party].color = c.partyColor;
          if (c.partyIcon) totals[party].icon = c.partyIcon;
        }
      });
    } else {
      // Fallback: Aggregate from constituency leaders
      processedPartyData.forEach(res => {
        const party = res.leader?.partyName || 'Unknown';
        if (!totals[party]) {
          totals[party] = { count: 0, won: 0, color: '#cbd5e1', icon: '', samanupathik: 0, prSeats: 0 };
        }
        
        const status = (res.leader?.status || '').toLowerCase();
        if (status === 'won' || res.winProbability === 100) {
          totals[party].won += 1;
        } else {
          totals[party].count += 1;
        }
      });
    }

    // PR Seat Allocation Logic
    const TOTAL_CAST_VOTES = 11342213;
    const THRESHOLD = 340267; // Exactly as specified by user
    const TOTAL_PR_SEATS = 110;
    const QUOTA_PER_SEAT = TOTAL_CAST_VOTES / TOTAL_PR_SEATS; // ~103,111.027

    const eligibleParties = Object.entries(totals).filter(([_, data]) => data.samanupathik >= THRESHOLD);

    if (eligibleParties.length > 0) {
      let allocatedSeats = 0;
      const partyRemainders: { party: string, remainder: number }[] = [];

      eligibleParties.forEach(([party, data]) => {
        const rawSeats = data.samanupathik / QUOTA_PER_SEAT;
        const seats = Math.floor(rawSeats);
        totals[party].prSeats = seats;
        allocatedSeats += seats;
        partyRemainders.push({ party, remainder: rawSeats - seats });
      });

      // Distribute remaining seats using largest remainder method among eligible parties
      partyRemainders.sort((a, b) => b.remainder - a.remainder);
      let i = 0;
      while (allocatedSeats < TOTAL_PR_SEATS && i < partyRemainders.length) {
        totals[partyRemainders[i].party].prSeats += 1;
        allocatedSeats += 1;
        i++;
      }
    }
    
    return Object.entries(totals).sort((a, b) => {
      const totalA = a[1].won + a[1].count + a[1].prSeats;
      const totalB = b[1].won + b[1].count + b[1].prSeats;
      if (totalB !== totalA) return totalB - totalA;
      if (b[1].won !== a[1].won) return b[1].won - a[1].won;
      return b[1].samanupathik - a[1].samanupathik;
    });
  }, [processedPartyData, partyData, samanupathikData]);

  // Filtered Results
  const filteredResults = useMemo(() => {
    return processedBattlesData.filter(res => {
      const name = res.leader?.candidateName || '';
      const district = res.district || '';
      const province = res.province || '';
      const search = searchTerm.toLowerCase();
      
      return name.toLowerCase().includes(search) ||
             district.toLowerCase().includes(search) ||
             province.toLowerCase().includes(search);
    });
  }, [processedBattlesData, searchTerm]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={resetFilters}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
          >
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-200">
              🇳🇵
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">{t.title}</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{t.subtitle}</p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500 rounded-full text-sm transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ne')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${language === 'ne' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                नेपाली
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.lastUpdated}</p>
              <p className="text-xs font-bold text-slate-600">{lastUpdated.toLocaleTimeString()}</p>
            </div>
            <button 
              onClick={syncData}
              disabled={isSyncing}
              className={`p-2 rounded-full transition-all ${isSyncing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-8 space-y-12">
        {/* Top Row: Standings and Parliament */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar: Party Stats */}
          <aside className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-600" /> 
                {t.partyStanding}
              </h2>
            </div>
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 items-stretch border-b border-slate-200">
                <div className="col-span-5 p-4 flex items-center">
                  <h2 className="text-sm font-bold text-slate-800">{t.parties}</h2>
                </div>
                <div className="col-span-7 grid grid-cols-5 h-full">
                  <div className="bg-[#FEF9C3] flex flex-col items-center justify-center p-2 border-l border-slate-100">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-yellow-700">
                      <TrendingUp className="w-2 h-2" /> {t.leading}
                    </div>
                  </div>
                  <div className="bg-[#FFEDD5] flex flex-col items-center justify-center p-2 border-l border-slate-100">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-orange-700">
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex items-center justify-center text-[5px] text-white">✓</div> {t.won}
                    </div>
                  </div>
                  <div className="bg-[#E0F2FE] flex flex-col items-center justify-center p-2 border-l border-slate-100">
                    <div className="text-[8px] font-bold text-blue-700">{t.totalSeats}</div>
                  </div>
                  <div className="bg-red-50 flex flex-col items-center justify-center p-2 border-l border-slate-100">
                    <div className="text-[8px] font-bold text-red-700 text-center leading-tight">
                      {language === 'ne' ? 'समानुपातिक सिट' : 'PR Seats'}
                    </div>
                  </div>
                  <div className="bg-white flex flex-col items-center justify-center p-2 border-l border-slate-100">
                    <div className="text-[8px] font-bold text-slate-600 text-center leading-tight">
                      {language === 'ne' ? 'समानुपातिक मत' : 'PR Votes'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100">
                {partyTotals
                  .filter(([_, data]) => {
                    // Show if has wins, leads, or proportional votes
                    return data.won > 0 || data.count > 0 || data.samanupathik > 0;
                  })
                  .map(([party, data]) => {
                    const total = data.won + data.count;
                    return (
                      <div 
                        key={party} 
                        className="grid grid-cols-12 items-stretch group hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedParty({ name: party, ...data })}
                      >
                        <div className="col-span-5 p-4 flex flex-col justify-center gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-white shrink-0 overflow-hidden">
                              {data.icon ? (
                                <img src={data.icon} alt={party} className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-xs font-bold text-slate-400">{party.substring(0, 2)}</span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-800 leading-tight">{party}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.won / 138) * 100}%` }}
                              className="h-full"
                              style={{ backgroundColor: '#22c55e' }}
                            />
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(data.count / 138) * 100}%` }}
                              className="h-full"
                              style={{ backgroundColor: data.color || '#0ea5e9' }}
                            />
                          </div>
                        </div>

                        <div className="col-span-7 grid grid-cols-5">
                          <div className="bg-[#FEF9C3]/10 flex items-center justify-center border-l border-slate-100">
                            <span className="text-sm font-bold text-slate-700">{data.count > 0 ? formatNumber(data.count) : '-'}</span>
                          </div>
                          <div className="bg-[#FFEDD5]/10 flex items-center justify-center border-l border-slate-100">
                            <span className="text-sm font-bold text-slate-900">{data.won > 0 ? formatNumber(data.won) : '-'}</span>
                          </div>
                          <div className="bg-[#E0F2FE]/10 flex items-center justify-center border-l border-slate-100">
                            <span className="text-sm font-black text-slate-900">{formatNumber(data.won + data.count)}</span>
                          </div>
                          <div className="bg-red-50/30 flex items-center justify-center border-l border-slate-100">
                            <span className="text-sm font-black text-red-600">{data.prSeats > 0 ? formatNumber(data.prSeats) : '-'}</span>
                          </div>
                          <div className="flex items-center justify-center border-l border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500">{data.samanupathik > 0 ? formatNumber(data.samanupathik) : '0'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </aside>

          {/* Right: Parliament Chart Dashboard */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-red-600" /> 
                {t.parliament}
              </h2>
            </div>
            <ParliamentChart data={partyTotals} language={language} />
            
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalSeats}</p>
                  <p className="text-3xl font-black text-slate-900">{formatNumber(275)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.majority}</p>
                  <p className="text-3xl font-black text-red-600">{formatNumber(138)}</p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-red-600" style={{ width: '50.1%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Main Battles */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <Users className="w-6 h-6 text-red-600" /> 
              {t.mainBattles}
              <span className="text-sm font-bold text-slate-400 ml-2 bg-slate-100 px-3 py-1 rounded-full">
                {formatNumber(filteredResults.length)} {t.constituency}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredResults.map((res) => (
                  <motion.div
                    layout
                    key={`${res.province}-${res.district}-${res.constituency}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedConstituency(res)}
                  >
                    {/* Card Header */}
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {res.province} • {res.district}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{t.constituency} {formatNumber(res.constituency)}</span>
                      </div>
                      <div className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {formatNumber(res.winProbability)}% {t.prob}
                      </div>
                    </div>

                    {/* Main Content: Top 4 Candidates */}
                    <div className="p-4 space-y-3">
                      {res.topCandidates.map((candidate, idx) => (
                        <div key={idx} className={`flex items-center gap-3 ${idx === 0 ? 'pb-3 border-b border-slate-50' : ''}`}>
                          <div className="relative shrink-0">
                            {candidate.candidatePicture ? (
                              <img 
                                src={candidate.candidatePicture} 
                                alt={candidate.candidateName || 'Candidate'}
                                className={`${idx === 0 ? 'w-14 h-14' : 'w-10 h-10'} rounded-lg object-cover ring-2 ring-slate-50`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`${idx === 0 ? 'w-14 h-14' : 'w-10 h-10'} bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 ring-2 ring-slate-50`}>
                                <Users className={idx === 0 ? 'w-6 h-6' : 'w-4 h-4'} />
                              </div>
                            )}
                            {candidate.partyIcon && (
                              <div className={`absolute -bottom-1 -right-1 ${idx === 0 ? 'w-6 h-6' : 'w-4 h-4'} bg-white rounded-full p-0.5 shadow-sm border border-slate-100`}>
                                <img 
                                  src={candidate.partyIcon} 
                                  className="w-full h-full object-contain"
                                  alt={candidate.partyName || 'Party'}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h3 className={`${idx === 0 ? 'font-bold text-sm' : 'font-semibold text-xs'} text-slate-900 truncate leading-tight`}>
                                  {candidate.candidateName}
                                </h3>
                                <p className="text-[10px] font-medium text-slate-400 truncate">{candidate.partyName}</p>
                              </div>
                              <div className="text-right">
                                <p className={`${idx === 0 ? 'font-black text-sm' : 'font-bold text-xs'} text-slate-800`}>
                                  {candidate.votes.toLocaleString()}
                                </p>
                                {idx === 0 && (
                                  <p className={`text-[9px] font-bold uppercase tracking-tighter ${candidate.status?.toLowerCase() === 'won' ? 'text-green-600' : 'text-blue-600'}`}>
                                    {candidate.status?.toLowerCase() === 'won' ? t.won : t.leading}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Stats */}
                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <TrendingUp className="w-2.5 h-2.5" />
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{t.leadMargin}</p>
                          <p className="text-xs font-black text-green-600">+{formatNumber(res.lead)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{t.totalVotes}</p>
                          <p className="text-xs font-black text-slate-600">{formatNumber(res.totalVotes)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredResults.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{t.noResults}</h3>
                <p className="text-sm text-slate-500">{t.tryAdjusting}</p>
              </div>
            )}
          </section>
      </main>

      {/* Party Detail Modal */}
      <AnimatePresence>
        {selectedParty && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedParty(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center bg-white overflow-hidden">
                    {selectedParty.icon ? (
                      <img src={selectedParty.icon} alt={selectedParty.name} className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl font-bold text-slate-400">{selectedParty.name.substring(0, 2)}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedParty.name}</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.partyStanding}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedParty(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#FEF9C3] rounded-2xl p-6 border border-yellow-100">
                    <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-1">{t.leading}</p>
                    <p className="text-4xl font-black text-yellow-800">{formatNumber(selectedParty.count)}</p>
                  </div>
                  <div className="bg-[#FFEDD5] rounded-2xl p-6 border border-orange-100">
                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1">{t.won}</p>
                    <p className="text-4xl font-black text-orange-800">{formatNumber(selectedParty.won)}</p>
                  </div>
                  <div className="bg-[#E0F2FE] rounded-2xl p-6 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">{t.totalSeats}</p>
                    <p className="text-4xl font-black text-blue-800">{formatNumber(selectedParty.won + selectedParty.count)}</p>
                  </div>
                  <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">{t.proportionalVotes}</p>
                    <p className="text-4xl font-black text-red-800">{formatNumber(selectedParty.samanupathik)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.results}</h3>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedParty.won / 138) * 100}%` }}
                      className="h-full"
                      style={{ backgroundColor: '#22c55e' }}
                    />
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(selectedParty.count / 138) * 100}%` }}
                      className="h-full"
                      style={{ backgroundColor: selectedParty.color || '#0ea5e9' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>0</span>
                    <span>{t.majority} (138)</span>
                    <span>275</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-center">
                <button 
                  onClick={() => setSelectedParty(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  {t.back}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedConstituency && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedConstituency(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedConstituency(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedConstituency.province} • {selectedConstituency.district}
                    </h2>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-widest">
                      {t.constituency} {formatNumber(selectedConstituency.constituency)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedConstituency(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalVotes}</p>
                    <p className="text-3xl font-black text-slate-900">{formatNumber(selectedConstituency.totalVotes)}</p>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                    <p className="text-[10px] font-black text-green-600/60 uppercase tracking-widest mb-1">{t.leadMargin}</p>
                    <p className="text-3xl font-black text-green-600">+{formatNumber(selectedConstituency.lead)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest mb-1">{t.prob}</p>
                    <p className="text-3xl font-black text-blue-600">{formatNumber(selectedConstituency.winProbability)}%</p>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Bar Chart */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> {t.voteDistribution}
                    </h3>
                    <div className="h-[300px] w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedConstituency.topCandidates.map(c => ({
                            name: c.candidateName,
                            votes: c.votes,
                            color: c.partyColor || '#ef4444'
                          }))}
                          layout="vertical"
                          margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20}>
                            {selectedConstituency.topCandidates.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.partyColor || '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" /> {t.voteShare}
                    </h3>
                    <div className="h-[300px] w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={selectedConstituency.topCandidates.map(c => ({
                              name: c.candidateName,
                              value: c.votes
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {selectedConstituency.topCandidates.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.partyColor || '#ef4444'} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="text-[10px] font-bold text-slate-600">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Candidate List Detailed */}
                <div className="space-y-4">
                  <div className="grid grid-cols-12 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="col-span-6">{t.candidate}</div>
                    <div className="col-span-3 text-right">{t.votes}</div>
                    <div className="col-span-3 text-right">{t.share}</div>
                  </div>
                  <div className="space-y-2">
                    {selectedConstituency.topCandidates.map((c, idx) => (
                      <div key={idx} className="grid grid-cols-12 items-center p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="col-span-6 flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={c.candidatePicture || 'https://picsum.photos/seed/user/100/100'} 
                              className="w-10 h-10 rounded-full object-cover border-2 border-slate-50"
                              alt={c.candidateName}
                              referrerPolicy="no-referrer"
                            />
                            {c.partyIcon && (
                              <img 
                                src={c.partyIcon} 
                                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white p-0.5 border border-slate-100"
                                alt={c.partyName}
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{c.candidateName}</p>
                            <p className="text-[10px] font-medium text-slate-400">{c.partyName}</p>
                          </div>
                        </div>
                        <div className="col-span-3 text-right">
                          <p className="text-sm font-black text-slate-800">{formatNumber(c.votes)}</p>
                        </div>
                        <div className="col-span-3 text-right">
                          <p className="text-sm font-black text-slate-400">
                            {((c.votes / selectedConstituency.totalVotes) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-center">
                <button 
                  onClick={() => setSelectedConstituency(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {t.back}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-slate-400">
            <Info className="w-5 h-5" />
            <p className="text-xs font-medium">{t.dataSource}</p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-xs font-bold text-slate-500 hover:text-red-600 uppercase tracking-widest">{t.about}</a>
            <a href="#" className="text-xs font-bold text-slate-500 hover:text-red-600 uppercase tracking-widest">{t.methodology}</a>
            <a href="#" className="text-xs font-bold text-slate-500 hover:text-red-600 uppercase tracking-widest">{t.contact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
