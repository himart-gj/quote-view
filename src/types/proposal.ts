export type QuoteMode = 'general' | 'subscription' | 'hybrid';
export type AppStep = 'home' | 'input' | 'proposal' | 'pop-printer' | 'crm' | 'himobile' | 'insurance' | 'care-table' | 'lotte-plan' | 'allcare-guide' | 'marketing-db';
export type SubscriptionPeriod = 36 | 60;

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
  depositMonths: number; // 150 (1~150회차)
  maturityRefund: number; // 4,950,000 | 9,900,000 | 14,850,000 | 19,800,000
}

export const MAX_GENERAL_HIPREED_ACCOUNTS = 8;
export const MAX_LIFECARE_TOTAL_ACCOUNTS = 8;

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

export function calculateGeneralHiPreedSummary(counts: GeneralHiPreedCounts) {
  const totalAccounts =
    (counts.hf75 || 0) +
    (counts.hf150 || 0) +
    (counts.hf225 || 0) +
    (counts.hf300 || 0);

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
    const count = counts[plan.id] || 0;
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

/**
 * 실제 카드 결제가(payPrice) 기준 금액대별 자동 캐시백 계산
 * 2,000만원 이상: 1,000,000원
 * 1,500만원 이상: 750,000원
 * 1,200만원 이상: 600,000원
 * 1,000만원 이상: 500,000원
 * 700만원 이상: 350,000원
 * 500만원 이상: 250,000원
 * 300만원 이상: 150,000원
 * 300만원 미만 또는 카드 '미정': 0원
 */
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

/**
 * 구독구매 전용: 삼성제휴카드 · 신한제휴카드 선택 시 구독원금 합계(totalPrincipal)가
 * 300만원 이상이면 일반 견적기와 동일한 금액대별 캐시백 구간을 자동 지급합니다.
 * (우리카드 · 롯데카드 · 미적용 또는 원금 300만원 미만: 0원)
 */
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
  subAutoTierCashback?: boolean;
  subManualTierCashback?: number;
  subExtraCashback?: number;
}

export function extractGeneralPlanData(
  source: GeneralPlanData
): GeneralPlanData {
  return {
    generalItems: (source.generalItems || []).map((it) => ({ ...it })),
    generalCardType: source.generalCardType || '미정',
    instantDiscount: Number(source.instantDiscount) || 0,
    earnedPoints: Number(source.earnedPoints) || 0,
    pointUsed: Number(source.pointUsed) || 0,
    autoTierCashback: source.autoTierCashback ?? true,
    manualTierCashback: Number(source.manualTierCashback) || 0,
    extraCashback: Number(source.extraCashback) || 0,
    extraBenefits: (source.extraBenefits || []).map((b) => ({ ...b })),
    generalHiPreedCounts: {
      hf75: 0,
      hf150: 0,
      hf225: 0,
      hf300: 0,
      ...(source.generalHiPreedCounts || {}),
    },

    items: (source.items || []).map((it) => ({
      ...it,
      period:
        it.period === 36
          ? 36
          : it.period === 60
          ? 60
          : source.subscriptionPeriod === 36
          ? 36
          : 60,
    })),
    subscriptionPeriod: source.subscriptionPeriod === 36 ? 36 : 60,
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
    subAutoTierCashback: source.subAutoTierCashback ?? true,
    subManualTierCashback: Math.max(0, Number(source.subManualTierCashback) || 0),
    subExtraCashback: Math.max(0, Number(source.subExtraCashback) || 0),
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

    items: (source.items || []).map((it, idx) => ({
      ...it,
      id: `${idPrefix}-sub-${Date.now()}-${idx}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      period:
        it.period === 36
          ? 36
          : it.period === 60
          ? 60
          : source.subscriptionPeriod === 36
          ? 36
          : 60,
    })),
    subscriptionPeriod: source.subscriptionPeriod === 36 ? 36 : 60,
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
    subAutoTierCashback: source.subAutoTierCashback ?? true,
    subManualTierCashback: Math.max(0, Number(source.subManualTierCashback) || 0),
    subExtraCashback: Math.max(0, Number(source.subExtraCashback) || 0),
  };
}

export function switchGeneralPlanInState(
  prev: ProposalState,
  targetPlan: 1 | 2
): ProposalState {
  if (prev.activeGeneralPlan === targetPlan) return prev;

  const currentSnapshot = extractGeneralPlanData(prev);
  if (targetPlan === 2) {
    // 1안 -> 2안으로 전환: 현재 값을 generalPlan1에 저장하고 generalPlan2를 활성 필드로 로드
    const nextActive = extractGeneralPlanData(prev.generalPlan2);
    return {
      ...prev,
      activeGeneralPlan: 2,
      generalPlan1: currentSnapshot,
      ...nextActive,
    };
  } else {
    // 2안 -> 1안으로 전환: 현재 값을 generalPlan2에 저장하고 generalPlan1을 활성 필드로 로드
    const nextActive = extractGeneralPlanData(prev.generalPlan1);
    return {
      ...prev,
      activeGeneralPlan: 1,
      generalPlan2: currentSnapshot,
      ...nextActive,
    };
  }
}

export function copyPlan1ToPlan2InState(prev: ProposalState): ProposalState {
  const plan1Source =
    prev.activeGeneralPlan === 1
      ? extractGeneralPlanData(prev)
      : extractGeneralPlanData(prev.generalPlan1);

  const clonedForPlan2 = cloneGeneralPlanData(plan1Source, 'plan2');

  return {
    ...prev,
    activeGeneralPlan: 2,
    generalPlan1: plan1Source,
    generalPlan2: extractGeneralPlanData(clonedForPlan2),
    ...clonedForPlan2,
  };
}

export function calculateGeneralPurchaseSummary(state: GeneralPlanData) {
  const items = state.generalItems || [];
  const validItems = items.filter(
    (it) => (it.category || '').trim() !== '' || (Number(it.unitPrice) || 0) > 0
  );
  const displayItems = validItems.length > 0 ? validItems : items;

  // 총 행사가 합계
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

  // 추가 혜택 분리 ('discount' = 즉시할인성 추가혜택, 'etc' = 기타 캐시백/사은품 등 추가혜택)
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

  // 1단계 차감: 즉시할인 혜택 합계 = 기본 즉시할인 + 추가혜택 중 '즉시할인' + 포인트 즉시사용액
  const totalStep1InstantDiscount =
    instantDiscount + extraDiscountSum + pointUsed;

  const freedSummary = calculateGeneralHiPreedSummary(
    state.generalHiPreedCounts || { hf75: 0, hf150: 0, hf225: 0, hf300: 0 }
  );
  const hiFreedAccounts = freedSummary.totalAccounts;
  const hiFreedSupport = freedSummary.totalSupport;
  const hiFreedMonthlyInstallment35 = freedSummary.monthlyInstallment35;
  const hiFreedMonthlyDeposit = freedSummary.totalMonthlyDeposit;
  const hiFreedMaturityRefund = freedSummary.totalMaturityRefund;

  // 고객 실 결제부담금 (실결제가: payPrice)
  const payPrice = Math.max(
    0,
    sum - totalStep1InstantDiscount - hiFreedSupport
  );

  // 금액대별 캐시백: 카드 선택 시('미정'이 아닐 때) 실결제가(payPrice) 기준으로 자동 계산 (수동 수정 시 수동값 반영)
  const tierCashback =
    state.autoTierCashback !== false
      ? calculateAutoTierCashback(payPrice, state.generalCardType)
      : Math.max(0, Number(state.manualTierCashback) || 0);

  // 배송익월 추가 캐시백
  const extraCashback = Math.max(0, Number(state.extraCashback) || 0);

  // 2단계 차감 1: 캐시백 혜택 합계 (금액대별 캐시백 + 배송익월 추가 캐시백)
  const totalStep2Cashback = tierCashback + extraCashback;

  // 2단계 차감 2: 추가 혜택 합계 (즉시할인 외 기타 추가혜택 + 잔여 적립포인트)
  const totalStep2ExtraBenefit = extraEtcSum + remainingPoints;

  // 최종 혜택가 (체감 구매가: rawNet)
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

export function getSubscriptionPeriodSummary(
  items: SubscriptionItem[],
  fallbackPeriod: SubscriptionPeriod = 60
) {
  const safeFallback: SubscriptionPeriod = fallbackPeriod === 36 ? 36 : 60;
  const list = items || [];

  const itemPeriods: SubscriptionPeriod[] =
    list.length > 0
      ? list.map((it) =>
          it.period === 36 ? 36 : it.period === 60 ? 60 : safeFallback
        )
      : [safeFallback];

  const all36 = itemPeriods.every((p) => p === 36);
  const all60 = itemPeriods.every((p) => p === 60);
  const isMixedPeriod = !all36 && !all60;

  const periodLabel = all36
    ? '36개월'
    : all60
    ? '60개월'
    : '36·60개월 맞춤';

  // 대표 개월수: 60개월 품목이 하나라도 있으면 60, 전부 36개월이면 36
  const representativePeriod: SubscriptionPeriod = all36 ? 36 : 60;

  const totalBaseMonthly = list.reduce(
    (sum, item) => sum + Math.max(0, Number(item.monthlyFee) || 0),
    0
  );

  // 각 구독 품목의 개별 원금 (전산 OCR contractAmount 반올림 오차 ±period*5원 이내면 전산 원금 우선 사용하여 CRM 총판·실판 원금과 1원 단위 일치 보장)
  const totalPrincipal = list.reduce((sum, item) => {
    const itemPeriod: SubscriptionPeriod =
      item.period === 36 ? 36 : item.period === 60 ? 60 : safeFallback;
    const monthly = Math.max(0, Number(item.monthlyFee) || 0);
    const byMonthly = monthly * itemPeriod;
    const explicitContract = Math.max(0, Number(item.contractAmount) || 0);
    if (
      explicitContract > 0 &&
      (monthly === 0 || Math.abs(explicitContract - byMonthly) <= itemPeriod * 5)
    ) {
      return sum + explicitContract;
    }
    return sum + byMonthly;
  }, 0);

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

export function calculateSubscriptionSummary(planData: GeneralPlanData) {
  const items = planData.items || [];
  const validItems = items.filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0
  );
  const displayItems = validItems.length > 0 ? validItems : items;

  const fallbackPeriod: SubscriptionPeriod =
    planData.subscriptionPeriod === 36 ? 36 : 60;
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
      const itemPeriod =
        it.period === 36 ? 36 : it.period === 60 ? 60 : fallbackPeriod;
      if (cat && mod) return `${cat}(${mod}·${itemPeriod}M)`;
      return `${cat || mod}(${itemPeriod}M)`;
    })
    .filter(Boolean);

  const totalBaseMonthly = periodInfo.totalBaseMonthly;
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
    representativePeriod
  );
  const hiPlusMonthly = hiSummary.monthlyHiPlusSupport;

  // 삼성·신한 제휴카드 구독원금 300만원 이상 금액대별 캐시백 + 구독 추가 캐시백
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

  // 일시 지급 캐시백(금액대별 캐시백 + 구독 추가 캐시백)은 1회 입금이므로
  // 월환산으로 나누지 않고 최종 기간 총 체감가(finalTotalFee)에서만 일시 차감합니다.
  const monthlyCashbackEquiv = 0;

  // 매월 실제 청구·월지원 차감 후 월 체감 구독료 (제휴카드 월 할인 + 구독프리드 월 지원금)
  const monthlyBillingAfterCardAndHiPlus =
    totalBaseMonthly - cardDiscount - hiPlusMonthly;

  const finalMonthlyFee = monthlyBillingAfterCardAndHiPlus;

  const totalMonthlyDiscountOverTerm =
    (cardDiscount + hiPlusMonthly) * representativePeriod;
  const totalTermBillingBeforeCashback =
    totalPrincipal - totalMonthlyDiscountOverTerm;

  const totalSubBenefit =
    totalMonthlyDiscountOverTerm + totalSubCashback;
  const finalTotalFee = totalPrincipal - totalSubBenefit;

  const hasSubData =
    totalBaseMonthly > 0 ||
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
    totalBaseMonthly,
    totalMonthlyFee: totalBaseMonthly,
    totalPrincipal,
    currentCard,
    currentCardTier,
    cardDiscount,
    hiSummary,
    hiPlusMonthly,
    isTierCashbackCard,
    autoSubTierCashback,
    subTierCashback,
    subExtraCashback,
    totalSubCashback,
    monthlyCashbackEquiv,
    monthlyBillingAfterCardAndHiPlus,
    totalMonthlyDiscountOverTerm,
    totalTermBillingBeforeCashback,
    finalMonthlyFee,
    finalTotalFee,
    totalSubBenefit,
    hasSubData,
  };
}

export function getGeneralPlan1And2Summaries(state: ProposalState) {
  const plan1Data =
    state.activeGeneralPlan === 1
      ? extractGeneralPlanData(state)
      : extractGeneralPlanData(state.generalPlan1);
  const plan2Data =
    state.activeGeneralPlan === 2
      ? extractGeneralPlanData(state)
      : extractGeneralPlanData(state.generalPlan2);

  const plan1Summary = calculateGeneralPurchaseSummary(plan1Data);
  const plan2Summary = calculateGeneralPurchaseSummary(plan2Data);

  const plan1SubSummary = calculateSubscriptionSummary(plan1Data);
  const plan2SubSummary = calculateSubscriptionSummary(plan2Data);

  const hasPlan1Gen =
    plan1Summary.sum > 0 ||
    plan1Data.generalItems.some(
      (it) =>
        (it.category || '').trim() !== '' || (it.modelName || '').trim() !== ''
    );
  const hasPlan2Gen =
    plan2Summary.sum > 0 ||
    plan2Data.generalItems.some(
      (it) =>
        (it.category || '').trim() !== '' || (it.modelName || '').trim() !== ''
    );

  const hasPlan1Data =
    state.quoteMode === 'general'
      ? hasPlan1Gen
      : state.quoteMode === 'subscription'
      ? plan1SubSummary.hasSubData
      : hasPlan1Gen || plan1SubSummary.hasSubData;

  const hasPlan2Data =
    state.quoteMode === 'general'
      ? hasPlan2Gen
      : state.quoteMode === 'subscription'
      ? plan2SubSummary.hasSubData
      : hasPlan2Gen || plan2SubSummary.hasSubData;

  return {
    plan1Data,
    plan2Data,
    plan1Summary,
    plan2Summary,
    plan1SubSummary,
    plan2SubSummary,
    hasPlan1Data,
    hasPlan2Data,
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
  monthlyDiscount: number;
}

export interface AffiliateCardSpec {
  id: AffiliateCardId;
  name: string;
  shortName: string;
  benefitType: '청구할인' | '캐시백' | '미적용';
  tiers: CardTier[];
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
  monthlySupport60: number; // 12,000 | 15,000 | 18,000
  monthlyDeposit1to90: number; // 40,000 | 50,000 | 60,000
  depositMonths: number; // 90 (1~90회차 납입)
  deferMonths: number; // 30 (91~120회차 월 0원 거치)
  maturityRefund: number; // 3,600,000 | 4,500,000 | 5,400,000 (120회 만기 100% 환급 원금)
}

export interface ProposalState {
  quoteMode: QuoteMode;

  // 일반구매(일시불) 현재 활성 안 상태 (1안 또는 2안)
  activeGeneralPlan: 1 | 2;
  generalPlan1: GeneralPlanData;
  generalPlan2: GeneralPlanData;

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
  subAutoTierCashback?: boolean;
  subManualTierCashback?: number;
  subExtraCashback?: number;
}

export const MAX_HI_PLUS_ACCOUNTS = 8;

export const AFFILIATE_CARDS: AffiliateCardSpec[] = [
  {
    id: 'woori',
    name: '우리 제휴카드',
    shortName: '우리 제휴카드',
    benefitType: '청구할인',
    tiers: [
      { id: 'woori-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', monthlyDiscount: 18000 },
      { id: 'woori-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', monthlyDiscount: 20000 },
      { id: 'woori-120', minSpendLabel: '전월 실적 120만원 이상', minSpendShort: '120만원', monthlyDiscount: 22000 },
    ],
  },
  {
    id: 'lotte',
    name: '롯데 제휴카드',
    shortName: '롯데 제휴카드',
    benefitType: '캐시백',
    tiers: [
      { id: 'lotte-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', monthlyDiscount: 18000 },
      { id: 'lotte-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', monthlyDiscount: 20000 },
      { id: 'lotte-150', minSpendLabel: '전월 실적 150만원 이상', minSpendShort: '150만원', monthlyDiscount: 22000 },
    ],
  },
  {
    id: 'samsung',
    name: '삼성 제휴카드',
    shortName: '삼성 제휴카드',
    benefitType: '청구할인',
    tiers: [
      { id: 'samsung-30', minSpendLabel: '전월 실적 30만원 이상', minSpendShort: '30만원', monthlyDiscount: 13000 },
      { id: 'samsung-70', minSpendLabel: '전월 실적 70만원 이상', minSpendShort: '70만원', monthlyDiscount: 17000 },
      { id: 'samsung-150', minSpendLabel: '전월 실적 150만원 이상', minSpendShort: '150만원', monthlyDiscount: 20000 },
    ],
  },
  {
    id: 'shinhan',
    name: '신한 제휴카드',
    shortName: '신한 제휴카드',
    benefitType: '캐시백',
    tiers: [
      { id: 'shinhan-50', minSpendLabel: '전월 실적 50만원 이상', minSpendShort: '50만원', monthlyDiscount: 10000 },
      { id: 'shinhan-100', minSpendLabel: '전월 실적 100만원 이상', minSpendShort: '100만원', monthlyDiscount: 20000 },
      { id: 'shinhan-200', minSpendLabel: '전월 실적 200만원 이상', minSpendShort: '200만원', monthlyDiscount: 30000 },
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
    monthlySupport60: 18000,
    monthlyDeposit1to90: 60000,
    depositMonths: 90,
    deferMonths: 30,
    maturityRefund: 5400000,
  },
];

export function calculateHiPlusSummary(
  counts: HiPlusCounts,
  period: SubscriptionPeriod
) {
  const totalAccounts = counts.hi72 + counts.hi90 + counts.hi108;

  const monthlyHiPlusSupport = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = counts[plan.id] || 0;
    const unitMonthly =
      period === 36 ? plan.monthlySupport36 : plan.monthlySupport60;
    return sum + count * unitMonthly;
  }, 0);

  const totalHiPlusSupport = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = counts[plan.id] || 0;
    return sum + count * plan.totalSupport;
  }, 0);

  const totalMonthlyDeposit = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = counts[plan.id] || 0;
    return sum + count * plan.monthlyDeposit1to90;
  }, 0);

  const totalMaturityRefund = HI_PLUS_PLANS.reduce((sum, plan) => {
    const count = counts[plan.id] || 0;
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
    const count = counts[plan.id] || 0;
    if (count > 0) {
      const unitMonthly =
        period === 36 ? plan.monthlySupport36 : plan.monthlySupport60;
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
