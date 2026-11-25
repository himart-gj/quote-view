export type QuoteMode = 'general' | 'subscription' | 'hybrid';
export type AppStep = 'home' | 'input' | 'proposal' | 'pop-printer' | 'crm' | 'himobile' | 'insurance' | 'care-table' | 'lotte-plan' | 'allcare-guide' | 'marketing-db';
export type SubscriptionPeriod = 36 | 48 | 60;

export function normalizeSubscriptionPeriod(
  raw: unknown,
  fallback: SubscriptionPeriod = 60
): SubscriptionPeriod {
  const num = Number(raw);
  if (num === 36 || num === 60) return num;
  return fallback === 36 || fallback === 60 ? fallback : 60;
}

// ==================== 일반구매(일시불) 타입 ====================
export interface GeneralPurchaseItem {
  id: string;
  category: string;
  modelName: string;
  quantity: number;
  unitPrice: number; // 단가(행사가)
  name?: string;
  code?: string;
  qty?: number;
  price?: number;
  discount1?: number; // 기타할인1 (즉시할인 합계)
  discount2?: number; // 기타할인2 (L.Point 합계)
  cashback?: number; // 캐시백 (금액대 캐시백)
}

export type GeneralExtraBenefitType = 'discount' | 'etc';

export interface GeneralExtraBenefitItem {
  id: string;
  type: GeneralExtraBenefitType; // 'discount' = 즉시할인성 추가혜택, 'etc' = 캐시백/사은품 등 실결제 이후 추가혜택
  description: string;
  amount: number;
}

export type GeneralCardType =
  | '롯데 제휴카드'
  | '삼성 제휴카드'
  | '신한 제휴카드'
  | '우리 제휴카드'
  | '일반카드'
  | '미정';

export const GENERAL_CARD_OPTIONS: GeneralCardType[] = [
  '롯데 제휴카드',
  '삼성 제휴카드',
  '신한 제휴카드',
  '우리 제휴카드',
  '일반카드',
  '미정',
];

export const AFFILIATE_GENERAL_CARD_OPTIONS: GeneralCardType[] = [
  '롯데 제휴카드',
  '삼성 제휴카드',
  '신한 제휴카드',
  '우리 제휴카드',
];

export function isAffiliateGeneralCardType(
  card?: string | null
): card is GeneralCardType {
  return (
    card === '롯데 제휴카드' ||
    card === '삼성 제휴카드' ||
    card === '신한 제휴카드' ||
    card === '우리 제휴카드'
  );
}

export const GENERAL_CATEGORY_PRESETS = [
  '냉장고',
  '김치냉장고',
  '세탁건조기',
  'TV',
  '에어컨',
  '시스템에어컨',
  '식기세척기',
  '청소기',
];

export type GeneralHiPreedKey = 'hf75' | 'hf150' | 'hf225' | 'hf300';

export interface GeneralHiPreedCounts {
  hf75: number;
  hf150: number;
  hf225: number;
  hf300: number;
}

export interface GeneralHiPreedPlanSpec {
  id: GeneralHiPreedKey;
  name: string;
  buttonLabel: string;
  planCode: string; // '75' | '150' | '225' | '300'
  supportAmount: number; // 750,000 | 1,500,000 | 2,250,000 | 3,000,000
  monthlyInstallment35: number; // 23,473 | 46,946 | 70,419 | 93,892 (35개월 할부 매월 상쇄액)
  installmentMonths: number; // 35
  monthlyDeposit: number; // 33,000 | 66,000 | 99,000 | 132,000
  depositMonths: number; // 150 (1~150회차 정기 납입 · 별도 거치기간 없음)
  maturityRefund: number; // 4,950,000 | 9,900,000 | 14,850,000 | 19,800,000 (150회 만기 100% 환급 원금)
}

export const MAX_FREED_ACCOUNTS = 12;
export const MAX_GENERAL_HIPREED_ACCOUNTS = MAX_FREED_ACCOUNTS;
export const MAX_LIFECARE_TOTAL_ACCOUNTS = MAX_FREED_ACCOUNTS;

export const GENERAL_HIPREED_PLANS: GeneralHiPreedPlanSpec[] = [
  {
    id: 'hf75',
    name: '하이프리드 75',
    buttonLabel: '하이프리드 75',
    planCode: '75',
    supportAmount: 750000,
    monthlyInstallment35: 23473,
    installmentMonths: 35,
    monthlyDeposit: 33000,
    depositMonths: 150,
    maturityRefund: 4950000,
  },
  {
    id: 'hf150',
    name: '하이프리드 150',
    buttonLabel: '하이프리드 150',
    planCode: '150',
    supportAmount: 1500000,
    monthlyInstallment35: 46946,
    installmentMonths: 35,
    monthlyDeposit: 66000,
    depositMonths: 150,
    maturityRefund: 9900000,
  },
  {
    id: 'hf225',
    name: '하이프리드 225',
    buttonLabel: '하이프리드 225',
    planCode: '225',
    supportAmount: 2250000,
    monthlyInstallment35: 70419,
    installmentMonths: 35,
    monthlyDeposit: 99000,
    depositMonths: 150,
    maturityRefund: 14850000,
  },
  {
    id: 'hf300',
    name: '하이프리드 300',
    buttonLabel: '하이프리드 300',
    planCode: '300',
    supportAmount: 3000000,
    monthlyInstallment35: 93892,
    installmentMonths: 35,
    monthlyDeposit: 132000,
    depositMonths: 150,
    maturityRefund: 19800000,
  },
];

export function calculateGeneralHiPreedSummary(
  counts: GeneralHiPreedCounts,
  hidden = false
) {
  if (hidden) {
    return {
      totalAccounts: 0,
      totalSupport: 0,
      monthlyInstallment35: 0,
      totalMonthlyDeposit: 0,
      totalMaturityRefund: 0,
      comboParts: [] as string[],
      comboLabel: '',
      activePlans: [] as (GeneralHiPreedPlanSpec & {
        count: number;
        subSupportAmount: number;
        subMonthlyInstallment35: number;
        subMonthlyDeposit: number;
        subMaturityRefund: number;
      })[],
    };
  }
  const safeCounts = counts || { hf75: 0, hf150: 0, hf225: 0, hf300: 0 };
  const totalAccounts =
    (safeCounts.hf75 || 0) +
    (safeCounts.hf150 || 0) +
    (safeCounts.hf225 || 0) +
    (safeCounts.hf300 || 0);

  let totalSupport = 0;
  let monthlyInstallment35 = 0;
  let totalMonthlyDeposit = 0;
  let totalMaturityRefund = 0;

  const comboParts: string[] = [];
  const activePlans: (GeneralHiPreedPlanSpec & {
    count: number;
    subSupportAmount: number;
    subMonthlyInstallment35: number;
    subMonthlyDeposit: number;
    subMaturityRefund: number;
  })[] = [];

  GENERAL_HIPREED_PLANS.forEach((plan) => {
    const count = safeCounts[plan.id] || 0;
    if (count > 0) {
      const subSupportAmount = plan.supportAmount * count;
      const subMonthlyInstallment35 = plan.monthlyInstallment35 * count;
      const subMonthlyDeposit = plan.monthlyDeposit * count;
      const subMaturityRefund = plan.maturityRefund * count;

      totalSupport += subSupportAmount;
      monthlyInstallment35 += subMonthlyInstallment35;
      totalMonthlyDeposit += subMonthlyDeposit;
      totalMaturityRefund += subMaturityRefund;

      comboParts.push(`${plan.name} × ${count}건`);
      activePlans.push({
        ...plan,
        count,
        subSupportAmount,
        subMonthlyInstallment35,
        subMonthlyDeposit,
        subMaturityRefund,
      });
    }
  });

  const comboLabel = comboParts.join(' + ');

  return {
    totalAccounts,
    totalSupport,
    monthlyInstallment35,
    totalMonthlyDeposit,
    totalMaturityRefund,
    comboParts,
    comboLabel,
    activePlans,
  };
}

export function calculateAutoTierCashback(
  payPrice: number,
  cardType: GeneralCardType
): number {
  if (cardType === '미정' || cardType === '일반카드') return 0;
  if (payPrice >= 20000000) return 1000000;
  if (payPrice >= 15000000) return 750000;
  if (payPrice >= 12000000) return 600000;
  if (payPrice >= 10000000) return 500000;
  if (payPrice >= 7000000) return 350000;
  if (payPrice >= 5000000) return 250000;
  if (payPrice >= 3000000) return 150000;
  return 0;
}

export function isSubTierCashbackEligibleCard(
  cardId?: AffiliateCardId | string
): boolean {
  return cardId === 'samsung' || cardId === 'shinhan';
}

export function calculateAutoSubscriptionTierCashback(
  totalPrincipal: number,
  cardId?: AffiliateCardId | string
): number {
  if (!isSubTierCashbackEligibleCard(cardId)) return 0;
  if (totalPrincipal >= 20000000) return 1000000;
  if (totalPrincipal >= 15000000) return 750000;
  if (totalPrincipal >= 12000000) return 600000;
  if (totalPrincipal >= 10000000) return 500000;
  if (totalPrincipal >= 7000000) return 350000;
  if (totalPrincipal >= 5000000) return 250000;
  if (totalPrincipal >= 3000000) return 150000;
  return 0;
}

export function calculateSubLotteBilling5pDiscount(
  totalPrincipal: number,
  cardId?: AffiliateCardId | string,
  enabled?: boolean
): number {
  if (cardId !== 'lotte' || !enabled || !(totalPrincipal > 0)) return 0;
  return Math.min(Math.floor(totalPrincipal * 0.05), 50000);
}

export interface GeneralPlanData {
  generalItems: GeneralPurchaseItem[];
  generalCardType: GeneralCardType;
  instantDiscount: number;
  earnedPoints: number;
  pointUsed: number;
  autoTierCashback: boolean;
  manualTierCashback: number;
  extraCashback: number;
  extraBenefits: GeneralExtraBenefitItem[];
  generalHiPreedCounts: GeneralHiPreedCounts;
  hideHiPreed?: boolean;

  // 구독구매 필드 통합 (1안 / 2안 개별 저장·복원용)
  items: SubscriptionItem[];
  subscriptionPeriod: SubscriptionPeriod;
  careService: string;
  warrantyType?: string;
  warrantyYears: 3 | 5;
  allCare: boolean;
  selectedCardId: AffiliateCardId;
  selectedCardTierId: string;
  hiPlusCounts: HiPlusCounts;
  hideSubPreed?: boolean;
  hiPlusPayoutMethod?: HiPlusPayoutMethod;
  countPreedTowardCardSpend?: boolean;
  subAutoTierCashback?: boolean;
  subManualTierCashback?: number;
  subExtraCashback?: number;
  subLotteBilling5p?: boolean;
}

export function extractGeneralPlanData(
  source?: Partial<GeneralPlanData> | null
): GeneralPlanData {
  const s = source || {};
  return {
    generalItems: (s.generalItems || []).map((it) => ({ ...it })),
    generalCardType: s.generalCardType || '미정',
    instantDiscount: Number(s.instantDiscount) || 0,
    earnedPoints: Number(s.earnedPoints) || 0,
    pointUsed: Number(s.pointUsed) || 0,
    autoTierCashback: s.autoTierCashback ?? true,
    manualTierCashback: Number(s.manualTierCashback) || 0,
    extraCashback: Number(s.extraCashback) || 0,
    extraBenefits: (s.extraBenefits || []).map((b) => ({ ...b })),
    generalHiPreedCounts: {
      hf75: 0,
      hf150: 0,
      hf225: 0,
      hf300: 0,
      ...(s.generalHiPreedCounts || {}),
    },
    hideHiPreed: Boolean(s.hideHiPreed),

    items: (s.items || []).map((it) => ({
      ...it,
      period: normalizeSubscriptionPeriod(
        it.period,
        normalizeSubscriptionPeriod(s.subscriptionPeriod, 60)
      ),
    })),
    subscriptionPeriod: normalizeSubscriptionPeriod(s.subscriptionPeriod, 60),
    careService: s.careService || SUB_CARE_OPTIONS[0],
    warrantyType: s.warrantyType || 'AS연장보험 + 가전수리올케어',
    warrantyYears: 5,
    allCare: s.allCare ?? true,
    selectedCardId: s.selectedCardId || 'none',
    selectedCardTierId: s.selectedCardTierId || '',
    hiPlusCounts: {
      hi72: 0,
      hi90: 0,
      hi108: 0,
      ...(s.hiPlusCounts || {}),
    },
    hideSubPreed: Boolean(s.hideSubPreed),
    hiPlusPayoutMethod: normalizeHiPlusPayoutMethod(s.hiPlusPayoutMethod),
    countPreedTowardCardSpend: Boolean(s.countPreedTowardCardSpend),
    subAutoTierCashback: s.subAutoTierCashback ?? true,
    subManualTierCashback: Math.max(0, Number(s.subManualTierCashback) || 0),
    subExtraCashback: Math.max(0, Number(s.subExtraCashback) || 0),
    subLotteBilling5p: Boolean(s.subLotteBilling5p),
  };
}

export function cloneGeneralPlanData(
  source: GeneralPlanData,
  idPrefix = 'plan2'
): GeneralPlanData {
  return {
    generalItems: (source.generalItems || []).map((it, idx) => ({
      ...it,
      id: `${idPrefix}-item-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
    })),
    generalCardType: source.generalCardType || '미정',
    instantDiscount: Number(source.instantDiscount) || 0,
    earnedPoints: Number(source.earnedPoints) || 0,
    pointUsed: Number(source.pointUsed) || 0,
    autoTierCashback: source.autoTierCashback ?? true,
    manualTierCashback: Number(source.manualTierCashback) || 0,
    extraCashback: Number(source.extraCashback) || 0,
    extraBenefits: (source.extraBenefits || []).map((b, idx) => ({
      ...b,
      id: `${idPrefix}-ext-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
    })),
    generalHiPreedCounts: {
      hf75: 0,
      hf150: 0,
      hf225: 0,
      hf300: 0,
      ...(source.generalHiPreedCounts || {}),
    },
    hideHiPreed: Boolean(source.hideHiPreed),

    items: (source.items || []).map((it, idx) => ({
      ...it,
      id: `${idPrefix}-sub-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      period: normalizeSubscriptionPeriod(
        it.period,
        normalizeSubscriptionPeriod(source.subscriptionPeriod, 60)
      ),
    })),
    subscriptionPeriod: normalizeSubscriptionPeriod(source.subscriptionPeriod, 60),
    careService: source.careService || SUB_CARE_OPTIONS[0],
    warrantyType: source.warrantyType || 'AS연장보험 + 가전수리올케어',
    warrantyYears: 5,
    allCare: source.allCare ?? true,
    selectedCardId: source.selectedCardId || 'none',
    selectedCardTierId: source.selectedCardTierId || '',
    hiPlusCounts: {
      hi72: 0,
      hi90: 0,
      hi108: 0,
      ...(source.hiPlusCounts || {}),
    },
    hideSubPreed: Boolean(source.hideSubPreed),
    hiPlusPayoutMethod: normalizeHiPlusPayoutMethod(source.hiPlusPayoutMethod),
    countPreedTowardCardSpend: Boolean(source.countPreedTowardCardSpend),
    subAutoTierCashback: source.subAutoTierCashback ?? true,
    subManualTierCashback: Math.max(0, Number(source.subManualTierCashback) || 0),
    subExtraCashback: Math.max(0, Number(source.subExtraCashback) || 0),
    subLotteBilling5p: Boolean(source.subLotteBilling5p),
  };
}

export const MAX_QUOTE_PLANS = 6;

export function hasPlanMeaningfulContent(
  plan?: Partial<GeneralPlanData> | null
): boolean {
  if (!plan) return false;
  const hasGen = (plan.generalItems || []).some(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.unitPrice) || 0) > 0
  );
  if (hasGen) return true;
  const hasSub = (plan.items || []).some(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0 ||
      (Number(it.contractAmount) || 0) > 0
  );
  if (hasSub) return true;
  if (
    (Number(plan.instantDiscount) || 0) > 0 ||
    (Number(plan.extraCashback) || 0) > 0 ||
    (Number(plan.subExtraCashback) || 0) > 0 ||
    Boolean(plan.subLotteBilling5p)
  ) {
    return true;
  }
  const genFreed =
    (plan.generalHiPreedCounts?.hf75 || 0) +
    (plan.generalHiPreedCounts?.hf150 || 0) +
    (plan.generalHiPreedCounts?.hf225 || 0) +
    (plan.generalHiPreedCounts?.hf300 || 0);
  const subFreed =
    (plan.hiPlusCounts?.hi72 || 0) +
    (plan.hiPlusCounts?.hi90 || 0) +
    (plan.hiPlusCounts?.hi108 || 0);
  return genFreed + subFreed > 0;
}

export function resolveGeneralPlansFromState(
  state: ProposalState
): GeneralPlanData[] {
  const mode: QuoteMode = state.quoteMode || 'general';
  const liveSnapshot = extractGeneralPlanData(state);
  const rawActive = Math.max(
    1,
    Math.floor(Number(state.activeGeneralPlan) || 1)
  );

  if (Array.isArray(state.generalPlans) && state.generalPlans.length > 0) {
    const plans = state.generalPlans
      .slice(0, MAX_QUOTE_PLANS)
      .map((p) => extractGeneralPlanData(p));
    const clampedIdx = Math.min(plans.length, rawActive) - 1;
    plans[clampedIdx] = liveSnapshot;
    return plans;
  }

  // 하위 호환: generalPlans가 없는 기존 저장 데이터 복원
  const p1 =
    rawActive === 1
      ? liveSnapshot
      : extractGeneralPlanData(state.generalPlan1 || state);
  const rawP2 =
    rawActive === 2
      ? liveSnapshot
      : state.generalPlan2
      ? extractGeneralPlanData(state.generalPlan2)
      : null;

  if (rawActive === 2 || (rawP2 && hasPlanMeaningfulContent(rawP2))) {
    return [p1, rawP2 || createEmptyGeneralPlanData(mode, 2)];
  }
  return [p1];
}

export function syncActivePlanIntoGeneralPlans(
  state: ProposalState
): ProposalState {
  const mode: QuoteMode = state.quoteMode || 'general';
  const nextPlans = resolveGeneralPlansFromState(state);
  const clampedActive = Math.min(
    nextPlans.length,
    Math.max(1, Math.floor(Number(state.activeGeneralPlan) || 1))
  );
  const activeData = nextPlans[clampedActive - 1];
  const fallbackPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, 2),
    hideHiPreed: Boolean(activeData.hideHiPreed),
    hideSubPreed: Boolean(activeData.hideSubPreed),
  };

  return {
    ...state,
    ...activeData,
    activeGeneralPlan: clampedActive,
    generalPlans: nextPlans,
    generalPlan1: nextPlans[0],
    generalPlan2: nextPlans[1] ?? fallbackPlan2,
  };
}

export function applyAllGeneralPlansPatch(
  prev: ProposalState,
  patchFn: (plan: GeneralPlanData, idx: number) => GeneralPlanData
): ProposalState {
  const mode: QuoteMode = prev.quoteMode || 'general';
  const currentPlans = resolveGeneralPlansFromState(prev);
  const nextPlans = currentPlans.map((p, idx) =>
    extractGeneralPlanData(patchFn(p, idx))
  );
  const clampedActive = Math.min(
    nextPlans.length,
    Math.max(1, Math.floor(Number(prev.activeGeneralPlan) || 1))
  );
  const activeData = nextPlans[clampedActive - 1];
  const fallbackPlan2: GeneralPlanData = patchFn(
    createEmptyGeneralPlanData(mode, 2),
    1
  );

  return {
    ...prev,
    ...activeData,
    activeGeneralPlan: clampedActive,
    generalPlans: nextPlans,
    generalPlan1: nextPlans[0],
    generalPlan2: nextPlans[1] ?? extractGeneralPlanData(fallbackPlan2),
  };
}

export function switchGeneralPlanInState(
  prev: ProposalState,
  targetPlan: number
): ProposalState {
  const plans = resolveGeneralPlansFromState(prev);
  const target = Math.floor(Number(targetPlan) || 1);
  if (target < 1 || target > plans.length) return prev;
  if (prev.activeGeneralPlan === target && Array.isArray(prev.generalPlans)) {
    return prev;
  }

  const nextActive = extractGeneralPlanData(plans[target - 1]);
  const fallbackPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(prev.quoteMode || 'general', 2),
    hideHiPreed: Boolean(nextActive.hideHiPreed),
    hideSubPreed: Boolean(nextActive.hideSubPreed),
  };

  return {
    ...prev,
    ...nextActive,
    activeGeneralPlan: target,
    generalPlans: plans,
    generalPlan1: plans[0],
    generalPlan2: plans[1] ?? fallbackPlan2,
  };
}

export function addEmptyGeneralPlanInState(prev: ProposalState): ProposalState {
  const mode: QuoteMode = prev.quoteMode || 'general';
  const plans = resolveGeneralPlansFromState(prev);
  if (plans.length >= MAX_QUOTE_PLANS) return prev;

  const newPlanNum = plans.length + 1;
  const freshPlan: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, newPlanNum),
    hideHiPreed: Boolean(prev.hideHiPreed),
    hideSubPreed: Boolean(prev.hideSubPreed),
  };
  const nextPlans = [...plans, freshPlan];
  const fallbackPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, 2),
    hideHiPreed: Boolean(freshPlan.hideHiPreed),
    hideSubPreed: Boolean(freshPlan.hideSubPreed),
  };

  return {
    ...prev,
    ...freshPlan,
    activeGeneralPlan: newPlanNum,
    generalPlans: nextPlans,
    generalPlan1: nextPlans[0],
    generalPlan2: nextPlans[1] ?? fallbackPlan2,
  };
}

export function duplicateActiveGeneralPlanInState(
  prev: ProposalState
): ProposalState {
  const mode: QuoteMode = prev.quoteMode || 'general';
  const plans = resolveGeneralPlansFromState(prev);
  if (plans.length >= MAX_QUOTE_PLANS) return prev;

  const activeIdx =
    Math.min(
      plans.length,
      Math.max(1, Math.floor(Number(prev.activeGeneralPlan) || 1))
    ) - 1;
  const sourcePlan = plans[activeIdx];
  const newPlanNum = plans.length + 1;
  const clonedPlan = cloneGeneralPlanData(sourcePlan, `plan${newPlanNum}`);
  const nextPlans = [...plans, extractGeneralPlanData(clonedPlan)];
  const fallbackPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, 2),
    hideHiPreed: Boolean(clonedPlan.hideHiPreed),
    hideSubPreed: Boolean(clonedPlan.hideSubPreed),
  };

  return {
    ...prev,
    ...clonedPlan,
    activeGeneralPlan: newPlanNum,
    generalPlans: nextPlans,
    generalPlan1: nextPlans[0],
    generalPlan2: nextPlans[1] ?? fallbackPlan2,
  };
}

export function copyPlan1ToPlan2InState(prev: ProposalState): ProposalState {
  return duplicateActiveGeneralPlanInState(prev);
}

export function deleteGeneralPlanInState(
  prev: ProposalState,
  targetPlan: number
): ProposalState {
  const mode: QuoteMode = prev.quoteMode || 'general';
  const plans = resolveGeneralPlansFromState(prev);
  if (plans.length <= 1) return prev;

  const delIdx = Math.floor(Number(targetPlan) || 0) - 1;
  if (delIdx < 0 || delIdx >= plans.length) return prev;

  const curActiveIdx =
    Math.min(
      plans.length,
      Math.max(1, Math.floor(Number(prev.activeGeneralPlan) || 1))
    ) - 1;
  const nextPlans = plans.filter((_, idx) => idx !== delIdx);
  const nextActiveIdx =
    delIdx < curActiveIdx
      ? curActiveIdx - 1
      : Math.min(nextPlans.length - 1, curActiveIdx);
  const nextActivePlan = nextActiveIdx + 1;
  const nextActiveData = extractGeneralPlanData(nextPlans[nextActiveIdx]);
  const fallbackPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, 2),
    hideHiPreed: Boolean(nextActiveData.hideHiPreed),
    hideSubPreed: Boolean(nextActiveData.hideSubPreed),
  };

  return {
    ...prev,
    ...nextActiveData,
    activeGeneralPlan: nextActivePlan,
    generalPlans: nextPlans,
    generalPlan1: nextPlans[0],
    generalPlan2: nextPlans[1] ?? fallbackPlan2,
  };
}

export function confirmActiveGeneralPlanInState(
  prev: ProposalState,
  targetPlan?: number
): ProposalState {
  const mode: QuoteMode = prev.quoteMode || 'general';
  const plans = resolveGeneralPlansFromState(prev);
  const chosenIdx =
    Math.min(
      plans.length,
      Math.max(
        1,
        Math.floor(Number(targetPlan ?? prev.activeGeneralPlan) || 1)
      )
    ) - 1;
  const chosenData = extractGeneralPlanData(plans[chosenIdx]);
  const emptyPlan2: GeneralPlanData = {
    ...createEmptyGeneralPlanData(mode, 2),
    hideHiPreed: Boolean(chosenData.hideHiPreed),
    hideSubPreed: Boolean(chosenData.hideSubPreed),
  };

  return {
    ...prev,
    ...chosenData,
    activeGeneralPlan: 1,
    generalPlans: [chosenData],
    generalPlan1: chosenData,
    generalPlan2: emptyPlan2,
  };
}

export function calculateGeneralPurchaseSummary(state: GeneralPlanData) {
  const items = state.generalItems || [];
  const validItems = items.filter(
    (it) => (it.category || '').trim() !== '' || (Number(it.unitPrice) || 0) > 0
  );
  const displayItems = validItems.length > 0 ? validItems : items;

  const sum = displayItems.reduce(
    (acc, it) =>
      acc +
      Math.max(0, Number(it.unitPrice) || 0) *
        Math.max(1, Number(it.quantity) || 1),
    0
  );

  const instantDiscount = Math.max(0, Number(state.instantDiscount) || 0);
  const earnedPoints = Math.max(0, Number(state.earnedPoints) || 0);
  const pointUsed = Math.max(0, Number(state.pointUsed) || 0);
  const remainingPoints = Math.max(0, earnedPoints - pointUsed);

  const extraBenefits = state.extraBenefits || [];
  const extraDiscountItems = extraBenefits.filter(
    (b) =>
      b.type === 'discount' &&
      (Number(b.amount) > 0 || (b.description || '').trim() !== '')
  );
  const extraEtcItems = extraBenefits.filter(
    (b) =>
      b.type === 'etc' &&
      (Number(b.amount) > 0 || (b.description || '').trim() !== '')
  );

  const extraDiscountSum = extraDiscountItems.reduce(
    (acc, b) => acc + Math.max(0, Number(b.amount) || 0),
    0
  );
  const extraEtcSum = extraEtcItems.reduce(
    (acc, b) => acc + Math.max(0, Number(b.amount) || 0),
    0
  );

  const totalStep1InstantDiscount =
    instantDiscount + extraDiscountSum + pointUsed;

  const freedSummary = calculateGeneralHiPreedSummary(
    state.generalHiPreedCounts || { hf75: 0, hf150: 0, hf225: 0, hf300: 0 },
    Boolean(state.hideHiPreed)
  );
  const hiFreedAccounts = freedSummary.totalAccounts;
  const hiFreedSupport = freedSummary.totalSupport;
  const hiFreedMonthlyInstallment35 = freedSummary.monthlyInstallment35;
  const hiFreedMonthlyDeposit = freedSummary.totalMonthlyDeposit;
  const hiFreedMaturityRefund = freedSummary.totalMaturityRefund;

  const payPrice = Math.max(
    0,
    sum - totalStep1InstantDiscount - hiFreedSupport
  );

  const tierCashback =
    state.autoTierCashback !== false
      ? calculateAutoTierCashback(payPrice, state.generalCardType)
      : Math.max(0, Number(state.manualTierCashback) || 0);

  const extraCashback = Math.max(0, Number(state.extraCashback) || 0);
  const totalStep2Cashback = tierCashback + extraCashback;
  const totalStep2ExtraBenefit = extraEtcSum + remainingPoints;

  const rawNet =
    sum -
    totalStep1InstantDiscount -
    hiFreedSupport -
    totalStep2Cashback -
    totalStep2ExtraBenefit;

  const totalDiscountAndBenefit =
    totalStep1InstantDiscount +
    hiFreedSupport +
    totalStep2Cashback +
    totalStep2ExtraBenefit;

  return {
    displayItems,
    sum,
    instantDiscount,
    earnedPoints,
    pointUsed,
    remainingPoints,
    extraDiscountItems,
    extraEtcItems,
    extraDiscountSum,
    extraEtcSum,
    totalStep1InstantDiscount,
    hiFreedAccounts,
    hiFreedSupport,
    hiFreedMonthlyInstallment35,
    hiFreedMonthlyDeposit,
    hiFreedMaturityRefund,
    comboLabel: freedSummary.comboLabel,
    comboParts: freedSummary.comboParts,
    activeFreedPlans: freedSummary.activePlans,
    payPrice,
    tierCashback,
    extraCashback,
    totalStep2Cashback,
    totalStep2ExtraBenefit,
    rawNet,
    totalDiscountAndBenefit,
  };
}

export function getValidDisplayModelName(
  rawModelName: unknown,
  monthlyFeeOrPrice?: number
): string {
  const trimmed = String(rawModelName ?? '').trim();
  if (!trimmed || trimmed === '-') return '';
  const digitsOnly = trimmed.replace(/[,\s원]/g, '');
  if (/^\d+$/.test(digitsOnly)) {
    const numVal = Number(digitsOnly);
    if (
      monthlyFeeOrPrice !== undefined &&
      numVal === Math.round(Number(monthlyFeeOrPrice) || 0)
    ) {
      return '';
    }
    return '';
  }
  return trimmed;
}

export function getSubscriptionItemPrincipal(
  item: SubscriptionItem,
  fallbackPeriod: SubscriptionPeriod = 60
): number {
  const safeFallback: SubscriptionPeriod = normalizeSubscriptionPeriod(
    fallbackPeriod,
    60
  );
  const itemPeriod: SubscriptionPeriod = normalizeSubscriptionPeriod(
    item.period,
    safeFallback
  );
  const monthly = Math.max(0, Number(item.monthlyFee) || 0);
  const byMonthly = monthly * itemPeriod;
  const explicitContract = Math.max(0, Number(item.contractAmount) || 0);
  if (
    explicitContract > 0 &&
    (monthly === 0 || Math.abs(explicitContract - byMonthly) <= itemPeriod * 5)
  ) {
    return explicitContract;
  }
  return byMonthly;
}

export function getSubscriptionSurplusMeta(
  rawNetMonthly: number,
  payoutMethod?: HiPlusPayoutMethod | unknown
) {
  const isSurplusZone = rawNetMonthly <= 0;
  const displayNetMonthly = isSurplusZone ? 0 : rawNetMonthly;
  const monthlySurplus = rawNetMonthly < 0 ? Math.abs(rawNetMonthly) : 0;
  const method = normalizeHiPlusPayoutMethod(payoutMethod);
  const isCardBill = method === 'card_bill';
  const surplusBadgeText =
    monthlySurplus > 0
      ? isCardBill
        ? `+ 매월 카드 청구대금 추가 차감 예상 ${monthlySurplus.toLocaleString()}원`
        : `+ 매월 통장 입금 예상 ${monthlySurplus.toLocaleString()}원`
      : '';
  const surplusInlineText =
    monthlySurplus > 0
      ? isCardBill
        ? `+매월 카드 청구대금 추가 차감 예상 ${monthlySurplus.toLocaleString()}원`
        : `+매월 ${monthlySurplus.toLocaleString()}원 통장 입금 예상`
      : '';
  const surplusStickyText =
    monthlySurplus > 0
      ? `매월 +${monthlySurplus.toLocaleString()}원 혜택`
      : '';

  return {
    isSurplusZone,
    displayNetMonthly,
    monthlySurplus,
    isCardBill,
    surplusBadgeText,
    surplusInlineText,
    surplusStickyText,
  };
}

export function getSubscriptionPeriodSummary(
  items: SubscriptionItem[],
  fallbackPeriod: SubscriptionPeriod = 60
) {
  const safeFallback: SubscriptionPeriod = normalizeSubscriptionPeriod(
    fallbackPeriod,
    60
  );
  const list = items || [];
  const validList = list.filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0 ||
      (Number(it.contractAmount) || 0) > 0
  );
  const periodSource = validList.length > 0 ? validList : list;

  const itemPeriods: SubscriptionPeriod[] =
    periodSource.length > 0
      ? periodSource.map((it) =>
          normalizeSubscriptionPeriod(it.period, safeFallback)
        )
      : [safeFallback];

  const uniquePeriods = Array.from(new Set(itemPeriods)).sort((a, b) => a - b);
  const all36 = uniquePeriods.length === 1 && uniquePeriods[0] === 36;
  const all60 = uniquePeriods.length === 1 && uniquePeriods[0] === 60;
  const isMixedPeriod = uniquePeriods.length > 1;

  const periodLabel = isMixedPeriod
    ? `${uniquePeriods.join('·')}개월 맞춤`
    : `${uniquePeriods[0]}개월`;

  const representativePeriod: SubscriptionPeriod =
    uniquePeriods[uniquePeriods.length - 1] || safeFallback;

  const totalBaseMonthly = list.reduce(
    (sum, item) => sum + Math.max(0, Number(item.monthlyFee) || 0),
    0
  );

  const totalPrincipal = list.reduce(
    (sum, item) => sum + getSubscriptionItemPrincipal(item, safeFallback),
    0
  );

  return {
    representativePeriod,
    periodLabel,
    isMixedPeriod,
    all36,
    all60,
    totalBaseMonthly,
    totalPrincipal,
  };
}

export interface SubscriptionPhaseSegment {
  key: string;
  startMonth: number;
  endMonth: number;
  months: number;
  label: string;
  activeItemCount: number;
  endedItemCount: number;
  rawBaseMonthly: number;
  baseMonthly: number;
  hiPlusMonthly: number;
  rawAfterPreed: number;
  effectiveAfterPreed: number;
  surplusAfterPreed: number;
  cardDiscount: number;
  rawFinalMonthly: number;
  effectiveFinalMonthly: number;
  surplusFinalMonthly: number;
}

export function calculateSubscriptionPhases(
  items: SubscriptionItem[],
  fallbackPeriod: SubscriptionPeriod = 60,
  hiPlusMonthly = 0,
  cardDiscount = 0,
  subLotteBillingDiscount = 0
): SubscriptionPhaseSegment[] {
  const safeFallback: SubscriptionPeriod = normalizeSubscriptionPeriod(
    fallbackPeriod,
    60
  );
  const list = items || [];
  const validList = list.filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0 ||
      (Number(it.contractAmount) || 0) > 0
  );
  const source = validList.length > 0 ? validList : list;
  const itemPeriods: SubscriptionPeriod[] =
    source.length > 0
      ? source.map((it) => normalizeSubscriptionPeriod(it.period, safeFallback))
      : [safeFallback];
  const uniquePeriods = Array.from(new Set(itemPeriods)).sort((a, b) => a - b);
  const isMixed = uniquePeriods.length > 1;

  const sourcePrincipals = source.map((it) =>
    getSubscriptionItemPrincipal(it, safeFallback)
  );
  const totalSourcePrincipal = sourcePrincipals.reduce((s, p) => s + p, 0);
  const safeLotteDisc = Math.max(
    0,
    Math.min(Math.round(subLotteBillingDiscount || 0), totalSourcePrincipal)
  );

  // 혼합 개월수(36·48·60 혼재)일 때 원금 비례로 5% 청구할인액을 배분하여 구간별 월 원구독료 산출
  const itemDiscs: number[] = sourcePrincipals.map(() => 0);
  if (isMixed && safeLotteDisc > 0 && totalSourcePrincipal > 0) {
    let allocated = 0;
    let lastPositiveIdx = -1;
    sourcePrincipals.forEach((p, idx) => {
      if (p > 0) lastPositiveIdx = idx;
    });
    sourcePrincipals.forEach((p, idx) => {
      if (p <= 0) return;
      if (idx === lastPositiveIdx) {
        itemDiscs[idx] = Math.max(0, safeLotteDisc - allocated);
      } else {
        const share = Math.floor((safeLotteDisc * p) / totalSourcePrincipal);
        itemDiscs[idx] = share;
        allocated += share;
      }
    });
  }

  const itemBilledMonthly = source.map((it, idx) => {
    const rawM = Math.max(0, Number(it.monthlyFee) || 0);
    if (!isMixed || safeLotteDisc <= 0 || totalSourcePrincipal <= 0) {
      return rawM;
    }
    const itemP = sourcePrincipals[idx];
    const itemPeriod = normalizeSubscriptionPeriod(it.period, safeFallback);
    const itemDisc = itemDiscs[idx] || 0;
    return itemPeriod > 0
      ? Math.round(Math.max(0, itemP - itemDisc) / itemPeriod)
      : rawM;
  });

  let prevEnd = 0;
  return uniquePeriods.map((endMonth) => {
    const startMonth = prevEnd + 1;
    const months = Math.max(1, endMonth - prevEnd);
    const activeIndices: number[] = [];
    source.forEach((it, idx) => {
      if (normalizeSubscriptionPeriod(it.period, safeFallback) >= endMonth) {
        activeIndices.push(idx);
      }
    });
    const endedItemCount = Math.max(0, source.length - activeIndices.length);
    const rawBaseMonthly = activeIndices.reduce(
      (sum, idx) => sum + Math.max(0, Number(source[idx].monthlyFee) || 0),
      0
    );
    const baseMonthly =
      safeLotteDisc <= 0 || totalSourcePrincipal <= 0
        ? rawBaseMonthly
        : !isMixed
        ? endMonth > 0
          ? Math.round(
              Math.max(0, totalSourcePrincipal - safeLotteDisc) / endMonth
            )
          : rawBaseMonthly
        : activeIndices.reduce(
            (sum, idx) => sum + (itemBilledMonthly[idx] || 0),
            0
          );

    const rawAfterPreed = baseMonthly - hiPlusMonthly;
    const effectiveAfterPreed = Math.max(0, rawAfterPreed);
    const surplusAfterPreed = Math.max(0, -rawAfterPreed);

    const rawFinalMonthly = baseMonthly - hiPlusMonthly - cardDiscount;
    const effectiveFinalMonthly = Math.max(0, rawFinalMonthly);
    const surplusFinalMonthly = Math.max(0, -rawFinalMonthly);

    prevEnd = endMonth;

    return {
      key: `phase-${startMonth}-${endMonth}`,
      startMonth,
      endMonth,
      months,
      label: isMixed ? `${startMonth}~${endMonth}개월차` : `${endMonth}개월`,
      activeItemCount: activeIndices.length,
      endedItemCount,
      rawBaseMonthly,
      baseMonthly,
      hiPlusMonthly,
      rawAfterPreed,
      effectiveAfterPreed,
      surplusAfterPreed,
      cardDiscount,
      rawFinalMonthly,
      effectiveFinalMonthly,
      surplusFinalMonthly,
    };
  });
}

export function recommendCardSpendHiPlusCounts(
  targetMinSpend: number,
  maxAccounts: number = MAX_FREED_ACCOUNTS
): HiPlusCounts | null {
  if (
    !Number.isFinite(targetMinSpend) ||
    targetMinSpend <= 0 ||
    maxAccounts <= 0 ||
    targetMinSpend > maxAccounts * 60000
  ) {
    return null;
  }

  if (targetMinSpend === 300000 && maxAccounts >= 6) {
    return { hi72: 0, hi90: 6, hi108: 0 };
  }

  let best: {
    counts: HiPlusCounts;
    overshoot: number;
    totalAcc: number;
    nonZeroTypes: number;
  } | null = null;

  for (let c108 = 0; c108 <= maxAccounts; c108++) {
    for (let c90 = 0; c90 <= maxAccounts - c108; c90++) {
      for (let c72 = 0; c72 <= maxAccounts - c108 - c90; c72++) {
        const totalAcc = c72 + c90 + c108;
        if (totalAcc === 0) continue;
        const deposit = c72 * 40000 + c90 * 50000 + c108 * 60000;
        if (deposit < targetMinSpend) continue;
        const overshoot = deposit - targetMinSpend;
        const nonZeroTypes =
          (c72 > 0 ? 1 : 0) + (c90 > 0 ? 1 : 0) + (c108 > 0 ? 1 : 0);
        if (
          !best ||
          overshoot < best.overshoot ||
          (overshoot === best.overshoot && nonZeroTypes < best.nonZeroTypes) ||
          (overshoot === best.overshoot &&
            nonZeroTypes === best.nonZeroTypes &&
            totalAcc < best.totalAcc)
        ) {
          best = {
            counts: { hi72: c72, hi90: c90, hi108: c108 },
            overshoot,
            totalAcc,
            nonZeroTypes,
          };
        }
      }
    }
  }

  return best ? best.counts : null;
}

export function calculateSubscriptionSummary(planData: GeneralPlanData) {
  const items = planData.items || [];
  const validItems = items.filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0
  );
  const displayItems = validItems.length > 0 ? validItems : items;

  const fallbackPeriod: SubscriptionPeriod = normalizeSubscriptionPeriod(
    planData.subscriptionPeriod,
    60
  );
  const periodInfo = getSubscriptionPeriodSummary(items, fallbackPeriod);
  const period: SubscriptionPeriod = periodInfo.representativePeriod;
  const representativePeriod: SubscriptionPeriod =
    periodInfo.representativePeriod;
  const periodLabel = periodInfo.periodLabel;
  const isMixedPeriod = periodInfo.isMixedPeriod;

  const validSubNames = items
    .map((it) => {
      const cat = (it.category || '').trim();
      const mod = (it.modelName || '').trim();
      if (!cat && !mod) return '';
      const itemPeriod = normalizeSubscriptionPeriod(it.period, fallbackPeriod);
      if (cat && mod) return `${cat}(${mod}·${itemPeriod}M)`;
      return `${cat || mod}(${itemPeriod}M)`;
    })
    .filter(Boolean);

  const rawTotalBaseMonthly = periodInfo.totalBaseMonthly;
  const totalPrincipal = periodInfo.totalPrincipal;

  const currentCard = AFFILIATE_CARDS.find(
    (c) => c.id === planData.selectedCardId
  );
  const currentCardTier = currentCard?.tiers.find(
    (t) => t.id === planData.selectedCardTierId
  );
  const cardDiscount = currentCardTier?.monthlyDiscount || 0;

  const hiSummary = calculateHiPlusSummary(
    planData.hiPlusCounts || { hi72: 0, hi90: 0, hi108: 0 },
    representativePeriod,
    Boolean(planData.hideSubPreed)
  );
  const hiPlusMonthly = hiSummary.monthlyHiPlusSupport;

  const hiPlusPayoutMethod = normalizeHiPlusPayoutMethod(
    planData.hiPlusPayoutMethod
  );
  const countPreedTowardCardSpend = Boolean(planData.countPreedTowardCardSpend);
  const targetCardMinSpend = currentCardTier?.minSpendAmount || 0;
  const recognizedPreedSpend =
    countPreedTowardCardSpend && hiPlusPayoutMethod !== 'bank_bank'
      ? hiSummary.totalMonthlyDeposit
      : 0;
  const additionalCardSpendNeeded = Math.max(
    0,
    targetCardMinSpend - recognizedPreedSpend
  );

  const isTierCashbackCard = isSubTierCashbackEligibleCard(planData.selectedCardId);
  const autoSubTierCashback = calculateAutoSubscriptionTierCashback(
    totalPrincipal,
    planData.selectedCardId
  );
  const subTierCashback =
    planData.subAutoTierCashback !== false
      ? autoSubTierCashback
      : Math.max(0, Number(planData.subManualTierCashback) || 0);
  const subExtraCashback = Math.max(0, Number(planData.subExtraCashback) || 0);
  const totalSubCashback = subTierCashback + subExtraCashback;

  const subLotteBilling5p = Boolean(planData.subLotteBilling5p);
  const subLotteBillingDiscount = calculateSubLotteBilling5pDiscount(
    totalPrincipal,
    planData.selectedCardId,
    subLotteBilling5p
  );
  const billedPrincipal = Math.max(0, totalPrincipal - subLotteBillingDiscount);

  const phaseSegments = calculateSubscriptionPhases(
    items,
    fallbackPeriod,
    hiPlusMonthly,
    cardDiscount,
    subLotteBillingDiscount
  );

  const billedBaseMonthly =
    subLotteBillingDiscount > 0
      ? isMixedPeriod
        ? phaseSegments[0]?.baseMonthly ?? rawTotalBaseMonthly
        : representativePeriod > 0
        ? Math.round(billedPrincipal / representativePeriod)
        : rawTotalBaseMonthly
      : rawTotalBaseMonthly;

  const totalBaseMonthly = billedBaseMonthly;
  const subLotteMonthlyDiscount = Math.max(
    0,
    rawTotalBaseMonthly - billedBaseMonthly
  );

  const monthlyCashbackEquiv = 0;

  const baseMonthlyAfterPreed = totalBaseMonthly - hiPlusMonthly;
  const displayMonthlyAfterPreed = Math.max(0, baseMonthlyAfterPreed);
  const surplusMonthlyAfterPreed = Math.max(0, -baseMonthlyAfterPreed);

  const monthlyBillingAfterCardAndHiPlus =
    totalBaseMonthly - cardDiscount - hiPlusMonthly;

  const finalMonthlyFee = monthlyBillingAfterCardAndHiPlus;

  const totalMonthlyDiscountOverTerm =
    (cardDiscount + hiPlusMonthly) * representativePeriod;
  const totalTermBillingBeforeCashback =
    billedPrincipal - totalMonthlyDiscountOverTerm;

  const totalSubBenefit =
    totalMonthlyDiscountOverTerm + totalSubCashback + subLotteBillingDiscount;
  const finalTotalFee = totalPrincipal - totalSubBenefit;

  const totalTermSurplus =
    finalTotalFee < 0
      ? Math.abs(finalTotalFee)
      : !isMixedPeriod && finalMonthlyFee < 0
      ? Math.abs(finalMonthlyFee) * representativePeriod
      : phaseSegments.reduce(
          (acc, seg) => acc + seg.surplusFinalMonthly * seg.months,
          0
        );

  const hasSubData =
    rawTotalBaseMonthly > 0 ||
    totalPrincipal > 0 ||
    items.some(
      (it) =>
        (it.category || '').trim() !== '' || (it.modelName || '').trim() !== ''
    );

  return {
    displayItems,
    validSubNames,
    period,
    representativePeriod,
    periodLabel,
    isMixedPeriod,
    subscriptionPeriod: representativePeriod,
    rawTotalBaseMonthly,
    billedBaseMonthly,
    totalBaseMonthly,
    totalMonthlyFee: totalBaseMonthly,
    totalPrincipal,
    billedPrincipal,
    subLotteMonthlyDiscount,
    currentCard,
    currentCardTier,
    cardDiscount,
    hiSummary,
    hiPlusMonthly,
    baseMonthlyAfterPreed,
    displayMonthlyAfterPreed,
    surplusMonthlyAfterPreed,
    phaseSegments,
    hiPlusPayoutMethod,
    countPreedTowardCardSpend,
    targetCardMinSpend,
    recognizedPreedSpend,
    additionalCardSpendNeeded,
    isTierCashbackCard,
    autoSubTierCashback,
    subTierCashback,
    subExtraCashback,
    totalSubCashback,
    subLotteBilling5p,
    subLotteBillingDiscount,
    monthlyCashbackEquiv,
    monthlyBillingAfterCardAndHiPlus,
    totalMonthlyDiscountOverTerm,
    totalTermBillingBeforeCashback,
    finalMonthlyFee,
    finalTotalFee,
    totalTermSurplus,
    totalSubBenefit,
    hasSubData,
  };
}

export interface ResolvedPlanSummaryEntry {
  planNum: number;
  data: GeneralPlanData;
  genSummary: ReturnType<typeof calculateGeneralPurchaseSummary>;
  subSummary: ReturnType<typeof calculateSubscriptionSummary>;
  hasGen: boolean;
  hasSub: boolean;
  hasData: boolean;
}

export function getAllGeneralPlanSummaries(
  state: ProposalState
): ResolvedPlanSummaryEntry[] {
  const plans = resolveGeneralPlansFromState(state);
  return plans.map((data, idx) => {
    const genSummary = calculateGeneralPurchaseSummary(data);
    const subSummary = calculateSubscriptionSummary(data);
    const hasGen =
      genSummary.sum > 0 ||
      data.generalItems.some(
        (it) =>
          (it.category || '').trim() !== '' ||
          (it.modelName || '').trim() !== ''
      );
    const hasSub = subSummary.hasSubData;
    const hasData =
      state.quoteMode === 'general'
        ? hasGen
        : state.quoteMode === 'subscription'
        ? hasSub
        : hasGen || hasSub;

    return {
      planNum: idx + 1,
      data,
      genSummary,
      subSummary,
      hasGen,
      hasSub,
      hasData,
    };
  });
}

export function getGeneralPlan1And2Summaries(state: ProposalState) {
  const allPlans = getAllGeneralPlanSummaries(state);
  const mode: QuoteMode = state.quoteMode || 'general';
  const emptyPlan2 = createEmptyGeneralPlanData(mode, 2);

  const p1 = allPlans[0];
  const p2 = allPlans[1];

  const plan1Data = p1
    ? p1.data
    : extractGeneralPlanData(state.generalPlan1 || state);
  const plan2Data = p2
    ? p2.data
    : state.generalPlan2
    ? extractGeneralPlanData(state.generalPlan2)
    : emptyPlan2;

  const plan1Summary = p1
    ? p1.genSummary
    : calculateGeneralPurchaseSummary(plan1Data);
  const plan2Summary = p2
    ? p2.genSummary
    : calculateGeneralPurchaseSummary(plan2Data);

  const plan1SubSummary = p1
    ? p1.subSummary
    : calculateSubscriptionSummary(plan1Data);
  const plan2SubSummary = p2
    ? p2.subSummary
    : calculateSubscriptionSummary(plan2Data);

  const hasPlan1Data = p1 ? p1.hasData : false;
  const hasPlan2Data = p2 ? p2.hasData : false;

  const validPlansCount = allPlans.filter((p) => p.hasData).length;
  const hasMultiplePlans =
    allPlans.length >= 2 &&
    (validPlansCount >= 2 || (Number(state.activeGeneralPlan) || 1) > 1);

  return {
    plan1Data,
    plan2Data,
    plan1Summary,
    plan2Summary,
    plan1SubSummary,
    plan2SubSummary,
    hasPlan1Data,
    hasPlan2Data,
    allPlans,
    totalPlanCount: allPlans.length,
    validPlansCount,
    hasMultiplePlans,
  };
}

// ==================== 구독구매 타입 ====================
export const SUB_CARE_OPTIONS = [
  '방문케어 (전문가 점검·교체)',
  '셀프케어 (필터·소모품 정기배송)',
  '케어없음 (자가관리)',
];

export interface SubscriptionItem {
  id: string;
  category: string;
  modelName: string;
  modelCode?: string;
  monthlyFee: number;
  period?: SubscriptionPeriod;
  careService: string;
  careType?: string;
  warrantyType?: string;
  cardName?: string;
  contractAmount?: number;
}

export type AffiliateCardId = 'woori' | 'lotte' | 'samsung' | 'shinhan' | 'none';

export interface CardTier {
  id: string;
  minSpendLabel: string;
  minSpendShort: string;
  minSpendAmount: number;
  monthlyDiscount: number;
}

export interface AffiliateCardSpec {
  id: AffiliateCardId;
  name: string;
  shortName: string;
  benefitType: '청구할인' | '캐시백' | '미적용';
  tiers: CardTier[];
}

export type HiPlusPayoutMethod = 'card_bank' | 'card_bill' | 'bank_bank';

export interface HiPlusPayoutOptionSpec {
  id: HiPlusPayoutMethod;
  title: string;
  shortTitle: string;
  desc: string;
}

export const HI_PLUS_PAYOUT_OPTIONS: HiPlusPayoutOptionSpec[] = [
  {
    id: 'card_bank',
    title: '카드납 + 통장 입금',
    shortTitle: '카드납 · 통장입금',
    desc: '제휴카드로 상조회비 자동이체 · 월 지원금은 고객 계좌로 입금',
  },
  {
    id: 'card_bill',
    title: '카드납 + 카드 청구할인',
    shortTitle: '카드납 · 청구할인',
    desc: '제휴카드로 상조회비 자동이체 · 월 지원금은 카드 청구대금에서 차감',
  },
  {
    id: 'bank_bank',
    title: '통장납 + 통장 입금',
    shortTitle: '통장납 · 통장입금',
    desc: '은행 계좌 자동이체로 상조회비 납부 · 월 지원금은 고객 계좌로 입금',
  },
];

export function normalizeHiPlusPayoutMethod(
  raw: unknown
): HiPlusPayoutMethod {
  if (raw === 'card_bill' || raw === 'bank_bank' || raw === 'card_bank') {
    return raw;
  }
  return 'card_bank';
}

export type HiPlusKey = 'hi72' | 'hi90' | 'hi108';

export interface HiPlusCounts {
  hi72: number;
  hi90: number;
  hi108: number;
}

export interface HiPlusPlanSpec {
  id: HiPlusKey;
  name: string;
  buttonLabel: string;
  planCode: string; // '72' | '90' | '108'
  totalSupport: number; // 720,000 | 900,000 | 1,080,000
  monthlySupport36: number; // 20,000 | 25,000 | 30,000
  monthlySupport48?: number; // 15,000 | 18,750 | 22,500
  monthlySupport60: number; // 12,000 | 15,000 | 18,000
  monthlyDeposit1to90: number; // 40,000 | 50,000 | 60,000
  depositMonths: number; // 90 (1~90회차 정기 납입)
  deferMonths: number; // 30 (90회 완납 후 91~120개월차 월 0원 거치)
  maturityRefund: number; // 3,600,000 | 4,500,000 | 5,400,000 (120개월 만기 100% 환급 원금)
}

export interface ProposalState {
  quoteMode: QuoteMode;
  compareModes?: QuoteMode[];
  modeConfigs?: {
    general?: GeneralPlanData;
    subscription?: GeneralPlanData;
    hybrid?: GeneralPlanData;
  };

  // 다중 견적안 상태 (1안 ~ 최대 6안, 하위호환 generalPlan1/generalPlan2 동기화)
  activeGeneralPlan: number;
  generalPlan1: GeneralPlanData;
  generalPlan2: GeneralPlanData;
  generalPlans?: GeneralPlanData[];

  generalItems: GeneralPurchaseItem[];
  generalCardType: GeneralCardType;
  instantDiscount: number;
  earnedPoints: number;
  pointUsed: number;
  autoTierCashback: boolean;
  manualTierCashback: number;
  extraCashback: number;
  extraBenefits: GeneralExtraBenefitItem[];
  generalHiPreedCounts: GeneralHiPreedCounts;
  hideHiPreed?: boolean;

  // 구독구매 상태
  items: SubscriptionItem[];
  subscriptionPeriod: SubscriptionPeriod;
  careService: string;
  warrantyType?: string;
  warrantyYears: 3 | 5;
  allCare: boolean;
  selectedCardId: AffiliateCardId;
  selectedCardTierId: string;
  hiPlusCounts: HiPlusCounts;
  hideSubPreed?: boolean;
  hiPlusPayoutMethod?: HiPlusPayoutMethod;
  countPreedTowardCardSpend?: boolean;
  subAutoTierCashback?: boolean;
  subManualTierCashback?: number;
  subExtraCashback?: number;
  subLotteBilling5p?: boolean;
}

export const MAX_HI_PLUS_ACCOUNTS = MAX_FREED_ACCOUNTS;

/**
 * [매장 제휴카드 월 혜택 단가표 유지보수 안내]
 * - 카드사 월별 프로모션(예: 하이-클래스 롯데카드 기본 16,000/19,000/21,000원 vs 매장 추가 프로모션 18,000/20,000/22,000원 등)에 따라
 *   아래 tiers의 monthlyDiscount / minSpendAmount 값만 갱신하면 전체 계산식·제안서·공유뷰어에 일괄 반영됩니다.
 */
export const AFFILIATE_CARDS: AffiliateCardSpec[] = [
  {
    id: 'woori',
    name: '우리 제휴카드',
    shortName: '우리 제휴카드',
    benefitType: '청구할인',
    tiers: [
      { id: 'woori-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', minSpendAmount: 300000, monthlyDiscount: 18000 },
      { id: 'woori-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', minSpendAmount: 700000, monthlyDiscount: 20000 },
      { id: 'woori-120', minSpendLabel: '전월 실적 120만원 이상', minSpendShort: '120만원', minSpendAmount: 1200000, monthlyDiscount: 22000 },
    ],
  },
  {
    id: 'lotte',
    name: '롯데 제휴카드',
    shortName: '롯데 제휴카드',
    benefitType: '캐시백',
    tiers: [
      { id: 'lotte-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', minSpendAmount: 300000, monthlyDiscount: 18000 },
      { id: 'lotte-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', minSpendAmount: 700000, monthlyDiscount: 20000 },
      { id: 'lotte-150', minSpendLabel: '전월 실적 150만원 이상', minSpendShort: '150만원', minSpendAmount: 1500000, monthlyDiscount: 22000 },
    ],
  },
  {
    id: 'samsung',
    name: '삼성 제휴카드',
    shortName: '삼성 제휴카드',
    benefitType: '청구할인',
    tiers: [
      { id: 'samsung-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', minSpendAmount: 300000, monthlyDiscount: 13000 },
      { id: 'samsung-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', minSpendAmount: 700000, monthlyDiscount: 17000 },
      { id: 'samsung-150', minSpendLabel: '전월 실적 150만원 이상', minSpendShort: '150만원', minSpendAmount: 1500000, monthlyDiscount: 20000 },
    ],
  },
  {
    id: 'shinhan',
    name: '신한 제휴카드',
    shortName: '신한 제휴카드',
    benefitType: '캐시백',
    tiers: [
      { id: 'shinhan-50', minSpendLabel: '전월 실적 50만원 이상', minSpendShort: '50만원', minSpendAmount: 500000, monthlyDiscount: 10000 },
      { id: 'shinhan-100', minSpendLabel: '전월 실적 100만원 이상', minSpendShort: '100만원', minSpendAmount: 1000000, monthlyDiscount: 20000 },
      { id: 'shinhan-200', minSpendLabel: '전월 실적 200만원 이상', minSpendShort: '200만원', minSpendAmount: 2000000, monthlyDiscount: 30000 },
    ],
  },
];

export const HI_PLUS_PLANS: HiPlusPlanSpec[] = [
  {
    id: 'hi72',
    name: 'Hi구독 플러스 72',
    buttonLabel: '플러스 72',
    planCode: '72',
    totalSupport: 720000,
    monthlySupport36: 20000,
    monthlySupport48: 15000,
    monthlySupport60: 12000,
    monthlyDeposit1to90: 40000,
    depositMonths: 90,
    deferMonths: 30,
    maturityRefund: 3600000,
  },
  {
    id: 'hi90',
    name: 'Hi구독 플러스 90',
    buttonLabel: '플러스 90',
    planCode: '90',
    totalSupport: 900000,
    monthlySupport36: 25000,
    monthlySupport48: 18750,
    monthlySupport60: 15000,
    monthlyDeposit1to90: 50000,
    depositMonths: 90,
    deferMonths: 30,
    maturityRefund: 4500000,
  },
  {
    id: 'hi108',
    name: 'Hi구독 플러스 108',
    buttonLabel: '플러스 108',
    planCode: '108',
    totalSupport: 1080000,
    monthlySupport36: 30000,
    monthlySupport48: 22500,
    monthlySupport60: 18000,
    monthlyDeposit1to90: 60000,
    depositMonths: 90,
    deferMonths: 30,
    maturityRefund: 5400000,
  },
];

export function getHiPlusUnitMonthlySupport(
  plan: HiPlusPlanSpec,
  period: number
): number {
  if (period === 36) return plan.monthlySupport36;
  if (period === 48 && typeof plan.monthlySupport48 === 'number') {
    return plan.monthlySupport48;
  }
  if (period === 60) return plan.monthlySupport60;
  if (Number.isFinite(period) && period > 0) {
    return Math.round(plan.totalSupport / period);
  }
  return plan.monthlySupport60;
}

export function calculateHiPlusSummary(
  counts: HiPlusCounts,
  period: number,
  hidden = false
) {
  if (hidden) {
    return {
      totalAccounts: 0,
      monthlyHiPlusSupport: 0,
      totalHiPlusSupport: 0,
      totalMonthlyDeposit: 0,
      totalMaturityRefund: 0,
      comboLabel: '',
      comboParts: [] as string[],
      activePlans: [] as {
        plan: HiPlusPlanSpec;
        count: number;
        monthlySupport: number;
        totalSupport: number;
      }[],
    };
  }
  const safeCounts = counts || { hi72: 0, hi90: 0, hi108: 0 };
  const totalAccounts =
    (safeCounts.hi72 || 0) + (safeCounts.hi90 || 0) + (safeCounts.hi108 || 0);

  const monthlyHiPlusSupport = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = safeCounts[plan.id] || 0;
    const unitMonthly = getHiPlusUnitMonthlySupport(plan, period);
    return sum + count * unitMonthly;
  }, 0);

  const totalHiPlusSupport = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = safeCounts[plan.id] || 0;
    return sum + count * plan.totalSupport;
  }, 0);

  const totalMonthlyDeposit = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = safeCounts[plan.id] || 0;
    return sum + count * plan.monthlyDeposit1to90;
  }, 0);

  const totalMaturityRefund = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = safeCounts[plan.id] || 0;
    return sum + count * plan.maturityRefund;
  }, 0);

  const comboParts: string[] = [];
  const activePlans: {
    plan: HiPlusPlanSpec;
    count: number;
    monthlySupport: number;
    totalSupport: number;
  }[] = [];

  HI_PLUS_PLANS.forEach((plan) => {
    const count = safeCounts[plan.id] || 0;
    if (count > 0) {
      const unitMonthly = getHiPlusUnitMonthlySupport(plan, period);
      comboParts.push(`웅진프리드라이프 ${plan.name} × ${count}구좌`);
      activePlans.push({
        plan,
        count,
        monthlySupport: unitMonthly,
        totalSupport: plan.totalSupport * count,
      });
    }
  });

  const comboLabel = comboParts.join(' + ');

  return {
    totalAccounts,
    monthlyHiPlusSupport,
    totalHiPlusSupport,
    totalMonthlyDeposit,
    totalMaturityRefund,
    comboLabel,
    comboParts,
    activePlans,
  };
}

export function getActiveCompareModes(state: ProposalState): QuoteMode[] {
  const raw = Array.isArray(state.compareModes) ? state.compareModes : [];
  const valid = raw.filter(
    (m): m is QuoteMode =>
      m === 'general' || m === 'subscription' || m === 'hybrid'
  );
  const unique = Array.from(new Set(valid));
  if (unique.length >= 2) {
    const order: QuoteMode[] = ['general', 'subscription', 'hybrid'];
    return order.filter((m) => unique.includes(m));
  }
  return [state.quoteMode];
}

export function hasMeaningfulGeneralItems(
  data?: GeneralPlanData | null
): boolean {
  if (!data || !Array.isArray(data.generalItems)) return false;
  return data.generalItems.some(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.unitPrice) || 0) > 0
  );
}

export function hasMeaningfulSubItems(data?: GeneralPlanData | null): boolean {
  if (!data || !Array.isArray(data.items)) return false;
  return data.items.some(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0 ||
      (Number(it.contractAmount) || 0) > 0
  );
}

export function resolveComparisonModePlanData(
  state: ProposalState,
  mode: QuoteMode
): GeneralPlanData {
  const liveData = extractGeneralPlanData(state);
  if (state.quoteMode === mode) {
    return liveData;
  }
  const configured = state.modeConfigs?.[mode]
    ? extractGeneralPlanData(state.modeConfigs[mode]!)
    : null;

  const genFallback =
    state.quoteMode === 'general' || hasMeaningfulGeneralItems(liveData)
      ? liveData
      : state.modeConfigs?.general &&
        hasMeaningfulGeneralItems(state.modeConfigs.general)
      ? extractGeneralPlanData(state.modeConfigs.general)
      : state.modeConfigs?.hybrid &&
        hasMeaningfulGeneralItems(state.modeConfigs.hybrid)
      ? extractGeneralPlanData(state.modeConfigs.hybrid)
      : liveData;

  const subFallback =
    state.quoteMode === 'subscription' || hasMeaningfulSubItems(liveData)
      ? liveData
      : state.modeConfigs?.subscription &&
        hasMeaningfulSubItems(state.modeConfigs.subscription)
      ? extractGeneralPlanData(state.modeConfigs.subscription)
      : state.modeConfigs?.hybrid &&
        hasMeaningfulSubItems(state.modeConfigs.hybrid)
      ? extractGeneralPlanData(state.modeConfigs.hybrid)
      : liveData;

  if (!configured) {
    return {
      ...liveData,
      generalItems: genFallback.generalItems,
      generalCardType: genFallback.generalCardType,
      instantDiscount: genFallback.instantDiscount,
      earnedPoints: genFallback.earnedPoints,
      pointUsed: genFallback.pointUsed,
      autoTierCashback: genFallback.autoTierCashback,
      manualTierCashback: genFallback.manualTierCashback,
      extraCashback: genFallback.extraCashback,
      extraBenefits: genFallback.extraBenefits,
      generalHiPreedCounts: genFallback.generalHiPreedCounts,
      hideHiPreed: genFallback.hideHiPreed,
      items: subFallback.items,
      subscriptionPeriod: subFallback.subscriptionPeriod,
      careService: subFallback.careService,
      warrantyType: subFallback.warrantyType,
      warrantyYears: subFallback.warrantyYears,
      allCare: subFallback.allCare,
      selectedCardId: subFallback.selectedCardId,
      selectedCardTierId: subFallback.selectedCardTierId,
      hiPlusCounts: subFallback.hiPlusCounts,
      hideSubPreed: subFallback.hideSubPreed,
      hiPlusPayoutMethod: subFallback.hiPlusPayoutMethod,
      countPreedTowardCardSpend: subFallback.countPreedTowardCardSpend,
      subAutoTierCashback: subFallback.subAutoTierCashback,
      subManualTierCashback: subFallback.subManualTierCashback,
      subExtraCashback: subFallback.subExtraCashback,
      subLotteBilling5p: subFallback.subLotteBilling5p,
    };
  }

  const needGenFallback =
    (mode === 'general' || mode === 'hybrid') &&
    !hasMeaningfulGeneralItems(configured) &&
    hasMeaningfulGeneralItems(genFallback);
  const needSubFallback =
    (mode === 'subscription' || mode === 'hybrid') &&
    !hasMeaningfulSubItems(configured) &&
    hasMeaningfulSubItems(subFallback);

  return {
    ...configured,
    ...(needGenFallback
      ? {
          generalItems: genFallback.generalItems,
          generalCardType: genFallback.generalCardType,
          instantDiscount: genFallback.instantDiscount,
          earnedPoints: genFallback.earnedPoints,
          pointUsed: genFallback.pointUsed,
          autoTierCashback: genFallback.autoTierCashback,
          manualTierCashback: genFallback.manualTierCashback,
          extraCashback: genFallback.extraCashback,
          extraBenefits: genFallback.extraBenefits,
          generalHiPreedCounts: genFallback.generalHiPreedCounts,
          hideHiPreed: genFallback.hideHiPreed,
        }
      : {}),
    ...(needSubFallback
      ? {
          items: subFallback.items,
          subscriptionPeriod: subFallback.subscriptionPeriod,
          careService: subFallback.careService,
          warrantyType: subFallback.warrantyType,
          warrantyYears: subFallback.warrantyYears,
          allCare: subFallback.allCare,
          selectedCardId: subFallback.selectedCardId,
          selectedCardTierId: subFallback.selectedCardTierId,
          hiPlusCounts: subFallback.hiPlusCounts,
          hideSubPreed: subFallback.hideSubPreed,
          hiPlusPayoutMethod: subFallback.hiPlusPayoutMethod,
          countPreedTowardCardSpend: subFallback.countPreedTowardCardSpend,
          subAutoTierCashback: subFallback.subAutoTierCashback,
          subManualTierCashback: subFallback.subManualTierCashback,
          subExtraCashback: subFallback.subExtraCashback,
          subLotteBilling5p: subFallback.subLotteBilling5p,
        }
      : {}),
  };
}

export function switchQuoteModeInState(
  prev: ProposalState,
  targetMode: QuoteMode
): ProposalState {
  if (prev.quoteMode === targetMode) return prev;
  const currentSnapshot = extractGeneralPlanData(prev);
  const targetData = resolveComparisonModePlanData(prev, targetMode);
  const emptyPlan2 = createEmptyGeneralPlanData(targetMode, 2);
  return {
    ...prev,
    quoteMode: targetMode,
    modeConfigs: {
      ...(prev.modeConfigs || {}),
      [prev.quoteMode]: currentSnapshot,
      [targetMode]: targetData,
    },
    activeGeneralPlan: 1,
    generalPlans: [targetData],
    generalPlan1: targetData,
    generalPlan2: emptyPlan2,
    ...targetData,
  };
}

export const createEmptyGeneralPlanData = (
  mode: QuoteMode,
  planNum: number = 1
): GeneralPlanData => ({
  generalItems: [
    {
      id: `gen-${mode}-p${planNum}-1`,
      category: "",
      modelName: "",
      quantity: 1,
      unitPrice: 0,
    },
  ],
  generalCardType: "미정",
  instantDiscount: 0,
  earnedPoints: 0,
  pointUsed: 0,
  autoTierCashback: true,
  manualTierCashback: 0,
  extraCashback: 0,
  extraBenefits: [],
  generalHiPreedCounts: {
    hf75: 0,
    hf150: 0,
    hf225: 0,
    hf300: 0,
  },
  hideHiPreed: false,
  items: [
    {
      id: `sub-${mode}-p${planNum}-1`,
      category: "",
      modelName: "",
      monthlyFee: 0,
      period: 60,
      careService: SUB_CARE_OPTIONS[0],
    },
  ],
  subscriptionPeriod: 60,
  careService: SUB_CARE_OPTIONS[0],
  warrantyType: "AS연장보험 + 가전수리올케어",
  warrantyYears: 5,
  allCare: true,
  selectedCardId: "none",
  selectedCardTierId: "",
  hiPlusCounts: {
    hi72: 0,
    hi90: 0,
    hi108: 0,
  },
  hideSubPreed: false,
  hiPlusPayoutMethod: "card_bank",
  countPreedTowardCardSpend: false,
  subAutoTierCashback: true,
  subManualTierCashback: 0,
  subExtraCashback: 0,
  subLotteBilling5p: false,
});

export const createInitialState = (mode: QuoteMode): ProposalState => {
  const plan1 = createEmptyGeneralPlanData(mode, 1);
  const plan2 = createEmptyGeneralPlanData(mode, 2);

  return {
    quoteMode: mode,
    activeGeneralPlan: 1,
    generalPlans: [plan1],
    generalPlan1: plan1,
    generalPlan2: plan2,
    ...plan1,
  };
};

// ==================== HISIS 판매접수등록 전표 → ProposalState 정식 빌더 ====================
export interface HisisSlipGeneralItemInput {
  category: string;
  modelName: string;
  productName?: string;
  quantity: number;
  /** 전산 접수금액 (행 합계) */
  receiptAmount: number;
  /** 전산 에누리 (행 합계) */
  discountAmount?: number;
  /** 전산 실구매가 (행 합계) */
  actualPrice: number;
}

export interface HisisSlipSubscriptionItemInput {
  category: string;
  modelName: string;
  /** 하단 [결제] 영역 신용카드 결제금액 기준 구독 약정원금 */
  contractAmount: number;
  /** SET-CARD 뒤 숫자(36 | 48 | 60) */
  period: SubscriptionPeriod;
  /** 월 구독료 (미지정 시 Math.round(contractAmount / period)) */
  monthlyFee?: number;
  careService?: string;
  warrantyType?: string;
}

export interface BuildProposalFromHisisSlipInput {
  mode: 'general' | 'subscription';
  generalItems?: HisisSlipGeneralItemInput[];
  subscriptionItems?: HisisSlipSubscriptionItemInput[];
  generalCardType?: GeneralCardType;
}

/**
 * HISIS [판매접수등록] 전표 추출 품목 데이터를 통합 견적기에서 즉시 열어 수정·공유 가능한
 * 정식 ProposalState 객체로 1원 오차 없이 변환합니다.
 */
export function buildProposalStateFromHisisSlip(
  input: BuildProposalFromHisisSlipInput
): ProposalState {
  if (input.mode === 'subscription') {
    const base = createInitialState('subscription');
    const rawSubs = Array.isArray(input.subscriptionItems)
      ? input.subscriptionItems
      : [];

    const builtSubItems: SubscriptionItem[] =
      rawSubs.length > 0
        ? rawSubs.map((it, idx) => {
            const period = normalizeSubscriptionPeriod(it.period, 60);
            const contractAmount = Math.max(
              0,
              Math.round(Number(it.contractAmount) || 0)
            );
            const monthlyFee =
              it.monthlyFee !== undefined && Number(it.monthlyFee) > 0
                ? Math.round(Number(it.monthlyFee))
                : period > 0
                ? Math.round(contractAmount / period)
                : 0;
            const cleanModel = (it.modelName || '').trim();
            const cleanCat = (it.category || '').trim() || '구독가전';
            return {
              id: `hisis-sub-${Date.now()}-${idx}`,
              category: cleanCat,
              modelName: cleanModel,
              modelCode: cleanModel,
              monthlyFee,
              contractAmount,
              period,
              careService: it.careService || SUB_CARE_OPTIONS[0],
              careType: it.careService || SUB_CARE_OPTIONS[0],
              warrantyType: it.warrantyType || 'AS연장보험 + 가전수리올케어',
            };
          })
        : base.generalPlan1.items;

    const repPeriod = normalizeSubscriptionPeriod(
      builtSubItems[0]?.period,
      60
    );

    const plan1: GeneralPlanData = {
      ...base.generalPlan1,
      items: builtSubItems,
      subscriptionPeriod: repPeriod,
      careService: builtSubItems[0]?.careService || SUB_CARE_OPTIONS[0],
      warrantyType:
        builtSubItems[0]?.warrantyType || 'AS연장보험 + 가전수리올케어',
      warrantyYears: 5,
      allCare: true,
      selectedCardId: 'none',
      selectedCardTierId: '',
      subAutoTierCashback: false,
      subManualTierCashback: 0,
      subExtraCashback: 0,
      subLotteBilling5p: false,
    };

    return {
      ...base,
      quoteMode: 'subscription',
      activeGeneralPlan: 1,
      generalPlans: [plan1],
      generalPlan1: plan1,
      ...plan1,
    };
  }

  // 일반구매 전표: payPrice === 실구매가 합계, rawNet === 실구매가 합계 1원 오차 없이 일치
  const base = createInitialState('general');
  const rawGen = Array.isArray(input.generalItems) ? input.generalItems : [];

  let totalInstantDiscount = 0;
  const builtGeneralItems: GeneralPurchaseItem[] =
    rawGen.length > 0
      ? rawGen.map((it, idx) => {
          const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
          const actual = Math.max(0, Math.round(Number(it.actualPrice) || 0));
          const receipt = Math.max(
            actual,
            Math.round(Number(it.receiptAmount) || actual)
          );

          let unitPrice = 0;
          let itemDiscount = 0;

          if (receipt > actual) {
            unitPrice =
              receipt % qty === 0 ? receipt / qty : Math.ceil(receipt / qty);
            itemDiscount = Math.max(0, unitPrice * qty - actual);
          } else {
            unitPrice =
              actual % qty === 0 ? actual / qty : Math.ceil(actual / qty);
            itemDiscount = Math.max(0, unitPrice * qty - actual);
          }

          totalInstantDiscount += itemDiscount;

          const cleanModel = (it.modelName || '').trim();
          const cleanCat = (it.category || '').trim() || '일반가전';

          return {
            id: `hisis-gen-${Date.now()}-${idx}`,
            category: cleanCat,
            modelName: cleanModel,
            code: cleanModel,
            name: it.productName || cleanCat,
            quantity: qty,
            qty,
            unitPrice,
            price: unitPrice * qty,
            discount1: idx === 0 ? itemDiscount : 0,
            discount2: 0,
            cashback: 0,
          };
        })
      : base.generalPlan1.generalItems;

  if (builtGeneralItems.length > 0 && totalInstantDiscount > 0) {
    builtGeneralItems[0] = {
      ...builtGeneralItems[0],
      discount1: totalInstantDiscount,
    };
  }

  const plan1: GeneralPlanData = {
    ...base.generalPlan1,
    generalItems: builtGeneralItems,
    generalCardType: input.generalCardType || '일반카드',
    instantDiscount: totalInstantDiscount,
    earnedPoints: 0,
    pointUsed: 0,
    autoTierCashback: false,
    manualTierCashback: 0,
    extraCashback: 0,
    extraBenefits: [],
  };

  return {
    ...base,
    quoteMode: 'general',
    activeGeneralPlan: 1,
    generalPlans: [plan1],
    generalPlan1: plan1,
    ...plan1,
  };
}
