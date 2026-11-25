import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AFFILIATE_CARDS,
  AffiliateCardId,
  calculateGeneralHiPreedSummary,
  calculateGeneralPurchaseSummary,
  calculateHiPlusSummary,
  calculateSubscriptionSummary,
  extractGeneralPlanData,
  GENERAL_HIPREED_PLANS,
  GeneralHiPreedKey,
  getActiveCompareModes,
  getGeneralPlan1And2Summaries,
  getHiPlusUnitMonthlySupport,
  getSubscriptionSurplusMeta,
  HI_PLUS_PLANS,
  HiPlusCounts,
  HiPlusKey,
  HiPlusPayoutMethod,
  isAffiliateGeneralCardType,
  MAX_FREED_ACCOUNTS,
  ProposalState,
  QuoteMode,
  recommendCardSpendHiPlusCounts,
  resolveComparisonModePlanData,
  switchGeneralPlanInState,
  switchQuoteModeInState,
} from '../types/proposal';
import {
  decodeQuoteFromCurrentUrl,
  normalizeConsultantRoleTitle,
  SharedQuotePayload,
} from '../utils/viewerQuoteDecoder';
import { SpringNumberFlow } from './SpringNumberFlow';
import { CustomerProposalSheet } from './CustomerProposalSheet';
import { UnifiedComplianceAccordion } from './ProposalComplianceBlocks';
import { safeCopyText, scrollToTopInstant } from '../utils/mobileQaRuntime';
import {
  ArrowDown,
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
  SlidersHorizontal,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface MultiModeTabSwitcherBannerProps {
  state: ProposalState;
  onSelectMode: (mode: QuoteMode) => void;
}

const MultiModeTabSwitcherBanner: React.FC<MultiModeTabSwitcherBannerProps> = ({
  state,
  onSelectMode,
}) => {
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

  const subSurplus = getSubscriptionSurplusMeta(
    subSum.finalMonthlyFee,
    subSum.hiPlusPayoutMethod
  );
  const hybSubSurplus = getSubscriptionSurplusMeta(
    hybSubSum.finalMonthlyFee,
    hybSubSum.hiPlusPayoutMethod
  );

  const getModeMeta = (m: QuoteMode, idx: number) => {
    const planBadge = `비교 ${idx + 1}안`;
    if (m === 'general') {
      return {
        badge: planBadge,
        title: '일반구매 설계',
        price: `${genSum.rawNet.toLocaleString()}원`,
        sub: `실결제 ${genSum.payPrice.toLocaleString()}원`,
      };
    }
    if (m === 'subscription') {
      return {
        badge: planBadge,
        title: `구독구매 설계 (${subSum.periodLabel})`,
        price: subSurplus.isSurplusZone
          ? subSurplus.monthlySurplus > 0
            ? `월 0원 (${subSurplus.surplusStickyText})`
            : '월 0원'
          : `월 ${subSum.finalMonthlyFee.toLocaleString()}원`,
        sub:
          subSurplus.isSurplusZone || subSum.finalTotalFee <= 0
            ? subSum.totalTermSurplus > 0
              ? `총 +${subSum.totalTermSurplus.toLocaleString()}원 초과 혜택`
              : '총 체감 0원'
            : `총 체감 ${subSum.finalTotalFee.toLocaleString()}원`,
      };
    }
    return {
      badge: planBadge,
      title: '일반 + 구독 통합설계',
      price: `일시불 ${Math.round(hybGenSum.rawNet / 10000).toLocaleString()}만 + ${
        hybSubSurplus.isSurplusZone
          ? hybSubSurplus.monthlySurplus > 0
            ? `월 0원 (${hybSubSurplus.surplusStickyText})`
            : '월 0원'
          : `월 ${hybSubSum.finalMonthlyFee.toLocaleString()}원`
      }`,
      sub: `통합 총 체감 ${hybCombinedNet.toLocaleString()}원`,
    };
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 p-3 sm:p-4 space-y-2 shadow-[0_2px_10px_rgba(25,31,40,0.03)] no-print">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span className="font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#1B64DA] dark:text-blue-400 shrink-0" />
          <span>맞춤 설계안 비교 ({compareModes.length}개 구매방식)</span>
        </span>
        <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400">
          탭을 눌러 구매방식별 혜택을 비교해 보세요
        </span>
      </div>
      <div
        className={`grid ${
          compareModes.length === 3
            ? 'grid-cols-1 min-[440px]:grid-cols-3'
            : 'grid-cols-1 min-[380px]:grid-cols-2'
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
              className={`p-2.5 sm:p-3 rounded-xl text-left border-2 transition cursor-pointer schedule-tactile min-w-0 flex flex-col justify-between ${
                active
                  ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500 shadow-xs'
                  : 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#191F28] dark:text-slate-100 border-[#E5E8EB] dark:border-slate-700 hover:border-[#1B64DA]/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-extrabold ${
                      active
                        ? 'bg-[#1B64DA] dark:bg-slate-900/40 text-white'
                        : 'bg-white dark:bg-slate-900 border border-[#E5E8EB] dark:border-slate-700 text-[#4E5968] dark:text-slate-300'
                    }`}
                  >
                    {meta.badge}
                  </span>
                  {active && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-300">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>선택됨</span>
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-[13px] font-black break-keep leading-snug">
                  {meta.title}
                </div>
              </div>
              <div className="mt-1.5">
                <div
                  className={`text-sm sm:text-base font-black font-mono tabular-nums break-keep leading-snug ${
                    active ? 'text-white' : 'text-[#E60012] dark:text-[#FF5A65]'
                  }`}
                >
                  {meta.price}
                </div>
                <div
                  className={`text-[11px] font-semibold font-mono mt-0.5 tabular-nums break-keep ${
                    active ? 'text-slate-200' : 'text-[#8B95A1] dark:text-slate-400'
                  }`}
                >
                  {meta.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

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
  const [showCustomControls, setShowCustomControls] = useState<boolean>(false);
  const simulatorRef = useRef<HTMLElement | null>(null);
  const pendingSimAnchorTopRef = useRef<number | null>(null);

  // 공유 링크 최초 진입 시 무조건 최상단(0px)부터 시작
  useLayoutEffect(() => {
    scrollToTopInstant();
  }, [payload]);

  // 하단 시뮬레이터 버튼 조작 시 상단 제안서 높이 변동(STEP 3 노출/숨김 등)으로 화면이 튀지 않도록 동기 스크롤 앵커 보정
  useLayoutEffect(() => {
    const prevTop = pendingSimAnchorTopRef.current;
    if (prevTop === null) return;
    pendingSimAnchorTopRef.current = null;
    const simEl = simulatorRef.current;
    if (!simEl) return;
    const delta = simEl.getBoundingClientRect().top - prevTop;
    if (Math.abs(delta) >= 1) {
      try {
        window.scrollBy({ top: delta, left: 0, behavior: 'instant' as ScrollBehavior });
      } catch {
        window.scrollBy(0, delta);
      }
    }
  }, [simState]);

  const captureSimulatorAnchor = () => {
    if (simulatorRef.current) {
      pendingSimAnchorTopRef.current =
        simulatorRef.current.getBoundingClientRect().top;
    }
  };

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
  const subSurplus = getSubscriptionSurplusMeta(
    subSummary.finalMonthlyFee,
    subSummary.hiPlusPayoutMethod
  );

  const showGeneral =
    simState.quoteMode === 'general' || simState.quoteMode === 'hybrid';
  const showSub =
    simState.quoteMode === 'subscription' || simState.quoteMode === 'hybrid';
  const isHybrid = simState.quoteMode === 'hybrid';

  const payloadCompareModes = useMemo(
    () => getActiveCompareModes(payload.state),
    [payload.state]
  );

  const originPlanData = useMemo(() => {
    if (payloadCompareModes.length >= 2) {
      return resolveComparisonModePlanData(payload.state, simState.quoteMode);
    }
    if (activePlan === 2 && hasPlan2Data && payload.state.generalPlan2) {
      return payload.state.generalPlan2;
    }
    if (payload.state.generalPlan1) {
      return payload.state.generalPlan1;
    }
    return payload.state;
  }, [payloadCompareModes, payload.state, simState.quoteMode, activePlan, hasPlan2Data]);

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
  const canAddMoreLifecare = combinedLifecareAccounts < MAX_FREED_ACCOUNTS;

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
      if (delta > 0 && genTotal + subTotal >= MAX_FREED_ACCOUNTS) {
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
      if (delta > 0 && subTotal + genTotal >= MAX_FREED_ACCOUNTS) {
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

  const handleSelectPayoutMethod = (method: HiPlusPayoutMethod) => {
    setSimState((prev) => ({
      ...prev,
      hiPlusPayoutMethod: method,
    }));
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
        subLotteBilling5p:
          originPlanData.selectedCardId === cardId
            ? Boolean(originPlanData.subLotteBilling5p)
            : Boolean(prev.subLotteBilling5p),
      };
    });
  };

  const originCleanPlan = useMemo(
    () => extractGeneralPlanData(originPlanData),
    [originPlanData]
  );

  const hasAnyOriginCard = Boolean(
    (showSub && originSubAffiliateCard) ||
      (showGeneral && originGeneralAffiliateCard)
  );

  const isSameHiPlusAsOrigin =
    (simState.hiPlusCounts?.hi72 || 0) === (originCleanPlan.hiPlusCounts?.hi72 || 0) &&
    (simState.hiPlusCounts?.hi90 || 0) === (originCleanPlan.hiPlusCounts?.hi90 || 0) &&
    (simState.hiPlusCounts?.hi108 || 0) === (originCleanPlan.hiPlusCounts?.hi108 || 0);

  const isSameGenPreedAsOrigin =
    (simState.generalHiPreedCounts?.hf75 || 0) ===
      (originCleanPlan.generalHiPreedCounts?.hf75 || 0) &&
    (simState.generalHiPreedCounts?.hf150 || 0) ===
      (originCleanPlan.generalHiPreedCounts?.hf150 || 0) &&
    (simState.generalHiPreedCounts?.hf225 || 0) ===
      (originCleanPlan.generalHiPreedCounts?.hf225 || 0) &&
    (simState.generalHiPreedCounts?.hf300 || 0) ===
      (originCleanPlan.generalHiPreedCounts?.hf300 || 0);

  const isOriginPresetActive =
    !showCustomControls &&
    isSameHiPlusAsOrigin &&
    isSameGenPreedAsOrigin &&
    (!showSub ||
      (simState.selectedCardId === originCleanPlan.selectedCardId &&
        simState.selectedCardTierId === originCleanPlan.selectedCardTierId &&
        Boolean(simState.subLotteBilling5p) ===
          Boolean(originCleanPlan.subLotteBilling5p))) &&
    (!showGeneral || simState.generalCardType === originCleanPlan.generalCardType);

  const isNoCardPresetActive =
    !showCustomControls &&
    hasAnyOriginCard &&
    isSameHiPlusAsOrigin &&
    isSameGenPreedAsOrigin &&
    (!showSub || simState.selectedCardId === 'none') &&
    (!showGeneral ||
      simState.generalCardType === '미정' ||
      simState.generalCardType === '일반카드');

  const handleApplyOriginPlanPreset = () => {
    setShowCustomControls(false);
    setSimState((prev) => ({
      ...prev,
      ...extractGeneralPlanData(originPlanData),
    }));
  };

  const handleApplyNoCardPreset = () => {
    setShowCustomControls(false);
    const base = extractGeneralPlanData(originPlanData);
    setSimState((prev) => ({
      ...prev,
      ...base,
      ...(showSub
        ? {
            selectedCardId: 'none' as AffiliateCardId,
            selectedCardTierId: '',
            subAutoTierCashback: true,
          }
        : {}),
      ...(showGeneral ? { generalCardType: '미정' } : {}),
    }));
  };

  const handleSetHiPlusCounts = (nextCounts: HiPlusCounts) => {
    setSimState((prev) => ({
      ...prev,
      hiPlusCounts: { ...nextCounts },
    }));
  };

  const maxSubAccountsAvailable =
    isHybrid && !simState.hideHiPreed
      ? Math.max(0, MAX_FREED_ACCOUNTS - generalHiPreed.totalAccounts)
      : MAX_FREED_ACCOUNTS;

  const autoSpendHiPlusPreset = useMemo(() => {
    if (!originSubAffiliateCard) return null;
    const activeTier =
      subSummary.currentCard &&
      subSummary.currentCard.id === originSubAffiliateCard.id &&
      subSummary.currentCardTier
        ? subSummary.currentCardTier
        : originSubAffiliateCard.tiers.find(
            (t) => t.id === originCleanPlan.selectedCardTierId
          ) || originSubAffiliateCard.tiers[0];
    if (!activeTier || !simState.countPreedTowardCardSpend) return null;
    if (simState.hiPlusPayoutMethod === 'bank_bank') return null;
    return recommendCardSpendHiPlusCounts(
      activeTier.minSpendAmount,
      maxSubAccountsAvailable
    );
  }, [
    originSubAffiliateCard,
    subSummary.currentCard,
    subSummary.currentCardTier,
    originCleanPlan.selectedCardTierId,
    simState.countPreedTowardCardSpend,
    simState.hiPlusPayoutMethod,
    maxSubAccountsAvailable,
  ]);

  const hasEverSubPreedInPlan =
    !simState.hideSubPreed &&
    (hiPlusSummary.totalAccounts > 0 ||
      (originCleanPlan.hiPlusCounts.hi72 || 0) +
        (originCleanPlan.hiPlusCounts.hi90 || 0) +
        (originCleanPlan.hiPlusCounts.hi108 || 0) >
        0);

  const hasEverGenPreedInPlan =
    !simState.hideHiPreed &&
    (generalHiPreed.totalAccounts > 0 ||
      (originCleanPlan.generalHiPreedCounts.hf75 || 0) +
        (originCleanPlan.generalHiPreedCounts.hf150 || 0) +
        (originCleanPlan.generalHiPreedCounts.hf225 || 0) +
        (originCleanPlan.generalHiPreedCounts.hf300 || 0) >
        0);

  const displayRoleTitle = normalizeConsultantRoleTitle(
    payload.consultant.roleTitle
  );

  const activeCompareModes = getActiveCompareModes(simState);
  const activeModeIdx = activeCompareModes.indexOf(simState.quoteMode);
  const effectivePlanNum =
    activeCompareModes.length >= 2
      ? activeModeIdx >= 0
        ? activeModeIdx + 1
        : 1
      : activePlan;
  const effectiveHasMultiplePlans =
    activeCompareModes.length >= 2 ? true : hasBothPlans;

  const cleanPhone = (payload.consultant.phone || '').replace(/[^0-9]/g, '');
  const smsBody = encodeURIComponent(
    `[${payload.consultant.storeName}] 안녕하세요 ${payload.consultant.name}님! 보내주신 맞춤 비교 견적서(${
      effectiveHasMultiplePlans ? `${effectivePlanNum}안` : '확인완료'
    }) 보고 연락드립니다.`
  );

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
      ? `맞춤 가전 구독 제안서 (${subSummary.periodLabel})`
      : validSubNames.length === 1
      ? `${validSubNames[0]} 구독 제안서 (${subSummary.periodLabel})`
      : `${validSubNames[0]} 외 ${validSubNames.length - 1}건 구독 제안서 (${subSummary.periodLabel})`;

  const step1DiscountDetails: string[] = [];
  const step2CashbackDetails: string[] = [];
  const step2ExtraDetails: string[] = [];

  const currentCard = subSummary.currentCard;
  const currentCardTier = subSummary.currentCardTier;
  const subCardBenefitLabel =
    currentCard?.benefitType === '캐시백' ||
    currentCard?.id === 'lotte' ||
    currentCard?.id === 'shinhan'
      ? '캐시백'
      : '청구할인';

  const subCashbackDetailParts: string[] = [];
  const subFormulaParts = ['월 구독료'];
  if (subSummary.cardDiscount > 0) {
    subFormulaParts.push(`제휴카드${subCardBenefitLabel}`);
  }
  if (!simState.hideSubPreed && subSummary.hiPlusMonthly > 0) {
    subFormulaParts.push('구독프리드');
  }
  const subFormulaText = subFormulaParts.join(' − ');

  const hybridTotalDiscountAndSupport =
    generalSummary.totalDiscountAndBenefit + subSummary.totalSubBenefit;
  const hybridCombinedNetTotal = generalSummary.rawNet + subSummary.finalTotalFee;

  const hasGeneralSim =
    showGeneral && (Boolean(originGeneralAffiliateCard) || !simState.hideHiPreed);
  const hasSubSim =
    showSub && (Boolean(originSubAffiliateCard) || !simState.hideSubPreed);
  const showSimulatorSection = hasGeneralSim || hasSubSim;

  const plan1ComparePrice =
    simState.quoteMode === 'subscription'
      ? plan1SubSummary.finalMonthlyFee
      : simState.quoteMode === 'hybrid'
      ? plan1Summary.rawNet + plan1SubSummary.finalTotalFee
      : plan1Summary.rawNet;
  const plan2ComparePrice =
    simState.quoteMode === 'subscription'
      ? plan2SubSummary.finalMonthlyFee
      : simState.quoteMode === 'hybrid'
      ? plan2Summary.rawNet + plan2SubSummary.finalTotalFee
      : plan2Summary.rawNet;
  const planDiffAmount = Math.abs(plan1ComparePrice - plan2ComparePrice);
  const planTotalSubDiff = Math.abs(plan1SubSummary.finalTotalFee - plan2SubSummary.finalTotalFee);
  const cheaperPlanNum =
    plan1ComparePrice < plan2ComparePrice
      ? 1
      : plan2ComparePrice < plan1ComparePrice
      ? 2
      : 0;

  const containerMaxW = 'max-w-2xl min-[700px]:max-w-3xl lg:max-w-4xl';

  return (
    <div className="min-h-[100dvh] bg-[#F2F4F6] dark:bg-[#0B1120] text-[#191F28] dark:text-slate-100 pb-36 min-[480px]:pb-28">
      {/* 공식 롯데하이마트 플래그십 헤더 — 모바일 390px 첫 화면 압축 */}
      <header className="safe-top-header no-print sticky top-0 z-30 bg-white/95 dark:bg-[#131C2E]/95 backdrop-blur-md border-b border-[#E5E8EB] dark:border-slate-800 border-t-[3px] border-t-[#E60012] px-3 sm:px-5 py-1.5 sm:py-2 shadow-[0_1px_6px_rgba(25,31,40,0.03)]">
        <div className={`${containerMaxW} mx-auto flex items-center justify-between gap-2`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider shrink-0">
                LOTTE HIMART
              </span>
              <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300 truncate">
                {payload.consultant.storeName}
              </span>
            </div>
            <h1 className="text-[13px] sm:text-base font-black text-[#191F28] dark:text-white break-keep leading-tight mt-0.5 truncate">
              {payload.customerName
                ? `${payload.customerName} 고객님 맞춤 견적서`
                : '고객님 전용 맞춤 가전 견적서'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isModifiedFromOriginal ? (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E60012] hover:bg-[#C8000F] text-white text-[11.5px] font-extrabold cursor-pointer schedule-tactile whitespace-nowrap shadow-xs"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>원래 제안 복귀</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold border border-[#BFDBFE] dark:border-blue-800 whitespace-nowrap">
                <UserCheck className="w-3 h-3 text-[#1B64DA] dark:text-blue-400 shrink-0" />
                <span>공식 안심 뷰어</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className={`${containerMaxW} mx-auto px-2.5 sm:px-5 pt-2 sm:pt-3 space-y-2.5 sm:space-y-3.5`}>
        {/* 담당 컨설턴트 컨시어지 바 + 시뮬레이터 바로가기 (컴팩트 압축) */}
        <div className="no-print rounded-xl sm:rounded-2xl bg-white dark:bg-[#131C2E] border border-[#E5E8EB] dark:border-slate-700/80 shadow-[0_1px_6px_rgba(25,31,40,0.03)] px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#191F28] dark:bg-slate-800 text-white font-black text-xs flex items-center justify-center shrink-0">
              {payload.consultant.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap leading-tight">
                <span className="text-xs sm:text-[13px] font-black text-[#191F28] dark:text-white">
                  {payload.consultant.name}
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400 truncate">
                  · {displayRoleTitle} · {payload.createdAt}
                </span>
              </div>
              {payload.consultant.greeting && (
                <p className="text-[11px] sm:text-xs text-[#4E5968] dark:text-slate-300 font-medium mt-0.5 line-clamp-1 sm:line-clamp-2 break-keep leading-snug">
                  "{payload.consultant.greeting}"
                </p>
              )}
            </div>
          </div>

          {showSimulatorSection && (
            <button
              type="button"
              onClick={() => {
                simulatorRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 hover:bg-[#DBEAFE] border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#1B64DA] dark:text-blue-400" />
              <span>조건 비교</span>
              <ArrowDown className="w-3 h-3 text-[#1B64DA] dark:text-blue-400" />
            </button>
          )}
        </div>

        {/* 복수 구매방식 비교 탭 */}
        {activeCompareModes.length >= 2 && (
          <MultiModeTabSwitcherBanner
            state={simState}
            onSelectMode={(selectedMode) =>
              setSimState((prev) => switchQuoteModeInState(prev, selectedMode))
            }
          />
        )}

        {/* 1안 vs 2안 실시간 비교 스위치 */}
        {activeCompareModes.length < 2 && hasBothPlans && (
          <div className="no-print rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 p-3 sm:p-4 space-y-2 shadow-[0_2px_10px_rgba(25,31,40,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Layers className="w-4 h-4 text-[#1B64DA] dark:text-blue-400 shrink-0" />
                <span>맞춤 설계 1안 ↔ 2안 비교</span>
              </span>
              {cheaperPlanNum > 0 && (planDiffAmount > 0 || planTotalSubDiff > 0) ? (
                <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold font-mono tabular-nums break-keep">
                  {simState.quoteMode === 'subscription'
                    ? `${cheaperPlanNum}안 선택 시 월 ${planDiffAmount.toLocaleString()}원 · ${subSummary.periodLabel} 총 ${planTotalSubDiff.toLocaleString()}원 절감`
                    : `${cheaperPlanNum}안 선택 시 ${planDiffAmount.toLocaleString()}원 추가 절감`}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400 whitespace-nowrap">
                  탭하여 체감가 즉시 비교
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
              {[1, 2].map((pNum) => {
                const isSelected = activePlan === pNum;
                const gSum = pNum === 1 ? plan1Summary : plan2Summary;
                const sSum = pNum === 1 ? plan1SubSummary : plan2SubSummary;
                const sSurplus = getSubscriptionSurplusMeta(
                  sSum.finalMonthlyFee,
                  sSum.hiPlusPayoutMethod
                );
                const monthlyText = sSurplus.isSurplusZone
                  ? sSurplus.monthlySurplus > 0
                    ? `월 0원 (${sSurplus.surplusStickyText})`
                    : '월 0원'
                  : `월 ${sSum.finalMonthlyFee.toLocaleString()}원`;
                const mainPrice =
                  simState.quoteMode === 'subscription'
                    ? monthlyText
                    : simState.quoteMode === 'hybrid'
                    ? `일시불 ${gSum.rawNet.toLocaleString()}원 + ${monthlyText}`
                    : `${gSum.rawNet.toLocaleString()}원`;
                const subPrice =
                  simState.quoteMode === 'subscription'
                    ? sSurplus.isSurplusZone || sSum.finalTotalFee <= 0
                      ? sSurplus.monthlySurplus > 0
                        ? `총 +${(
                            sSurplus.monthlySurplus * sSum.representativePeriod
                          ).toLocaleString()}원 초과 혜택`
                        : '총 체감 0원'
                      : `총 체감 ${sSum.finalTotalFee.toLocaleString()}원`
                    : simState.quoteMode === 'hybrid'
                    ? `통합 체감 ${(gSum.rawNet + sSum.finalTotalFee).toLocaleString()}원 (실결제 ${gSum.payPrice.toLocaleString()}원)`
                    : `실결제 ${gSum.payPrice.toLocaleString()}원`;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() =>
                      setSimState((prev) =>
                        switchGeneralPlanInState(prev, pNum as 1 | 2)
                      )
                    }
                    className={`p-2.5 sm:p-3 rounded-xl text-left border-2 transition cursor-pointer schedule-tactile min-w-0 ${
                      isSelected
                        ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500 shadow-xs'
                        : 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#191F28] dark:text-slate-100 border-[#E5E8EB] dark:border-slate-700 hover:border-[#1B64DA]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-extrabold ${
                          isSelected
                            ? 'bg-[#1B64DA] dark:bg-slate-900/40 text-white'
                            : 'bg-white dark:bg-slate-900 border border-[#E5E8EB] dark:border-slate-700 text-[#4E5968] dark:text-slate-300'
                        }`}
                      >
                        견적 {pNum}안
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-emerald-300">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>선택됨</span>
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm sm:text-base font-black font-mono tabular-nums break-keep leading-snug mt-1 ${
                        isSelected ? 'text-white' : 'text-[#E60012] dark:text-[#FF5A65]'
                      }`}
                    >
                      {mainPrice}
                    </div>
                    <div
                      className={`text-[11px] font-semibold font-mono tabular-nums break-keep mt-0.5 ${
                        isSelected ? 'text-slate-200' : 'text-[#8B95A1] dark:text-slate-400'
                      }`}
                    >
                      {subPrice}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 메인 고객 스토리 제안서 시트 */}
        <CustomerProposalSheet
          activePlan={effectivePlanNum}
          currentCard={currentCard}
          currentCardTier={currentCardTier}
          generalHeaderTitle={generalHeaderTitle}
          generalHiPreed={generalHiPreed}
          generalSummary={generalSummary}
          hasBothPlans={effectiveHasMultiplePlans}
          hideInlineSafetyBox={simState.quoteMode !== 'general'}
          hiPlusSummary={hiPlusSummary}
          hybridCombinedNetTotal={hybridCombinedNetTotal}
          hybridTotalDiscountAndSupport={hybridTotalDiscountAndSupport}
          onSelectPayoutMethod={handleSelectPayoutMethod}
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

        {/* [블록 4] 원클릭 조건 비교 시뮬레이터 */}
        {showSimulatorSection && (
          <section
            id="benefit-simulator"
            ref={simulatorRef}
            onClickCapture={captureSimulatorAnchor}
            className="no-print scroll-mt-16 rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 p-3.5 sm:p-5 space-y-3.5 shadow-[0_2px_10px_rgba(25,31,40,0.03)]"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2.5">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#1B64DA] dark:text-blue-400 shrink-0" />
                  <span>
                    {showSub ? '원클릭 조건 비교 · 구좌 조절' : '조건 직접 비교 시뮬레이터'}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400 mt-0.5 break-keep">
                  {showSub
                    ? '아래 모드를 터치하면 위 영수증 금액이 즉시 비교됩니다'
                    : '제휴카드·라이프케어 구좌를 조절하면 위 제안서와 하단 체감가가 실시간 반영됩니다'}
                </p>
              </div>
              {isModifiedFromOriginal && (
                <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1B64DA] dark:text-blue-300 border border-[#BFDBFE] dark:border-blue-800 text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  시뮬레이션 중
                </span>
              )}
            </div>

            {/* 구독·통합 모드 원클릭 모드 칩 */}
            {showSub && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleApplyOriginPlanPreset}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition cursor-pointer schedule-tactile ${
                    isOriginPresetActive
                      ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500 shadow-2xs'
                      : 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#4E5968] dark:text-slate-300 border-[#D1D6DB] dark:border-slate-700 hover:border-[#1B64DA]/50'
                  }`}
                >
                  {isOriginPresetActive && (
                    <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 stroke-[3]" />
                  )}
                  <span>상담사 추천안(원본)</span>
                </button>

                {hasAnyOriginCard && (
                  <button
                    type="button"
                    onClick={handleApplyNoCardPreset}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition cursor-pointer schedule-tactile ${
                      isNoCardPresetActive
                        ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500 shadow-2xs'
                        : 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#4E5968] dark:text-slate-300 border-[#D1D6DB] dark:border-slate-700 hover:border-[#1B64DA]/50'
                    }`}
                  >
                    {isNoCardPresetActive && (
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 stroke-[3]" />
                    )}
                    <span>제휴카드 미적용 시</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowCustomControls((v) => !v)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition cursor-pointer schedule-tactile ${
                    showCustomControls || (!isOriginPresetActive && !isNoCardPresetActive)
                      ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1B64DA] dark:text-blue-300 border-[#1B64DA] dark:border-blue-500'
                      : 'bg-[#F8FAFC] dark:bg-slate-800/70 text-[#4E5968] dark:text-slate-300 border-[#D1D6DB] dark:border-slate-700 hover:border-[#1B64DA]/50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>구좌 직접 조절</span>
                  {showCustomControls ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              </div>
            )}

            {(!showSub ||
              showCustomControls ||
              (!isOriginPresetActive && !isNoCardPresetActive)) && (
              <div
                className={
                  hasGeneralSim && hasSubSim
                    ? 'grid grid-cols-1 min-[880px]:grid-cols-2 gap-3.5'
                    : 'space-y-3.5'
                }
              >
                {hasGeneralSim && (
                  <div className="space-y-3">
                    {originGeneralAffiliateCard && (
                      <div className="rounded-xl border border-[#E5E8EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-[#1B64DA] dark:text-blue-400" />
                            <span>일반구매 제휴카드 적용 ON/OFF</span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400">
                            터치 시 전환
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
                          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1.5 cursor-pointer transition ${
                            simState.generalCardType === originGeneralAffiliateCard
                              ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500'
                              : 'bg-white dark:bg-slate-900 text-[#4E5968] dark:text-slate-300 border-[#D1D6DB] dark:border-slate-700'
                          }`}
                        >
                          {simState.generalCardType === originGeneralAffiliateCard && (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>{originGeneralAffiliateCard}</span>
                        </button>
                      </div>
                    )}

                    {!simState.hideHiPreed && (
                      <div className="rounded-xl border border-[#E5E8EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#1B64DA] dark:text-blue-400" />
                              <span>하이프리드 결합 구좌 조절</span>
                            </div>
                            <p className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400 mt-0.5">
                              합산 최대 {MAX_FREED_ACCOUNTS}구좌까지 선택하여 선지원금을 비교해 보세요
                            </p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#D1D6DB] dark:border-slate-700 text-[11.5px] font-black text-[#191F28] dark:text-slate-100 font-mono tabular-nums whitespace-nowrap">
                            {isHybrid && !simState.hideSubPreed
                              ? `합산 ${combinedLifecareAccounts}/${MAX_FREED_ACCOUNTS}`
                              : `${generalHiPreed.totalAccounts}/${MAX_FREED_ACCOUNTS}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                          {GENERAL_HIPREED_PLANS.map((plan) => {
                            const cnt = simState.generalHiPreedCounts[plan.id] || 0;
                            return (
                              <div
                                key={plan.id}
                                className={`rounded-lg border p-2.5 flex items-center justify-between gap-2 ${
                                  cnt > 0
                                    ? 'bg-white dark:bg-slate-900 border-[#1B64DA] dark:border-blue-500 shadow-2xs'
                                    : 'bg-white/80 dark:bg-slate-900/60 border-[#E5E8EB] dark:border-slate-700'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-[#191F28] dark:text-slate-100">
                                    {plan.name}
                                  </div>
                                  <div className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                                    -{(plan.supportAmount / 10000).toLocaleString()}만원 지원
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={cnt === 0}
                                    onClick={() => handleAdjustHiPreed(plan.id, -1)}
                                    aria-label={`${plan.name} 구좌 감소`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#F2F4F6] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                  >
                                    −
                                  </button>
                                  <span className="text-xs font-black font-mono tabular-nums w-5 text-center">
                                    {cnt}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canAddMoreLifecare}
                                    onClick={() => handleAdjustHiPreed(plan.id, 1)}
                                    aria-label={`${plan.name} 구좌 추가`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#191F28] dark:bg-blue-600 text-white font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {!showSub && generalHiPreed.totalAccounts > 0 && (
                          <p className="text-[11px] font-semibold text-[#4E5968] dark:text-slate-300 leading-relaxed break-keep">
                            만기(150회[150개월] 납입 완료 · 거치 없음) 시 납입 원금{' '}
                            <strong className="text-emerald-700 dark:text-emerald-400 font-black font-mono tabular-nums whitespace-nowrap">
                              {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급
                            </strong>{' '}
                            (미이용 시 · 월 납입금{' '}
                            <span className="font-mono tabular-nums whitespace-nowrap">
                              {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원
                            </span>
                            )
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {hasSubSim && (
                  <div className="space-y-3">
                    {originSubAffiliateCard && (
                      <div className="rounded-xl border border-[#E5E8EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-[#1B64DA] dark:text-blue-400" />
                            <span>구독 제휴카드 · 전월 실적 구간</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSelectedSubCard(originSubAffiliateCard.id)
                          }
                          className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1.5 cursor-pointer transition ${
                            simState.selectedCardId === originSubAffiliateCard.id
                              ? 'bg-[#191F28] dark:bg-blue-600 text-white border-[#191F28] dark:border-blue-500'
                              : 'bg-white dark:bg-slate-900 text-[#4E5968] dark:text-slate-300 border-[#D1D6DB] dark:border-slate-700'
                          }`}
                        >
                          {simState.selectedCardId === originSubAffiliateCard.id && (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>{originSubAffiliateCard.name}</span>
                        </button>

                        {currentCard && currentCard.id === originSubAffiliateCard.id && (
                          <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-1.5">
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
                                  className={`px-2.5 py-2 rounded-lg border flex min-[390px]:block items-center justify-between text-center cursor-pointer transition ${
                                    active
                                      ? 'bg-white dark:bg-slate-900 border-2 border-[#1B64DA] dark:border-blue-500 shadow-2xs'
                                      : 'bg-white/75 dark:bg-slate-900/60 border-[#E5E8EB] dark:border-slate-700'
                                  }`}
                                >
                                  <div className="text-[11px] font-bold text-[#4E5968] dark:text-slate-300">
                                    {tier.minSpendShort} 이상
                                  </div>
                                  <div className="text-xs font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
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
                      <div className="rounded-xl border border-[#E5E8EB] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/60 p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#1B64DA] dark:text-blue-400" />
                              <span>Hi구독 플러스 구좌 조절</span>
                            </div>
                            <p className="text-[11px] font-medium text-[#8B95A1] dark:text-slate-400 mt-0.5">
                              최대 {MAX_FREED_ACCOUNTS}구좌 범위에서 월 현금지원 규모를 조절합니다
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11.5px] font-black font-mono tabular-nums whitespace-nowrap ${
                              !canAddMoreLifecare
                                ? 'bg-[#FFF1F2] dark:bg-rose-950/60 border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300'
                                : 'bg-white dark:bg-slate-900 border-[#D1D6DB] dark:border-slate-700 text-[#191F28] dark:text-slate-100'
                            }`}
                          >
                            {isHybrid && !simState.hideHiPreed
                              ? `합산 ${combinedLifecareAccounts}/${MAX_FREED_ACCOUNTS}`
                              : `${hiPlusSummary.totalAccounts}/${MAX_FREED_ACCOUNTS}`}
                          </span>
                        </div>

                        {/* 원클릭 구좌 프리셋 칩 */}
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetHiPlusCounts({ hi72: 0, hi90: 0, hi108: 0 })
                            }
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#D1D6DB] dark:border-slate-700 text-[11px] font-bold text-[#4E5968] dark:text-slate-300 cursor-pointer"
                          >
                            초기화(0구좌)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetHiPlusCounts(originCleanPlan.hiPlusCounts)
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 cursor-pointer"
                          >
                            추천 구좌 복원
                          </button>
                          {autoSpendHiPlusPreset && originSubAffiliateCard && (
                            <button
                              type="button"
                              onClick={() => {
                                setSimState((prev) => {
                                  const preferredTier =
                                    prev.selectedCardId === originSubAffiliateCard.id &&
                                    prev.selectedCardTierId
                                      ? prev.selectedCardTierId
                                      : originCleanPlan.selectedCardTierId ||
                                        originSubAffiliateCard.tiers[0]?.id ||
                                        '';
                                  return {
                                    ...prev,
                                    selectedCardId: originSubAffiliateCard.id,
                                    selectedCardTierId: preferredTier,
                                    hiPlusCounts: { ...autoSpendHiPlusPreset },
                                  };
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                            >
                              카드실적 자동충족
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
                          {HI_PLUS_PLANS.map((plan) => {
                            const cnt = simState.hiPlusCounts[plan.id] || 0;
                            const unitSupport = getHiPlusUnitMonthlySupport(
                              plan,
                              subSummary.representativePeriod
                            );
                            return (
                              <div
                                key={plan.id}
                                className={`rounded-lg border p-2.5 flex flex-row min-[420px]:flex-col items-center min-[420px]:items-stretch justify-between gap-2 ${
                                  cnt > 0
                                    ? 'bg-white dark:bg-slate-900 border-[#1B64DA] dark:border-blue-500 shadow-2xs'
                                    : 'bg-white/80 dark:bg-slate-900/60 border-[#E5E8EB] dark:border-slate-700'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-[#191F28] dark:text-slate-100 leading-snug">
                                    {plan.buttonLabel}
                                  </div>
                                  <div className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap mt-0.5">
                                    월 -{(unitSupport / 1000).toLocaleString()}천원
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={cnt === 0}
                                    onClick={() => handleAdjustHiPlus(plan.id, -1)}
                                    aria-label={`${plan.buttonLabel} 구좌 감소`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#F2F4F6] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                  >
                                    −
                                  </button>
                                  <span className="text-xs font-black font-mono tabular-nums min-w-[1.25rem] text-center">
                                    {cnt}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!canAddMoreLifecare}
                                    onClick={() => handleAdjustHiPlus(plan.id, 1)}
                                    aria-label={`${plan.buttonLabel} 구좌 추가`}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#191F28] dark:bg-blue-600 text-white font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* [블록 4] 단일 통합 유의사항 아코디언 (구독/통합 모드 시 법적 고지 100% 무중복 일원화) */}
        {showSub ? (
          <UnifiedComplianceAccordion
            open={showCompliance}
            onToggle={() => setShowCompliance((v) => !v)}
            hasHiPlus={hasEverSubPreedInPlan}
            hasGeneralHiPreed={isHybrid && hasEverGenPreedInPlan}
            chevronUpIcon={<ChevronUp className="w-4 h-4 shrink-0" />}
            chevronDownIcon={<ChevronDown className="w-4 h-4 shrink-0" />}
          />
        ) : (
          <div className="no-print rounded-2xl bg-white dark:bg-[#131C2E] border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCompliance((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-[#4E5968] dark:text-slate-300 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#8B95A1] dark:text-slate-400 shrink-0" />
                <span>제휴카드 · 결합상품 유의사항 안내</span>
              </span>
              {showCompliance ? (
                <ChevronUp className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
            </button>
            {showCompliance && (
              <div className="px-4 pb-3.5 text-xs text-[#8B95A1] dark:text-slate-400 space-y-1.5 leading-relaxed break-keep border-t border-[#E5E8EB] dark:border-slate-700/80 pt-3">
                <p>
                  • 본 제안서의 캐시백 및 제휴카드 월 캐시백/청구할인은 카드사 전월 실적 조건 충족 및 당월 행사 기준이며 결제일에 따라 일부 변동될 수 있습니다.
                </p>
                {!simState.hideHiPreed && (
                  <p>
                    • 하이프리드(거치기간 없이 150회[150개월] 납입 완료 시 만기)는 예·적금·보험 등 금융상품이 아닌 웅진프리드라이프의 선불식 할부거래 별도 계약 상품입니다. 상조·전환 서비스 미이용 및 만기 유지 시 납입 원금 100% 전액 환급이 적용되며, 중도 해지·3회 이상 연체 시 가전 지원금 지급 중단·환수가 발생하고 해약환급금은 공정거래위원회 고시에 따라 납입 원금보다 적거나 없을 수 있습니다. 계약서 수령일로부터 14일 이내 청약철회(할부거래법 제24조)가 가능하며, 할부거래법 제27조에 의거해 고객 납입금의 50%를 제1금융권 지급보증·예치 계약으로 안전하게 보전합니다.
                  </p>
                )}
                <p>
                  • 재고 확인 및 배송일 지정은 아래 담당 컨설턴트에게 문의해 주시면 신속히 안내해 드립니다.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 고정 컨시어지 액션 독 */}
      <div className="safe-bottom-dock no-print fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#131C2E]/95 backdrop-blur-md border-t border-[#D1D6DB] dark:border-slate-700/80 px-3.5 sm:px-5 pt-2 shadow-[0_-4px_16px_rgba(25,31,40,0.06)]">
        <div
          className={`${containerMaxW} mx-auto flex flex-col min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between gap-2 min-[480px]:gap-3`}
        >
          <div className="flex flex-wrap items-baseline justify-between min-[480px]:block gap-x-2 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#8B95A1] dark:text-slate-400">
              <span>
                {payload.consultant.storeName} · {payload.consultant.name}
              </span>
              {isModifiedFromOriginal && (
                <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 text-[#1B64DA] dark:text-blue-300 text-[10.5px] font-black">
                  시뮬레이션 중
                </span>
              )}
            </div>
            <div className="text-sm sm:text-lg font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums break-keep ml-auto min-[480px]:ml-0 leading-snug flex flex-wrap items-center gap-1">
              {simState.quoteMode === 'subscription' ? (
                subSurplus.isSurplusZone ? (
                  <>
                    <span className="whitespace-nowrap">월 0원</span>
                    {subSurplus.monthlySurplus > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10.5px] font-extrabold whitespace-nowrap">
                        {subSurplus.surplusStickyText}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="whitespace-nowrap">
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </span>
                    <span className="text-[11px] text-[#4E5968] dark:text-slate-300 font-bold whitespace-nowrap">
                      (총 {Math.max(0, subSummary.finalTotalFee).toLocaleString()}원)
                    </span>
                  </>
                )
              ) : simState.quoteMode === 'hybrid' ? (
                <>
                  <span className="whitespace-nowrap">
                    일시불 <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                  </span>
                  <span className="text-[#4E5968] dark:text-slate-400">+</span>
                  {subSurplus.isSurplusZone ? (
                    <>
                      <span className="text-[#1B64DA] dark:text-blue-400 whitespace-nowrap">
                        월 0원
                      </span>
                      {subSurplus.monthlySurplus > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10.5px] font-extrabold whitespace-nowrap">
                          {subSurplus.surplusStickyText}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[#1B64DA] dark:text-blue-400 whitespace-nowrap">
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </span>
                  )}
                  <span className="text-[11px] text-[#4E5968] dark:text-slate-300 font-bold whitespace-nowrap">
                    (통합 {hybridCombinedNetTotal.toLocaleString()}원)
                  </span>
                </>
              ) : (
                <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full min-[480px]:w-auto shrink-0">
            <a
              href="https://map.naver.com/p/search/%EB%A1%AF%EB%8D%B0%ED%95%98%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EA%B2%BD%EA%B8%B0%EA%B4%91%EC%A3%BC%EC%A0%90"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] min-w-[42px] p-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#F2F4F6] text-[#191F28] dark:text-slate-200 border border-[#D1D6DB] dark:border-slate-700 inline-flex items-center justify-center shrink-0"
              title="매장 위치 지도 보기"
            >
              <MapPin className="w-4 h-4 text-[#4E5968] dark:text-slate-300" />
            </a>

            {cleanPhone && (
              <a
                href={`sms:${cleanPhone}${
                  typeof navigator !== 'undefined' &&
                  /iPad|iPhone|iPod/i.test(navigator.userAgent)
                    ? '&'
                    : '?'
                }body=${smsBody}`}
                className="min-h-[42px] flex-1 min-[480px]:flex-initial px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#F2F4F6] text-[#191F28] dark:text-slate-100 border border-[#D1D6DB] dark:border-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 schedule-tactile whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
                <span>문자 문의</span>
              </a>
            )}

            {cleanPhone ? (
              <a
                href={`tel:${cleanPhone}`}
                className="min-h-[42px] flex-[1.25] min-[480px]:flex-initial px-3.5 sm:px-4 py-2 rounded-xl bg-[#E60012] hover:bg-[#C8000F] text-white text-xs sm:text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-xs schedule-tactile whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                <span>담당자 바로 통화</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await safeCopyText(window.location.href);
                }}
                className="min-h-[42px] flex-1 min-[480px]:flex-initial px-3.5 py-2 rounded-xl bg-[#E60012] hover:bg-[#C8000F] text-white text-xs font-black inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-white shrink-0" />
                <span>이 혜택 조건 보관</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
      <div className="min-h-[100dvh] bg-[#F2F4F6] dark:bg-[#0B1120] text-[#191F28] dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-11 h-11 rounded-xl bg-[#E60012] text-white flex items-center justify-center mb-3">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="text-sm sm:text-base font-black">맞춤 견적서를 불러오는 중입니다...</div>
        <p className="text-xs text-[#8B95A1] dark:text-slate-400 font-medium mt-1">
          롯데하이마트 경기광주점 공식 뷰어
        </p>
      </div>
    );
  }

  if (!payload || status === 'empty') {
    return (
      <div className="min-h-[100dvh] bg-[#F2F4F6] dark:bg-[#0B1120] text-[#191F28] dark:text-slate-100 flex flex-col items-center justify-center p-5 select-none">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 border-t-[4px] border-t-[#E60012] p-6 text-center shadow-[0_4px_20px_rgba(25,31,40,0.06)] space-y-4">
          <div className="w-11 h-11 mx-auto rounded-xl bg-[#191F28] dark:bg-slate-800 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#60A5FA]" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#E60012] text-white text-[11.5px] font-black tracking-wider">
                LOTTE HIMART
              </span>
              <span className="text-xs font-extrabold text-[#4E5968] dark:text-slate-300">경기광주점</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight dark:text-white">
              고객 전용 맞춤 견적 뷰어
            </h1>
            <p className="text-xs sm:text-sm text-[#4E5968] dark:text-slate-300 leading-relaxed font-medium break-keep">
              문자(SMS) 또는 카카오톡으로 전달받으신 <strong>전용 견적 링크</strong>를 눌러 접속해 주세요.
            </p>
          </div>
          <a
            href="https://map.naver.com/p/search/%EB%A1%AF%EB%8D%B0%ED%95%98%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EA%B2%BD%EA%B8%B0%EA%B4%91%EC%A3%BC%EC%A0%90"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] w-full py-3 px-4 rounded-xl bg-[#191F28] dark:bg-blue-600 hover:bg-[#262F3D] text-white text-xs sm:text-sm font-black inline-flex items-center justify-center gap-1.5 transition"
          >
            <MapPin className="w-4 h-4 text-[#FF6B78] dark:text-white shrink-0" />
            <span>롯데하이마트 경기광주점 위치 안내</span>
          </a>
        </div>
      </div>
    );
  }

  return <CustomerShareQuoteView payload={payload} />;
};

export default CustomerViewerRoot;
