'use client';

/**
 * ☝️ [중요] Next.js App Router에서 useState, useEffect 등을 쓰려면
 * 반드시 파일 최상단에 'use client'; 가 있어야 해!
 */

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
// 1. 사용할 아이콘들을 모두 여기서 불러옵니다.
import {
  LayoutDashboard,
  PieChart,
  BookOpen,
  Settings,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  X,
  Pin, // 대문자 Pin
  Star, // 대문자 Star
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Building2,
  Coins,
  ArrowRightLeft,
  MessageSquareQuote,
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * [앱 설정 및 테마]
 * ------------------------------------------------------------------
 */
const APP_CONFIG = {
  theme: {
    primary: 'bg-rose-400',
    primaryHover: 'hover:bg-rose-500',
    // [변경] 배경색을 연한 그레이로 변경
    secondaryBg: 'bg-gray-50',
    cardBg: 'bg-white',
    textMain: 'text-zinc-700',
    textSub: 'text-gray-500',
    accent: 'text-rose-500',
    highlight: 'bg-yellow-200',
    // [변경] 사이드바 배경을 흰색으로 변경 (깔끔함 강조)
    sidebarBg: 'bg-white', 
  },
  icons: {
    Dashboard: Star,
    Stats: PieChart,
    Strategies: BookOpen,
    Settings: Pin,
    
    Add: Plus,
    Search: Search,
    Export: Download,
    Delete: Trash2,
    Edit: Edit2,
    Close: X,
    Quote: MessageSquareQuote,

    Down: ChevronDown,
    Up: TrendingUp,
    DownTrend: TrendingDown,
    Fee: Building2,
    Profit: Coins,
    Exchange: ArrowRightLeft,
  }
};

const DEFAULT_STRATEGIES = [
  { id: 'rsi_div', title: 'RSI 다이버전스', description: '과매수/과매도 구간에서 주가와 지표의 괴리를 이용한 매매' },
  { id: 'breakout', title: '박스권 돌파', description: '오랜 횡보장을 강한 거래량으로 돌파할 때 진입' },
  { id: 'bband', title: '볼린저 밴드', description: '밴드 하단 지지 또는 상단 저항 매매' },
];

const DEFAULT_EXCHANGES = [
  { id: 'binance', name: 'Binance', makerFee: 0.02, takerFee: 0.05 },
  { id: 'bybit', name: 'Bybit', makerFee: 0.01, takerFee: 0.06 },
  { id: 'upbit', name: 'Upbit', makerFee: 0.05, takerFee: 0.05 },
];

/**
 * ------------------------------------------------------------------
 * [Firebase Init]
 * ------------------------------------------------------------------
 */
const firebaseConfig = {
  apiKey: "AIzaSyApCBDZtKlXoeclGosSDwYGrZxmLlvRHc4",
  authDomain: "berry-log.firebaseapp.com",
  projectId: "berry-log",
  storageBucket: "berry-log.firebasestorage.app",
  messagingSenderId: "196264964134",
  appId: "1:196264964134:web:bc1fa5d181204bb965b6e7",
  measurementId: "G-EZEWGTX337"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (typeof window !== 'undefined') {
  try {
    getAnalytics(app);
  } catch (e) {
    console.log("Analytics init skipped");
  }
}

const appId = 'very-daily-log';

// 유틸리티 함수들
const formatNumber = (num: any) => {
  if (num === '' || num === null || num === undefined) return '';
  return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const getCurrentDateTimeString = () => {
  const now = new Date();
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

/**
 * ------------------------------------------------------------------
 * [메인 앱 컴포넌트]
 * ------------------------------------------------------------------
 */
export default function VeryDailyLog() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [strategies, setStrategies] = useState(DEFAULT_STRATEGIES);
  const [exchanges, setExchanges] = useState(DEFAULT_EXCHANGES);
  const [userQuote, setUserQuote] = useState("기록이 쌓여 실력이 됩니다.");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('ALL');

  const Icons = APP_CONFIG.icons;

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'stock_records'),
      orderBy('openDate', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      setLoading(false);
    }, (error) => {
      console.error("Fetch Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Settings Fetching
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.exchanges) setExchanges(data.exchanges);
          if (data.quote) setUserQuote(data.quote);
        }
      } catch (e) {
        console.error("Settings Error:", e);
      }
    };
    fetchSettings();
  }, [user]);

  const saveSettings = async (newExchanges: any[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), {
        exchanges: newExchanges
      }, { merge: true });
      setExchanges(newExchanges);
    } catch (e) {
      console.error("Save Settings Error:", e);
    }
  };

  const handleSaveQuote = async (newQuote: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), {
        quote: newQuote
      }, { merge: true });
      setUserQuote(newQuote);
    } catch (e) {
      console.error("Save Quote Error:", e);
    }
  };

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(records.map(r => r.symbol?.toUpperCase()).filter(Boolean));
    return Array.from(symbols).sort();
  }, [records]);

  // --- CRUD Functions ---
  const handleSave = async (formData: any) => {
    if (!user) return;
    let finalData = { ...formData };
    
    if (finalData.closePrice && finalData.entryPrice && finalData.leverage) {
      const entry = parseFloat(finalData.entryPrice);
      const close = parseFloat(finalData.closePrice);
      const lev = parseFloat(finalData.leverage);
      const margin = parseFloat(finalData.margin) || 0;
      
      let pnlPercent = 0;
      if (finalData.position === 'Long') {
        pnlPercent = ((close - entry) / entry) * 100 * lev;
      } else {
        pnlPercent = ((entry - close) / entry) * 100 * lev;
      }
      finalData.pnl = parseFloat(pnlPercent.toFixed(2));
      
      const positionSize = margin * lev;
      const exchangeInfo = exchanges.find(ex => ex.name === finalData.exchange);
      const entryFeeRate = (exchangeInfo ? (finalData.entryType === 'Maker' ? exchangeInfo.makerFee : exchangeInfo.takerFee) : 0.04) / 100;
      const exitFeeRate = (exchangeInfo ? (finalData.exitType === 'Maker' ? exchangeInfo.makerFee : exchangeInfo.takerFee) : 0.04) / 100;

      const entryFee = positionSize * entryFeeRate;
      const exitValue = positionSize * (1 + (pnlPercent / 100 / lev));
      const exitFee = exitValue * exitFeeRate;
      
      const totalFee = entryFee + exitFee;
      finalData.fees = parseFloat(totalFee.toFixed(2));

      const grossPnl = margin * (pnlPercent / 100);
      finalData.grossPnl = parseFloat(grossPnl.toFixed(2));
      finalData.realizedPnlValue = parseFloat((grossPnl - totalFee).toFixed(2));
    }

    try {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'stock_records');
      if (editingRecord) {
        await updateDoc(doc(colRef, editingRecord.id), finalData);
      } else {
        await addDoc(colRef, {
          ...finalData,
          createdAt: serverTimestamp()
        });
      }
      setIsFormOpen(false);
      setEditingRecord(null);
    } catch (e) {
      console.error("Save Error:", e);
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'stock_records', deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("Delete Error:", e);
    }
  };

  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const header = ['날짜', '거래소', '종목', '포지션', '진입가', '청산가', '레버리지', '수익률(%)', '순수익($)', '수수료($)', '전략', '메모'];
    const rows = records.map(r => [
      r.openDate,
      r.exchange || '-',
      r.symbol,
      r.position,
      r.entryPrice,
      r.closePrice || '-',
      r.leverage,
      r.pnl || '-',
      r.realizedPnlValue || '-',
      r.fees || '-',
      r.strategy || '-',
      `"${(r.entryMemo || '')} ${(r.exitMemo || '')}"`
    ]);

    const csvContent = BOM + [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trading_log_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    if (selectedSymbol !== 'ALL') {
      result = result.filter(r => r.symbol?.toUpperCase() === selectedSymbol);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.symbol?.toLowerCase().includes(lower) || 
        r.strategy?.toLowerCase().includes(lower) ||
        r.exchange?.toLowerCase().includes(lower) ||
        r.entryMemo?.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [records, searchTerm, selectedSymbol]);

  const openPositions = filteredRecords.filter(r => r.status === 'Open');
  const closedRecords = filteredRecords.filter(r => r.status === 'Closed');

  const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight || !text) return <span>{text}</span>;
    const parts = text.toString().split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? 
            <span key={i} className={`${APP_CONFIG.theme.highlight} rounded px-0.5`}>{part}</span> : part
        )}
      </span>
    );
  };

  if (loading && !user) return <div className={`min-h-screen flex items-center justify-center ${APP_CONFIG.theme.secondaryBg} ${APP_CONFIG.theme.accent} animate-pulse font-sans`}>로딩중...</div>;

  return (
    <div className={`min-h-screen ${APP_CONFIG.theme.secondaryBg} pb-20 md:pb-0 md:pl-64 transition-all duration-300`}>
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around p-3 pb-safe">
        <NavButton icon={<Icons.Dashboard size={20}/>} label="일지" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavButton icon={<Icons.Stats size={20}/>} label="통계" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        <NavButton icon={<Icons.Settings size={20}/>} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex fixed left-0 top-0 bottom-0 w-64 ${APP_CONFIG.theme.sidebarBg} border-r border-gray-200 flex-col p-6 shadow-sm z-40`}>
        
        {/* 로고 영역 */}
        <div className="mb-10 pl-1">
          <div className="flex flex-col text-gray-700 leading-none">
            <span className="text-4xl font-light tracking-tight mb-1">Very</span>
            <div className="flex items-start gap-1">
              <span className="text-4xl font-bold tracking-tight">Daily Log</span>
              <div className="w-2.5 h-2.5 bg-rose-300 rounded-full mt-2"></div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<Icons.Dashboard size={18}/>} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Icons.Stats size={18}/>} label="통계 분석" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <SidebarItem icon={<Icons.Strategies size={18}/>} label="매매 전략" active={activeTab === 'strategies'} onClick={() => setActiveTab('strategies')} />
          <SidebarItem icon={<Icons.Settings size={18}/>} label="환경 설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        
        <div className="pt-6 border-t border-gray-200">
           <button onClick={handleExportCSV} className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-500 transition-colors w-full p-2 rounded-lg hover:bg-gray-50">
             <Icons.Export size={16} /> 엑셀 다운로드
           </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
        {activeTab === 'dashboard' && (
          <DashboardView 
            openPositions={openPositions} 
            closedRecords={closedRecords} 
            onAdd={() => { setEditingRecord(null); setIsFormOpen(true); }}
            onEdit={(r: any) => { setEditingRecord(r); setIsFormOpen(true); }}
            onDelete={(r: any) => setDeleteTarget(r)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            uniqueSymbols={uniqueSymbols}
            HighlightText={HighlightText}
            Icons={Icons}
            userQuote={userQuote}
          />
        )}
        {activeTab === 'stats' && <StatsView records={records} Icons={Icons} />}
        {activeTab === 'strategies' && <StrategiesView strategies={strategies} />}
        {activeTab === 'settings' && (
          <SettingsView 
            exchanges={exchanges} 
            onSave={saveSettings} 
            Icons={Icons} 
            userQuote={userQuote}
            onSaveQuote={handleSaveQuote}
          />
        )}
      </main>

      {/* Modals */}
      {isFormOpen && (
        <TradeFormModal 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          initialData={editingRecord}
          onSave={handleSave}
          strategies={strategies}
          exchanges={exchanges}
          existingSymbols={uniqueSymbols}
          Icons={Icons}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal 
          target={deleteTarget} 
          onClose={() => setDeleteTarget(null)} 
          onConfirm={handleDelete} 
          Icons={Icons}
        />
      )}
    </div>
  );
}

// --- Sub Components ---

function DashboardView({ 
  openPositions, closedRecords, onAdd, onEdit, onDelete, 
  searchTerm, setSearchTerm, selectedSymbol, setSelectedSymbol, uniqueSymbols, HighlightText, Icons, userQuote
}: any) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-col">
            {/* [변경] 폰트 크기 키우고 (text-3xl), 아래 간격 추가 (mb-2) */}
            <h1 className="text-3xl font-bold text-zinc-600 mb-2">😎</h1>
            <p className={`${APP_CONFIG.theme.accent} text-sm font-medium`}>{userQuote}</p>
          </div>
        </div>
        
        {/* 검색창 영역 */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="종목, 메모, 거래소 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 transition-shadow placeholder-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <button 
          onClick={() => setSelectedSymbol('ALL')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedSymbol === 'ALL' ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          ALL
        </button>
        {uniqueSymbols.map((sym: string) => (
          <button 
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedSymbol === sym ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Open Positions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-rose-400 rounded-full"></div>
            <h3 className="font-bold text-lg text-gray-700">진행 중인 포지션 ({openPositions.length})</h3>
          </div>
          
          {/* 기록하기 버튼 */}
          <button 
            onClick={onAdd}
            className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} text-white px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1 text-xs font-bold transition-transform active:scale-95 whitespace-nowrap`}
          >
            <Icons.Add size={14} /> 기록하기
          </button>
        </div>
        
        {openPositions.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
            현재 보유 중인 포지션이 없어요 🕊️
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openPositions.map((record: any) => (
              <TradeCard 
                key={record.id} 
                record={record} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                HighlightText={HighlightText}
                searchTerm={searchTerm}
                Icons={Icons}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closed Records */}
      <section>
        <details className="group" open={true}>
          <summary className="list-none cursor-pointer mb-3">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 bg-gray-300 group-open:bg-rose-400 transition-colors rounded-full"></div>
                <h3 className="font-bold text-lg text-gray-700">매매 기록 보관함 ({closedRecords.length})</h3>
              </div>
              <Icons.Down className="text-gray-400 group-open:rotate-180 transition-transform" />
            </div>
          </summary>
          
          <div className="mt-4 space-y-3">
            {closedRecords.length === 0 ? (
              <div className="text-center p-8 text-gray-400 text-sm">아직 완료된 매매 기록이 없어요.</div>
            ) : (
              closedRecords.map((record: any) => (
                <HistoryRow 
                  key={record.id} 
                  record={record} 
                  onEdit={onEdit} 
                  onDelete={onDelete} 
                  HighlightText={HighlightText}
                  searchTerm={searchTerm}
                  Icons={Icons}
                />
              ))
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

function SettingsView({ exchanges, onSave, Icons, userQuote, onSaveQuote }: any) {
  const [localExchanges, setLocalExchanges] = useState(exchanges);
  const [newEx, setNewEx] = useState({ name: '', makerFee: '0.02', takerFee: '0.05' });
  const [quoteInput, setQuoteInput] = useState(userQuote);

  useEffect(() => {
    setQuoteInput(userQuote);
  }, [userQuote]);

  const handleAdd = () => {
    if (!newEx.name) return;
    const next = [...localExchanges, { ...newEx, id: Date.now().toString() }];
    setLocalExchanges(next);
    onSave(next);
    setNewEx({ name: '', makerFee: '0.02', takerFee: '0.05' });
  };

  const handleDelete = (id: string) => {
    if (confirm('이 거래소를 목록에서 삭제할까요?')) {
      const next = localExchanges.filter((e: any) => e.id !== id);
      setLocalExchanges(next);
      onSave(next);
    }
  };

  const handleUpdate = (id: string, field: string, value: string) => {
    const next = localExchanges.map((e: any) => e.id === id ? { ...e, [field]: value } : e);
    setLocalExchanges(next);
  };

  const handleBlur = () => {
    onSave(localExchanges);
  };

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl mx-auto pb-20">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">환경 설정 ⚙️</h2>
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
          <Icons.Quote size={20} className="text-rose-400"/> 메인 문구 설정
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          대시보드 상단에 표시될 나만의 다짐이나 명언을 적어보세요.
        </p>
        <div className="flex gap-2">
          <input 
            type="text"
            value={quoteInput}
            onChange={(e) => setQuoteInput(e.target.value)}
            placeholder="기록이 쌓여 실력이 됩니다."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors"
          />
          <button 
            onClick={() => onSaveQuote(quoteInput)}
            className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} text-white px-6 rounded-xl font-bold text-sm shadow-md shadow-rose-200 transition-transform active:scale-95 whitespace-nowrap`}
          >
            저장
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
          <Icons.Fee size={20} className="text-rose-400"/> 거래소 및 수수료 관리
        </h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          자주 사용하는 거래소와 수수료율(%)을 등록해두세요.<br/>매매 기록 시 자동 적용됩니다.
        </p>
        
        <div className="space-y-4">
          {localExchanges.map((ex: any) => (
            <div key={ex.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
              <button 
                onClick={() => handleDelete(ex.id)} 
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Icons.Delete size={16} />
              </button>

              <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 font-bold mb-1 block ml-1">거래소명</label>
                  <input 
                    type="text" 
                    value={ex.name} 
                    onChange={(e) => handleUpdate(ex.id, 'name', e.target.value)}
                    onBlur={handleBlur}
                    className="w-full bg-white border-b-2 border-gray-200 focus:border-rose-400 px-3 py-2 outline-none text-sm font-bold text-gray-700 rounded-t-lg transition-colors"
                  />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 font-bold mb-1 block ml-1">Maker(%)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ex.makerFee} 
                      onChange={(e) => handleUpdate(ex.id, 'makerFee', e.target.value)}
                      onBlur={handleBlur}
                      className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-center outline-none focus:border-rose-300 font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 font-bold mb-1 block ml-1">Taker(%)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ex.takerFee} 
                      onChange={(e) => handleUpdate(ex.id, 'takerFee', e.target.value)}
                      onBlur={handleBlur}
                      className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-center outline-none focus:border-rose-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
          <p className="text-xs font-bold text-rose-400 mb-3 ml-1">새로운 거래소 추가</p>
          <div className="flex flex-col md:flex-row gap-3 items-end">
             <div className="w-full md:flex-1">
               <input 
                 placeholder="예: Bitget"
                 value={newEx.name}
                 onChange={(e) => setNewEx({...newEx, name: e.target.value})}
                 className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors"
               />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <div className="flex-1 md:w-20">
                 <input 
                   type="number" step="0.01"
                   placeholder="Mk"
                   value={newEx.makerFee}
                   onChange={(e) => setNewEx({...newEx, makerFee: e.target.value})}
                   className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors text-center"
                 />
               </div>
               <div className="flex-1 md:w-20">
                 <input 
                   type="number" step="0.01"
                   placeholder="Tk"
                   value={newEx.takerFee}
                   onChange={(e) => setNewEx({...newEx, takerFee: e.target.value})}
                   className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors text-center"
                 />
               </div>
               <button 
                onClick={handleAdd} 
                className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} text-white p-3 rounded-xl transition-transform active:scale-95 shadow-md shadow-rose-200 flex-shrink-0`}
               >
                 <Icons.Add size={20} />
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsView({ records, Icons }: any) {
  const closed = records.filter((r: any) => r.status === 'Closed');
  const wins = closed.filter((r: any) => r.pnl > 0).length;
  const total = closed.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  
  const totalNetPnl = closed.reduce((acc: number, cur: any) => acc + (parseFloat(cur.realizedPnlValue) || 0), 0);
  const totalFees = closed.reduce((acc: number, cur: any) => acc + (parseFloat(cur.fees) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">나의 트레이딩 성적표 📊</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="총 매매" value={`${total}회`} icon={<Icons.Dashboard size={18} />} color="bg-blue-50 text-blue-600" />
        <StatCard label="승률" value={`${winRate}%`} icon={<Icons.Up size={18} />} color="bg-rose-50 text-rose-600" />
        <StatCard label="순수익(Net)" value={`$${formatNumber(totalNetPnl)}`} icon={<Icons.Profit size={18} />} color={totalNetPnl >= 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"} />
        <StatCard label="총 수수료" value={`$${formatNumber(totalFees)}`} icon={<Icons.Fee size={18} />} color="bg-gray-100 text-gray-600" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center text-gray-400 text-sm">
        상세 통계 준비 중...
      </div>
    </div>
  );
}

function StrategiesView({ strategies }: any) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800">나의 매매 전략 노트 📝</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {strategies.map((s: any, idx: number) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-rose-300 transition-all">
            <h3 className="font-bold text-lg text-rose-500 mb-2">{s.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} mb-1`}>{icon}</div>
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

function TradeCard({ record, onEdit, onDelete, HighlightText, searchTerm, Icons }: any) {
  const isLong = record.position === 'Long';
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all relative group">
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={() => onEdit(record)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-rose-500"><Icons.Edit size={14} /></button>
        <button onClick={() => onDelete(record)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500"><Icons.Delete size={14} /></button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLong ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {record.position.toUpperCase()} x{record.leverage}
        </span>
        <div className="flex items-center gap-2">
          {record.exchange && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{record.exchange}</span>}
          <span className="text-xs text-gray-400">{record.openDate.split('T')[0]}</span>
        </div>
      </div>

      <h3 className="font-bold text-lg text-gray-800 mb-1 flex items-center gap-2">
        <HighlightText text={record.symbol} highlight={searchTerm} />
      </h3>
      <div className={`${APP_CONFIG.theme.secondaryBg} text-xs ${APP_CONFIG.theme.accent} mb-4 inline-block px-2 py-0.5 rounded`}>
         <HighlightText text={record.strategy || '전략 없음'} highlight={searchTerm} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-gray-400 text-xs">진입가</div>
          <div className="font-mono font-medium">{formatNumber(record.entryPrice)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Margin</div>
          <div className="font-mono font-medium">${formatNumber(record.margin)}</div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ record, onEdit, onDelete, HighlightText, searchTerm, Icons }: any) {
  const isProfit = record.pnl > 0;
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 hover:border-rose-200 transition-all flex flex-col md:flex-row md:items-center gap-4 group">
      <div className="flex justify-between items-center md:hidden">
        <span className="text-xs text-gray-400">{record.openDate.split('T')[0]}</span>
        <div className="flex gap-2">
           <button onClick={() => onEdit(record)} className="text-gray-400"><Icons.Edit size={14} /></button>
           <button onClick={() => onDelete(record)} className="text-gray-400"><Icons.Delete size={14} /></button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${record.position === 'Long' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {record.position.charAt(0)}
          </span>
          <h4 className="font-bold text-gray-700 truncate w-24 md:w-auto">
            <HighlightText text={record.symbol} highlight={searchTerm} />
          </h4>
          <span className="text-xs text-gray-400">x{record.leverage}</span>
          {record.exchange && <span className="text-[10px] text-gray-400 border border-gray-100 px-1 rounded ml-1 hidden md:inline">{record.exchange}</span>}
        </div>
        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
          <span>{record.strategy}</span>
          {record.exitReason && <span className="bg-gray-100 px-1 rounded text-[10px] text-gray-400">{record.exitReason}</span>}
          {record.exitMemo && <span className={`${APP_CONFIG.theme.accent} text-[10px] truncate max-w-[150px]`}>💬 {record.exitMemo}</span>}
        </div>
      </div>

      <div className="flex justify-between md:justify-end items-center gap-6 md:w-1/2">
        <div className="text-right">
          <div className="text-[10px] text-gray-400">PNL %</div>
          <div className={`font-bold font-mono ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
            {record.pnl > 0 ? '+' : ''}{record.pnl}%
          </div>
        </div>
        <div className="text-right w-20">
          <div className="text-[10px] text-gray-400">순수익($)</div>
          <div className={`font-bold font-mono text-sm ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
            ${formatNumber(record.realizedPnlValue)}
          </div>
          {record.fees > 0 && <div className="text-[9px] text-gray-300">수수료 -${record.fees}</div>}
        </div>
        <div className="hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => onEdit(record)} className="p-2 hover:bg-rose-50 rounded-full text-gray-400 hover:text-rose-500"><Icons.Edit size={16} /></button>
           <button onClick={() => onDelete(record)} className="p-2 hover:bg-rose-50 rounded-full text-gray-400 hover:text-red-500"><Icons.Delete size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// [NEW] 커스텀 토글 컴포넌트
function ToggleSwitch({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) {
  return (
    <div className="bg-gray-100 p-1 rounded-full flex items-center relative h-8 w-32">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 text-xs font-bold z-10 transition-colors ${value === opt ? 'text-rose-500' : 'text-gray-400'}`}
        >
          {opt}
        </button>
      ))}
      <div 
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-all duration-200 ease-out ${value === options[1] ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
      />
    </div>
  );
}

function TradeFormModal({ isOpen, onClose, initialData, onSave, strategies, exchanges, existingSymbols, Icons }: any) {
  const [formData, setFormData] = useState({
    symbol: '',
    exchange: exchanges[0]?.name || '', // Default exchange
    position: 'Long',
    leverage: '1',
    margin: '',
    entryPrice: '',
    entryType: 'Maker', // Maker or Taker
    openDate: getCurrentDateTimeString(),
    status: 'Open',
    closePrice: '',
    exitType: 'Taker', // Maker or Taker
    exitReason: '',
    closeDate: '',
    strategy: strategies[0]?.title || '',
    entryMemo: '', 
    exitMemo: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        entryMemo: initialData.entryMemo || initialData.memo || '', 
        exitMemo: initialData.exitMemo || '',
        exchange: initialData.exchange || exchanges[0]?.name,
        entryType: initialData.entryType || 'Maker',
        exitType: initialData.exitType || 'Taker',
      });
    }
  }, [initialData]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'closePrice') {
        if (value && !prev.closeDate) {
          next.status = 'Closed';
          next.closeDate = getCurrentDateTimeString();
        }
      }
      return next;
    });
  };

  const handleStatusChange = (e: any) => {
    const isClosed = e.target.checked;
    setFormData(prev => ({
      ...prev,
      status: isClosed ? 'Closed' : 'Open',
      closeDate: isClosed && !prev.closeDate ? getCurrentDateTimeString() : prev.closeDate
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-xl text-gray-800">{initialData ? '매매 기록 수정 ✏️' : '새 매매 기록 🌱'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><Icons.Close size={20} className="text-gray-400"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Exchange & Symbol */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">거래소</label>
              <select 
                name="exchange" 
                value={formData.exchange} 
                onChange={handleChange} 
                className="w-full p-2.5 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-rose-300 focus:outline-none text-sm"
              >
                {exchanges.map((ex: any) => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">종목명</label>
              <input 
                list="symbol-list"
                name="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                placeholder="BTC"
                className="w-full p-2.5 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-rose-300 focus:outline-none text-sm font-bold uppercase"
                required
              />
              <datalist id="symbol-list">
                {existingSymbols.map((sym: string) => <option key={sym} value={sym} />)}
              </datalist>
            </div>
          </div>

          {/* Position & Margin */}
          <div className="flex gap-4">
             <div className="w-1/2">
                <label className="block text-xs font-bold text-gray-500 mb-1">포지션</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({...formData, position: 'Long'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${formData.position === 'Long' ? 'bg-green-100 text-green-600 ring-2 ring-green-200' : 'bg-gray-50 text-gray-400'}`}>Long</button>
                  <button type="button" onClick={() => setFormData({...formData, position: 'Short'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${formData.position === 'Short' ? 'bg-red-100 text-red-600 ring-2 ring-red-200' : 'bg-gray-50 text-gray-400'}`}>Short</button>
                </div>
             </div>
             <div className="w-1/2">
                <FormInput label="증거금 (Margin $)" name="margin" type="number" value={formData.margin} onChange={handleChange} placeholder="$" />
             </div>
          </div>

          {/* Entry Info */}
          <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
             <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-400">진입 정보</span>
                {/* [NEW] 커스텀 토글 적용 */}
                <ToggleSwitch 
                  options={['Maker', 'Taker']} 
                  value={formData.entryType} 
                  onChange={(val) => setFormData({...formData, entryType: val})} 
                />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <FormInput label="진입가" name="entryPrice" type="number" step="any" value={formData.entryPrice} onChange={handleChange} required />
               <FormInput label="레버리지 (x)" name="leverage" type="number" value={formData.leverage} onChange={handleChange} required />
             </div>
             <FormInput label="오픈 시간" name="openDate" type="datetime-local" value={formData.openDate} onChange={handleChange} />
             <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">전략 & 근거</label>
               <div className="flex gap-2 mb-2">
                 <select name="strategy" value={formData.strategy} onChange={handleChange} className="w-1/2 p-2 bg-white rounded-xl border border-blue-100 text-xs outline-none">
                   <option value="">전략 선택</option>
                   {strategies.map((s: any) => <option key={s.id} value={s.title}>{s.title}</option>)}
                   <option value="기타">기타</option>
                 </select>
               </div>
               <textarea 
                  name="entryMemo"
                  value={formData.entryMemo}
                  onChange={handleChange}
                  placeholder="진입 근거 메모..."
                  className="w-full p-2 bg-white rounded-xl border border-blue-100 text-xs resize-none h-16 outline-none"
                />
             </div>
          </div>

          {/* Exit Info */}
          <div className="border-t border-dashed border-gray-200 my-2"></div>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-sm font-bold text-gray-700">청산 정보 (선택)</span>
               <label className="flex items-center gap-2 cursor-pointer select-none">
                 <input 
                   type="checkbox" 
                   checked={formData.status === 'Closed'} 
                   onChange={handleStatusChange} 
                   className="w-5 h-5 rounded text-rose-500 focus:ring-rose-400 accent-rose-500 cursor-pointer"
                 />
                 <span className={`text-xs ${formData.status === 'Closed' ? 'text-rose-500 font-bold' : 'text-gray-500'}`}>포지션 종료됨</span>
               </label>
             </div>
             
             {formData.status === 'Closed' && (
               <div className="animate-fade-in space-y-3 p-4 bg-gray-50 rounded-2xl">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-rose-400">청산 세부</span>
                    {/* [NEW] 커스텀 토글 적용 */}
                    <ToggleSwitch 
                      options={['Maker', 'Taker']} 
                      value={formData.exitType} 
                      onChange={(val) => setFormData({...formData, exitType: val})} 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <FormInput label="청산가" name="closePrice" type="number" step="any" value={formData.closePrice} onChange={handleChange} placeholder="입력시 자동 계산" />
                   <FormInput label="청산 시간" name="closeDate" type="datetime-local" value={formData.closeDate} onChange={handleChange} />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">청산 기준</label>
                   <div className="flex gap-2 flex-wrap">
                     {['TP Hit', 'SL Hit', 'Trailing', 'Market'].map(reason => (
                       <button 
                         key={reason}
                         type="button" 
                         onClick={() => setFormData({...formData, exitReason: reason})}
                         className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${formData.exitReason === reason ? 'bg-rose-400 text-white border-rose-400' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300'}`}
                       >
                         {reason}
                       </button>
                     ))}
                   </div>
                 </div>
                 <textarea 
                   name="exitMemo"
                   value={formData.exitMemo}
                   onChange={handleChange}
                   placeholder="매매 복기 및 배운 점..."
                   className="w-full p-3 bg-white rounded-xl border border-rose-200 focus:border-rose-400 focus:outline-none text-sm resize-none h-16"
                 />
               </div>
             )}
          </div>

          <div className="pt-2">
            <button type="submit" className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} w-full text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-[0.98]`}>
              {initialData ? '수정 완료' : '기록 저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormInput({ label, ...props }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
      <input 
        className="w-full p-2.5 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-rose-300 focus:outline-none text-sm transition-all"
        {...props}
      />
    </div>
  );
}

function DeleteConfirmModal({ target, onClose, onConfirm, Icons }: any) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Icons.Delete size={24} />
        </div>
        <h3 className="font-bold text-lg text-gray-800 mb-2">기록을 삭제할까요?</h3>
        <p className="text-gray-500 text-sm mb-6">
          <span className="font-bold text-gray-700">{target.symbol}</span> 매매 기록이 영구적으로 삭제됩니다.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">취소</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-colors">삭제하기</button>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? `${APP_CONFIG.theme.secondaryBg} ${APP_CONFIG.theme.accent} font-bold` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
    >
      {icon}
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-rose-500 rounded-full"></div>}
    </button>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${active ? APP_CONFIG.theme.accent : 'text-gray-400'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
