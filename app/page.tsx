'use client';

/**
 * ☝️ [중요] Next.js App Router에서 useState, useEffect 등을 쓰려면
 * 반드시 파일 최상단에 'use client'; 가 있어야 해!
 */

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { createPortal } from 'react-dom';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
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
import {
  PieChart,
  BookOpen,
  Settings,
  Plus,
  Search,
  Download,
  Trash2,
  Edit2,
  X,
  Pin,
  Star,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Building2,
  Coins,
  ArrowRightLeft,
  MessageSquareQuote,
  Image as ImageIcon,
} from 'lucide-react';
// 달력 라이브러리
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';

/**
 * ------------------------------------------------------------------
 * [앱 설정 및 테마]
 * ------------------------------------------------------------------
 */
const APP_CONFIG = {
  theme: {
    primary: 'bg-rose-300',
    primaryHover: 'hover:bg-rose-400',
    secondaryBg: 'bg-zinc-50', 
    sidebarBg: 'bg-white',
    cardBg: 'bg-white',
    textMain: 'text-zinc-700',
    textSub: 'text-zinc-500',
    accent: 'text-rose-400',
    highlight: 'bg-yellow-200',
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
    Chart: ImageIcon,
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false); // 로딩 끝!
    });
    return () => unsubscribe();
  }, []);

  // 구글 로그인 함수
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    signOut(auth);
    setRecords([]);
  };

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
          if (data.strategies) setStrategies(data.strategies);
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

  const handleSaveStrategies = async (newStrategies: any[]) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), {
        strategies: newStrategies
      }, { merge: true });
      setStrategies(newStrategies);
    } catch (e) {
      console.error("Save Strategies Error:", e);
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

  // --- Derived State ---
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
  
  // 로그인 화면
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${APP_CONFIG.theme.secondaryBg} p-6`}>
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-zinc-100 flex flex-col items-center max-w-sm w-full animate-fade-in-up">
          <div className="mb-8 text-center">
            <span className="text-4xl font-light text-zinc-600 block mb-1">Very</span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-bold text-zinc-700">Daily Log</span>
              <div className={`w-3 h-3 ${APP_CONFIG.theme.primary} rounded-full mt-2`}></div>
            </div>
            <p className="text-zinc-400 text-sm mt-4">어디서든 기록되는 나만의 매매일지</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full bg-white text-zinc-700 px-6 py-4 rounded-2xl border border-zinc-200 font-bold flex items-center justify-center gap-3 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all active:scale-95 shadow-sm group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="group-hover:text-rose-500">Google 계정으로 시작하기</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${APP_CONFIG.theme.secondaryBg} pb-20 md:pb-0 md:pl-64 transition-all duration-300`}>
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 flex justify-around p-3 pb-safe">
        <NavButton icon={<Icons.Dashboard size={20}/>} label="일지" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavButton icon={<Icons.Stats size={20}/>} label="통계" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        <NavButton icon={<Icons.Settings size={20}/>} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex fixed left-0 top-0 bottom-0 w-64 ${APP_CONFIG.theme.sidebarBg} border-r border-zinc-200 flex-col p-6 shadow-sm z-40`}>
        
        {/* 로고 영역 */}
        <div className="mb-10 pl-1">
          <div className="flex flex-col text-zinc-700 leading-none">
            <span className="text-4xl font-light tracking-tight mb-1">Very</span>
            <div className="flex items-start gap-1">
              <span className="text-4xl font-bold tracking-tight">Daily Log</span>
              <div className={`w-2.5 h-2.5 ${APP_CONFIG.theme.primary} rounded-full mt-2`}></div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<Icons.Dashboard size={18}/>} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Icons.Stats size={18}/>} label="통계 분석" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <SidebarItem icon={<Icons.Strategies size={18}/>} label="매매 전략" active={activeTab === 'strategies'} onClick={() => setActiveTab('strategies')} />
          <SidebarItem icon={<Icons.Settings size={18}/>} label="환경 설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
        
        <div className="pt-6 border-t border-zinc-200 space-y-2">
           <button onClick={handleExportCSV} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-rose-300 transition-colors w-full p-2 rounded-lg hover:bg-zinc-50">
             <Icons.Export size={16} /> 엑셀 다운로드
           </button>
           {/* 로그아웃 버튼 */}
           <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-rose-400 transition-colors w-full p-2 rounded-lg hover:bg-zinc-50">
             <Icons.Close size={16} /> 로그아웃
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
        {activeTab === 'strategies' && (
          <StrategiesView 
            strategies={strategies} 
            onSave={handleSaveStrategies}
            Icons={Icons}
          />
        )}
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
            <h1 className="text-5xl font-bold text-zinc-600 mb-2">😎</h1>
            <p className={`${APP_CONFIG.theme.accent} text-sm font-medium`}>{userQuote}</p>
          </div>
        </div>
        
        {/* 검색창 영역 */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="종목, 메모, 거래소 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 transition-shadow placeholder-zinc-300"
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <button 
          onClick={() => setSelectedSymbol('ALL')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedSymbol === 'ALL' ? 'bg-zinc-700 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}
        >
          ALL
        </button>
        {uniqueSymbols.map((sym: string) => (
          <button 
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedSymbol === sym ? 'bg-zinc-700 text-white shadow-md' : 'bg-white text-zinc-500 hover:bg-zinc-50'}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Open Positions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* [수정] 색상 통일 (bg-rose-400) */}
            <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
            <h3 className="font-bold text-lg text-zinc-700">
              진행 중인 포지션 
              {/* [수정] 괄호 없이 숫자만 핑크색으로 표시 */}
              <span className="text-rose-400 ml-1.5">{openPositions.length}</span>
            </h3>
          </div>
          
          <button 
            onClick={onAdd}
            className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} text-white p-2 rounded-xl shadow-md flex items-center justify-center transition-transform active:scale-95`}
          >
            <Icons.Add size={20} />
          </button>
        </div>
        
        {openPositions.length === 0 ? (
          <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 text-sm">
            현재 보유 중인 포지션이 없어요
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
          <summary className="list-none cursor-pointer mb-3 select-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* [수정] 색상 통일 (bg-rose-400) */}
                <div className="w-2 h-2 bg-rose-400 rounded-full transition-colors"></div>
                {/* [수정] 여기는 숫자 아예 제거함 */}
                <h3 className="font-bold text-lg text-zinc-700">매매 기록 보관함</h3>
              </div>
              <Icons.Down className="text-zinc-400 group-open:rotate-180 transition-transform" />
            </div>
          </summary>
          
          <div className="space-y-3">
            {closedRecords.length === 0 ? (
              <div className="text-center p-8 text-zinc-400 text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">
                아직 완료된 매매 기록이 없어요.
              </div>
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
      <h2 className="text-2xl font-bold text-zinc-700 mb-6">환경 설정</h2>
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
        <h3 className="font-bold text-lg text-zinc-700 mb-4 flex items-center gap-2">
          <Icons.Quote size={20} className="text-rose-400"/> 메인 문구 설정
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          대시보드 상단에 표시될 나만의 다짐이나 명언을 적어보세요.
        </p>
        <div className="flex gap-2">
          <input 
            type="text"
            value={quoteInput}
            onChange={(e) => setQuoteInput(e.target.value)}
            placeholder="기록이 쌓여 실력이 됩니다."
            className="flex-1 bg-zinc-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors"
          />
          <button 
            onClick={() => onSaveQuote(quoteInput)}
            className={`${APP_CONFIG.theme.primary} ${APP_CONFIG.theme.primaryHover} text-white px-6 rounded-xl font-bold text-sm shadow-md shadow-rose-200 transition-transform active:scale-95 whitespace-nowrap`}
          >
            저장
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
        <h3 className="font-bold text-lg text-zinc-700 mb-4 flex items-center gap-2">
          <Icons.Fee size={20} className="text-rose-400"/> 거래소 및 수수료 관리
        </h3>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          자주 사용하는 거래소와 수수료율(%)을 등록해두세요.<br/>매매 기록 시 자동 적용됩니다.
        </p>
        
        <div className="space-y-4">
          {localExchanges.map((ex: any) => (
            <div key={ex.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative">
              <button 
                onClick={() => handleDelete(ex.id)} 
                className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-50 rounded-full transition-colors"
              >
                <Icons.Delete size={16} />
              </button>

              <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400 font-bold mb-1 block ml-1">거래소명</label>
                  <input 
                    type="text" 
                    value={ex.name} 
                    onChange={(e) => handleUpdate(ex.id, 'name', e.target.value)}
                    onBlur={handleBlur}
                    className="w-full bg-white border-b-2 border-zinc-200 focus:border-rose-400 px-3 py-2 outline-none text-sm font-bold text-zinc-700 rounded-t-lg transition-colors"
                  />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-400 font-bold mb-1 block ml-1">Maker(%)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ex.makerFee} 
                      onChange={(e) => handleUpdate(ex.id, 'makerFee', e.target.value)}
                      onBlur={handleBlur}
                      className="w-full bg-white rounded-lg border border-zinc-200 px-3 py-2 text-sm text-center outline-none focus:border-rose-300 font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-zinc-400 font-bold mb-1 block ml-1">Taker(%)</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={ex.takerFee} 
                      onChange={(e) => handleUpdate(ex.id, 'takerFee', e.target.value)}
                      onBlur={handleBlur}
                      className="w-full bg-white rounded-lg border border-zinc-200 px-3 py-2 text-sm text-center outline-none focus:border-rose-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-dashed border-zinc-200">
          <p className="text-xs font-bold text-rose-400 mb-3 ml-1">새로운 거래소 추가</p>
          <div className="flex flex-col md:flex-row gap-3 items-end">
             <div className="w-full md:flex-1">
               <input 
                 placeholder="예: Bitget"
                 value={newEx.name}
                 onChange={(e) => setNewEx({...newEx, name: e.target.value})}
                 className="w-full bg-zinc-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors"
               />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <div className="flex-1 md:w-20">
                 <input 
                   type="number" step="0.01"
                   placeholder="Mk"
                   value={newEx.makerFee}
                   onChange={(e) => setNewEx({...newEx, makerFee: e.target.value})}
                   className="w-full bg-zinc-50 rounded-xl px-3 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors text-center"
                 />
               </div>
               <div className="flex-1 md:w-20">
                 <input 
                   type="number" step="0.01"
                   placeholder="Tk"
                   value={newEx.takerFee}
                   onChange={(e) => setNewEx({...newEx, takerFee: e.target.value})}
                   className="w-full bg-zinc-50 rounded-xl px-3 py-3 text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors text-center"
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
      <h2 className="text-2xl font-bold text-zinc-700 mb-6">성적표</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="총 매매" value={`${total}회`} icon={<Icons.Dashboard size={18} />} color="bg-blue-50 text-blue-600" />
        <StatCard label="승률" value={`${winRate}%`} icon={<Icons.Up size={18} />} color="bg-rose-50 text-rose-400" />
        <StatCard label="순수익(Net)" value={`$${formatNumber(totalNetPnl)}`} icon={<Icons.Profit size={18} />} color={totalNetPnl >= 0 ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"} />
        <StatCard label="총 수수료" value={`$${formatNumber(totalFees)}`} icon={<Icons.Fee size={18} />} color="bg-zinc-100 text-zinc-600" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 text-center text-zinc-400 text-sm">
        상세 통계 준비 중...
      </div>
    </div>
  );
}

function StrategiesView({ strategies, onSave, Icons }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newStrat, setNewStrat] = useState({ title: '', description: '' });

  const handleAdd = () => {
    if (!newStrat.title) return;
    const next = [...strategies, { ...newStrat, id: Date.now().toString() }];
    onSave(next);
    setNewStrat({ title: '', description: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 전략을 삭제할까요?')) {
      const next = strategies.filter((s: any) => s.id !== id);
      onSave(next);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-700">나의 매매 전략 노트</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-rose-50 text-rose-400 px-4 py-2 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
        >
          {isAdding ? <><Icons.Close size={16}/> 취소</> : <><Icons.Add size={16}/> 전략 추가</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 animate-fade-in">
          <h3 className="text-sm font-bold text-zinc-700 mb-3">새로운 전략 작성</h3>
          <div className="space-y-3">
            <div>
              <input 
                value={newStrat.title}
                onChange={(e) => setNewStrat({...newStrat, title: e.target.value})}
                placeholder="전략 이름 (예: RSI 다이버전스)"
                className="w-full bg-zinc-50 px-4 py-3 rounded-xl text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors font-bold"
              />
            </div>
            <div>
              <textarea 
                value={newStrat.description}
                onChange={(e) => setNewStrat({...newStrat, description: e.target.value})}
                placeholder="전략에 대한 상세 설명이나 진입 근거를 적어주세요."
                className="w-full bg-zinc-50 px-4 py-3 rounded-xl text-sm outline-none border border-transparent focus:bg-white focus:border-rose-300 transition-colors resize-none h-24"
              />
            </div>
            <button 
              onClick={handleAdd}
              className="w-full bg-rose-400 hover:bg-rose-400 text-white font-bold py-3 rounded-xl shadow-md shadow-rose-200 transition-colors"
            >
              저장하기
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((s: any) => (
          <div key={s.id} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:border-rose-200 transition-all group relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-rose-400">{s.title}</h3>
              <button 
                onClick={() => handleDelete(s.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-rose-400 transition-all p-1"
              >
                <Icons.Delete size={16} />
              </button>
            </div>
            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} mb-1`}>{icon}</div>
      <span className="text-zinc-400 text-xs">{label}</span>
      <span className="text-xl font-bold text-zinc-700">{value}</span>
    </div>
  );
}

function TradeCard({ record, onEdit, onDelete, HighlightText, searchTerm, Icons }: any) {
  const [isSelected, setIsSelected] = useState(false);
  const isLong = record.position === 'Long';
  
  return (
    <div 
      onClick={() => setIsSelected(!isSelected)}
      className={`relative rounded-3xl p-5 border transition-all duration-200 cursor-pointer select-none overflow-hidden
        ${isSelected 
          ? 'bg-rose-50 border-rose-200 shadow-inner' 
          : 'bg-white border-zinc-100 shadow-sm hover:shadow-md'
        }`}
    >
      {/* [수정] 버튼을 우측 상단에 '절대 위치'로 고정 (공간 차지 X) */}
      {isSelected && (
        <div className="absolute top-4 right-4 flex gap-2 z-10 animate-fade-in">
           <button 
             onClick={(e) => { e.stopPropagation(); onEdit(record); }} 
             className="w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 active:scale-95 transition-all"
           >
             <Icons.Edit size={16} />
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(record); }} 
             className="w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 active:scale-95 transition-all"
           >
             <Icons.Delete size={16} />
           </button>
        </div>
      )}

      <div className={`transition-opacity duration-200 ${isSelected ? 'opacity-40 blur-[1px]' : 'opacity-100'}`}>
        {/* 날짜 */}
        <div className="text-zinc-400 text-xs mb-2 font-medium">
          {record.openDate.split('T')[0]}
        </div>

        {/* 종목 + 포지션 + 전략 (꽉 차게 배치) */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pr-10"> {/* pr-10: 버튼 공간 확보 */}
          {/* 종목명 */}
          <h3 className="text-2xl font-bold text-zinc-700 leading-none tracking-tight">
            <HighlightText text={record.symbol} highlight={searchTerm} />
          </h3>

          {/* 포지션 뱃지 */}
          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold tracking-tight whitespace-nowrap ${isLong ? 'bg-green-400 text-white' : 'bg-rose-400 text-white'}`}>
            {record.position.toUpperCase()} x{record.leverage}
          </span>

          {/* 전략 뱃지 */}
          {record.strategy && (
             <span className="bg-zinc-100 text-rose-400 px-2 py-1 rounded-lg text-[11px] font-bold tracking-tight whitespace-nowrap truncate max-w-[120px]">
               <HighlightText text={record.strategy} highlight={searchTerm} />
             </span>
          )}
        </div>

        {/* 가격 정보 (가로로 꽉 차게) */}
        <div className="flex items-end gap-6 w-full">
          <div className="flex flex-col">
            <span className="text-zinc-400 text-[10px] font-bold mb-0.5 ml-0.5">진입가</span>
            <span className="font-mono text-xl font-bold text-zinc-700 leading-none">
              {formatNumber(record.entryPrice)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-400 text-[10px] font-bold mb-0.5 ml-0.5">증거금</span>
            <div className="flex items-baseline gap-0.5">
              <span className="font-mono text-xl font-bold text-zinc-700 leading-none">
                {formatNumber(record.margin)}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">USDT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// [수정] 청산(LIQ) + 고수익(50%, 100%) 뱃지 추가
function HistoryRow({ record, onEdit, onDelete, HighlightText, searchTerm, Icons }: any) {
  const pnl = parseFloat(record.pnl);
  const isLiquidation = pnl <= -100;
  const isMegaWin = pnl >= 100; 
  const isBigWin = pnl >= 50 && pnl < 100; 
  
  const displayPnl = isLiquidation ? -100 : pnl;
  
  const displayNetProfit = isLiquidation 
    ? -1 * (Number(record.margin) + Number(record.fees)) 
    : record.realizedPnlValue;

  const isProfit = displayPnl > 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-zinc-100 hover:border-rose-200 transition-all relative group shadow-sm">
      
      {/* [데스크탑 전용] 호버 시 뜨는 수정/삭제 버튼 (우측 상단 고정) */}
      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-4 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg z-10">
         <button onClick={(e) => {e.stopPropagation(); onEdit(record)}} className="p-2 hover:bg-rose-50 rounded-full text-zinc-400 hover:text-rose-400 transition-colors"><Icons.Edit size={16} /></button>
         <button onClick={(e) => {e.stopPropagation(); onDelete(record)}} className="p-2 hover:bg-rose-50 rounded-full text-zinc-400 hover:text-rose-400 transition-colors"><Icons.Delete size={16} /></button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        
        {/* 1. 모바일 상단 (날짜 + 버튼) / 데스크탑은 날짜 안보임(디자인상) */}
        <div className="flex justify-between items-center md:hidden border-b border-zinc-50 pb-2 mb-1">
          <span className="text-[10px] text-zinc-300 font-medium">{record.openDate.split('T')[0]}</span>
          <div className="flex gap-3">
             <button onClick={() => onEdit(record)} className="text-zinc-300 hover:text-rose-400"><Icons.Edit size={14} /></button>
             <button onClick={() => onDelete(record)} className="text-zinc-300 hover:text-rose-400"><Icons.Delete size={14} /></button>
          </div>
        </div>

        {/* 2. 메인 정보 (종목, 뱃지) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${record.position === 'Long' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
              {record.position.charAt(0)}
            </div>
            
            <h4 className="text-base font-bold text-zinc-700 truncate mr-1">
              <HighlightText text={record.symbol} highlight={searchTerm} />
            </h4>

            {/* 뱃지들 */}
            {isLiquidation && <span className="bg-zinc-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">LIQ 🤮</span>}
               {/* 1. 청산 뱃지 */}
          {isLiquidation && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0">LIQ 🤮</span>
          )}

          {/* 2. 100% 이상 로켓 뱃지 */}
          {isMegaWin && (
            <span className="bg-gradient-to-r from-orange-300 to-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex-shrink-0">
              100🚀
            </span>
          )}

          {/* 3. 50% 이상 불꽃 뱃지 */}
          {isBigWin && (
            <span className="bg-Lime-400 text-white text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0">
              50🔥
            </span>
          )}
          </div>
          
          {/* 메모 */}
          {record.exitMemo && <div className="text-[11px] text-zinc-400 truncate pl-7">💬 {record.exitMemo}</div>}
        </div>

        {/* 3. 수익 정보 (우측 정렬) */}
        <div className="flex justify-between md:justify-end items-end gap-4 md:gap-8 mt-1 md:mt-0 pl-2 md:pl-0 md:pr-10"> {/* md:pr-10은 데스크탑 버튼 공간 확보 */}
          <div className="text-right">
            <div className="text-[9px] text-zinc-400 font-bold mb-0.5">PNL</div>
            <div className={`text-base font-bold font-mono leading-none ${isProfit ? 'text-green-500' : 'text-rose-400'}`}>
              {displayPnl > 0 ? '+' : ''}{displayPnl}%
            </div>
          </div>
          
          <div className="text-right min-w-[80px]">
            <div className="text-[9px] text-zinc-400 font-bold mb-0.5">Net(USDT)</div>
            <div className={`text-base font-bold font-mono leading-none ${isProfit ? 'text-green-500' : 'text-rose-400'}`}>
              {formatNumber(displayNetProfit)}
            </div>
            {record.fees > 0 && <div className="text-[9px] text-zinc-300 mt-0.5">Fee -{record.fees}</div>}
          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleSwitch({ options, value, onChange }: { options: string[], value: string, onChange: (val: string) => void }) {
  return (
    <div className="bg-zinc-100 p-1 rounded-full flex items-center relative h-8 w-32">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 text-xs font-bold z-10 transition-colors ${value === opt ? 'text-rose-400' : 'text-zinc-400'}`}
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
    exchange: exchanges[0]?.name || '',
    position: 'Long',
    leverage: '1',
    margin: '',
    entryPrice: '',
    entryType: 'Maker',
    openDate: getCurrentDateTimeString(),
    status: 'Open',
    closePrice: '',
    exitType: 'Taker',
    exitReason: '',
    closeDate: '',
    strategy: strategies[0]?.title || '',
    entryMemo: '', 
    exitMemo: '',
    chartImage: '', 
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
        chartImage: initialData.chartImage || '',
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

  const handleImageChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, chartImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-zinc-200 flex justify-between items-center">
          <h3 className="font-bold text-xl text-zinc-700">{initialData ? '매매 기록 수정' : '새 매매 기록'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full"><Icons.Close size={20} className="text-zinc-400"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Exchange & Symbol */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <CustomSelect 
                label="거래소" 
                name="exchange" 
                value={formData.exchange} 
                onChange={handleChange} 
                options={exchanges}
                icon={Icons.Down} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">종목명</label>
              <input 
                list="symbol-list"
                name="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                placeholder="BTC"
                className="w-full p-2.5 bg-white rounded-xl border border-zinc-200 focus:border-rose-300 focus:outline-none text-sm font-bold uppercase transition-all"
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
                <label className="block text-xs font-bold text-zinc-500 mb-1">포지션</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setFormData({...formData, position: 'Long'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${formData.position === 'Long' ? 'bg-green-100 text-green-600 ring-2 ring-green-200' : 'bg-white border border-zinc-200 text-zinc-400'}`}>Long</button>
                  <button type="button" onClick={() => setFormData({...formData, position: 'Short'})} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${formData.position === 'Short' ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200' : 'bg-white border border-zinc-200 text-zinc-400'}`}>Short</button>
                </div>
             </div>
             <div className="w-1/2">
                <FormInput label="증거금 (Margin $)" name="margin" type="number" value={formData.margin} onChange={handleChange} placeholder="$" />
             </div>
          </div>

          {/* Entry Info */}
          <div className="bg-zinc-50 p-4 rounded-2xl space-y-3">
             <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-rose-400">진입 정보</span>
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
             
             {/* 핑크색 달력 적용 (아이콘 없음) */}
             <PinkDatePicker 
               label="오픈 시간" 
               selected={formData.openDate} 
               onChange={(val: string) => handleChange({ target: { name: 'openDate', value: val } })} 
             />

             <div>
               <CustomSelect 
                 label="전략 & 근거"
                 name="strategy"
                 value={formData.strategy}
                 onChange={handleChange}
                 options={strategies}
                 placeholder="전략 선택"
                 icon={Icons.Down}
               />
               <div className="mt-3">
                 <textarea 
                    name="entryMemo"
                    value={formData.entryMemo}
                    onChange={handleChange}
                    placeholder="진입 근거 및 시나리오..."
                    className="w-full p-3 bg-white rounded-xl border border-rose-200 focus:border-rose-400 outline-none text-sm resize-none h-20 placeholder-zinc-300 transition-colors"
                  />
               </div>
             </div>

             {/* 차트 이미지 첨부 영역 */}
             <div className="mt-2">
                <label className="block text-xs font-bold text-zinc-500 mb-2">차트 스크린샷</label>
                {!formData.chartImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:bg-zinc-100 hover:border-rose-300 transition-colors bg-white">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Icons.Chart className="w-6 h-6 text-zinc-400 mb-1" />
                      <p className="text-xs text-zinc-500">클릭하여 이미지 업로드</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                ) : (
                  <div className="relative w-full rounded-xl overflow-hidden border border-zinc-200 group">
                    <img src={formData.chartImage} alt="Chart" className="w-full h-auto object-cover max-h-48" />
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, chartImage: '' }))}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
                    >
                      <Icons.Close size={16} />
                    </button>
                  </div>
                )}
             </div>
          </div>

          {/* Exit Info */}
          <div className="border-t border-dashed border-zinc-200 my-2"></div>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="text-sm font-bold text-zinc-700">청산 정보 (선택)</span>
               <PinkCheckbox 
                 checked={formData.status === 'Closed'} 
                 onChange={handleStatusChange}
                 label="포지션 종료됨"
               />
             </div>
             
             {formData.status === 'Closed' && (
               <div className="animate-fade-in space-y-3 p-4 bg-zinc-50 rounded-2xl">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-rose-400">청산 세부</span>
                    <ToggleSwitch 
                      options={['Maker', 'Taker']} 
                      value={formData.exitType} 
                      onChange={(val) => setFormData({...formData, exitType: val})} 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <FormInput label="청산가" name="closePrice" type="number" step="any" value={formData.closePrice} onChange={handleChange} placeholder="입력시 자동 계산" />
                   {/* 핑크색 달력 적용 (왼쪽으로 열림) */}
                   <PinkDatePicker 
                     label="청산 시간" 
                     selected={formData.closeDate} 
                     onChange={(val: string) => handleChange({ target: { name: 'closeDate', value: val } })} 
                     placement="bottom-end"
                   />
                 </div>
                 
                 <div>
                   <label className="block text-xs font-bold text-zinc-500 mb-1">청산 기준</label>
                   <div className="flex gap-2 flex-wrap">
                     {['TP Hit', 'SL Hit', 'Trailing', 'Market'].map(reason => (
                        <button 
                         key={reason}
                         type="button" 
                         onClick={() => setFormData({...formData, exitReason: reason})}
                         className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${formData.exitReason === reason ? 'bg-rose-400 text-white border-rose-400' : 'bg-white text-zinc-500 border-zinc-200 hover:border-rose-300'}`}
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
                   className="w-full p-3 bg-white rounded-xl border border-rose-200 focus:border-rose-400 focus:outline-none text-sm resize-none h-20 placeholder-zinc-300"
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
      <label className="block text-xs font-bold text-zinc-500 mb-1">{label}</label>
      <input 
        className="w-full p-2.5 bg-white rounded-xl border border-zinc-200 focus:border-rose-300 focus:outline-none text-sm transition-all font-medium text-zinc-700"
        {...props}
      />
    </div>
  );
}

function CustomSelect({ label, value, onChange, options, placeholder, name, icon: Icon }: any) {
  return (
    <div>
      {label && <label className="block text-xs font-bold text-zinc-500 mb-1">{label}</label>}
      <div className="relative w-full">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-white rounded-xl px-4 py-3 pr-10 text-sm font-bold text-zinc-700 outline-none border border-zinc-200 focus:border-rose-300 transition-colors appearance-none cursor-pointer"
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt: any) => {
            const val = typeof opt === 'object' ? (opt.name || opt.title) : opt;
            const text = typeof opt === 'object' ? (opt.name || opt.title) : opt;
            const key = typeof opt === 'object' ? (opt.id || opt.name || opt.title) : opt;
            return <option key={key} value={val}>{text}</option>;
          })}
        </select>
        
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
          {Icon ? <Icon size={16} /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${active ? 'text-rose-400' : 'text-zinc-300 hover:text-zinc-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm mb-1 ${
        active 
          ? 'bg-rose-50 text-rose-500 shadow-sm shadow-rose-100' 
          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PinkCheckbox({ checked, onChange, label }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      <div className="relative">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onChange}
          className="peer sr-only"
        />
        <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center
          ${checked 
            ? 'bg-rose-500 border-rose-500 shadow-sm shadow-rose-200' 
            : 'bg-white border-zinc-300 hover:border-rose-300'
          }`}
        >
          <svg 
            className={`w-3.5 h-3.5 text-white transition-transform ${checked ? 'scale-100' : 'scale-0'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      </div>
      <span className={`text-xs font-bold transition-colors ${checked ? 'text-rose-500' : 'text-zinc-500 group-hover:text-zinc-600'}`}>
        {label}
      </span>
    </label>
  );
}

function DeleteConfirmModal({ target, onClose, onConfirm, Icons }: any) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.Delete size={32} />
        </div>
        <h3 className="font-bold text-xl text-zinc-700 mb-2">기록 삭제</h3>
        <p className="text-zinc-500 text-sm mb-6">
          정말로 이 매매 기록을 삭제하시겠습니까?<br/>삭제된 데이터는 복구할 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-colors">
            취소
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-rose-400 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-200">
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

// [최종] 아이콘 삭제됨 + 화살표 디자인 개선 + 방향 조절 가능
// [최종_수정] 포탈(Portal) 기술 적용: 달력을 body로 꺼내서 위치 버그 및 잘림 해결
const PinkDatePicker = ({ label, selected, onChange, placement = "bottom-start" }: any) => {
  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-zinc-500 mb-1">{label}</label>
      <div className="relative">
        <DatePicker
          selected={selected ? new Date(selected) : null}
          onChange={(date) => {
            if (date) {
               const offset = date.getTimezoneOffset() * 60000;
               const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
               onChange(localISOTime);
            }
          }}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          dateFormat="yyyy. MM. dd. aa h:mm" 
          locale={ko} 
          timeCaption="시간"
          // ▼ [핵심] 달력 방향 설정
          popperPlacement={placement}
          // ▼ [핵심] 달력을 모달 밖(body)으로 꺼내서 그리는 '포탈' 기능 (위치 버그 해결사!)
          popperContainer={({ children }) => {
            if (typeof window === 'undefined') return null;
            return createPortal(children, document.body);
          }}
          popperModifiers={[
            {
              name: "offset",
              options: { offset: [0, 8] },
            },
            {
              name: "preventOverflow", // 화면 밖으로 나가는 것 방지
              options: {
                rootBoundary: "viewport",
                tether: false,
                altAxis: true,
              },
            },
          ]}
          className="w-full p-2.5 bg-white rounded-xl border border-zinc-200 focus:border-rose-300 focus:outline-none text-sm font-bold text-zinc-700 cursor-pointer"
          placeholderText="날짜를 선택하세요"
          calendarClassName="custom-datepicker-calendar"
          dayClassName={(date) => "hover:!bg-rose-100 !rounded-full"}
        />
      </div>
      
      <style jsx global>{`
        /* 전체 컨테이너 */
        .custom-datepicker-calendar {
          border: none !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
          border-radius: 16px !important;
          font-family: inherit !important;
          overflow: hidden;
          display: flex !important;
          background-color: white;
          z-index: 9999 !important; /* 제일 위에 뜨게 함 */
        }

        /* 달력 영역 */
        .react-datepicker__month-container {
          float: left;
          width: 240px;
          border-right: 1px solid #ffe4e6;
        }

        .react-datepicker__header {
          background-color: #fff0f3 !important;
          border-bottom: 1px solid #ffe4e6 !important;
          padding-top: 16px !important;
          padding-bottom: 16px !important;
          position: relative;
        }
        
        /* 화살표 버튼 */
        .react-datepicker__navigation {
          top: 14px !important;
          width: 26px !important;
          height: 26px !important;
          background-color: transparent !important;
          border: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .react-datepicker__navigation--previous { left: 10px !important; }
        .react-datepicker__navigation--next { right: 100px !important; }

        /* 화살표 아이콘 (진한 핑크) */
        .react-datepicker__navigation-icon::before {
          border-color: #fb7185 !important;
          border-width: 2px 2px 0 0 !important;
          width: 8px !important;
          height: 8px !important;
          top: 9px !important;
        }
        .react-datepicker__navigation--previous .react-datepicker__navigation-icon::before { left: -1px !important; }
        .react-datepicker__navigation--next .react-datepicker__navigation-icon::before { left: -2px !important; }

        /* 텍스트 스타일 */
        .react-datepicker__current-month {
          color: #fb7185 !important;
          font-weight: 800 !important;
          font-size: 1rem !important;
        }
        .react-datepicker__day-name { color: #fda4af !important; font-weight: bold; width: 28px !important; line-height: 28px !important; margin: 2px !important; }
        .react-datepicker__day { width: 28px !important; line-height: 28px !important; margin: 2px !important; }
        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
          background-color: #fb7185 !important;
          color: white !important;
          border-radius: 50% !important;
        }
        .react-datepicker__day:hover { border-radius: 50% !important; }

        /* 시간 영역 */
        .react-datepicker__time-container {
          width: 90px !important;
          border-left: none !important;
        }
        .react-datepicker__time-container .react-datepicker__header {
          background-color: #fff0f3 !important;
          border-bottom: 1px solid #ffe4e6 !important;
          padding-top: 16px !important;
          padding-bottom: 16px !important;
          width: 90px !important;
        }
        .react-datepicker-time__header {
          color: #fb7185 !important;
          font-weight: 800 !important;
          font-size: 1rem !important;
        }
        .react-datepicker__time-container .react-datepicker__time {
          background: white !important;
          height: 245px !important;
        }
        .react-datepicker__time-list-item {
          height: 32px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem !important;
        }
        .react-datepicker__time-container .react-datepicker__time .react-datepicker__time-box ul.react-datepicker__time-list li.react-datepicker__time-list-item--selected {
          background-color: #fb7185 !important;
          color: white !important;
          font-weight: bold !important;
        }
        
        .react-datepicker__triangle { display: none !important; }
        .react-datepicker-popper { z-index: 9999 !important; }
      `}</style>
    </div>
  );
};
