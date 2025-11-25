'use client';

import { List, Clock, BookOpen, TrendingUp } from 'lucide-react';

export type HeaderTab = 'journal' | 'stats' | 'strategy';

interface HeaderProps {
  activeTab: HeaderTab;
  onChangeTab: (tab: HeaderTab) => void;
}

export function Header({ activeTab, onChangeTab }: HeaderProps) {
  return (
    <header
      className="w-full flex items-center justify-between px-8 py-5 border-b bg-white"
      style={{ borderColor: '#FFE4EC' }}
    >
      {/* 왼쪽: 아이콘 + 타이틀 */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#FFF0F3' }}
        >
          <TrendingUp style={{ color: '#FF9EAA' }} size={20} />
        </div>
        <h1
          className="text-xl font-semibold"
          style={{ color: '#E25574' }}
        >
          급등주 노트
        </h1>
      </div>

      {/* 오른쪽: 탭들 */}
      <nav className="flex items-center gap-6 text-sm">
        {/* 일지 */}
        <button
          type="button"
          onClick={() => onChangeTab('journal')}
          className="flex items-center gap-1 px-4 py-2 rounded-2xl font-semibold transition"
          style={
            activeTab === 'journal'
              ? { backgroundColor: '#FFF0F3', color: '#E25574' }
              : { color: '#9CA3AF' }
          }
        >
          <List size={16} />
          일지
        </button>

        {/* 통계 */}
        <button
          type="button"
          onClick={() => onChangeTab('stats')}
          className="flex items-center gap-1 transition"
          style={
            activeTab === 'stats'
              ? { color: '#E25574', fontWeight: 600 }
              : { color: '#9CA3AF' }
          }
        >
          <Clock size={16} />
          통계
        </button>

        {/* 전략 */}
        <button
          type="button"
          onClick={() => onChangeTab('strategy')}
          className="flex items-center gap-1 transition"
          style={
            activeTab === 'strategy'
              ? { color: '#E25574', fontWeight: 600 }
              : { color: '#9CA3AF' }
          }
        >
          <BookOpen size={16} />
          전략
        </button>
      </nav>
    </header>
  );
}