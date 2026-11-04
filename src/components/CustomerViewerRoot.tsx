import React, { useEffect, useMemo, useState } from 'react';
import {
  AFFILIATE_CARDS,
  AffiliateCardId,
  calculateGeneralHiPreedSummary,
  calculateGeneralPurchaseSummary,
  calculateHiPlusSummary,
  calculateSubscriptionSummary,
  GENERAL_HIPREED_PLANS,
  GeneralHiPreedKey,
  getGeneralPlan1And2Summaries,
  HI_PLUS_PLANS,
  HiPlusKey,
  isAffiliateGeneralCardType,
  MAX_LIFECARE_TOTAL_ACCOUNTS,
  ProposalState,
  switchGeneralPlanInState,
} from '../types/proposal';
import {
  decodeQuoteFromCurrentUrl,
  normalizeConsultantRoleTitle,
  SharedQuotePayload,
} from '../utils/viewerQuoteDecoder';
import { SpringNumberFlow } from './SpringNumberFlow';
import { safeCopyText } from '../utils/mobileQaRuntime';
import {
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gift,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCheck,
} from 'lucide-react';

export interface CustomerShareQuoteViewProps {
  payload: SharedQuotePayload;
}

export const CustomerShareQuoteView: React.FC<CustomerShareQuoteViewProps> = ({
  payload,
}) => {
  // 고객이 직접 조건을 눌러보며 비교할 수 있는 로컬 시뮬레이션 상태 (언제든 원본 복원 가능)
  const [simState, setSimState] = useState<ProposalState>(() =>
    JSON.parse(JSON.stringify(payload.state))
  );
  const [showCompliance, setShowCompliance] = useState<boolean>(false);

  const isModifiedFromOriginal = useMemo(
    () => JSON.stringify(simState) !== JSON.stringify(payload.state),
    [simState, payload.state]
  );

  const handleResetToOriginal = () => {
    setSimState(JSON.parse(JSON.stringify(payload.state)));
  };

  const activePlan = simState.activeGeneralPlan || 1;
  const {
    plan1Summary,
    plan2Summary,
    plan1SubSummary,
    plan2SubSummary,
    hasPlan1Data,
    hasPlan2Data,
  } = getGeneralPlan1And2Summaries(simState);
  const hasBothPlans = hasPlan1Data && hasPlan2Data;

  const generalSummary = calculateGeneralPurchaseSummary(simState);
  const generalHiPreed = calculateGeneralHiPreedSummary(
    simState.generalHiPreedCounts
  );
  const subSummary = calculateSubscriptionSummary(simState);
  const hiPlusSummary = calculateHiPlusSummary(
    simState.hiPlusCounts,
    subSummary.representativePeriod
  );

  const showGeneral =
    simState.quoteMode === 'general' || simState.quoteMode === 'hybrid';
  const showSub =
    simState.quoteMode === 'subscription' || simState.quoteMode === 'hybrid';

  // 견적 발송 시 컨설턴트가 선택한 원본 제휴카드 파악 (1안 / 2안 각각 대응)
  const originPlanData = useMemo(() => {
    if (activePlan === 2 && hasPlan2Data && payload.state.generalPlan2) {
      return payload.state.generalPlan2;
    }
    if (payload.state.generalPlan1) {
      return payload.state.generalPlan1;
    }
    return payload.state;
  }, [activePlan, hasPlan2Data, payload.state]);

  const originGeneralAffiliateCard = isAffiliateGeneralCardType(
    originPlanData.generalCardType
  )
    ? originPlanData.generalCardType
    : null;

  const originSubAffiliateCard = useMemo(() => {
    const cid = originPlanData.selectedCardId;
    if (!cid || cid === 'none') return null;
    return AFFILIATE_CARDS.find((c) => c.id === cid) || null;
  }, [originPlanData.selectedCardId]);

  // 라이프케어상품 플랜 합산 수량 (단일 8개 가능 · 혼합 합산 최대 8개 제한)
  const combinedLifecareAccounts =
    (showGeneral ? generalHiPreed.totalAccounts : 0) +
    (showSub ? hiPlusSummary.totalAccounts : 0);
  const canAddMoreLifecare =
    combinedLifecareAccounts < MAX_LIFECARE_TOTAL_ACCOUNTS;

  const handleAdjustHiPreed = (key: GeneralHiPreedKey, delta: number) => {
    setSimState((prev) => {
      const counts = prev.generalHiPreedCounts;
      const genTotal =
        (counts.hf75 || 0) +
        (counts.hf150 || 0) +
        (counts.hf225 || 0) +
        (counts.hf300 || 0);
      const subTotal =
        prev.quoteMode === 'hybrid'
          ? (prev.hiPlusCounts.hi72 || 0) +
            (prev.hiPlusCounts.hi90 || 0) +
            (prev.hiPlusCounts.hi108 || 0)
          : 0;
      const current = counts[key] || 0;
      const nextVal = current + delta;
      if (nextVal < 0) return prev;
      if (delta > 0 && genTotal + subTotal >= MAX_LIFECARE_TOTAL_ACCOUNTS) {
        return prev;
      }
      return {
        ...prev,
        generalHiPreedCounts: {
          ...counts,
          [key]: nextVal,
        },
      };
    });
  };

  const handleAdjustHiPlus = (key: HiPlusKey, delta: number) => {
    setSimState((prev) => {
      const counts = prev.hiPlusCounts;
      const subTotal =
        (counts.hi72 || 0) +
        (counts.hi90 || 0) +
        (counts.hi108 || 0);
      const genTotal =
        prev.quoteMode === 'hybrid'
          ? (prev.generalHiPreedCounts.hf75 || 0) +
            (prev.generalHiPreedCounts.hf150 || 0) +
            (prev.generalHiPreedCounts.hf225 || 0) +
            (prev.generalHiPreedCounts.hf300 || 0)
          : 0;
      const current = counts[key] || 0;
      const nextVal = current + delta;
      if (nextVal < 0) return prev;
      if (delta > 0 && subTotal + genTotal >= MAX_LIFECARE_TOTAL_ACCOUNTS) {
        return prev;
      }
      return {
        ...prev,
        hiPlusCounts: {
          ...counts,
          [key]: nextVal,
        },
      };
    });
  };

  const handleToggleSelectedSubCard = (cardId: AffiliateCardId) => {
    setSimState((prev) => {
      if (prev.selectedCardId === cardId) {
        return {
          ...prev,
          selectedCardId: 'none',
          selectedCardTierId: '',
          subAutoTierCashback: true,
        };
      }
      const card = AFFILIATE_CARDS.find((c) => c.id === cardId);
      const preferredTier =
        originPlanData.selectedCardId === cardId &&
        originPlanData.selectedCardTierId
          ? originPlanData.selectedCardTierId
          : card?.tiers?.[0]?.id || '';
      return {
        ...prev,
        selectedCardId: cardId,
        selectedCardTierId: preferredTier,
        subAutoTierCashback: true,
      };
    });
  };

  const displayRoleTitle = normalizeConsultantRoleTitle(
    payload.consultant.roleTitle
  );

  // 문자 상담 프리필 생성
  const cleanPhone = (payload.consultant.phone || '').replace(/[^0-9]/g, '');
  const smsBody = encodeURIComponent(
    `[${payload.consultant.storeName}] 안녕하세요 ${payload.consultant.name}님! 보내주신 맞춤 비교 견적서(${
      hasBothPlans ? `${activePlan}안` : '확인완료'
    }) 보고 연락드립니다.`
  );

  return (
    <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] pb-28">
      {/* 상단 프리미엄 브랜드 바 */}
      <header className="sticky top-0 z-30 bg-[#18181B]/95 backdrop-blur-md text-white px-4 py-3 border-b border-white/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{payload.consultant.storeName} 공식 맞춤 제안서</span>
            </div>
            <h1 className="text-sm sm:text-base font-black truncate mt-0.5">
              {payload.customerName
                ? `${payload.customerName} 고객님 전용 혜택 설계안`
                : 'VIP 고객님 전용 가전 혜택 설계안'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isModifiedFromOriginal ? (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer schedule-tactile"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>원래 제안 복귀</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-300 text-[11px] font-extrabold border border-white/10">
                <UserCheck className="w-3 h-3" />
                <span>고객 전용 안심뷰</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3.5 sm:px-5 pt-4 space-y-4">
        {/* 담당 컨설턴트 안심 인사 카드 */}
        <div className="rounded-3xl bg-white border border-[#E4DFD5] p-4 shadow-2xs flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#8C5A32] text-white font-black text-base flex items-center justify-center shrink-0">
            {payload.consultant.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black">
                {payload.consultant.name}{' '}
                <span className="text-xs font-bold text-[#78716C]">
                  · {displayRoleTitle}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[#78716C]">
                설계일 {payload.createdAt}
              </span>
            </div>
            <p className="text-xs text-[#57534E] font-medium mt-1 leading-relaxed">
              "{payload.consultant.greeting}"
            </p>
          </div>
        </div>

        {/* [킬러 기능 1] 1안 vs 2안 원터치 비교 스위치 (둘 다 있을 때 자동 노출) */}
        {hasBothPlans && (
          <div className="rounded-3xl bg-[#18181B] text-white p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-amber-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                설계안 1안 ↔ 2안 실시간 비교
              </span>
              <span className="text-[11px] text-slate-300">
                탭을 눌러 두 플랜의 혜택을 비교해 보세요
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setSimState((prev) => switchGeneralPlanInState(prev, 1))
                }
                className={`p-3 rounded-2xl text-left border cursor-pointer schedule-tactile ${
                  activePlan === 1
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-black">견적 1안</div>
                <div className="text-sm sm:text-base font-black font-mono mt-0.5">
                  {simState.quoteMode === 'subscription'
                    ? `월 ${plan1SubSummary.finalMonthlyFee.toLocaleString()}원`
                    : `${plan1Summary.rawNet.toLocaleString()}원`}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSimState((prev) => switchGeneralPlanInState(prev, 2))
                }
                className={`p-3 rounded-2xl text-left border cursor-pointer schedule-tactile ${
                  activePlan === 2
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/5 text-slate-200 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-xs font-black">견적 2안</div>
                <div className="text-sm sm:text-base font-black font-mono mt-0.5">
                  {simState.quoteMode === 'subscription'
                    ? `월 ${plan2SubSummary.finalMonthlyFee.toLocaleString()}원`
                    : `${plan2Summary.rawNet.toLocaleString()}원`}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ==================== A. 일반구매 패키지 & 인터랙티브 시뮬레이터 ==================== */}
        {showGeneral && (
          <section className="rounded-3xl bg-white border border-[#E4DFD5] overflow-hidden shadow-xs">
            {/* 상단 최종 체감가 히어로 스테이지 */}
            <div className="bg-gradient-to-br from-[#18181B] to-[#292524] text-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black">
                  맞춤 구매 최대 혜택가
                </span>
                <span className="text-xs font-bold text-stone-300">
                  총 혜택{' '}
                  <strong className="text-emerald-400 font-mono">
                    -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원
                  </strong>
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-stone-400 font-bold">
                    모든 할인·캐시백·지원금 반영 시 최종 체감가
                  </div>
                  <div className="text-2xl sm:text-4xl font-black text-amber-300 mt-0.5">
                    <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-stone-400 font-bold">
                    행사가 합계 {generalSummary.sum.toLocaleString()}원
                  </div>
                  <div className="text-sm font-black text-white font-mono">
                    실결제가 <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* 구성 품목 리스트 */}
              <div className="space-y-2">
                <div className="text-xs font-black text-[#78716C] flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#8C5A32]" />
                  <span>선택하신 가전 구성 품목</span>
                </div>
                <div className="space-y-1.5">
                  {generalSummary.displayItems.map((it, idx) => {
                    const lineAmt =
                      (Number(it.unitPrice) || 0) *
                      Math.max(1, Number(it.quantity) || 1);
                    return (
                      <div
                        key={it.id || idx}
                        className="rounded-2xl bg-[#FAF8F4] border border-[#E4DFD5] px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black truncate">
                            {it.category || `품목 ${idx + 1}`}{' '}
                            {it.quantity > 1 && (
                              <span className="text-[#8C5A32]">×{it.quantity}</span>
                            )}
                          </div>
                          {it.modelName && (
                            <div className="text-[11px] font-mono text-[#78716C]">
                              {it.modelName}
                            </div>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black font-mono shrink-0">
                          {lineAmt.toLocaleString()}원
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 혜택 단계별 차감 요약 */}
              <div className="rounded-2xl bg-[#FAF8F4] border border-[#E4DFD5] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-[#78716C]">1단계 즉시할인·포인트 차감</span>
                  <span className="font-mono font-black text-blue-600">
                    -{generalSummary.totalStep1InstantDiscount.toLocaleString()}원
                  </span>
                </div>
                {generalSummary.hiFreedSupport > 0 && (
                  <div className="flex justify-between font-bold">
                    <span className="text-[#78716C]">
                      라이프케어 결합 즉시지원 ({generalHiPreed.comboLabel})
                    </span>
                    <span className="font-mono font-black text-rose-600">
                      -{generalSummary.hiFreedSupport.toLocaleString()}원
                    </span>
                  </div>
                )}
                {generalSummary.totalStep2Cashback > 0 && (
                  <div className="flex justify-between font-bold">
                    <span className="text-[#78716C]">
                      제휴카드 금액대·익월 캐시백 (
                      {isAffiliateGeneralCardType(simState.generalCardType)
                        ? simState.generalCardType
                        : originGeneralAffiliateCard || '제휴카드'}
                      )
                    </span>
                    <span className="font-mono font-black text-emerald-700">
                      -{generalSummary.totalStep2Cashback.toLocaleString()}원
                    </span>
                  </div>
                )}
                {generalSummary.totalStep2ExtraBenefit > 0 && (
                  <div className="flex justify-between font-bold">
                    <span className="text-[#78716C]">추가 사은·적립 포인트 혜택</span>
                    <span className="font-mono font-black text-amber-700">
                      -{generalSummary.totalStep2ExtraBenefit.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {/* [1] 직접 눌러보는 결제카드 (견적 발송 시 선택한 제휴카드 종류만 노출) */}
              {originGeneralAffiliateCard && (
                <div className="rounded-2xl border-2 border-[#D8C3A8] bg-[#FAF5EC] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#6E4423] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>직접 눌러보는 결제카드 (선택 제휴카드)</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#8C5A32] shrink-0">
                      터치 시 혜택 비교
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setSimState((prev) => ({
                          ...prev,
                          generalCardType:
                            prev.generalCardType === originGeneralAffiliateCard
                              ? '미정'
                              : originGeneralAffiliateCard,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 cursor-pointer schedule-tactile ${
                        simState.generalCardType === originGeneralAffiliateCard
                          ? 'bg-[#18181B] text-white border-[#18181B] shadow-2xs'
                          : 'bg-white text-[#57534E] border-[#DFD6C7]'
                      }`}
                    >
                      {simState.generalCardType === originGeneralAffiliateCard && (
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>{originGeneralAffiliateCard}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* [2] 라이프케어상품 결합 지원금 시뮬레이터 (최대 8개 제한) */}
              <div className="rounded-2xl border-2 border-[#D8C3A8] bg-[#FAF5EC] p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs sm:text-[13px] font-black text-[#6E4423] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>라이프케어상품 결합 지원금 시뮬레이터</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#8C5A32] mt-0.5">
                      중복상관없이 최대 8개 플랜 가입가능
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#D8C3A8] text-[10.5px] font-black text-[#6E4423] shrink-0">
                    {simState.quoteMode === 'hybrid'
                      ? `합산 ${combinedLifecareAccounts}/8개`
                      : `${generalHiPreed.totalAccounts}/8개`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {GENERAL_HIPREED_PLANS.map((plan) => {
                    const cnt = simState.generalHiPreedCounts[plan.id] || 0;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-2.5 flex items-center justify-between ${
                          cnt > 0
                            ? 'bg-white border-[#8C5A32] shadow-2xs'
                            : 'bg-white/70 border-[#E4DFD5]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black">{plan.name}</div>
                          <div className="text-[10px] font-bold text-rose-600 font-mono">
                            -{(plan.supportAmount / 10000).toLocaleString()}만원 지원
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={cnt === 0}
                            onClick={() => handleAdjustHiPreed(plan.id, -1)}
                            className="w-6 h-6 rounded-lg bg-[#F4F2ED] font-black text-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="text-xs font-black font-mono w-4 text-center">
                            {cnt}
                          </span>
                          <button
                            type="button"
                            disabled={!canAddMoreLifecare}
                            onClick={() => handleAdjustHiPreed(plan.id, 1)}
                            className="w-6 h-6 rounded-lg bg-[#18181B] text-white font-black text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {generalHiPreed.totalAccounts > 0 && (
                  <p className="text-[11px] font-bold text-[#6E4423] leading-relaxed">
                    ✓ 만기(150회) 시 납입 원금{' '}
                    <strong>
                      {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급
                    </strong>{' '}
                    (월 납입금{' '}
                    <strong>
                      {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원
                    </strong>{' '}
                    적립형)
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ==================== B. 가전 구독 패키지 & 인터랙티브 제휴카드/라이프케어 시뮬레이터 ==================== */}
        {showSub && (
          <section className="rounded-3xl bg-white border border-[#E4DFD5] overflow-hidden shadow-xs">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/30 text-xs font-black">
                  가전 구독 ({subSummary.periodLabel}) 케어 설계안
                </span>
                <span className="text-xs font-bold text-slate-300">
                  무상 A/S · 정기 케어 포함
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-xs text-slate-400 font-bold">
                    제휴카드·결합 혜택 적용 월 체감 구독료
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-sky-300 mt-0.5">
                    월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-bold">
                    기본 월 구독료 {subSummary.totalBaseMonthly.toLocaleString()}원
                  </div>
                  <div className="text-xs font-black text-emerald-400 font-mono">
                    매월 -
                    {(
                      subSummary.cardDiscount +
                      subSummary.hiPlusMonthly +
                      subSummary.monthlyCashbackEquiv
                    ).toLocaleString()}
                    원 체감 절감
                  </div>
                  {subSummary.totalSubCashback > 0 && (
                    <div className="text-[10.5px] font-extrabold text-amber-300 mt-0.5">
                      일시 캐시백 총 {subSummary.totalSubCashback.toLocaleString()}원 포함
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* 구독 품목 */}
              <div className="space-y-1.5">
                {subSummary.displayItems.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="rounded-2xl bg-[#FAF8F4] border border-[#E4DFD5] px-3.5 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-black">
                        {it.category || `구독 가전 ${idx + 1}`}{' '}
                        <span className="text-[11px] font-bold text-sky-700">
                          ({it.period || subSummary.representativePeriod}개월)
                        </span>
                      </div>
                      <div className="text-[11px] text-[#78716C] font-medium">
                        {it.modelName ? `${it.modelName} · ` : ''}
                        {it.careService}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-black font-mono shrink-0">
                      월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>

              {/* [1] 직접 눌러보는 결제카드 (견적 발송 시 선택한 구독 제휴카드만 노출) */}
              {originSubAffiliateCard && (
                <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 shrink-0 text-sky-700" />
                      <span>직접 눌러보는 결제카드 · 전월 실적 구간</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 shrink-0">
                      선택 제휴카드
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSelectedSubCard(originSubAffiliateCard.id)
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 cursor-pointer schedule-tactile ${
                        simState.selectedCardId === originSubAffiliateCard.id
                          ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-sky-200'
                      }`}
                    >
                      {simState.selectedCardId === originSubAffiliateCard.id && (
                        <Check className="w-3.5 h-3.5 text-amber-200" />
                      )}
                      <span>{originSubAffiliateCard.name}</span>
                    </button>
                  </div>

                  {subSummary.currentCard &&
                    subSummary.currentCard.id === originSubAffiliateCard.id && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {subSummary.currentCard.tiers.map((tier) => {
                          const active = simState.selectedCardTierId === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() =>
                                setSimState((prev) => ({
                                  ...prev,
                                  selectedCardTierId: tier.id,
                                }))
                              }
                              className={`p-2 rounded-xl border text-center cursor-pointer schedule-tactile ${
                                active
                                  ? 'bg-white border-2 border-sky-600 shadow-2xs'
                                  : 'bg-white/70 border-sky-200'
                              }`}
                            >
                              <div className="text-[10px] font-bold text-slate-500">
                                {tier.minSpendShort} 이상
                              </div>
                              <div className="text-xs font-black text-sky-700 font-mono">
                                -{(tier.monthlyDiscount / 10000).toFixed(1)}만/월
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {subSummary.totalSubCashback > 0 && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2 text-[11px] font-bold text-emerald-900 space-y-0.5">
                      <div>
                        🎁 일시 지급 캐시백 총{' '}
                        <strong>-{subSummary.totalSubCashback.toLocaleString()}원</strong> 적용됨
                        (월 환산 -{subSummary.monthlyCashbackEquiv.toLocaleString()}원 체감)
                      </div>
                      <div className="text-[10.5px] text-emerald-700">
                        {subSummary.subTierCashback > 0 &&
                          `${subSummary.currentCard?.shortName || ''} 300만↑ 금액대별 캐시백 -${subSummary.subTierCashback.toLocaleString()}원`}
                        {subSummary.subTierCashback > 0 &&
                          subSummary.subExtraCashback > 0 &&
                          ' · '}
                        {subSummary.subExtraCashback > 0 &&
                          `추가 캐시백 -${subSummary.subExtraCashback.toLocaleString()}원`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 카드 미선택 상태에서 추가 캐시백만 있는 경우 표시 */}
              {!originSubAffiliateCard && subSummary.totalSubCashback > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2 text-[11px] font-bold text-emerald-900">
                  🎁 일시 지급 캐시백 총{' '}
                  <strong>-{subSummary.totalSubCashback.toLocaleString()}원</strong> 적용됨
                  (월 환산 -{subSummary.monthlyCashbackEquiv.toLocaleString()}원 체감)
                </div>
              )}

              {/* [2] 라이프케어상품 결합 지원금 시뮬레이터 (구독 · 혼합 공통 최대 8개 제한) */}
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs sm:text-[13px] font-black text-sky-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-700" />
                      <span>라이프케어상품 결합 지원금 시뮬레이터</span>
                    </div>
                    <p className="text-[11px] font-bold text-sky-800 mt-0.5">
                      중복상관없이 최대 8개 플랜 가입가능
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-sky-200 text-[10.5px] font-black text-sky-900 shrink-0">
                    {simState.quoteMode === 'hybrid'
                      ? `합산 ${combinedLifecareAccounts}/8개`
                      : `${hiPlusSummary.totalAccounts}/8개`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {HI_PLUS_PLANS.map((plan) => {
                    const cnt = simState.hiPlusCounts[plan.id] || 0;
                    const unitSupport =
                      subSummary.representativePeriod === 36
                        ? plan.monthlySupport36
                        : plan.monthlySupport60;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-xl border p-2 flex flex-col justify-between gap-1.5 ${
                          cnt > 0
                            ? 'bg-white border-rose-500 shadow-2xs'
                            : 'bg-white/70 border-sky-200'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] font-black">{plan.buttonLabel}</div>
                          <div className="text-[9.5px] sm:text-[10px] font-bold text-rose-600 font-mono truncate">
                            월 -{(unitSupport / 1000).toLocaleString()}천원
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            disabled={cnt === 0}
                            onClick={() => handleAdjustHiPlus(plan.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 font-black text-xs cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <span className="text-xs font-black font-mono">{cnt}</span>
                          <button
                            type="button"
                            disabled={!canAddMoreLifecare}
                            onClick={() => handleAdjustHiPlus(plan.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hiPlusSummary.totalAccounts > 0 && (
                  <p className="text-[11px] font-bold text-sky-950 leading-relaxed">
                    ✓ 만기(120회) 시 납입 원금{' '}
                    <strong>
                      {hiPlusSummary.totalMaturityRefund.toLocaleString()}원 100% 전액 환급
                    </strong>{' '}
                    (월 납입금{' '}
                    <strong>
                      {hiPlusSummary.totalMonthlyDeposit.toLocaleString()}원
                    </strong>{' '}
                    · 1~90회 적립형)
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 결합상품 필수 안내 아코디언 (공정위/소비자 안내 준수) */}
        <div className="rounded-2xl bg-white border border-[#E4DFD5] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCompliance((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-black text-[#57534E] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8C5A32]" />
              제휴카드 · 라이프케어 결합상품 유의사항 안내
            </span>
            {showCompliance ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showCompliance && (
            <div className="px-4 pb-4 text-[11px] text-[#78716C] space-y-1.5 leading-relaxed border-t border-[#F4F2ED] pt-3">
              <p>
                • 본 제안서의 금액대별 캐시백 및 제휴카드 청구할인/캐시백은 카드사 전월 실적 조건 충족 및 당월 행사 기준이며, 발급월·결제일에 따라 일부 변동될 수 있습니다.
              </p>
              <p>
                • 하이프리드 및 Hi구독 플러스 결합상품은 웅진프리드라이프 상조/라이프케어 별도 계약 상품으로, 만기 완납 및 계약 유지 시 약정 원금 100% 환급이 적용되며 중도 해약 시 해약환급금 산정 기준에 따라 지원금 반환 또는 차감이 발생할 수 있습니다.
              </p>
              <p>
                • 정확한 재고, 배송 희망일 배정, 사은품 혜택 확정은 아래 담당 컨설턴트에게 문의해 주시면 신속히 안내해 드립니다.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ==================== 하단 엄지 영역 고정 컨버전 독 (Smart Thumb-Zone Dock) ==================== */}
      <div className="safe-bottom-dock fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D6D0C4] px-3 sm:px-3.5 pt-2.5 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-[#78716C] truncate">
              {payload.consultant.storeName} · {payload.consultant.name}
            </div>
            <div className="text-sm font-black text-[#18181B] font-mono truncate">
              {simState.quoteMode === 'subscription' ? (
                <>
                  월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                </>
              ) : (
                <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://map.naver.com/p/search/%EB%A1%AF%EB%8D%B0%ED%95%98%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EA%B2%BD%EA%B8%B0%EA%B4%91%EC%A3%BC%EC%A0%90"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl bg-[#F4F2ED] hover:bg-[#EAE5DC] text-[#18181B] border border-[#D6D0C4]"
              title="매장 위치 지도 보기"
            >
              <MapPin className="w-4 h-4 text-[#8C5A32]" />
            </a>

            {cleanPhone && (
              <a
                href={`sms:${cleanPhone}${typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent) ? '&' : '?'}body=${smsBody}`}
                className="px-2.5 sm:px-3.5 py-2.5 rounded-2xl bg-[#F4ECE1] hover:bg-[#EAE0D0] text-[#6E4423] border border-[#D8C3A8] text-xs font-black inline-flex items-center gap-1 sm:gap-1.5 schedule-tactile whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>문자 문의</span>
              </a>
            )}

            {cleanPhone ? (
              <a
                href={`tel:${cleanPhone}`}
                className="px-3 sm:px-4 py-2.5 rounded-2xl bg-[#18181B] hover:bg-stone-800 text-white text-xs sm:text-sm font-black inline-flex items-center gap-1 sm:gap-1.5 shadow-md schedule-tactile whitespace-nowrap"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>담당자 바로 통화</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await safeCopyText(window.location.href);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#18181B] text-white text-xs font-black inline-flex items-center gap-1.5"
              >
                <Gift className="w-4 h-4 text-amber-400" />
                <span>이 혜택 조건 보관하기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// 3. 고객 전용 독립 보안 루트 (직원용 App.tsx 마운트 자체를 원천 차단하는 샌드박스 엔트리)
// ============================================================================

export const CustomerViewerRoot: React.FC = () => {
  const [payload, setPayload] = useState<SharedQuotePayload | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const decoded = await decodeQuoteFromCurrentUrl();
      if (!active) return;
      if (decoded) {
        setPayload(decoded);
        setStatus('ready');
      } else {
        setPayload(null);
        setStatus('empty');
      }
    };

    load();
    window.addEventListener('hashchange', load);
    window.addEventListener('popstate', load);
    return () => {
      active = false;
      window.removeEventListener('hashchange', load);
      window.removeEventListener('popstate', load);
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-amber-300 flex items-center justify-center mb-3 shadow-md">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-black">맞춤 비교 견적서를 불러오는 중입니다...</div>
        <p className="text-xs text-[#78716C] font-semibold mt-1">
          롯데하이마트 경기광주점 고객 전용 뷰어
        </p>
      </div>
    );
  }

  if (!payload || status === 'empty') {
    return (
      <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] flex flex-col items-center justify-center p-5 select-none">
        <div className="w-full max-w-md rounded-3xl bg-white border border-[#E4DFD5] p-6 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#18181B] text-amber-300 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <div className="text-[11px] font-extrabold text-[#8C5A32]">
              롯데하이마트 경기광주점
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight">
              고객 전용 맞춤 견적 뷰어
            </h1>
            <p className="text-xs text-[#57534E] leading-relaxed font-medium">
              문자(SMS) 또는 카카오톡으로 전달받으신 <strong>전용 견적 링크</strong>를 눌러 접속해 주세요.
            </p>
          </div>
          <a
            href="https://map.naver.com/p/search/%EB%A1%AF%EB%8D%B0%ED%95%98%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EA%B2%BD%EA%B8%B0%EA%B4%91%EC%A3%BC%EC%A0%90"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-[#18181B] hover:bg-stone-800 text-white text-xs font-black inline-flex items-center justify-center gap-1.5 transition"
          >
            <MapPin className="w-4 h-4 text-amber-300" />
            <span>롯데하이마트 경기광주점 위치 안내</span>
          </a>
        </div>
      </div>
    );
  }

  return <CustomerShareQuoteView payload={payload} />;
};

export default CustomerViewerRoot;
