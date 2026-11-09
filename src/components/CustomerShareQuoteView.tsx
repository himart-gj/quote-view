import React, { useEffect, useMemo, useState } from 'react';
import { AFFILIATE_CARDS, AffiliateCardId, calculateGeneralHiPreedSummary, calculateGeneralPurchaseSummary, calculateHiPlusSummary, calculateSubscriptionSummary, GENERAL_HIPREED_PLANS, GeneralHiPreedKey, getActiveCompareModes, getGeneralPlan1And2Summaries, HI_PLUS_PLANS, HiPlusKey, isAffiliateGeneralCardType, MAX_LIFECARE_TOTAL_ACCOUNTS, ProposalState, switchGeneralPlanInState, switchQuoteModeInState } from '../types/proposal';
import { decodeSharedQuoteFromHash, loadCachedCustomerQuotePayload, normalizeConsultantRoleTitle, SharedQuotePayload, unlockStaffDeviceWithPin } from '../utils/shareQuoteCodec';
import { SpringNumberFlow } from './SpringNumberFlow';
import { CustomerProposalSheet } from './CustomerProposalSheet';
import { MultiModeTabSwitcherBanner } from './MultiModeComparisonSection';
import { safeCopyText } from '../utils/mobileQaRuntime';
import { Check, ChevronDown, ChevronUp, CreditCard, Gift, Layers, MapPin, MessageSquare, Phone, RotateCcw, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
export { ShareQuoteLinkModal } from './ShareQuoteLinkModal';
export type { ShareQuoteLinkModalProps } from './ShareQuoteLinkModal';

export interface CustomerShareQuoteViewProps {
  payload: SharedQuotePayload;
}

export const CustomerShareQuoteView: React.FC<CustomerShareQuoteViewProps> = ({
  payload,
}) => {
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
    simState.generalHiPreedCounts,
    Boolean(simState.hideHiPreed)
  );
  const subSummary = calculateSubscriptionSummary(simState);
  const hiPlusSummary = calculateHiPlusSummary(
    simState.hiPlusCounts,
    subSummary.representativePeriod,
    Boolean(simState.hideSubPreed)
  );

  const showGeneral =
    simState.quoteMode === 'general' || simState.quoteMode === 'hybrid';
  const showSub =
    simState.quoteMode === 'subscription' || simState.quoteMode === 'hybrid';
  const isHybrid = simState.quoteMode === 'hybrid';

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

  const combinedLifecareAccounts =
    (showGeneral && !simState.hideHiPreed ? generalHiPreed.totalAccounts : 0) +
    (showSub && !simState.hideSubPreed ? hiPlusSummary.totalAccounts : 0);
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
        prev.quoteMode === 'hybrid' && !prev.hideSubPreed
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
        prev.quoteMode === 'hybrid' && !prev.hideHiPreed
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

  const cleanPhone = (payload.consultant.phone || '').replace(/[^0-9]/g, '');
  const smsBody = encodeURIComponent(
    `[${payload.consultant.storeName}] 안녕하세요 ${payload.consultant.name}님! 보내주신 맞춤 비교 견적서(${
      hasBothPlans ? `${activePlan}안` : '확인완료'
    }) 보고 연락드립니다.`
  );

  // ==================== 통합앱 고객 제안서(ProposalPreview)와 동일한 텍스트·세부내역 빌더 ====================
  const validGeneralNames = generalSummary.displayItems
    .map((it) => (it.category || '').trim())
    .filter(Boolean);
  const generalHeaderTitle =
    validGeneralNames.length === 0
      ? '맞춤 가전 패키지 구매 제안서'
      : validGeneralNames.length === 1
      ? `${validGeneralNames[0]} 맞춤 구매 제안서`
      : `${validGeneralNames[0]} 외 ${validGeneralNames.length - 1}건 맞춤 구매 제안서`;

  const validSubNames = subSummary.displayItems
    .map((it) => (it.category || '').trim())
    .filter(Boolean);
  const subHeaderTitle =
    validSubNames.length === 0
      ? `맞춤 가전 구독 제안서 (${subSummary.periodLabel} 구독)`
      : validSubNames.length === 1
      ? `${validSubNames[0]} 구독 제안서 (${subSummary.periodLabel} 구독)`
      : `${validSubNames[0]} 외 ${validSubNames.length - 1}건 구독 제안서 (${subSummary.periodLabel} 구독)`;

  const step1DiscountDetails: string[] = [];
  if (generalSummary.instantDiscount > 0) {
    step1DiscountDetails.push(
      `기본 즉시할인 -${generalSummary.instantDiscount.toLocaleString()}원`
    );
  }
  generalSummary.extraDiscountItems.forEach((it) => {
    step1DiscountDetails.push(
      `${it.description || '추가 즉시할인'} -${(Number(it.amount) || 0).toLocaleString()}원`
    );
  });
  if (generalSummary.pointUsed > 0) {
    step1DiscountDetails.push(
      `포인트 즉시사용 -${generalSummary.pointUsed.toLocaleString()}원`
    );
  }

  const step2CashbackDetails: string[] = [];
  if (generalSummary.tierCashback > 0) {
    step2CashbackDetails.push(
      `금액대별 캐시백 -${generalSummary.tierCashback.toLocaleString()}원`
    );
  }
  if (generalSummary.extraCashback > 0) {
    step2CashbackDetails.push(
      `배송익월 추가 캐시백 -${generalSummary.extraCashback.toLocaleString()}원`
    );
  }

  const step2ExtraDetails: string[] = [];
  generalSummary.extraEtcItems.forEach((it) => {
    step2ExtraDetails.push(
      `${it.description || '기타 추가혜택'} -${(Number(it.amount) || 0).toLocaleString()}원`
    );
  });
  if (generalSummary.remainingPoints > 0) {
    step2ExtraDetails.push(
      `잔여 적립포인트 -${generalSummary.remainingPoints.toLocaleString()}P`
    );
  }

  const currentCard = subSummary.currentCard;
  const currentCardTier = subSummary.currentCardTier;
  const subCardBenefitLabel =
    currentCard?.benefitType === '캐시백' ||
    currentCard?.id === 'lotte' ||
    currentCard?.id === 'shinhan'
      ? '캐시백'
      : '청구할인';

  const subCashbackDetailParts: string[] = [];
  if (subSummary.subTierCashback > 0) {
    subCashbackDetailParts.push(
      `${currentCard?.shortName || '제휴카드'} 금액대별 캐시백(원금 ${Math.floor(
        subSummary.totalPrincipal / 10000
      ).toLocaleString()}만원 구간) -${subSummary.subTierCashback.toLocaleString()}원`
    );
  }
  if (subSummary.subExtraCashback > 0) {
    subCashbackDetailParts.push(
      `추가 캐시백 -${subSummary.subExtraCashback.toLocaleString()}원`
    );
  }

  const subFormulaParts = ['월 구독료'];
  if (subSummary.cardDiscount > 0) {
    subFormulaParts.push(`제휴카드${subCardBenefitLabel}`);
  }
  if (!simState.hideSubPreed && subSummary.hiPlusMonthly > 0) {
    subFormulaParts.push('구독프리드');
  }
  const subFormulaText = subFormulaParts.join(' ➖ ');

  const hybridTotalDiscountAndSupport =
    generalSummary.totalDiscountAndBenefit + subSummary.totalSubBenefit;
  const hybridCombinedNetTotal = generalSummary.rawNet + subSummary.finalTotalFee;

  const activeCompareModes = getActiveCompareModes(simState);
  const hasGeneralSim =
    showGeneral && (Boolean(originGeneralAffiliateCard) || !simState.hideHiPreed);
  const hasSubSim =
    showSub && (Boolean(originSubAffiliateCard) || !simState.hideSubPreed);
  const showSimulatorSection = hasGeneralSim || hasSubSim;

  const containerMaxW = isHybrid ? 'max-w-2xl md:max-w-4xl' : 'max-w-2xl';

  return (
    <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] pb-28">
      {/* 상단 프리미엄 브랜드 바 */}
      <header className="sticky top-0 z-30 bg-[#18181B]/95 backdrop-blur-md text-white px-4 py-3 border-b border-white/10">
        <div className={`${containerMaxW} mx-auto flex items-center justify-between gap-2`}>
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

      <main className={`${containerMaxW} mx-auto px-3 sm:px-5 pt-4 space-y-4`}>
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

        {/* 복수 구매방식(일반 · 구독 · 혼합) 탭 전환 스위치 (한 장에 합치지 않고 [1안 · 2안]처럼 개별 견적서로 전환) */}
        {activeCompareModes.length >= 2 && (
          <MultiModeTabSwitcherBanner
            state={simState}
            onSelectMode={(m) =>
              setSimState((prev) => switchQuoteModeInState(prev, m))
            }
          />
        )}

        {/* 1안 vs 2안 원터치 비교 스위치 (둘 다 있을 때 자동 노출) */}
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
                    : simState.quoteMode === 'hybrid'
                    ? `${(plan1Summary.rawNet + plan1SubSummary.finalTotalFee).toLocaleString()}원`
                    : `${plan1Summary.rawNet.toLocaleString()}원`}
                </div>
                {simState.quoteMode === 'subscription' &&
                  (plan1SubSummary.totalSubCashback > 0 ||
                    plan2SubSummary.totalSubCashback > 0) && (
                    <div className="text-[10.5px] font-bold opacity-85 mt-0.5 font-mono">
                      총 체감 {plan1SubSummary.finalTotalFee.toLocaleString()}원
                    </div>
                  )}
                {simState.quoteMode === 'hybrid' && (
                  <div className="text-[10.5px] font-bold opacity-85 mt-0.5 font-mono">
                    일반 {Math.round(plan1Summary.rawNet / 10000)}만 + 월{' '}
                    {plan1SubSummary.finalMonthlyFee.toLocaleString()}원
                  </div>
                )}
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
                    : simState.quoteMode === 'hybrid'
                    ? `${(plan2Summary.rawNet + plan2SubSummary.finalTotalFee).toLocaleString()}원`
                    : `${plan2Summary.rawNet.toLocaleString()}원`}
                </div>
                {simState.quoteMode === 'subscription' &&
                  (plan1SubSummary.totalSubCashback > 0 ||
                    plan2SubSummary.totalSubCashback > 0) && (
                    <div className="text-[10.5px] font-bold opacity-85 mt-0.5 font-mono">
                      총 체감 {plan2SubSummary.finalTotalFee.toLocaleString()}원
                    </div>
                  )}
                {simState.quoteMode === 'hybrid' && (
                  <div className="text-[10.5px] font-bold opacity-85 mt-0.5 font-mono">
                    일반 {Math.round(plan2Summary.rawNet / 10000)}만 + 월{' '}
                    {plan2SubSummary.finalMonthlyFee.toLocaleString()}원
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        <CustomerProposalSheet
          activePlan={activePlan}
          currentCard={currentCard}
          currentCardTier={currentCardTier}
          generalHeaderTitle={generalHeaderTitle}
          generalHiPreed={generalHiPreed}
          generalSummary={generalSummary}
          hasBothPlans={hasBothPlans}
          hiPlusSummary={hiPlusSummary}
          hybridCombinedNetTotal={hybridCombinedNetTotal}
          hybridTotalDiscountAndSupport={hybridTotalDiscountAndSupport}
          simState={simState}
          step1DiscountDetails={step1DiscountDetails}
          step2CashbackDetails={step2CashbackDetails}
          step2ExtraDetails={step2ExtraDetails}
          subCardBenefitLabel={subCardBenefitLabel}
          subCashbackDetailParts={subCashbackDetailParts}
          subFormulaText={subFormulaText}
          subHeaderTitle={subHeaderTitle}
          subSummary={subSummary}
        />

        {/* ==================== 고객 직접 비교용 인터랙티브 혜택 시뮬레이터 (숨김 설정된 프리드는 고객 화면에서도 완벽 숨김) ==================== */}
        {showSimulatorSection && (
          <section className="rounded-3xl bg-white border border-[#E4DFD5] p-4 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-[#EFECE6] pb-2.5">
              <div>
                <div className="text-xs sm:text-sm font-black text-[#18181B] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#8C5A32]" />
                  <span>조건 직접 비교해보기 (혜택 시뮬레이터)</span>
                </div>
                <p className="text-[11px] font-bold text-[#78716C] mt-0.5">
                  아래 버튼을 눌러보시면 위 제안서의 결제가·최종 체감가가 실시간으로 변경됩니다
                </p>
              </div>
              {isModifiedFromOriginal && (
                <button
                  type="button"
                  onClick={handleResetToOriginal}
                  className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black shrink-0 cursor-pointer"
                >
                  원래 제안 복귀
                </button>
              )}
            </div>

            <div className={hasGeneralSim && hasSubSim ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5' : 'space-y-3.5'}>
              {hasGeneralSim && (
                <div className="space-y-3">
                  {originGeneralAffiliateCard && (
                    <div className="rounded-2xl border border-[#D8C3A8] bg-[#FAF5EC] p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-[#6E4423] flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span>일반구매 결제카드 혜택 ON/OFF</span>
                        </span>
                        <span className="text-[10px] font-bold text-[#8C5A32]">
                          터치 시 비교
                        </span>
                      </div>
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
                            ? 'bg-[#18181B] text-white border-[#18181B]'
                            : 'bg-white text-[#57534E] border-[#DFD6C7]'
                        }`}
                      >
                        {simState.generalCardType === originGeneralAffiliateCard && (
                          <Check className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>{originGeneralAffiliateCard}</span>
                      </button>
                    </div>
                  )}

                  {!simState.hideHiPreed && (
                    <div className="rounded-2xl border border-[#D8C3A8] bg-[#FAF5EC] p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-[#6E4423] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>일반 라이프케어(하이프리드) 결합 시뮬레이터</span>
                          </div>
                          <p className="text-[10.5px] font-bold text-[#8C5A32] mt-0.5">
                            중복 상관없이 최대 8개 플랜 가입 가능
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#D8C3A8] text-[10.5px] font-black text-[#6E4423] shrink-0">
                          {isHybrid && !simState.hideSubPreed
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
                            {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                          </strong>{' '}
                          (월 납입금{' '}
                          <strong>
                            {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원
                          </strong>{' '}
                          적립형)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasSubSim && (
                <div className="space-y-3">
                  {originSubAffiliateCard && (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 shrink-0 text-sky-700" />
                          <span>구독 결제카드 · 전월 실적 구간 비교</span>
                        </span>
                        <span className="text-[10px] font-bold text-sky-700">
                          선택 제휴카드
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleToggleSelectedSubCard(originSubAffiliateCard.id)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 cursor-pointer schedule-tactile ${
                          simState.selectedCardId === originSubAffiliateCard.id
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-white text-slate-700 border-sky-200'
                        }`}
                      >
                        {simState.selectedCardId === originSubAffiliateCard.id && (
                          <Check className="w-3.5 h-3.5 text-amber-200" />
                        )}
                        <span>{originSubAffiliateCard.name}</span>
                      </button>

                      {currentCard && currentCard.id === originSubAffiliateCard.id && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {currentCard.tiers.map((tier) => {
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
                    </div>
                  )}

                  {!simState.hideSubPreed && (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/55 p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-700" />
                            <span>구독 라이프케어(Hi구독 플러스) 시뮬레이터</span>
                          </div>
                          <p className="text-[10.5px] font-bold text-sky-800 mt-0.5">
                            중복 상관없이 최대 8개 플랜 가입 가능
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-sky-200 text-[10.5px] font-black text-sky-900 shrink-0">
                          {isHybrid && !simState.hideHiPreed
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
                          ✓ 납입기간 90회(30회는 거치만 · 120회 만기) 시 납입 원금{' '}
                          <strong>
                            {hiPlusSummary.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                          </strong>{' '}
                          (월 납입금{' '}
                          <strong>
                            {hiPlusSummary.totalMonthlyDeposit.toLocaleString()}원
                          </strong>{' '}
                          · 실납입 90회 / 이후 30회는 거치만)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 결합상품 필수 안내 아코디언 */}
        <div className="rounded-2xl bg-white border border-[#E4DFD5] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCompliance((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-black text-[#57534E] cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8C5A32]" />
              제휴카드 · 혜택 유의사항 안내
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
              {(!simState.hideHiPreed || !simState.hideSubPreed) && (
                <p>
                  • 하이프리드 및 Hi구독 플러스 결합상품은 웅진프리드라이프 상조/라이프케어 별도 계약 상품으로, 서비스(상조·전환) 미이용 및 만기 완납·유지 시 납입 원금 100% 전액 환급이 적용되며 중도 해약 시 해약환급금 산정 기준에 따라 지원금 반환 또는 차감이 발생할 수 있습니다.
                </p>
              )}
              <p>
                • 정확한 재고, 배송 희망일 배정, 사은품 혜택 확정은 아래 담당 컨설턴트에게 문의해 주시면 신속히 안내해 드립니다.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 하단 엄지 영역 고정 컨버전 독 (Smart Thumb-Zone Dock) */}
      <div className="safe-bottom-dock fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D6D0C4] px-3 sm:px-3.5 pt-2.5 shadow-2xl">
        <div className={`${containerMaxW} mx-auto flex items-center justify-between gap-2.5`}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-[#78716C] truncate">
              {payload.consultant.storeName} · {payload.consultant.name}
            </div>
            <div className="text-sm font-black text-[#18181B] font-mono truncate">
              {simState.quoteMode === 'subscription' ? (
                <>
                  월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                  {subSummary.totalSubCashback > 0 && (
                    <span className="ml-1 text-[11px] text-emerald-700">
                      (총 {subSummary.finalTotalFee.toLocaleString()}원)
                    </span>
                  )}
                </>
              ) : simState.quoteMode === 'hybrid' ? (
                <>
                  통합 <SpringNumberFlow value={hybridCombinedNetTotal} suffix="원" />
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
                href={`sms:${cleanPhone}${
                  typeof navigator !== 'undefined' &&
                  /iPad|iPhone|iPod/i.test(navigator.userAgent)
                    ? '&'
                    : '?'
                }body=${smsBody}`}
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

export const CustomerShareStandaloneRoot: React.FC = () => {
  const [payload, setPayload] = useState<SharedQuotePayload | null>(() =>
    loadCachedCustomerQuotePayload()
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');

  useEffect(() => {
    let active = true;

    const loadFromUrl = async () => {
      const decoded = await decodeSharedQuoteFromHash();
      if (!active) return;
      if (decoded) {
        setPayload(decoded);
        setStatus('ready');
      } else {
        setStatus('invalid');
      }
    };

    loadFromUrl();

    const handleUrlChange = () => {
      loadFromUrl();
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      active = false;
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  if (status === 'loading' && !payload) {
    return (
      <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-amber-300 flex items-center justify-center mb-3 shadow-md">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="text-base font-black">맞춤 비교 견적서를 불러오는 중입니다...</div>
        <p className="text-xs text-[#78716C] font-semibold mt-1">
          롯데하이마트 경기광주점 고객 전용 보안 뷰어
        </p>
      </div>
    );
  }

  if (!payload || status === 'invalid') {
    return (
      <PublicZeroTrustGateRoot
        onStaffVerified={() => {
          window.location.href = `${window.location.origin}${window.location.pathname}`;
        }}
      />
    );
  }

  return <CustomerShareQuoteView payload={payload} />;
};

export const PublicZeroTrustGateRoot: React.FC<{
  onStaffVerified: () => void;
}> = ({ onStaffVerified }) => {
  const [showPinBox, setShowPinBox] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const p = new URLSearchParams(window.location.search);
      return p.get('staff') === '1' || p.get('admin') === '1';
    } catch {
      return false;
    }
  });
  const [tapCount, setTapCount] = useState(0);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSecretShieldTap = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowPinBox(true);
        return 0;
      }
      return next;
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockStaffDeviceWithPin(pinValue)) {
      setPinError(false);
      onStaffVerified();
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F4F2ED] text-[#18181B] flex flex-col items-center justify-center p-5 select-none">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E4DFD5] p-6 text-center shadow-sm space-y-4">
        <div
          onClick={handleSecretShieldTap}
          className="w-12 h-12 mx-auto rounded-2xl bg-[#18181B] text-amber-300 flex items-center justify-center shadow-xs"
        >
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-extrabold text-[#8C5A32]">
            롯데하이마트 경기광주점
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight">
            전용 견적 링크로만 열람 가능합니다
          </h1>
          <p className="text-xs text-[#57534E] leading-relaxed font-medium">
            문자(SMS) 또는 카카오톡으로 전달받으신 <strong>전체 맞춤 견적 링크</strong>를 눌러 접속해 주세요.
            <br />
            (기본 주소로는 열람할 수 없는 페이지입니다.)
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

        {showPinBox && (
          <div className="pt-3 border-t border-[#F4F2ED]">
            <form onSubmit={handleVerify} className="space-y-2 text-left">
              <label className="block text-[11px] font-black text-stone-700">
                담당자 기기 등록 코드 입력 (최초 1회 인증 시 영구 유지)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={pinValue}
                  onChange={(e) => {
                    setPinValue(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="보안 코드 입력"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#D6D0C4] bg-[#FAF8F4] text-sm font-mono font-bold focus:outline-none focus:border-[#18181B]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shrink-0 cursor-pointer"
                >
                  인증
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] font-bold text-rose-600">
                  보안 코드가 일치하지 않습니다.
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
