'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Download,
  TrendingUp,
  Clock,
  Target,
  BookOpen,
  PieChart,
  List,
  X,
  Save,
  DollarSign,
} from 'lucide-react';

// Firebase 설정 (기존 설정 유지)
const firebaseConfig = {
  apiKey: "AIzaSyApCBDZtKlXoeclGosSDwYGrZxmLlvRHc4",
  authDomain: "berry-log.firebaseapp.com",
  projectId: "berry-log",
  storageBucket: "berry-log.firebasestorage.app",
  messagingSenderId: "196264964134",
  appId: "1:196264964134:web:bc1fa5d181204bb965b6e7",
  measurementId: "G-EZEWGTX337"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'ajou-notes';


// --- Helper Functions ---
const formatDate = (dateString: any) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (dateString: any) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

const formatTimeDiff = (start: any, end: any) => {
  if (!start || !end) return '-';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}시간 ${minutes}분`;
};

const formatCurrency = (val: any) => {
  if (!val && val !== 0) return '0';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Search Highlighter Component
const HighlightText = ({ text, highlight }: { text: any; highlight: any }) => {
  if (!highlight || !highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ backgroundColor: '#FFF0F3', color: '#FF758F' }} className="rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
};

// 1. 기본 모달 레이아웃
const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl transform rounded-2xl bg-white shadow-2xl transition-all border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// 2. Custom Delete Confirmation
const DeleteModal = ({ isOpen, onClose, onConfirm, title }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm transform rounded-2xl bg-white p-6 text-center shadow-xl transition-all border border-gray-100">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="text-red-400" size={24} />
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900">삭제하시겠습니까?</h3>
        <p className="mb-6 text-sm text-gray-500">
          &quot;{title}&quot; 항목이 영구적으로 삭제됩니다.
          <br />
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-400 px-5 py-2.5 font-medium text-white shadow-lg shadow-red-200 transition-all hover:bg-red-500"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
export default function Home() {
  const [user, setUser] = useState<any>(null);

  const [records, setRecords] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    winRate: 0,
    avgProfit: 0,
    totalTrades: 0,
    totalPnl: 0,
    longWinRate: 0,
    shortWinRate: 0,
    bestStrategy: '',
    worstStrategy: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'records' | 'strategies'>('records');
  const [selectedStrategyForFilter, setSelectedStrategyForFilter] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<any>(null);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Form States
  const initialRecordState = {
    date: new Date().toISOString().slice(0, 16),
    ticker: '',
    position: 'Long',
    margin: '',
    leverage: 1,
    entryPrice: '',
    exitPrice: '',
    exitReason: 'TP Hit',
    profitPercent: '',
    realizedPnl: '',
    strategyId: '',
    openDate: new Date().toISOString().slice(0, 16),
    closeDate: '',
    memo: '',
  };
  const [currentRecord, setCurrentRecord] = useState<any>(initialRecordState);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [currentStrategy, setCurrentStrategy] = useState<any>({ title: '', description: '' });
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);

  // --- Auth & Data Loading ---
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load Records
    const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'stock_records');
    const qRecords = query(recordsRef, orderBy('created_at', 'desc'));
    const unsubRecords = onSnapshot(
      qRecords,
      (snapshot: any) => {
        const data = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setRecords(data);
      },
      (err) => console.error('Record error:', err),
    );

    // Load Strategies
    const strategiesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'stock_strategies');
    const qStrategies = query(strategiesRef, orderBy('created_at', 'desc'));
    const unsubStrategies = onSnapshot(
      qStrategies,
      (snapshot: any) => {
        const data = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setStrategies(data);
      },
      (err) => console.error('Strategy error:', err),
    );

    return () => {
      unsubRecords();
      unsubStrategies();
    };
  }, [user]);

  // --- Logic: Calculations ---
  const calculateMetrics = (data: any) => {
    const entry = parseFloat(data.entryPrice);
    const exit = parseFloat(data.exitPrice);
    const lev = parseFloat(data.leverage);
    const margin = parseFloat(data.margin);

    if (!entry || !exit || !lev || !margin) return { percent: '', amount: '' };

    let pnlPercent = 0;
    if (data.position === 'Long') {
      pnlPercent = ((exit - entry) / entry) * 100 * lev;
    } else {
      pnlPercent = ((entry - exit) / entry) * 100 * lev;
    }

    let pnlAmount = '';
    if (margin) {
      pnlAmount = ((margin * pnlPercent) / 100).toFixed(2);
    }

    return { percent: pnlPercent.toFixed(2), amount: pnlAmount };
  };

  const handleRecordChange = (e: any) => {
    const { name, value } = e.target;
    let updatedRecord = { ...currentRecord, [name]: value };

    if (['entryPrice', 'exitPrice', 'leverage', 'position', 'margin'].includes(name)) {
      updatedRecord[name] = name === 'position' ? value : parseFloat(value || '0');
      const { percent, amount } = calculateMetrics(updatedRecord);
      updatedRecord.profitPercent = percent;
      updatedRecord.realizedPnl = amount;
    }

    setCurrentRecord(updatedRecord);
  };

  const handleStrategyChange = (e: any) => {
    const { name, value } = e.target;
    setCurrentStrategy({ ...currentStrategy, [name]: value });
  };

  const saveRecord = async () => {
    if (!user) return;
    try {
      const recordData = {
        ...currentRecord,
        margin: parseFloat(currentRecord.margin || '0'),
        leverage: parseFloat(currentRecord.leverage || '1'),
        entryPrice: parseFloat(currentRecord.entryPrice || '0'),
        exitPrice: currentRecord.exitPrice ? parseFloat(currentRecord.exitPrice) : null,
        profitPercent: currentRecord.profitPercent ? parseFloat(currentRecord.profitPercent) : null,
        realizedPnl: currentRecord.realizedPnl ? parseFloat(currentRecord.realizedPnl) : null,
        updated_at: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'stock_records', editingId), recordData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'stock_records'), {
          ...recordData,
          created_at: serverTimestamp(),
        });
      }

      resetRecordForm();
      setIsRecordModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const saveStrategy = async () => {
    if (!user || !currentStrategy.title) return;

    try {
      const payload = {
        ...currentStrategy,
        updated_at: serverTimestamp(),
      };

      if (editingStrategyId) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'stock_strategies', editingStrategyId), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'stock_strategies'), {
          ...payload,
          created_at: serverTimestamp(),
        });
      }

      setIsStrategyModalOpen(false);
      setCurrentStrategy({ title: '', description: '' });
      setEditingStrategyId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    const { type, id } = deleteTarget;
    try {
      const collectionName = type === 'record' ? 'stock_records' : 'stock_strategies';
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    }
  };

  const resetRecordForm = () => {
    setCurrentRecord(initialRecordState);
    setEditingId(null);
  };

  const openEditRecord = (rec: any) => {
    setCurrentRecord(rec);
    setEditingId(rec.id);
    setIsRecordModalOpen(true);
  };

  const exportCSV = () => {
    const header = ['날짜', '종목', '포지션', '진입가', '청산가', '레버리지', '마진($)', '수익률(%)', '실현손익($)', '결과', '전략', '메모'];
    const rows = records.map((r) => [
      r.openDate,
      r.ticker,
      r.position,
      r.entryPrice,
      r.exitPrice || '',
      r.leverage,
      r.margin,
      r.profitPercent || '',
      r.realizedPnl || '',
      r.profitPercent > 0 ? 'Win' : r.profitPercent < 0 ? 'Loss' : 'BE',
      strategies.find((s) => s.id === r.strategyId)?.title || '',
      (r.memo || '').replace(/\n/g, ' '),
    ]);

    const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'trade_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = useMemo(() => {
    let data = [...records];

    if (selectedStrategyForFilter) {
      data = data.filter((record) => record.strategyId === selectedStrategyForFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (record) =>
          (record.ticker && record.ticker.toLowerCase().includes(term)) ||
          (record.memo && record.memo.toLowerCase().includes(term)),
      );
    }
    return data;
  }, [records, searchTerm, selectedStrategyForFilter]);

  useEffect(() => {
    if (!records.length) return;

    const totalTrades = records.length;
    const completedTrades = records.filter((r) => r.profitPercent !== null && r.profitPercent !== '').length;
    const wins = records.filter((r) => r.profitPercent && r.profitPercent > 0).length;
    const losses = records.filter((r) => r.profitPercent && r.profitPercent < 0).length;

    const longTrades = records.filter((r) => r.position === 'Long');
    const shortTrades = records.filter((r) => r.position === 'Short');
    const longWins = longTrades.filter((r) => r.profitPercent && r.profitPercent > 0).length;
    const shortWins = shortTrades.filter((r) => r.profitPercent && r.profitPercent > 0).length;

    const avgProfit =
      completedTrades > 0
        ? records
            .filter((r) => r.profitPercent)
            .reduce((sum, r) => sum + (Number(r.profitPercent) || 0), 0) / completedTrades
        : 0;

    const totalPnl = records.reduce((sum, r) => sum + (Number(r.realizedPnl) || 0), 0);

    const strategyStats: any = {};
    records.forEach((r) => {
      const strategyId = r.strategyId || 'none';
      if (!strategyStats[strategyId]) {
        strategyStats[strategyId] = { pnl: 0, count: 0 };
      }
      strategyStats[strategyId].pnl += Number(r.realizedPnl) || 0;
      strategyStats[strategyId].count += 1;
    });

    let bestStrategyId: string | null = null;
    let worstStrategyId: string | null = null;
    let maxPnl = -Infinity;
    let minPnl = Infinity;

    Object.entries(strategyStats).forEach(([id, s]: any) => {
      if (s.pnl > maxPnl) {
        maxPnl = s.pnl;
        bestStrategyId = id;
      }
      if (s.pnl < minPnl) {
        minPnl = s.pnl;
        worstStrategyId = id;
      }
    });

    setStats({
      winRate: completedTrades > 0 ? Math.round((wins / completedTrades) * 100) : 0,
      avgProfit: Number(avgProfit.toFixed(2)),
      totalTrades,
      totalPnl: Number(totalPnl.toFixed(2)),
      longWinRate: longTrades.length > 0 ? Math.round((longWins / longTrades.length) * 100) : 0,
      shortWinRate: shortTrades.length > 0 ? Math.round((shortWins / shortTrades.length) * 100) : 0,
      bestStrategy:
        bestStrategyId && bestStrategyId !== 'none'
          ? strategies.find((s) => s.id === bestStrategyId)?.title || '전략명 없음'
          : '-',
      worstStrategy:
        worstStrategyId && worstStrategyId !== 'none'
          ? strategies.find((s) => s.id === worstStrategyId)?.title || '전략명 없음'
          : '-',
    });
  }, [records, strategies]);

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === currentRecord.strategyId),
    [currentRecord.strategyId, strategies],
  );

  // Loading View (Light Theme)
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-2xl border border-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: '#FFF0F3' }}>
            <TrendingUp style={{ color: '#FF9EAA' }} size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Berry Log</h1>
            <p className="mt-2 text-sm text-gray-400">나만 보는 트레이딩 일지를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main View (Light Gray & Baby Pink & White Theme)
  return (
    <div className="flex min-h-screen justify-center bg-gray-50 px-3 py-6 text-gray-800 font-sans">
      <div className="flex w-full max-w-5xl flex-col gap-4">
        {/* 헤더 */}
        <header className="flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1">
            <div>
              <h1 className="text-base font-bold tracking-tight text-gray-900">급등주 노트</h1>
              <p className="text-[11px] text-gray-500">내 기준으로만 정리하는 매매 일지 & 전략 노트</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="hidden sm:inline">모드</span>
            <button
              onClick={() => setViewMode('records')}
              style={viewMode === 'records' ? { backgroundColor: '#FFF0F3', color: '#FF758F', fontWeight: 'bold' } : {}}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                viewMode === 'records'
                  ? '' // Style prop handles color
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              } text-[11px]`}
            >
              <List size={14} />
              매매 기록
            </button>
            <button
              onClick={() => setViewMode('strategies')}
              style={viewMode === 'strategies' ? { backgroundColor: '#FFF0F3', color: '#FF758F', fontWeight: 'bold' } : {}}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                viewMode === 'strategies'
                  ? '' // Style prop handles color
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              } text-[11px]`}
            >
              <BookOpen size={14} />
              전략 노트
            </button>
          </div>
        </header>

        {/* 상단 섹션 (검색 + 요약 통계) */}
        <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* 검색 & 필터 */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="종목 / 메모 키워드로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl bg-gray-50 py-2.5 pl-9 pr-3 text-xs text-gray-900 outline-none border border-gray-200 placeholder:text-gray-400 transition-all"
                // Focus styles difficult to force inline without state, relying on border
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>

            <div className="mt-1 flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedStrategyForFilter(null)}
                style={!selectedStrategyForFilter ? { backgroundColor: '#FFF0F3', color: '#FF758F', borderColor: '#FFB7C5', fontWeight: 'bold' } : {}}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  !selectedStrategyForFilter
                    ? ''
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                전체
              </button>
              {strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    setSelectedStrategyForFilter((prev) => (prev === s.id ? null : (s.id as string)))
                  }
                  style={selectedStrategyForFilter === s.id ? { backgroundColor: '#FFF0F3', color: '#FF758F', borderColor: '#FFB7C5', fontWeight: 'bold' } : {}}
                  className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                    selectedStrategyForFilter === s.id
                      ? ''
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <div className="mt-1 flex gap-2">
              <button
                onClick={() => {
                  resetRecordForm();
                  setIsRecordModalOpen(true);
                }}
                style={{ backgroundColor: '#FF9EAA', color: '#ffffff' }}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold shadow-md shadow-pink-100 transition hover:opacity-90"
              >
                <Plus size={14} />
                새 매매 기록
              </button>
              <button
                onClick={() => {
                  setCurrentStrategy({ title: '', description: '' });
                  setEditingStrategyId(null);
                  setIsStrategyModalOpen(true);
                }}
                className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
              >
                <BookOpen size={14} />
                전략 추가
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600 transition hover:bg-gray-50 hover:border-gray-300"
              >
                <Download size={14} />
                내보내기
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>승률</span>
                <TrendingUp style={{ color: '#FF9EAA' }} size={16} />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-800">
                {stats.winRate}
                <span className="text-sm font-normal text-gray-400"> %</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                총 {stats.totalTrades} 트레이드 / Long {stats.longWinRate}%, Short {stats.shortWinRate}%
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>평균 수익률</span>
                <PieChart className="text-sky-400" size={16} />
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-800">
                {stats.avgProfit}
                <span className="text-sm font-normal text-gray-400"> %</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                실현손익 합계{' '}
                <span className={`font-semibold ${stats.totalPnl >= 0 ? 'text-red-400' : 'text-sky-400'}`}>
                  ${formatCurrency(stats.totalPnl)}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 md:col-span-1 col-span-2">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>전략 성과</span>
                <Target className="text-amber-400" size={16} />
              </div>
              <div className="mt-2 space-y-1 text-[11px]">
                <div>
                  <span className="text-gray-400">Best</span>
                  <div className="truncate text-xs font-bold text-emerald-500">{stats.bestStrategy || '-'}</div>
                </div>
                <div>
                  <span className="text-gray-400">Worst</span>
                  <div className="truncate text-xs font-bold text-rose-400">{stats.worstStrategy || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 본문: 좌측 리스트 / 우측 요약 or 전략 리스트 */}
        <section className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* 좌측: 매매 기록 리스트 or 전략 리스트 */}
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 min-h-[400px]">
            {viewMode === 'records' ? (
              <>
                <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-gray-400 font-medium">
                  <span>매매 기록 {filteredRecords.length}개</span>
                </div>

                <div className="flex flex-col gap-2">
                  {filteredRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setSelectedRecordForDetail(record)}
                      className="group flex w-full items-stretch gap-3 rounded-xl bg-white p-3 text-left text-xs border border-gray-100 transition hover:bg-gray-50"
                    >
                      <div className="flex w-16 flex-col items-start justify-between">
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] text-gray-500 font-medium">
                          {formatDateShort(record.openDate || record.date)}
                        </span>
                        <span
                          className={`mt-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            record.position === 'Long'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-sky-50 text-sky-600'
                          }`}
                        >
                          {record.position}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-gray-800">
                              <HighlightText text={record.ticker || '-'} highlight={searchTerm} />
                            </span>
                            {record.margin && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                                ${formatCurrency(record.margin)} / {record.leverage}x
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px]">
                            {record.profitPercent ? (
                              <span
                                className={
                                  record.profitPercent > 0
                                    ? 'font-bold text-red-400'
                                    : record.profitPercent < 0
                                    ? 'font-bold text-sky-400'
                                    : 'text-gray-400'
                                }
                              >
                                {record.profitPercent}%
                              </span>
                            ) : (
                              <span className="text-gray-400">진행중</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span>
                            진입 {record.entryPrice ? `$${formatCurrency(record.entryPrice)}` : '-'} → 청산{' '}
                            {record.exitPrice ? `$${formatCurrency(record.exitPrice)}` : '미청산'}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {record.closeDate ? formatTimeDiff(record.openDate, record.closeDate) : '진행중'}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex flex-1 items-center gap-1 text-[11px] text-gray-500">
                            {record.strategyId && (
                              <span className="truncate rounded-md bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600 border border-amber-100">
                                {strategies.find((s) => s.id === record.strategyId)?.title || ''}
                              </span>
                            )}
                            {record.memo && (
                              <span className="truncate text-[11px] text-gray-400 ml-1">
                                <HighlightText text={record.memo} highlight={searchTerm} />
                              </span>
                            )}
                          </div>

                          <div className="ml-2 flex items-center gap-1 text-[11px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditRecord(record);
                              }}
                              className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({
                                  type: 'record',
                                  id: record.id,
                                  title: record.ticker || '기록',
                                });
                              }}
                              className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}

                  {!filteredRecords.length && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 py-10 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                      <List size={18} className="text-gray-300" />
                      <div className="space-y-1">
                        <p>아직 기록된 매매가 없거나, 검색 조건에 맞는 결과가 없어.</p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            resetRecordForm();
                            setIsRecordModalOpen(true);
                          }}
                          style={{ backgroundColor: '#FFF0F3', color: '#FF758F' }}
                          className="mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition hover:opacity-80"
                        >
                          <Plus size={12} />
                          첫 매매 기록 추가하기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-gray-400 font-medium">
                  <span>전략 노트 {strategies.length}개</span>
                </div>
                <div className="flex flex-col gap-2">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy.id}
                      className="group rounded-xl bg-white p-3 text-xs border border-gray-100 transition hover:shadow-sm hover:border-amber-200"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50">
                            <Target className="text-amber-400" size={15} />
                          </div>
                          <span className="text-sm font-bold text-gray-800">{strategy.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <button
                            onClick={() => {
                              setCurrentStrategy(strategy);
                              setEditingStrategyId(strategy.id);
                              setIsStrategyModalOpen(true);
                            }}
                            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'strategy',
                                id: strategy.id,
                                title: strategy.title,
                              })
                            }
                            className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="whitespace-pre-line text-[11px] text-gray-500 pl-8">{strategy.description}</div>
                    </div>
                  ))}

                  {!strategies.length && (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 py-10 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                      <BookOpen size={18} className="text-gray-300" />
                      <div className="space-y-1">
                        <p>아직 정리된 전략 노트가 없어.</p>
                        <button
                          onClick={() => {
                            setCurrentStrategy({ title: '', description: '' });
                            setEditingStrategyId(null);
                            setIsStrategyModalOpen(true);
                          }}
                          className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-200 transition"
                        >
                          <Plus size={12} />
                          첫 전략 노트 추가하기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 우측: 상세 or 요약 */}
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 min-h-[400px]">
            {viewMode === 'records' ? (
              selectedRecordForDetail ? (
                <div className="flex h-full flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                          {formatDate(selectedRecordForDetail.openDate || selectedRecordForDetail.date)}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            selectedRecordForDetail.position === 'Long'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-sky-50 text-sky-600'
                          }`}
                        >
                          {selectedRecordForDetail.position}
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-gray-900">
                        {selectedRecordForDetail.ticker || '종목명 없음'}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right text-xs">
                      <div
                        className={`flex items-baseline gap-1 text-base font-bold ${
                          selectedRecordForDetail.profitPercent > 0
                            ? 'text-red-400'
                            : selectedRecordForDetail.profitPercent < 0
                            ? 'text-sky-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {selectedRecordForDetail.profitPercent ? (
                          <>
                            <span>{selectedRecordForDetail.profitPercent}%</span>
                            {selectedRecordForDetail.realizedPnl && (
                              <span className="text-xs font-medium text-gray-400">
                                (${formatCurrency(selectedRecordForDetail.realizedPnl)})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">진행중</span>
                        )}
                      </div>
                      {selectedRecordForDetail.closeDate && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={11} />
                          {formatTimeDiff(selectedRecordForDetail.openDate, selectedRecordForDetail.closeDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4 text-xs border border-gray-100">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>진입가</span>
                      </div>
                      <div className="mt-1 font-mono text-sm text-gray-800 font-medium">
                        {selectedRecordForDetail.entryPrice
                          ? `$${formatCurrency(selectedRecordForDetail.entryPrice)}`
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>청산가</span>
                      </div>
                      <div className="mt-1 font-mono text-sm text-gray-800 font-medium">
                        {selectedRecordForDetail.exitPrice
                          ? `$${formatCurrency(selectedRecordForDetail.exitPrice)}`
                          : '미청산'}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>마진 / 레버리지</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        ${formatCurrency(selectedRecordForDetail.margin)} / {selectedRecordForDetail.leverage}x
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>청산 사유</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        {selectedRecordForDetail.exitReason || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-amber-50/50 p-3 text-xs border border-amber-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-amber-600 font-medium">
                        <BookOpen size={13} />
                        <span>연결된 전략</span>
                      </div>
                      {selectedRecord && (
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] text-amber-500 font-medium shadow-sm">
                          {selectedRecord.title}
                        </span>
                      )}
                    </div>
                    {selectedRecord ? (
                      <p className="whitespace-pre-line text-[11px] text-gray-600">{selectedRecord.description}</p>
                    ) : (
                      <p className="text-[11px] text-gray-400">연결된 전략이 없어요.</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-1 flex-col">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <List size={13} />
                        <span>메모</span>
                      </div>
                      <button
                        onClick={() => {
                          openEditRecord(selectedRecordForDetail);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500 transition hover:bg-gray-50"
                      >
                        <Edit2 size={11} />
                        이 기록 수정
                      </button>
                    </div>
                    <div className="flex-1 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-700 border border-gray-100 leading-relaxed">
                      {selectedRecordForDetail.memo?.trim() ? (
                        <p className="whitespace-pre-wrap">{selectedRecordForDetail.memo}</p>
                      ) : (
                        <p className="text-gray-400">아직 메모가 없어요. 이 기록을 수정해서 생각을 적어둘 수 있어.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-gray-400">
                  <Clock size={20} className="text-gray-300" />
                  <div className="space-y-1">
                    <p>왼쪽에서 기록을 선택하면 여기에 상세 내용이 나와.</p>
                    <p className="text-[11px] text-gray-400">전략, 진입/청산 이유, 감정 메모까지 한 번에 보기.</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-gray-400">
                <Target size={20} className="text-amber-300" />
                <div className="space-y-1">
                  <p>자주 쓰는 패턴이나 체크리스트를 전략 노트로 쌓아두고,</p>
                  <p className="text-[11px] text-gray-400">매매 기록과 연결해서 나중에 복기할 수 있어.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Record Modal (Light Theme) */}
        <Modal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            resetRecordForm();
          }}
          title={editingId ? '매매 기록 수정' : '새 매매 기록 추가'}
        >
          <form
            className="space-y-3 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              saveRecord();
            }}
          >
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">진입 일시</label>
                <input
                  type="datetime-local"
                  name="openDate"
                  value={currentRecord.openDate}
                  onChange={handleRecordChange}
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">청산 일시 (선택)</label>
                <input
                  type="datetime-local"
                  name="closeDate"
                  value={currentRecord.closeDate}
                  onChange={handleRecordChange}
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">종목</label>
                <input
                  type="text"
                  name="ticker"
                  value={currentRecord.ticker}
                  onChange={handleRecordChange}
                  placeholder="예: BTCUSDT, NVDA, TSLA..."
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">포지션</label>
                <div className="flex gap-1.5">
                  {['Long', 'Short'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentRecord({ ...currentRecord, position: p })}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                        currentRecord.position === p
                          ? p === 'Long'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : 'border-sky-200 bg-sky-50 text-sky-600'
                          : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">마진 ($)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="margin"
                    value={currentRecord.margin}
                    onChange={handleRecordChange}
                    placeholder="예: 100"
                    className="w-full rounded-lg bg-gray-50 px-2.5 py-2 pl-7 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <DollarSign className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" size={12} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">레버리지 (배)</label>
                <input
                  type="number"
                  name="leverage"
                  value={currentRecord.leverage}
                  onChange={handleRecordChange}
                  placeholder="예: 10"
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">전략 선택 (선택)</label>
                <select
                  name="strategyId"
                  value={currentRecord.strategyId}
                  onChange={handleRecordChange}
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <option value="">연결 안 함</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">진입가</label>
                <input
                  type="number"
                  name="entryPrice"
                  value={currentRecord.entryPrice}
                  onChange={handleRecordChange}
                  placeholder="예: 100.5"
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">청산가 (선택)</label>
                <input
                  type="number"
                  name="exitPrice"
                  value={currentRecord.exitPrice}
                  onChange={handleRecordChange}
                  placeholder="예: 110.2"
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">수익률 (%)</label>
                <input
                  type="number"
                  name="profitPercent"
                  value={currentRecord.profitPercent}
                  onChange={handleRecordChange}
                  placeholder="자동 계산"
                  className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">실현손익 ($)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="realizedPnl"
                    value={currentRecord.realizedPnl}
                    onChange={handleRecordChange}
                    placeholder="자동 계산"
                    className={`w-full rounded-lg bg-gray-50 px-2.5 py-2 pl-7 text-xs outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2 ${
                      Number(currentRecord.realizedPnl) > 0 ? 'text-red-500 font-medium' : 'text-sky-500 font-medium'
                    }`}
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <DollarSign className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" size={12} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-gray-500">청산 사유</label>
                <div className="flex gap-1.5">
                  {['TP Hit', 'SL Hit', 'Trailing Stop', 'Manual'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCurrentRecord({ ...currentRecord, exitReason: r })}
                      className={`flex-1 rounded-lg border px-1 py-2 text-[10px] transition-all ${
                        currentRecord.exitReason === r
                          ? 'border-amber-200 bg-amber-50 text-amber-600 font-medium'
                          : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-gray-500">메모</label>
              <textarea
                name="memo"
                value={currentRecord.memo}
                onChange={handleRecordChange}
                rows={4}
                placeholder="진입 이유, 손절/익절 기준, 당시 감정, 배운 점 등을 자유롭게 적어두면 좋아."
                className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:ring-2"
                style={{ borderColor: '#e5e7eb' }}
              />
            </div>

            <div className="mt-3 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  resetRecordForm();
                  setIsRecordModalOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 transition hover:bg-gray-50"
              >
                취소
              </button>
              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        type: 'record',
                        id: editingId,
                        title: currentRecord.ticker || '기록',
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-red-400 px-3 py-2 text-[11px] font-medium text-white shadow-md shadow-red-200 transition hover:bg-red-500"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-[11px] font-medium text-white shadow-md shadow-pink-200 transition hover:opacity-90"
                  style={{ backgroundColor: '#FF9EAA' }}
                >
                  <Save size={12} />
                  저장
                </button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Strategy Modal (Light Theme) */}
        <Modal
          isOpen={isStrategyModalOpen}
          onClose={() => {
            setIsStrategyModalOpen(false);
            setCurrentStrategy({ title: '', description: '' });
            setEditingStrategyId(null);
          }}
          title={editingStrategyId ? '전략 노트 수정' : '새 전략 노트'}
        >
          <form
            className="space-y-3 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              saveStrategy();
            }}
          >
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-gray-500">전략 이름</label>
              <input
                type="text"
                name="title"
                value={currentStrategy.title}
                onChange={handleStrategyChange}
                placeholder="예: 추세 추종 브레이크아웃, 급등주 단타 패턴 1번..."
                className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-gray-500">전략 상세</label>
              <textarea
                name="description"
                value={currentStrategy.description}
                onChange={handleStrategyChange}
                rows={6}
                placeholder="- 진입 조건
- 손절 라인
- 분할 진입/청산 규칙
- 종목/시장 필터
- 과거 예시 등"
                className="w-full rounded-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-800 outline-none border border-gray-200 placeholder:text-gray-400 focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="mt-3 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsStrategyModalOpen(false);
                  setCurrentStrategy({ title: '', description: '' });
                  setEditingStrategyId(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-500 transition hover:bg-gray-50"
              >
                취소
              </button>
              <div className="flex gap-2">
                {editingStrategyId && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        type: 'strategy',
                        id: editingStrategyId,
                        title: currentStrategy.title || '전략',
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-red-400 px-3 py-2 text-[11px] font-medium text-white shadow-md shadow-red-200 transition hover:bg-red-500"
                  >
                    <Trash2 size={12} />
                    삭제
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-4 py-2 text-[11px] font-medium text-white shadow-md shadow-amber-200 transition hover:bg-amber-500"
                >
                  <Save size={12} />
                  저장
                </button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Delete Modal */}
        <DeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={deleteTarget?.title}
        />
      </div>
    </div>
  );
}