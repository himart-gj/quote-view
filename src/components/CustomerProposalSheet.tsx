import React from 'react';
import { CreditCard, Layers, RefreshCw, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { SpringNumberFlow } from './SpringNumberFlow';
import {
  getSubscriptionItemPrincipal,
  getSubscriptionSurplusMeta,
  getValidDisplayModelName,
  HiPlusPayoutMethod,
  normalizeSubscriptionPeriod,
} from '../types/proposal';
import {
  CardDiscountTermNotice,
  CardSpendSimulationBadge,
  HiPlusInBoxCallout,
  HiPlusInlineSummaryCard,
  PreedSafetyGuideBox,
} from './ProposalComplianceBlocks';

const sanitizeFiveYearText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/3년\s*(무상|A\/?S)/gi, '5년 $1');
};

export const CustomerProposalSheet: React.FC<Record<string, any>> = ({
  activePlan,
  currentCard,
  currentCardTier,
  generalHeaderTitle,
  generalHiPreed,
  generalSummary,
  hasBothPlans,
  hiPlusSummary,
  hybridCombinedNetTotal,
  hybridTotalDiscountAndSupport,
  onSelectPayoutMethod,
  simState,
  subCardBenefitLabel,
  subFormulaText,
  subHeaderTitle,
  subSummary,
}) => {
  const step1DiscountRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.instantDiscount > 0
      ? [
          {
            key: 'instant-base',
            label: '기본 즉시할인',
            amount: generalSummary.instantDiscount,
          },
        ]
      : []),
    ...(generalSummary.extraDiscountItems || []).map((it: any, idx: number) => ({
      key: it.id || `extra-disc-${idx}`,
      label: (it.description || '').trim() || '추가 즉시할인',
      amount: Math.max(0, Number(it.amount) || 0),
    })),
    ...(generalSummary.pointUsed > 0
      ? [
          {
            key: 'point-used',
            label: '포인트 즉시사용',
            amount: generalSummary.pointUsed,
          },
        ]
      : []),
  ];

  const step2CashbackRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.tierCashback > 0
      ? [
          {
            key: 'tier-cashback',
            label: '금액대별 캐시백',
            amount: generalSummary.tierCashback,
          },
        ]
      : []),
    ...(generalSummary.extraCashback > 0
      ? [
          {
            key: 'extra-cashback',
            label: '배송익월 추가 캐시백',
            amount: generalSummary.extraCashback,
          },
        ]
      : []),
  ];

  const step2ExtraRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.extraEtcItems || []).map((it: any, idx: number) => ({
      key: it.id || `extra-etc-${idx}`,
      label: (it.description || '').trim() || '추가 혜택',
      amount: Math.max(0, Number(it.amount) || 0),
    })),
    ...(generalSummary.remainingPoints > 0
      ? [
          {
            key: 'remaining-points',
            label: '잔여 포인트 차감',
            amount: generalSummary.remainingPoints,
          },
        ]
      : []),
  ];

  const subCashbackRows: { key: string; label: string; amount: number }[] = [
    ...(subSummary.subTierCashback > 0
      ? [
          {
            key: 'sub-tier-cb',
            label: `${currentCard?.shortName || '제휴카드'} 금액대별 캐시백 (원금 ${Math.floor(
              subSummary.totalPrincipal / 10000
            ).toLocaleString()}만원 구간)`,
            amount: subSummary.subTierCashback,
          },
        ]
      : []),
    ...(subSummary.subExtraCashback > 0
      ? [
          {
            key: 'sub-extra-cb',
            label: '추가 일시 캐시백',
            amount: subSummary.subExtraCashback,
          },
        ]
      : []),
  ];

  const step1TotalDeduct =
    generalSummary.totalStep1InstantDiscount +
    (!simState.hideHiPreed ? generalSummary.hiFreedSupport : 0);
  const step2TotalRefund =
    generalSummary.totalStep2Cashback + generalSummary.totalStep2ExtraBenefit;
  const subMonthlyTotalDiscount =
    subSummary.cardDiscount +
    (!simState.hideSubPreed ? subSummary.hiPlusMonthly : 0);

  const subSurplus = getSubscriptionSurplusMeta(
    subSummary.finalMonthlyFee,
    subSummary.hiPlusPayoutMethod
  );
  const subTermSurplusTotal =
    subSurplus.monthlySurplus > 0
      ? subSurplus.monthlySurplus * subSummary.representativePeriod
      : subSummary.finalTotalFee < 0
      ? Math.abs(subSummary.finalTotalFee)
      : 0;
  const hasSubPreedActive =
    !simState.hideSubPreed && (hiPlusSummary?.totalAccounts || 0) > 0;
  const handlePayoutSelect = onSelectPayoutMethod as
    | ((method: HiPlusPayoutMethod) => void)
    | undefined;

  return (
    <section className="rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 border-t-[4px] border-t-[#E60012] shadow-[0_2px_12px_rgba(25,31,40,0.05)] p-3 sm:p-5 space-y-3 sm:space-y-4 text-[#191F28] dark:text-slate-100 overflow-hidden">
      {/* ==================== CASE A: 일반구매 단독 스토리 제안서 ==================== */}
      {simState.quoteMode === 'general' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 1. 공식 문서 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2.5 sm:pb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  공식 맞춤 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                {generalHeaderTitle}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100 max-w-full break-keep">
              <CreditCard className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
              <span>
                {simState.generalCardType === '미정' ||
                simState.generalCardType === '일반카드'
                  ? '제휴카드 미적용'
                  : simState.generalCardType}
              </span>
            </span>
          </div>

          {/* 2. 핵심 1~2줄 요약 배너 */}
          <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E8EB] dark:border-slate-700/80 px-3 py-2 sm:px-3.5 sm:py-2.5">
            <p className="text-[11.5px] sm:text-[13px] font-semibold text-[#4E5968] dark:text-slate-300 leading-snug break-keep">
              {generalSummary.totalDiscountAndBenefit > 0 && generalSummary.sum > 0 ? (
                <>
                  {generalSummary.displayItems.length}품목 기준가{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#191F28] dark:text-white">
                    {generalSummary.sum.toLocaleString()}원
                  </strong>
                  에서 총{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#1B64DA] dark:text-blue-400">
                    -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원(
                    {Math.min(99, Math.round((generalSummary.totalDiscountAndBenefit / generalSummary.sum) * 100))}%↓)
                  </strong>{' '}
                  적용 · 최종 체감가{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#E60012] dark:text-[#FF5A65]">
                    {generalSummary.rawNet.toLocaleString()}원
                  </strong>
                </>
              ) : (
                <>
                  선택하신 <strong className="font-extrabold text-[#191F28] dark:text-white">{generalSummary.displayItems.length}품목</strong> 롯데하이마트 공식 맞춤 견적 안내입니다.
                </>
              )}
            </p>
          </div>

          {/* 3. 히어로 가격 카드 + 컴팩트 2열 계산 요약 */}
          <div className="space-y-2">
            {/* 메인 히어로 카드: ③ 최종 혜택 체감 구매가 */}
            <div className="rounded-2xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/50 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-4 shadow-[0_6px_18px_rgba(230,0,18,0.08)]">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  ③ 최종 혜택 체감 구매가
                </span>
                {generalSummary.totalDiscountAndBenefit > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                    총 -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원 혜택
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-[clamp(1.65rem,7vw,2.15rem)] font-black tracking-tight text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </div>
                <div className="text-[11px] font-bold text-[#4E5968] dark:text-slate-300 break-keep">
                  ① 실결제가 − ② 사후 환급 혜택
                </div>
              </div>
            </div>

            {/* 컴팩트 2열 요약: ① 매장 실결제가 + ② 사후 환급 혜택 */}
            <div className="grid grid-cols-2 mobile-keep-grid gap-2">
              <div className="min-w-0 rounded-xl bg-[#191F28] dark:bg-slate-900 border border-transparent dark:border-slate-700 text-white px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10.5px] font-extrabold text-slate-300 break-keep">
                  ① 오늘 매장 실결제가
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black tracking-tight font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                </div>
                <div className="text-[10px] font-medium text-slate-300 mt-0.5 font-mono tabular-nums truncate">
                  {step1TotalDeduct > 0
                    ? `현장 -${step1TotalDeduct.toLocaleString()}원`
                    : `기준가 ${generalSummary.sum.toLocaleString()}원`}
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10.5px] font-extrabold text-[#1B64DA] dark:text-blue-300 break-keep">
                  ② 사후 환급 혜택
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black tracking-tight text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                  {step2TotalRefund > 0 ? `-${step2TotalRefund.toLocaleString()}원` : '0원'}
                </div>
                <div className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 truncate">
                  {step2TotalRefund > 0 ? '캐시백·포인트 환급' : '현장 차감 중심'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. STEP 1 · 선택하신 가전 패키지 구성 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 1
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  선택하신 가전 패키지 구성 ({generalSummary.displayItems.length}품목)
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 shrink-0 whitespace-nowrap">
                기준 행사가
              </span>
            </div>
            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {generalSummary.displayItems.map((it: any, idx: number) => {
                const lineAmt =
                  (Number(it.unitPrice) || 0) * Math.max(1, Number(it.quantity) || 1);
                const validModel = getValidDisplayModelName(it.modelName, it.unitPrice);
                return (
                  <div key={it.id || idx} className="ledger-row px-3.5 sm:px-4 py-2.5">
                    <div className="ledger-row-label flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-[#F2F4F6] dark:bg-slate-800 text-[#191F28] dark:text-slate-200 border border-[#E5E8EB] dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[13px] sm:text-sm font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                        {it.category || `가전품목 ${idx + 1}`}
                      </span>
                      {validModel && (
                        <span className="text-[11px] sm:text-xs font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                          {validModel}
                        </span>
                      )}
                      {it.quantity > 1 && (
                        <span className="text-xs font-extrabold text-[#E60012] dark:text-[#FF6B78] shrink-0 whitespace-nowrap">
                          ×{it.quantity}개
                        </span>
                      )}
                    </div>
                    <span className="ledger-row-value text-[13px] sm:text-sm font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                      {lineAmt.toLocaleString()}원
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="ledger-row px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-t border-[#E5E8EB] dark:border-slate-700/80">
              <span className="ledger-row-label text-xs font-extrabold text-[#4E5968] dark:text-slate-300">
                패키지 기준가 합계
              </span>
              <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                {generalSummary.sum.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 5. STEP 2 · 단계별 혜택 차감 순서 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 2
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  단계별 혜택 차감 순서
                </span>
              </div>
              {generalSummary.totalDiscountAndBenefit > 0 && (
                <span className="text-[11px] font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  총 -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원 혜택
                </span>
              )}
            </div>

            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {step1DiscountRows.map((row) => (
                <div key={row.key} className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      현장차감
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{row.amount.toLocaleString()}원
                  </span>
                </div>
              ))}

              {!simState.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                <div className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      현장차감
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      하이프리드 결합 지원금
                    </span>
                    <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400">
                      ({generalHiPreed.activePlans.map((p: any) => `${p.name} ${p.count}건`).join(' + ')})
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{generalSummary.hiFreedSupport.toLocaleString()}원
                  </span>
                </div>
              )}

              <div className="ledger-row px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70">
                <span className="ledger-row-label text-xs sm:text-sm font-black text-[#191F28] dark:text-white">
                  ① 오늘 매장 카드 실결제가
                </span>
                <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                </span>
              </div>

              {[...step2CashbackRows, ...step2ExtraRows].map((row) => (
                <div key={row.key} className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#FFF1F2] dark:bg-rose-950/50 border border-[#FECDD3] dark:border-rose-800 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold shrink-0">
                      사후환급
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{row.amount.toLocaleString()}원
                  </span>
                </div>
              ))}

              <div className="ledger-row px-3.5 sm:px-4 py-3.5 bg-[#FFF1F2] dark:bg-rose-950/35 border-t-2 border-[#E60012] dark:border-[#FF3B47]">
                <div className="ledger-row-label space-y-0.5">
                  <div className="text-sm sm:text-base font-black text-[#E60012] dark:text-[#FF6B78]">
                    ③ 최종 혜택 체감 구매가
                  </div>
                  {generalSummary.rawNet < 0 && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black font-mono tabular-nums">
                      오히려 +{Math.abs(generalSummary.rawNet).toLocaleString()}원 더 이득
                    </div>
                  )}
                </div>
                <span className="ledger-row-value text-xl sm:text-2xl font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </span>
              </div>
            </div>
          </div>

          {/* 6. STEP 3 · 만기 100% 환급 보증 */}
          {!simState.hideHiPreed && generalHiPreed.totalAccounts > 0 && (
            <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="flex items-start gap-1.5 font-bold text-[#191F28] dark:text-slate-100 leading-relaxed break-keep">
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold shrink-0 mt-0.5 whitespace-nowrap">
                  STEP 3
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  하이프리드 만기 100% 환급 안내: 만기(150회[150개월] · 거치 없음) 시 납입 원금{' '}
                  <strong className="font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap">
                    {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급
                  </strong>{' '}
                  (서비스 미이용 시)
                </span>
              </span>
              <span className="text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap">
                월 납입금 {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원
              </span>
            </div>
          )}

          <PreedSafetyGuideBox
            hasHiPlus={false}
            hasGeneralHiPreed={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
          />
        </div>
      )}

      {/* ==================== CASE B: 구독구매 단독 스토리 제안서 ==================== */}
      {simState.quoteMode === 'subscription' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 1. 공식 구독 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2 sm:pb-3 flex flex-wrap items-end justify-between gap-1.5">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  공식 구독 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                {subHeaderTitle}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
              <span>방문케어 · 5년 무상 A/S 포함</span>
            </span>
          </div>

          {/* 2. 핵심 1~2줄 요약 배너 */}
          <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E8EB] dark:border-slate-700/80 px-3 py-2 sm:px-3.5 sm:py-2.5">
            <p className="text-[11.5px] sm:text-[13px] font-semibold text-[#4E5968] dark:text-slate-300 leading-snug break-keep">
              {subMonthlyTotalDiscount > 0 || subSummary.totalSubBenefit > 0 ? (
                <>
                  {subSummary.displayItems.length}품목 기본{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#191F28] dark:text-white">
                    월 {subSummary.totalBaseMonthly.toLocaleString()}원
                  </strong>{' '}
                  → 혜택{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#1B64DA] dark:text-blue-400">
                    -{subMonthlyTotalDiscount.toLocaleString()}원
                  </strong>{' '}
                  적용 시{' '}
                  {subSurplus.isSurplusZone ? (
                    <>
                      <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#E60012] dark:text-[#FF5A65]">
                        월 0원
                      </strong>
                      {subSurplus.surplusInlineText && (
                        <>
                          {' '}
                          <strong className="font-mono tabular-nums font-extrabold text-emerald-700 dark:text-emerald-300">
                            ({subSurplus.surplusInlineText})
                          </strong>
                        </>
                      )}
                    </>
                  ) : (
                    <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#E60012] dark:text-[#FF5A65]">
                      월 체감 {subSummary.finalMonthlyFee.toLocaleString()}원
                    </strong>
                  )}
                </>
              ) : (
                <>
                  {subSummary.displayItems.length}품목 방문케어·5년 무상 A/S 포함{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#E60012] dark:text-[#FF5A65]">
                    월 {Math.max(0, subSummary.finalMonthlyFee).toLocaleString()}원
                  </strong>{' '}
                  구독 제안입니다.
                </>
              )}
            </p>
          </div>

          {/* 3. 히어로 가격 집중 레이아웃 (메인 ③ 최종 월 체감 구독료 + 하단 컴팩트 2열 요약 ①·②) */}
          <div className="space-y-2">
            {/* 메인 히어로 카드: ③ 최종 월 체감 구독료 */}
            <div className="rounded-2xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/55 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-5 shadow-[0_6px_20px_rgba(230,0,18,0.08)]">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs sm:text-[13px] font-black text-[#E60012] dark:text-[#FF6B78]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  ③ 최종 월 체감 구독료 ({subSummary.periodLabel})
                </span>
                {subSummary.totalSubBenefit > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                    총 -{subSummary.totalSubBenefit.toLocaleString()}원 혜택
                  </span>
                )}
              </div>

              <div className="mt-2">
                {subSurplus.isSurplusZone ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="text-[clamp(1.75rem,7.5vw,2.25rem)] font-black tracking-tight text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none">
                        월 0원
                      </div>
                      <span className="text-[11px] font-bold text-[#4E5968] dark:text-slate-300 font-mono tabular-nums whitespace-nowrap">
                        {subTermSurplusTotal > 0
                          ? `약정 기간 총 +${subTermSurplusTotal.toLocaleString()}원 초과 혜택 예상`
                          : `${subSummary.periodLabel} 총 체감 0원`}
                      </span>
                    </div>
                    {subSurplus.surplusBadgeText && (
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11.5px] sm:text-xs font-black font-mono tabular-nums break-keep shadow-2xs">
                        {subSurplus.surplusBadgeText}
                      </div>
                    )}
                    <p className="text-[10.5px] font-semibold text-[#4E5968] dark:text-slate-300 leading-snug break-keep pt-0.5">
                      ※ {subSummary.periodLabel} 약정 · 제휴카드 전월 실적 조건 충족 기준
                      {hasSubPreedActive && (
                        <>
                          {' '}· 지원상품(Hi구독 플러스) 월 납입금{' '}
                          <strong className="font-mono tabular-nums whitespace-nowrap text-[#191F28] dark:text-white">
                            {hiPlusSummary.totalMonthlyDeposit.toLocaleString()}원
                          </strong>
                          (1~90회 납입)은 별도입니다
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="text-[clamp(1.75rem,7.5vw,2.25rem)] font-black tracking-tight text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none">
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </div>
                    <div className="text-[11.5px] font-bold text-[#4E5968] dark:text-slate-300 font-mono tabular-nums whitespace-nowrap">
                      {subSummary.finalTotalFee <= 0
                        ? `${subSummary.periodLabel} 총 체감 0원`
                        : `${subSummary.periodLabel} 총 체감 ${subSummary.finalTotalFee.toLocaleString()}원`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 컴팩트 2열 계산 요약: ① 월 기본 구독료 + ② 매월 할인·캐시백 혜택 */}
            <div className="grid grid-cols-2 mobile-keep-grid gap-2">
              <div className="min-w-0 rounded-xl bg-[#191F28] dark:bg-slate-900 border border-transparent dark:border-slate-700 text-white px-3 py-2.5 flex flex-col justify-between overflow-hidden">
                <span className="text-[10.5px] font-extrabold text-slate-300 break-keep">
                  ① 월 기본 구독료 ({subSummary.periodLabel})
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black font-mono tabular-nums whitespace-nowrap tracking-tight">
                  월 {subSummary.totalBaseMonthly.toLocaleString()}원
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5 font-mono tabular-nums whitespace-nowrap truncate">
                  기준 원금 {subSummary.totalPrincipal.toLocaleString()}원
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/60 px-3 py-2.5 flex flex-col justify-between overflow-hidden">
                <span className="text-[10.5px] font-extrabold text-[#1B64DA] dark:text-blue-300 break-keep">
                  ② 매월 할인 · 캐시백 혜택
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap tracking-tight">
                  {subMonthlyTotalDiscount > 0
                    ? `월 -${subMonthlyTotalDiscount.toLocaleString()}원`
                    : subSummary.totalSubCashback > 0
                    ? `-${subSummary.totalSubCashback.toLocaleString()}원`
                    : '0원'}
                </div>
                <div className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 font-mono tabular-nums whitespace-nowrap truncate">
                  {subSummary.totalSubBenefit > 0
                    ? `총 -${subSummary.totalSubBenefit.toLocaleString()}원 혜택`
                    : '제휴카드·프리드 결합 가능'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. STEP 1 · 구독 가전 및 무상 케어 내역 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 1
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  구독 가전 및 무상 케어 내역 ({subSummary.displayItems.length}품목)
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 shrink-0 whitespace-nowrap">
                월 구독료 · 기준가
              </span>
            </div>
            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {subSummary.displayItems.map((it: any, idx: number) => {
                const itemPeriod = normalizeSubscriptionPeriod(
                  it.period,
                  subSummary.representativePeriod
                );
                const cleanCare = sanitizeFiveYearText(
                  it.careService || '전문가 방문케어'
                );
                const validModel = getValidDisplayModelName(it.modelName, it.monthlyFee);
                const itemPrincipal = getSubscriptionItemPrincipal(
                  it,
                  subSummary.representativePeriod
                );
                return (
                  <div key={it.id || idx} className="ledger-row items-start px-3.5 sm:px-4 py-2.5">
                    <div className="ledger-row-label space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-5 h-5 rounded-md bg-[#F2F4F6] dark:bg-slate-800 text-[#191F28] dark:text-slate-200 border border-[#E5E8EB] dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[13px] sm:text-sm font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                          {it.category || `구독 가전 ${idx + 1}`}
                        </span>
                        {validModel && (
                          <span className="text-[11px] sm:text-xs font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                            {validModel}
                          </span>
                        )}
                        <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                          {itemPeriod}개월 구독
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400 pl-6 break-keep">
                        {cleanCare} · 5년 무상 A/S 기본 포함
                      </div>
                    </div>
                    <div className="ledger-row-value flex flex-col items-end">
                      <span className="text-[13px] sm:text-sm font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                        월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                      </span>
                      {itemPrincipal > 0 && (
                        <span className="text-[10.5px] font-semibold text-[#6B7684] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap mt-0.5">
                          기준 금액 {itemPrincipal.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="ledger-row items-center px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-t border-[#E5E8EB] dark:border-slate-700/80">
              <div className="ledger-row-label">
                <div className="text-xs font-extrabold text-[#4E5968] dark:text-slate-300">
                  총 월 기본 구독료 ({subSummary.periodLabel})
                </div>
                {subSummary.totalPrincipal > 0 && (
                  <div className="text-[11px] font-semibold text-[#6B7684] dark:text-slate-400 font-mono tabular-nums">
                    제품 기준 금액(약정 원금) 합계 {subSummary.totalPrincipal.toLocaleString()}원
                  </div>
                )}
              </div>
              <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                월 {subSummary.totalBaseMonthly.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 5. STEP 2 · 월 혜택 차감 및 체감가 계산 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 2
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  월 혜택 차감 및 체감가 계산
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400 truncate">
                {subFormulaText}
              </span>
            </div>

            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {subSummary.cardDiscount > 0 && currentCard && currentCardTier && (
                <div className="px-3.5 sm:px-4 py-2.5 space-y-1.5">
                  <div className="ledger-row">
                    <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                        매월 카드
                      </span>
                      <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                        {currentCard.name} 월 {subCardBenefitLabel}
                      </span>
                      <span className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400">
                        ({currentCardTier.minSpendLabel})
                      </span>
                    </div>
                    <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      월 -{subSummary.cardDiscount.toLocaleString()}원
                    </span>
                  </div>
                  <CardSpendSimulationBadge
                    enabled={subSummary.countPreedTowardCardSpend}
                    payoutMethod={subSummary.hiPlusPayoutMethod}
                    recognizedPreedSpend={subSummary.recognizedPreedSpend || 0}
                    additionalCardSpendNeeded={subSummary.additionalCardSpendNeeded || 0}
                    targetCardMinSpend={subSummary.targetCardMinSpend || 0}
                  />
                  <CardDiscountTermNotice
                    cardDiscount={subSummary.cardDiscount}
                    benefitLabel={subCardBenefitLabel}
                    representativePeriod={subSummary.representativePeriod}
                  />
                </div>
              )}

              {!simState.hideSubPreed && subSummary.hiPlusMonthly > 0 && (
                <div className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      매월 지원
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      구독프리드 (Hi구독 플러스) 월 지원금
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    월 -{subSummary.hiPlusMonthly.toLocaleString()}원
                  </span>
                </div>
              )}

              <div className="px-3.5 sm:px-4 py-3.5 bg-[#FFF1F2] dark:bg-rose-950/35 border-t-2 border-[#E60012] dark:border-[#FF3B47]">
                <div className="ledger-row items-start">
                  <div className="ledger-row-label space-y-1">
                    {subSurplus.isSurplusZone && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[10.5px] font-extrabold">
                        약정 기간 · 제휴카드 전월 실적 조건 적용 기준
                      </span>
                    )}
                    <div className="text-sm sm:text-base font-black text-[#E60012] dark:text-[#FF6B78]">
                      ③ 최종 월 체감 구독료 ({subSummary.periodLabel})
                    </div>
                    {subSurplus.surplusBadgeText && (
                      <div className="pt-0.5 space-y-1">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-black font-mono tabular-nums break-keep">
                          {subSurplus.surplusBadgeText}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 break-keep">
                          매월 지원 혜택이 월 기본 구독료보다{' '}
                          <span className="font-mono tabular-nums whitespace-nowrap">
                            {subSurplus.monthlySurplus.toLocaleString()}원
                          </span>{' '}
                          더 많습니다
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="ledger-row-value text-xl sm:text-2xl font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                    {subSurplus.isSurplusZone ? (
                      '월 0원'
                    ) : (
                      <>
                        월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                      </>
                    )}
                  </span>
                </div>
                {hasSubPreedActive && (
                  <HiPlusInBoxCallout
                    totalAccounts={hiPlusSummary.totalAccounts}
                    totalMonthlyDeposit={hiPlusSummary.totalMonthlyDeposit}
                    totalMaturityRefund={hiPlusSummary.totalMaturityRefund}
                  />
                )}
              </div>

              {subCashbackRows.map((row) => (
                <div key={row.key} className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      1회 환급
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{row.amount.toLocaleString()}원
                  </span>
                </div>
              ))}

              <div className="ledger-row items-center px-3.5 sm:px-4 py-3 bg-[#191F28] dark:bg-slate-900 text-white">
                <div className="ledger-row-label space-y-0.5">
                  <div className="text-xs sm:text-sm font-black text-white">
                    최종 {subSummary.periodLabel} 총 체감가 합계
                  </div>
                  {subSurplus.isSurplusZone || subSummary.finalTotalFee <= 0 ? (
                    <div className="text-[11px] font-bold text-emerald-300 font-mono tabular-nums break-keep">
                      {subTermSurplusTotal > 0
                        ? `약정 기간 총 +${subTermSurplusTotal.toLocaleString()}원 초과 혜택 예상`
                        : `약정 원금 ${subSummary.totalPrincipal.toLocaleString()}원 기준`}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-300 font-mono tabular-nums break-keep">
                      약정 원금 {subSummary.totalPrincipal.toLocaleString()}원 기준
                    </div>
                  )}
                </div>
                <span className="ledger-row-value text-base sm:text-xl font-black text-white font-mono tabular-nums whitespace-nowrap">
                  {subSurplus.isSurplusZone || subSummary.finalTotalFee <= 0 ? (
                    '0원'
                  ) : (
                    <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
                  )}
                </span>
              </div>
            </div>
          </div>

          {hasSubPreedActive && (
            <HiPlusInlineSummaryCard
              hiSummary={hiPlusSummary}
              representativePeriod={subSummary.representativePeriod}
              payoutMethod={subSummary.hiPlusPayoutMethod}
              onSelectPayoutMethod={handlePayoutSelect}
              useMobileFluid
            />
          )}

          <PreedSafetyGuideBox
            hasHiPlus={hasSubPreedActive}
            hasGeneralHiPreed={false}
          />
        </div>
      )}

      {/* ==================== CASE C: 일반+구독 혼합 스토리 제안서 ==================== */}
      {simState.quoteMode === 'hybrid' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 1. 통합 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2.5 sm:pb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  <Layers className="w-3 h-3 text-[#1B64DA] dark:text-blue-400" />
                  일반 + 구독 통합 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                일반구매 · 구독구매 통합 맞춤 제안서
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100">
                일반카드: {simState.generalCardType === '미정' || simState.generalCardType === '일반카드' ? '미적용' : simState.generalCardType}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[11px] sm:text-xs font-extrabold text-[#1B64DA] dark:text-blue-300">
                구독: {subSummary.periodLabel}
              </span>
            </div>
          </div>

          {/* 2. 한 줄 통합 브리핑 배너 */}
          <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E8EB] dark:border-slate-700/80 px-3 py-2 sm:px-3.5 sm:py-2.5">
            <p className="text-[11.5px] sm:text-[13px] font-semibold text-[#4E5968] dark:text-slate-300 leading-snug break-keep">
              일반구매 <strong className="font-extrabold text-[#191F28] dark:text-white">{generalSummary.displayItems.length}품목</strong>(
              <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#191F28] dark:text-white">{generalSummary.rawNet.toLocaleString()}원</strong>) + 구독{' '}
              <strong className="font-extrabold text-[#191F28] dark:text-white">{subSummary.displayItems.length}품목</strong>(
              {subSurplus.isSurplusZone ? (
                <>
                  <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#1B64DA] dark:text-blue-400">월 0원</strong>
                  {subSurplus.surplusInlineText && (
                    <>
                      {' '}
                      <strong className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                        {subSurplus.surplusInlineText}
                      </strong>
                    </>
                  )}
                </>
              ) : (
                <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#1B64DA] dark:text-blue-400">
                  월 {subSummary.finalMonthlyFee.toLocaleString()}원
                </strong>
              )}
              ) · 총{' '}
              <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#1B64DA] dark:text-blue-400">
                -{hybridTotalDiscountAndSupport.toLocaleString()}원
              </strong>{' '}
              혜택
            </p>
          </div>

          {/* 3. 히어로 통합 요약 */}
          <div className="space-y-2">
            <div className="rounded-2xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/55 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-4 shadow-[0_6px_18px_rgba(230,0,18,0.08)]">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  ③ 통합 최종 혜택 합계
                </span>
                {hybridTotalDiscountAndSupport > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                    총 -{hybridTotalDiscountAndSupport.toLocaleString()}원 혜택
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-[clamp(1.5rem,6.5vw,2rem)] font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none">
                <SpringNumberFlow value={hybridCombinedNetTotal} suffix="원" />
              </div>
            </div>

            <div className="grid grid-cols-2 mobile-keep-grid gap-2">
              <div className="min-w-0 rounded-xl bg-[#191F28] dark:bg-slate-900 border border-transparent dark:border-slate-700 text-white px-3 py-2.5 flex flex-col justify-between overflow-hidden">
                <span className="text-[10.5px] font-extrabold text-slate-300 break-keep">
                  ① 일반구매 체감가
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.2rem)] font-black font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </div>
                <div className="text-[10px] text-slate-300 font-mono tabular-nums whitespace-nowrap truncate mt-0.5">
                  실결제 {generalSummary.payPrice.toLocaleString()}원
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/60 px-3 py-2.5 flex flex-col justify-between overflow-hidden">
                <span className="text-[10.5px] font-extrabold text-[#1B64DA] dark:text-blue-300 break-keep">
                  ② 구독 월 체감료
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.2rem)] font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                  {subSurplus.isSurplusZone ? (
                    '월 0원'
                  ) : (
                    <>
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </>
                  )}
                </div>
                {subSurplus.surplusBadgeText ? (
                  <div className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold font-mono tabular-nums break-keep leading-tight">
                    {subSurplus.surplusBadgeText}
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 font-mono tabular-nums whitespace-nowrap truncate mt-0.5">
                    총 {Math.max(0, subSummary.finalTotalFee).toLocaleString()}원
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. STEP 1 / STEP 2 대칭 원장 — 폴드 펼침(680~879px) 1열 보장, 880px+ 2열 분할 */}
          <div className="grid grid-cols-1 min-[880px]:grid-cols-2 gap-3.5 items-start">
            {/* STEP 1: 일반구매 */}
            <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 bg-white dark:bg-[#131C2E] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[11px] font-extrabold whitespace-nowrap">
                    STEP 1
                  </span>
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>일반구매 ({generalSummary.displayItems.length}품목)</span>
                </span>
                <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  합계 {generalSummary.sum.toLocaleString()}원
                </span>
              </div>
              <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
                {generalSummary.displayItems.map((it: any, idx: number) => {
                  const amt =
                    (Number(it.unitPrice) || 0) * Math.max(1, Number(it.quantity) || 1);
                  const validModel = getValidDisplayModelName(it.modelName, it.unitPrice);
                  return (
                    <div key={it.id || idx} className="ledger-row px-3.5 py-2.5 text-xs">
                      <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#191F28] dark:text-slate-100">
                          {idx + 1}. {it.category || `일반가전 ${idx + 1}`}
                        </span>
                        {validModel && (
                          <span className="text-[11px] font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                            {validModel}
                          </span>
                        )}
                        {it.quantity > 1 && (
                          <span className="text-xs font-extrabold text-[#E60012] dark:text-[#FF6B78] shrink-0 whitespace-nowrap">
                            ×{it.quantity}개
                          </span>
                        )}
                      </div>
                      <span className="ledger-row-value font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                        {amt.toLocaleString()}원
                      </span>
                    </div>
                  );
                })}

                {step1DiscountRows.map((row) => (
                  <div key={row.key} className="ledger-row px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) {row.label}
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{row.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}

                {!simState.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                  <div className="ledger-row px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) 하이프리드 지원금
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{generalSummary.hiFreedSupport.toLocaleString()}원
                    </span>
                  </div>
                )}

                <div className="ledger-row px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 text-xs">
                  <span className="ledger-row-label font-black text-[#191F28] dark:text-white">
                    ① 매장 실결제가
                  </span>
                  <span className="ledger-row-value text-sm font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                    {generalSummary.payPrice.toLocaleString()}원
                  </span>
                </div>

                {[...step2CashbackRows, ...step2ExtraRows].map((row) => (
                  <div key={row.key} className="ledger-row px-3.5 py-2 text-xs">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) {row.label}
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{row.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}

                <div className="ledger-row px-3.5 py-3 bg-[#FFF1F2] dark:bg-rose-950/35 border-t border-[#FECDD3] dark:border-rose-800">
                  <div className="ledger-row-label space-y-0.5">
                    <div className="text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                      일반 최종 혜택가
                    </div>
                    {generalSummary.rawNet < 0 && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black font-mono tabular-nums">
                        오히려 +{Math.abs(generalSummary.rawNet).toLocaleString()}원 더 이득
                      </div>
                    )}
                  </div>
                  <span className="ledger-row-value text-base font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                    <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 2: 구독구매 */}
            <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 bg-white dark:bg-[#131C2E] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[11px] font-extrabold whitespace-nowrap">
                    STEP 2
                  </span>
                  <RefreshCw className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
                  <span>구독구매 ({subSummary.displayItems.length}품목)</span>
                </span>
                <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  월 {subSummary.totalBaseMonthly.toLocaleString()}원
                </span>
              </div>
              <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
                {subSummary.displayItems.map((it: any, idx: number) => {
                  const itemPeriod = normalizeSubscriptionPeriod(
                    it.period,
                    subSummary.representativePeriod
                  );
                  const cleanCare = sanitizeFiveYearText(
                    it.careService || '전문가 방문케어'
                  );
                  const validModel = getValidDisplayModelName(it.modelName, it.monthlyFee);
                  const itemPrincipal = getSubscriptionItemPrincipal(
                    it,
                    subSummary.representativePeriod
                  );
                  return (
                    <div key={it.id || idx} className="ledger-row items-start px-3.5 py-2.5 text-xs">
                      <div className="ledger-row-label space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-[#191F28] dark:text-slate-100">
                            {idx + 1}. {it.category || `구독가전 ${idx + 1}`}
                          </span>
                          {validModel && (
                            <span className="text-[11px] font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                              {validModel}
                            </span>
                          )}
                          <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                            {itemPeriod}개월 구독
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400 break-keep">
                          {cleanCare} · 5년 무상 A/S 기본 포함
                        </div>
                      </div>
                      <div className="ledger-row-value flex flex-col items-end">
                        <span className="font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                          월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                        </span>
                        {itemPrincipal > 0 && (
                          <span className="text-[10px] font-semibold text-[#6B7684] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap mt-0.5">
                            기준 {itemPrincipal.toLocaleString()}원
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {subSummary.cardDiscount > 0 && currentCard && currentCardTier && (
                  <div className="px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40 space-y-1.5">
                    <div className="ledger-row">
                      <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                        (-) {currentCard.shortName} 월 {subCardBenefitLabel} ({currentCardTier.minSpendShort})
                      </span>
                      <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                        월 -{subSummary.cardDiscount.toLocaleString()}원
                      </span>
                    </div>
                    <CardSpendSimulationBadge
                      compact
                      enabled={subSummary.countPreedTowardCardSpend}
                      payoutMethod={subSummary.hiPlusPayoutMethod}
                      recognizedPreedSpend={subSummary.recognizedPreedSpend || 0}
                      additionalCardSpendNeeded={subSummary.additionalCardSpendNeeded || 0}
                      targetCardMinSpend={subSummary.targetCardMinSpend || 0}
                    />
                    <CardDiscountTermNotice
                      compact
                      cardDiscount={subSummary.cardDiscount}
                      benefitLabel={subCardBenefitLabel}
                      representativePeriod={subSummary.representativePeriod}
                    />
                  </div>
                )}

                {!simState.hideSubPreed && subSummary.hiPlusMonthly > 0 && (
                  <div className="ledger-row px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) 구독프리드 월 지원금
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      월 -{subSummary.hiPlusMonthly.toLocaleString()}원
                    </span>
                  </div>
                )}

                <div className="px-3.5 py-3 bg-[#FFF1F2] dark:bg-rose-950/35 border-t border-[#FECDD3] dark:border-rose-800">
                  <div className="ledger-row items-start">
                    <div className="ledger-row-label space-y-1">
                      {subSurplus.isSurplusZone && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[10px] font-extrabold">
                          약정 기간 · 제휴카드 전월 실적 조건 적용 기준
                        </span>
                      )}
                      <div className="text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                        월 체감 구독료 ({subSummary.periodLabel})
                      </div>
                      {subSurplus.surplusBadgeText && (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black font-mono tabular-nums break-keep">
                            {subSurplus.surplusBadgeText}
                          </div>
                          <div className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 break-keep">
                            지원 혜택이 월 구독료보다 매월 {subSurplus.monthlySurplus.toLocaleString()}원 더 많습니다
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="ledger-row-value text-base font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                      {subSurplus.isSurplusZone ? (
                        '월 0원'
                      ) : (
                        <>
                          월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                        </>
                      )}
                    </span>
                  </div>
                  {hasSubPreedActive && (
                    <HiPlusInBoxCallout
                      compact
                      totalAccounts={hiPlusSummary.totalAccounts}
                      totalMonthlyDeposit={hiPlusSummary.totalMonthlyDeposit}
                      totalMaturityRefund={hiPlusSummary.totalMaturityRefund}
                    />
                  )}
                </div>

                {subCashbackRows.map((row) => (
                  <div key={row.key} className="ledger-row px-3.5 py-2 text-xs">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) {row.label}
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{row.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}

                <div className="ledger-row items-center px-3.5 py-2.5 bg-[#191F28] dark:bg-slate-900 text-white text-xs">
                  <div className="ledger-row-label space-y-0.5">
                    <div className="font-bold text-slate-300">
                      {subSummary.periodLabel} 총 체감가
                    </div>
                    {(subSurplus.isSurplusZone || subSummary.finalTotalFee <= 0) &&
                      subTermSurplusTotal > 0 && (
                        <div className="text-[10.5px] font-bold text-emerald-300 font-mono tabular-nums break-keep">
                          약정 기간 총 +{subTermSurplusTotal.toLocaleString()}원 초과 혜택 예상
                        </div>
                      )}
                  </div>
                  <span className="ledger-row-value text-sm font-black text-white font-mono tabular-nums whitespace-nowrap">
                    {subSurplus.isSurplusZone || subSummary.finalTotalFee <= 0 ? (
                      '0원'
                    ) : (
                      <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. STEP 3 · 혼합 프리드 결합 만기 100% 원금 환급 안심 보증 */}
          {hasSubPreedActive ? (
            <HiPlusInlineSummaryCard
              hiSummary={hiPlusSummary}
              representativePeriod={subSummary.representativePeriod}
              payoutMethod={subSummary.hiPlusPayoutMethod}
              onSelectPayoutMethod={handlePayoutSelect}
              useMobileFluid
              showGeneralLine={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
              generalHiPreedSummary={!simState.hideHiPreed ? generalHiPreed : null}
            />
          ) : !simState.hideHiPreed && generalHiPreed.totalAccounts > 0 ? (
            <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-start gap-1.5 font-bold text-[#191F28] dark:text-slate-100 leading-relaxed break-keep">
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold shrink-0 mt-0.5 whitespace-nowrap">
                  STEP 3
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  일반 하이프리드 만기 100% 원금 환급 안내 (서비스 미이용 시):
                </span>
              </span>
              <span className="text-[11.5px] font-extrabold text-emerald-700 dark:text-emerald-300 break-keep leading-relaxed font-mono tabular-nums whitespace-nowrap">
                거치 없음 · 150회 만기 {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 환급
              </span>
            </div>
          ) : null}

          <PreedSafetyGuideBox
            hasHiPlus={hasSubPreedActive}
            hasGeneralHiPreed={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
          />
        </div>
      )}
    </section>
  );
};
