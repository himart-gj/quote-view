import React from 'react';
import {
  calculateGeneralHiPreedSummary,
  calculateGeneralPurchaseSummary,
  calculateSubscriptionSummary,
  getActiveCompareModes,
  ProposalState,
  QuoteMode,
  resolveComparisonModePlanData,
  SubscriptionPeriod,
  switchQuoteModeInState,
} from '../types/proposal';
import { Layers, RefreshCw, ShoppingBag, User } from 'lucide-react';

export interface QuoteModeComparisonControlBarProps {
  state: ProposalState;
  onChange: React.Dispatch<React.SetStateAction<ProposalState>>;
  onSwitchMode?: (mode: QuoteMode) => void;
  onShowProposal: () => void;
}

export const QuoteModeComparisonControlBar: React.FC<
  QuoteModeComparisonControlBarProps
> = ({ state, onChange, onSwitchMode, onShowProposal }) => {
  const activeCompare = getActiveCompareModes(state);
  return (
    <div
      className={`w-full ${
        state.quoteMode === 'hybrid'
          ? 'max-w-6xl xl:max-w-7xl'
          : 'max-w-2xl lg:max-w-3xl'
      } mb-2.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs space-y-2`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {([
            { id: 'general' as QuoteMode, label: '1. 일반구매' },
            { id: 'subscription' as QuoteMode, label: '2. 구독구매' },
            { id: 'hybrid' as QuoteMode, label: '3. 혼합구매' },
          ]).map((m) => {
            const isCur = state.quoteMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (onSwitchMode) {
                    onSwitchMode(m.id);
                  } else {
                    onChange((prev) => switchQuoteModeInState(prev, m.id));
                  }
                }}
                className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap ${
                  isCur
                    ? 'bg-slate-900 text-amber-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50/70 px-2.5 py-1.5 rounded-xl border border-indigo-200/80">
          <span className="text-[11px] font-black text-indigo-950 mr-0.5 whitespace-nowrap">
            📑 함께 보낼 견적탭 선택:
          </span>
          {([
            { id: 'general' as QuoteMode, label: '일반견적' },
            { id: 'subscription' as QuoteMode, label: '구독견적' },
            { id: 'hybrid' as QuoteMode, label: '혼합견적' },
          ]).map((m) => {
            const checked = activeCompare.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange((prev) => {
                    const curList = getActiveCompareModes(prev);
                    const exists = curList.includes(m.id);
                    let nextList: QuoteMode[];
                    if (exists) {
                      nextList = curList.filter((x) => x !== m.id);
                      if (nextList.length === 0) nextList = [prev.quoteMode];
                    } else {
                      const order: QuoteMode[] = ['general', 'subscription', 'hybrid'];
                      nextList = order.filter((x) => curList.includes(x) || x === m.id);
                    }
                    return {
                      ...prev,
                      compareModes: nextList.length >= 2 ? nextList : undefined,
                    };
                  });
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black border inline-flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                  checked
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-indigo-200 hover:bg-indigo-100/60'
                }`}
              >
                <span>{checked ? '☑' : '☐'}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onChange((prev) => {
                const curList = getActiveCompareModes(prev);
                const isAll3 = curList.length === 3;
                return {
                  ...prev,
                  compareModes: isAll3
                    ? undefined
                    : ['general', 'subscription', 'hybrid'],
                };
              });
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
              activeCompare.length === 3
                ? 'bg-amber-400 text-slate-950 shadow-2xs'
                : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
            }`}
          >
            {activeCompare.length === 3 ? '✓ 3종 탭 구성됨' : '⚡ 3종 모두 포함'}
          </button>
        </div>
      </div>

      {activeCompare.length >= 2 && (
        <div className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-extrabold flex flex-wrap items-center justify-between gap-2">
          <span>
            ✨ [{activeCompare
              .map((m) =>
                m === 'general'
                  ? '일반견적'
                  : m === 'subscription'
                  ? '구독견적'
                  : '혼합견적'
              )
              .join(' · ')}
            ]이 한 장에 합쳐지지 않고, [1안 · 2안]처럼 상단 탭으로 생성되어 각각의 견적서를 따로 전환하며 비교할 수 있습니다!
          </span>
          <button
            type="button"
            onClick={onShowProposal}
            className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer shrink-0"
          >
            제안서 확인하기 ➔
          </button>
        </div>
      )}
    </div>
  );
};

export interface PreviewModeComparisonBarProps {
  state: ProposalState;
  onChange: React.Dispatch<React.SetStateAction<ProposalState>>;
  onSwitchMode?: (mode: QuoteMode) => void;
  onEnsureProposalTab: () => void;
}

export const PreviewModeComparisonBar: React.FC<
  PreviewModeComparisonBarProps
> = ({ state, onChange, onSwitchMode, onEnsureProposalTab }) => {
  const curList = getActiveCompareModes(state);
  const handleSelectOrViewMode = (modeId: QuoteMode) => {
    if (onSwitchMode) {
      onSwitchMode(modeId);
    } else {
      onChange((prev) => switchQuoteModeInState(prev, modeId));
    }
    onEnsureProposalTab();
  };

  const handleToggleIncludeMode = (e: React.MouseEvent, modeId: QuoteMode) => {
    e.stopPropagation();
    onChange((prev) => {
      const prevList = getActiveCompareModes(prev);
      const exists = prevList.includes(modeId);
      let nextList: QuoteMode[];
      if (exists) {
        nextList = prevList.filter((x) => x !== modeId);
        if (nextList.length === 0) nextList = [prev.quoteMode];
      } else {
        const order: QuoteMode[] = ['general', 'subscription', 'hybrid'];
        nextList = order.filter((x) => prevList.includes(x) || x === modeId);
      }
      return {
        ...prev,
        compareModes: nextList.length >= 2 ? nextList : undefined,
      };
    });
    onEnsureProposalTab();
  };

  return (
    <div className="inline-flex items-center gap-0.5 bg-indigo-950/90 p-0.5 rounded-lg border border-indigo-500/40 shrink-0">
      <span className="text-[10px] font-black text-amber-300 px-1.5 hidden lg:inline">
        견적탭:
      </span>
      {([
        { id: 'general' as QuoteMode, label: '일반' },
        { id: 'subscription' as QuoteMode, label: '구독' },
        { id: 'hybrid' as QuoteMode, label: '혼합' },
      ]).map((m) => {
        const checked = curList.includes(m.id);
        const isCurrentView = state.quoteMode === m.id;
        return (
          <div
            key={m.id}
            className={`inline-flex items-center rounded-md overflow-hidden transition ${
              isCurrentView
                ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-amber-300/70'
                : checked
                ? 'bg-indigo-900/80 text-indigo-100'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <button
              type="button"
              onClick={(e) => handleToggleIncludeMode(e, m.id)}
              title={`${m.label}견적을 고객 공유 탭에 포함/제외`}
              className="pl-1.5 pr-1 py-1 text-[10.5px] font-black cursor-pointer hover:text-amber-300"
            >
              {checked ? '☑' : '☐'}
            </button>
            <button
              type="button"
              onClick={() => handleSelectOrViewMode(m.id)}
              title={`${m.label} 제안서 화면으로 즉시 전환`}
              className="pr-1.5 pl-0.5 py-1 font-extrabold text-[10.5px] cursor-pointer whitespace-nowrap"
            >
              {m.label}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => {
          onChange((prev) => {
            const isAll3 = getActiveCompareModes(prev).length === 3;
            return {
              ...prev,
              compareModes: isAll3
                ? undefined
                : ['general', 'subscription', 'hybrid'],
            };
          });
          onEnsureProposalTab();
        }}
        title="일반 · 구독 · 혼합 3가지 견적을 모두 탭으로 포함"
        className={`px-1.5 py-1 rounded-md font-black text-[10px] transition cursor-pointer whitespace-nowrap ${
          curList.length === 3
            ? 'bg-amber-400 text-slate-950'
            : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
        }`}
      >
        3종탭
      </button>
    </div>
  );
};

export interface MultiModeTabSwitcherBannerProps {
  state: ProposalState;
  onSelectMode: (mode: QuoteMode) => void;
  compact?: boolean;
}

export const MultiModeTabSwitcherBanner: React.FC<
  MultiModeTabSwitcherBannerProps
> = ({ state, onSelectMode, compact = false }) => {
  const compareModes = getActiveCompareModes(state);
  if (compareModes.length < 2) return null;

  const genData = resolveComparisonModePlanData(state, 'general');
  const subData = resolveComparisonModePlanData(state, 'subscription');
  const hybData = resolveComparisonModePlanData(state, 'hybrid');

  const genSum = calculateGeneralPurchaseSummary(genData);
  const subSum = calculateSubscriptionSummary(subData);
  const hybGenSum = calculateGeneralPurchaseSummary(hybData);
  const hybSubSum = calculateSubscriptionSummary(hybData);
  const hybCombinedNet = hybGenSum.rawNet + hybSubSum.finalTotalFee;

  const getModeMeta = (m: QuoteMode, idx: number) => {
    if (m === 'general') {
      return {
        badge: `견적탭 ${idx + 1}`,
        title: '🛒 일반구매 견적서',
        price: `${genSum.rawNet.toLocaleString()}원`,
        sub: `일시불 실결제 ${genSum.payPrice.toLocaleString()}원`,
      };
    }
    if (m === 'subscription') {
      return {
        badge: `견적탭 ${idx + 1}`,
        title: `🔄 구독구매 견적서 (${subSum.periodLabel})`,
        price: `월 ${subSum.finalMonthlyFee.toLocaleString()}원`,
        sub: `총 체감 ${subSum.finalTotalFee.toLocaleString()}원`,
      };
    }
    return {
      badge: `견적탭 ${idx + 1}`,
      title: '✨ 일반+구독 혼합견적서',
      price: `${hybCombinedNet.toLocaleString()}원`,
      sub: `일반 ${Math.round(hybGenSum.rawNet / 10000).toLocaleString()}만 + 월 ${hybSubSum.finalMonthlyFee.toLocaleString()}원`,
    };
  };

  return (
    <div
      className={`rounded-3xl bg-[#18181B] text-white ${
        compact ? 'p-3 space-y-2' : 'p-3.5 space-y-2.5'
      } shadow-md no-print`}
    >
      <div className="flex items-center justify-between text-xs font-black gap-2 flex-wrap">
        <span className="text-amber-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 shrink-0" />
          <span>
            구매방식별 맞춤 견적서 탭 전환 ({compareModes.length}종 선택됨)
          </span>
        </span>
        <span className="text-[11px] text-slate-300">
          탭을 눌러 각 구매방식 견적서를 개별 화면으로 확인하세요
        </span>
      </div>
      <div
        className={`grid ${
          compareModes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        } gap-2`}
      >
        {compareModes.map((m, idx) => {
          const active = state.quoteMode === m;
          const meta = getModeMeta(m, idx);
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMode(m)}
              className={`p-2.5 sm:p-3 rounded-2xl text-left border transition cursor-pointer schedule-tactile min-w-0 ${
                active
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                  : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-[11px] sm:text-xs font-black truncate">
                {meta.title}
              </div>
              <div className="text-sm sm:text-base font-black font-mono mt-0.5 truncate">
                {meta.price}
              </div>
              <div className="text-[10px] sm:text-[10.5px] font-bold opacity-85 mt-0.5 font-mono truncate">
                {meta.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface MultiModeComparisonSectionProps {
  state: ProposalState;
  activeCustomer?: { id: string; name: string; phone?: string } | null;
  fmtCat: (raw?: string | null) => string;
  fmtModel: (raw?: string | null) => string;
}

export const MultiModeComparisonSection: React.FC<
  MultiModeComparisonSectionProps
> = () => {
  return null;
};
