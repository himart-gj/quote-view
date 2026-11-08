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
                onClick={() => onSwitchMode?.(m.id)}
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
            📊 견적서 한번에 비교:
          </span>
          {([
            { id: 'general' as QuoteMode, label: '일반구매' },
            { id: 'subscription' as QuoteMode, label: '구독구매' },
            { id: 'hybrid' as QuoteMode, label: '혼합구매' },
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
            {activeCompare.length === 3 ? '✓ 3종 전체비교 켜짐' : '⚡ 3종 전체비교'}
          </button>
        </div>
      </div>

      {activeCompare.length >= 2 && (
        <div className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-[11px] font-extrabold flex flex-wrap items-center justify-between gap-2">
          <span>
            ✨ 선택된 구매방식({activeCompare
              .map((m) =>
                m === 'general'
                  ? '일반구매'
                  : m === 'subscription'
                  ? '구독구매'
                  : '혼합구매'
              )
              .join(' · ')}
            )이 제안서 화면에서 한눈에 나란히 비교됩니다! (좌측 탭을 눌러 각 구매방식 품목을 개별 수정할 수 있습니다)
          </span>
          <button
            type="button"
            onClick={onShowProposal}
            className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer shrink-0"
          >
            통합 비교 제안서 바로보기 ➔
          </button>
        </div>
      )}
    </div>
  );
};

export interface PreviewModeComparisonBarProps {
  state: ProposalState;
  onChange: React.Dispatch<React.SetStateAction<ProposalState>>;
  onEnsureProposalTab: () => void;
}

export const PreviewModeComparisonBar: React.FC<
  PreviewModeComparisonBarProps
> = ({ state, onChange, onEnsureProposalTab }) => {
  const curList = getActiveCompareModes(state);
  return (
    <div className="inline-flex items-center gap-0.5 bg-indigo-950/90 p-0.5 rounded-lg border border-indigo-500/40 shrink-0">
      <span className="text-[10px] font-black text-amber-300 px-1.5 hidden lg:inline">
        비교:
      </span>
      {([
        { id: 'general' as QuoteMode, label: '일반' },
        { id: 'subscription' as QuoteMode, label: '구독' },
        { id: 'hybrid' as QuoteMode, label: '혼합' },
      ]).map((m) => {
        const checked = curList.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              onChange((prev) => {
                const prevList = getActiveCompareModes(prev);
                const exists = prevList.includes(m.id);
                let nextList: QuoteMode[];
                if (exists) {
                  nextList = prevList.filter((x) => x !== m.id);
                  if (nextList.length === 0) nextList = [prev.quoteMode];
                } else {
                  const order: QuoteMode[] = ['general', 'subscription', 'hybrid'];
                  nextList = order.filter((x) => prevList.includes(x) || x === m.id);
                }
                return {
                  ...prev,
                  compareModes: nextList.length >= 2 ? nextList : undefined,
                };
              });
              onEnsureProposalTab();
            }}
            title="체크 시 제안서에서 해당 구매방식을 한눈에 나란히 비교합니다"
            className={`px-1.5 py-1 rounded-md font-extrabold text-[10.5px] transition cursor-pointer whitespace-nowrap ${
              checked
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {checked ? '☑' : '☐'} {m.label}
          </button>
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
        className={`px-1.5 py-1 rounded-md font-black text-[10px] transition cursor-pointer whitespace-nowrap ${
          curList.length === 3
            ? 'bg-amber-400 text-slate-950'
            : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
        }`}
      >
        3종비교
      </button>
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
> = ({ state, activeCustomer, fmtCat, fmtModel }) => {
  const compareModes = getActiveCompareModes(state);
  if (compareModes.length < 2) return null;

  const genData = resolveComparisonModePlanData(state, 'general');
  const subData = resolveComparisonModePlanData(state, 'subscription');
  const hybData = resolveComparisonModePlanData(state, 'hybrid');

  const genSum = calculateGeneralPurchaseSummary(genData);
  const genFreed = calculateGeneralHiPreedSummary(genData.generalHiPreedCounts);

  const subSum = calculateSubscriptionSummary(subData);

  const hybGenSum = calculateGeneralPurchaseSummary(hybData);
  const hybGenFreed = calculateGeneralHiPreedSummary(hybData.generalHiPreedCounts);
  const hybSubSum = calculateSubscriptionSummary(hybData);
  const hybCombinedNet = hybGenSum.rawNet + hybSubSum.finalTotalFee;
  const hybCombinedDiscount =
    hybGenSum.totalDiscountAndBenefit + hybSubSum.totalSubBenefit;

  const modeLabels: Record<QuoteMode, string> = {
    general: '일반구매 (일시불)',
    subscription: `구독구매 (${subSum.periodLabel})`,
    hybrid: '일반+구독 혼합구매',
  };

  const titleJoined = compareModes
    .map((m) =>
      m === 'general'
        ? '일반구매'
        : m === 'subscription'
        ? '구독구매'
        : '혼합구매'
    )
    .join(' · ');

  return (
    <div className="space-y-4">
      {/* 1. 상단 통합 비교 헤더 */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 text-xs font-extrabold">
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              구매방식 맞춤 비교 설계안 ({compareModes.length}종 동시 비교)
            </span>
            {activeCustomer && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-extrabold">
                <User className="w-3 h-3 text-amber-300" />
                [{activeCustomer.name} 고객님 맞춤 비교 제안서]
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white break-keep">
            {titleJoined} 한눈에 비교 제안서
          </h1>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {compareModes.map((m) => (
            <span
              key={m}
              className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                m === 'general'
                  ? 'bg-blue-950/80 text-blue-200 border-blue-400/40'
                  : m === 'subscription'
                  ? 'bg-rose-950/80 text-rose-200 border-rose-400/40'
                  : 'bg-amber-950/80 text-amber-200 border-amber-400/40'
              }`}
            >
              ✓ {modeLabels[m]}
            </span>
          ))}
        </div>
      </div>

      {/* 2. 상단 핵심 요약 비교 테이블 */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-1">
          <span className="text-xs font-black text-amber-300">
            📊 구매방식별 핵심 금액 · 혜택 한눈에 비교표
          </span>
          <span className="text-[11px] font-bold text-slate-300">
            예산과 월 지출 계획에 맞춰 가장 유리한 방식을 선택하실 수 있습니다
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                <th className="py-2.5 px-3 text-left font-black w-32 shrink-0 border-r border-slate-200">
                  비교 항목
                </th>
                {compareModes.includes('general') && (
                  <th className="py-2.5 px-3 text-left font-black text-blue-800 bg-blue-50/60 border-r border-slate-200">
                    🛒 일반구매 (일시불)
                  </th>
                )}
                {compareModes.includes('subscription') && (
                  <th className="py-2.5 px-3 text-left font-black text-rose-800 bg-rose-50/60 border-r border-slate-200">
                    🔄 구독구매 ({subSum.periodLabel})
                  </th>
                )}
                {compareModes.includes('hybrid') && (
                  <th className="py-2.5 px-3 text-left font-black text-indigo-900 bg-indigo-50/60">
                    ⚡ 일반+구독 혼합구매
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <tr>
                <td className="py-2 px-3 font-extrabold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                  구성 품목
                </td>
                {compareModes.includes('general') && (
                  <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                    일반 {genSum.displayItems.length}개 품목
                  </td>
                )}
                {compareModes.includes('subscription') && (
                  <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                    구독 {subSum.displayItems.length}개 품목 ({subSum.periodLabel})
                  </td>
                )}
                {compareModes.includes('hybrid') && (
                  <td className="py-2 px-3 font-bold text-slate-800">
                    일반 {hybGenSum.displayItems.length}개 + 구독 {hybSubSum.displayItems.length}개
                  </td>
                )}
              </tr>
              <tr>
                <td className="py-2 px-3 font-extrabold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                  기준 원금 / 합계
                </td>
                {compareModes.includes('general') && (
                  <td className="py-2 px-3 font-black font-mono text-slate-900 border-r border-slate-200">
                    {genSum.sum.toLocaleString()}원
                  </td>
                )}
                {compareModes.includes('subscription') && (
                  <td className="py-2 px-3 font-black font-mono text-slate-900 border-r border-slate-200">
                    원금 {subSum.totalPrincipal.toLocaleString()}원
                    <span className="block text-[10.5px] font-bold text-slate-500">
                      (기준 월 {subSum.totalBaseMonthly.toLocaleString()}원)
                    </span>
                  </td>
                )}
                {compareModes.includes('hybrid') && (
                  <td className="py-2 px-3 font-black font-mono text-slate-900">
                    {(hybGenSum.sum + hybSubSum.totalPrincipal).toLocaleString()}원
                    <span className="block text-[10.5px] font-bold text-slate-500">
                      (일반 {hybGenSum.sum.toLocaleString()}원 + 구독원금 {hybSubSum.totalPrincipal.toLocaleString()}원)
                    </span>
                  </td>
                )}
              </tr>
              <tr>
                <td className="py-2 px-3 font-extrabold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                  초기결제 · 월납부
                </td>
                {compareModes.includes('general') && (
                  <td className="py-2 px-3 font-black text-blue-700 border-r border-slate-200">
                    일시불 실결제 {genSum.payPrice.toLocaleString()}원
                    <span className="block text-[10.5px] font-semibold text-slate-500">
                      월 납부금 없음
                    </span>
                  </td>
                )}
                {compareModes.includes('subscription') && (
                  <td className="py-2 px-3 font-black text-rose-600 border-r border-slate-200">
                    초기 0원 · 월 체감 {subSum.finalMonthlyFee.toLocaleString()}원
                    <span className="block text-[10.5px] font-semibold text-slate-500">
                      ({subSum.periodLabel} 분납 · 무상케어 포함)
                    </span>
                  </td>
                )}
                {compareModes.includes('hybrid') && (
                  <td className="py-2 px-3 font-black text-indigo-700">
                    일시불 {hybGenSum.payPrice.toLocaleString()}원 + 월 {hybSubSum.finalMonthlyFee.toLocaleString()}원
                  </td>
                )}
              </tr>
              <tr>
                <td className="py-2 px-3 font-extrabold text-slate-600 bg-slate-50/80 border-r border-slate-200">
                  총 할인·캐시백·지원
                </td>
                {compareModes.includes('general') && (
                  <td className="py-2 px-3 font-black text-emerald-700 border-r border-slate-200">
                    -{genSum.totalDiscountAndBenefit.toLocaleString()}원 혜택
                  </td>
                )}
                {compareModes.includes('subscription') && (
                  <td className="py-2 px-3 font-black text-emerald-700 border-r border-slate-200">
                    -{subSum.totalSubBenefit.toLocaleString()}원 혜택
                  </td>
                )}
                {compareModes.includes('hybrid') && (
                  <td className="py-2 px-3 font-black text-emerald-700">
                    -{hybCombinedDiscount.toLocaleString()}원 혜택
                  </td>
                )}
              </tr>
              <tr className="bg-amber-50/70">
                <td className="py-2.5 px-3 font-black text-slate-900 bg-amber-100/70 border-r border-slate-200">
                  🎯 최종 체감 총액
                </td>
                {compareModes.includes('general') && (
                  <td className="py-2.5 px-3 font-black text-base font-mono text-blue-700 border-r border-slate-200">
                    {genSum.rawNet.toLocaleString()}원
                  </td>
                )}
                {compareModes.includes('subscription') && (
                  <td className="py-2.5 px-3 font-black text-base font-mono text-rose-600 border-r border-slate-200">
                    {subSum.finalTotalFee.toLocaleString()}원
                    <span className="block text-[11px] font-extrabold text-rose-700">
                      (월 체감 {subSum.finalMonthlyFee.toLocaleString()}원)
                    </span>
                  </td>
                )}
                {compareModes.includes('hybrid') && (
                  <td className="py-2.5 px-3 font-black text-base font-mono text-indigo-800">
                    {hybCombinedNet.toLocaleString()}원
                    <span className="block text-[11px] font-extrabold text-indigo-700">
                      (일반 {hybGenSum.rawNet.toLocaleString()}원 + 구독 {hybSubSum.finalTotalFee.toLocaleString()}원)
                    </span>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 선택된 구매방식별 상세 견적 카드 나란히 배치 */}
      <div
        className={`grid grid-cols-1 ${
          compareModes.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        } gap-4 items-start`}
      >
        {/* [카드 1: 일반구매 상세] */}
        {compareModes.includes('general') && (
          <div className="bg-slate-50 rounded-2xl border-2 border-blue-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
              <span className="text-sm font-black text-blue-800 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                일반구매 (일시불) 상세 견적
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {genData.generalCardType}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
              {genSum.displayItems.map((it, idx) => {
                const amt =
                  (Number(it.unitPrice) || 0) *
                  Math.max(1, Number(it.quantity) || 1);
                return (
                  <div
                    key={it.id || idx}
                    className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700"
                  >
                    <span className="min-w-0 break-keep">
                      {idx + 1}. {fmtCat(it.category) || `일반가전 ${idx + 1}`}
                      {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                      {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                    </span>
                    <span className="font-black font-mono text-slate-900 shrink-0">
                      {amt.toLocaleString()}원
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-600">
                  총 행사가 합계
                </span>
                <span className="text-sm font-black font-mono text-slate-900">
                  {genSum.sum.toLocaleString()}원
                </span>
              </div>
            </div>

            {genSum.totalDiscountAndBenefit > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
                {genSum.totalStep1InstantDiscount > 0 && (
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>(-) 즉시할인 혜택</span>
                    <span className="font-black text-blue-600">
                      -{genSum.totalStep1InstantDiscount.toLocaleString()}원
                    </span>
                  </div>
                )}
                {genSum.hiFreedSupport > 0 && (
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>(-) 하이프리드 지원금 ({genFreed.comboLabel})</span>
                    <span className="font-black text-blue-600">
                      -{genSum.hiFreedSupport.toLocaleString()}원
                    </span>
                  </div>
                )}
                <div className="bg-blue-600 text-white rounded-lg px-3 py-2 flex items-center justify-between font-black">
                  <span>💳 고객 실 결제부담금</span>
                  <span>{genSum.payPrice.toLocaleString()}원</span>
                </div>
                {genSum.totalStep2Cashback > 0 && (
                  <div className="flex items-center justify-between font-bold text-slate-700 pt-1">
                    <span>(-) 캐시백 혜택</span>
                    <span className="font-black text-rose-600">
                      -{genSum.totalStep2Cashback.toLocaleString()}원
                    </span>
                  </div>
                )}
                {genSum.totalStep2ExtraBenefit > 0 && (
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>(-) 포인트·기타 추가혜택</span>
                    <span className="font-black text-emerald-600">
                      -{genSum.totalStep2ExtraBenefit.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-extrabold text-amber-300">
                  🎯 일반구매 최종 혜택가 (체감가)
                </div>
                <div className="text-[10.5px] text-slate-300">
                  총 -{genSum.totalDiscountAndBenefit.toLocaleString()}원 혜택 반영
                </div>
              </div>
              <div className="text-xl font-black font-mono text-amber-400">
                {genSum.rawNet.toLocaleString()}원
              </div>
            </div>

            {genFreed.totalAccounts > 0 && (
              <div className="text-[11px] font-bold text-blue-900 bg-blue-100/70 border border-blue-200 rounded-lg px-2.5 py-1.5">
                🛡️ 하이프리드 만기(150회) 시 납입원금{' '}
                <strong>{genFreed.totalMaturityRefund.toLocaleString()}원 100% 환급</strong>
              </div>
            )}
          </div>
        )}

        {/* [카드 2: 구독구매 상세] */}
        {compareModes.includes('subscription') && (
          <div className="bg-slate-50 rounded-2xl border-2 border-rose-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200 pb-2">
              <span className="text-sm font-black text-rose-700 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-rose-600" />
                구독구매 ({subSum.periodLabel}) 상세 견적
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                무상 A/S·케어 포함
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
              {subSum.displayItems.map((it, idx) => {
                const itemPeriod: SubscriptionPeriod =
                  it.period === 36
                    ? 36
                    : it.period === 60
                    ? 60
                    : subSum.representativePeriod;
                return (
                  <div
                    key={it.id || idx}
                    className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700"
                  >
                    <span className="min-w-0 break-keep">
                      {idx + 1}. {fmtCat(it.category) || `구독가전 ${idx + 1}`}
                      {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                      <span className="ml-1 px-1 py-0.2 rounded bg-rose-50 text-rose-700 text-[10px] font-extrabold">
                        {itemPeriod}개월
                      </span>
                    </span>
                    <span className="font-black font-mono text-slate-900 shrink-0">
                      월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-600">
                  기준 월 구독료 합계 (원금 {subSum.totalPrincipal.toLocaleString()}원)
                </span>
                <span className="text-sm font-black font-mono text-slate-900">
                  월 {subSum.totalBaseMonthly.toLocaleString()}원
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
              {subSum.cardDiscount > 0 && (
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>
                    (-) 제휴카드 월 할인 ({subSum.currentCard?.shortName || '제휴카드'})
                  </span>
                  <span className="font-black text-blue-600">
                    월 -{subSum.cardDiscount.toLocaleString()}원
                  </span>
                </div>
              )}
              {subSum.hiPlusMonthly > 0 && (
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>
                    (-) 구독프리드 월 지원금 (납입 90회·30회 거치만)
                  </span>
                  <span className="font-black text-blue-600">
                    월 -{subSum.hiPlusMonthly.toLocaleString()}원
                  </span>
                </div>
              )}
              <div className="bg-rose-600 text-white rounded-lg px-3 py-2 flex items-center justify-between font-black">
                <span>💳 월 체감 구독료 ({subSum.periodLabel})</span>
                <span>월 {subSum.finalMonthlyFee.toLocaleString()}원</span>
              </div>
              {subSum.totalSubCashback > 0 && (
                <div className="flex items-center justify-between font-bold text-emerald-700 pt-1">
                  <span>(-) 구독 일시 캐시백 (1회 입금)</span>
                  <span className="font-black">
                    -{subSum.totalSubCashback.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-extrabold text-amber-300">
                  🎯 최종 {subSum.periodLabel} 총 체감가
                </div>
                <div className="text-[10.5px] text-slate-300">
                  원금 {subSum.totalPrincipal.toLocaleString()}원 대비 총 -{subSum.totalSubBenefit.toLocaleString()}원 혜택
                </div>
              </div>
              <div className="text-xl font-black font-mono text-amber-400">
                {subSum.finalTotalFee.toLocaleString()}원
              </div>
            </div>

            {subSum.hiSummary.totalAccounts > 0 && (
              <div className="text-[11px] font-bold text-indigo-900 bg-indigo-100/70 border border-indigo-200 rounded-lg px-2.5 py-1.5">
                🛡️ 구독프리드 결합 (납입기간 90회 · 30회는 거치만 / 120회 만기):{' '}
                <strong>{subSum.hiSummary.totalMaturityRefund.toLocaleString()}원 100% 환급</strong>
              </div>
            )}
          </div>
        )}

        {/* [카드 3: 일반+구독 혼합구매 상세] */}
        {compareModes.includes('hybrid') && (
          <div className="bg-slate-50 rounded-2xl border-2 border-indigo-300 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
              <span className="text-sm font-black text-indigo-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                일반+구독 혼합구매 상세 견적
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                일시불 + {hybSubSum.periodLabel} 구독
              </span>
            </div>

            {/* 혼합 파트 A: 일반구매 */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="font-black text-blue-700 flex items-center justify-between border-b border-slate-100 pb-1">
                <span>[파트 A] 일반구매 ({hybGenSum.displayItems.length}개 품목)</span>
                <span>합계 {hybGenSum.sum.toLocaleString()}원</span>
              </div>
              {hybGenSum.displayItems.map((it, idx) => {
                const amt =
                  (Number(it.unitPrice) || 0) *
                  Math.max(1, Number(it.quantity) || 1);
                return (
                  <div
                    key={it.id || idx}
                    className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-700"
                  >
                    <span className="min-w-0 break-keep">
                      • {fmtCat(it.category) || `일반가전 ${idx + 1}`}
                      {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                    </span>
                    <span className="font-mono font-black shrink-0">
                      {amt.toLocaleString()}원
                    </span>
                  </div>
                );
              })}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between font-black text-blue-800">
                <span>일반 실결제 {hybGenSum.payPrice.toLocaleString()}원</span>
                <span>➔ 일반 체감가 {hybGenSum.rawNet.toLocaleString()}원</span>
              </div>
            </div>

            {/* 혼합 파트 B: 구독구매 */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="font-black text-rose-700 flex items-center justify-between border-b border-slate-100 pb-1">
                <span>[파트 B] 구독구매 ({hybSubSum.displayItems.length}개 · {hybSubSum.periodLabel})</span>
                <span>원금 {hybSubSum.totalPrincipal.toLocaleString()}원</span>
              </div>
              {hybSubSum.displayItems.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-700"
                >
                  <span className="min-w-0 break-keep">
                    • {fmtCat(it.category) || `구독가전 ${idx + 1}`}
                    {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                  </span>
                  <span className="font-mono font-black shrink-0">
                    월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between font-black text-rose-700">
                <span>월 체감 {hybSubSum.finalMonthlyFee.toLocaleString()}원</span>
                <span>➔ {hybSubSum.periodLabel} 총 체감 {hybSubSum.finalTotalFee.toLocaleString()}원</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-extrabold text-amber-300">
                  🎯 혼합구매 통합 최종 체감가 합계
                </div>
                <div className="text-[10.5px] text-slate-300">
                  총 -{hybCombinedDiscount.toLocaleString()}원 통합 혜택 반영
                </div>
              </div>
              <div className="text-xl font-black font-mono text-amber-400">
                {hybCombinedNet.toLocaleString()}원
              </div>
            </div>

            {(hybGenFreed.totalAccounts > 0 ||
              hybSubSum.hiSummary.totalAccounts > 0) && (
              <div className="text-[11px] font-bold text-indigo-900 bg-indigo-100/70 border border-indigo-200 rounded-lg px-2.5 py-1.5">
                🛡️ 프리드 만기 100% 환급:{' '}
                {hybGenFreed.totalAccounts > 0 &&
                  `하이프리드(150회) ${hybGenFreed.totalMaturityRefund.toLocaleString()}원`}
                {hybGenFreed.totalAccounts > 0 &&
                  hybSubSum.hiSummary.totalAccounts > 0 &&
                  ' + '}
                {hybSubSum.hiSummary.totalAccounts > 0 &&
                  `구독프리드(납입 90회·30회 거치만) ${hybSubSum.hiSummary.totalMaturityRefund.toLocaleString()}원`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
