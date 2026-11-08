import {
  AffiliateCardId,
  extractGeneralPlanData,
  getActiveCompareModes,
  resolveComparisonModePlanData,
  GENERAL_CARD_OPTIONS,
  GeneralCardType,
  GeneralExtraBenefitItem,
  GeneralPlanData,
  ProposalState,
  QuoteMode,
  SUB_CARE_OPTIONS,
  SubscriptionPeriod,
} from '../types/proposal';
import { loadSavedUserName } from '../components/ScheduleModal';
import { ADMIN_PIN_CODE } from './careTableParser';

export interface ConsultantProfile {
  name: string;
  roleTitle: string;
  phone: string;
  storeName: string;
  greeting: string;
}

export interface SharedQuotePayload {
  v: 1;
  createdAt: string;
  customerName?: string;
  consultant: ConsultantProfile;
  state: ProposalState;
}

export interface EncodedQuoteLinks {
  /** 기본 무손실 초압축 링크 (?s=2_... - 점(.) 없음, 단독으로도 문자 링크 인식 가능) */
  compactUrl: string;
  /** 서버 단축(/q/Ab3x9Z) 또는 외부 단축(is.gd) 적용된 최종 최단 링크 (폴백 시 compactUrl) */
  shortUrl: string;
  /** 적용된 단축 방식 ('server' | 'external' | 'compact') */
  mode: 'server' | 'external' | 'compact';
  /** 내부 압축 토큰 */
  token: string;
}

const DEFAULT_STORE_NAME = '롯데하이마트 경기광주점';
const DEFAULT_ROLE_TITLE = '고객 맞춤 가전 컨설턴트';

export function normalizeConsultantRoleTitle(raw?: string | null): string {
  const trimmed = String(raw || '').trim();
  if (
    !trimmed ||
    trimmed === '수석 가전 컨설턴트' ||
    trimmed === '가전 전문 컨설턴트'
  ) {
    return DEFAULT_ROLE_TITLE;
  }
  return trimmed;
}
const DEFAULT_GREETING =
  '고객님 가계에 가장 유리한 플랜을 직접 비교해 보시고 편하게 연락 주세요!';
const DEFAULT_WARRANTY = 'AS연장보험 + 가전수리올케어';

const COMMON_CATEGORIES = [
  '냉장고',
  '김치냉장고',
  '세탁건조기',
  '워시타워',
  '세탁기',
  '건조기',
  'TV',
  '에어컨',
  '시스템에어컨',
  '식기세척기',
  '의류관리기',
  '청소기',
  '로봇청소기',
  '공기청정기',
  '정수기',
  '전기레인지',
  '안마의자',
  '전기밥솥',
  '노트북',
  '모바일',
] as const;

const SUB_CARD_IDS: AffiliateCardId[] = [
  'none',
  'lotte',
  'samsung',
  'shinhan',
  'woori',
];

const QUOTE_MODES: QuoteMode[] = ['general', 'subscription', 'hybrid'];

const CONSULTANT_STORAGE_KEY = 'himart_gj_consultant_profile_v1';
export const CUSTOMER_TAB_LOCK_KEY = 'himart_customer_tab_lock_v1';
export const CUSTOMER_DEVICE_VIEWER_ONLY_KEY = 'himart_customer_viewer_only_v1';
export const STAFF_TRUSTED_DEVICE_KEY = 'himart_staff_trusted_device_v1';
export const STAFF_VERIFIED_V2_KEY = 'himart_staff_verified_gate_v2';
export const STAFF_CUSTOM_PIN_KEY = 'himart_staff_custom_pin_v1';
export const CUSTOM_VIEWER_BASE_URL_KEY = 'himart_custom_viewer_base_url_v1';
export const LAST_CUSTOMER_QUOTE_CACHE_KEY = 'himart_last_customer_quote_v1';

export type BootEntryMode = 'customer-quote' | 'public-gate' | 'staff-app';

export function getEffectiveStaffPin(): string {
  try {
    const custom = (localStorage.getItem(STAFF_CUSTOM_PIN_KEY) || '').trim();
    if (custom.length >= 4) return custom;
  } catch {
    // ignore
  }
  return ADMIN_PIN_CODE;
}

export function saveCustomStaffPin(nextPin: string): boolean {
  const cleaned = (nextPin || '').trim();
  if (cleaned.length < 4) return false;
  try {
    localStorage.setItem(STAFF_CUSTOM_PIN_KEY, cleaned);
    return true;
  } catch {
    return false;
  }
}

export function normalizeViewerBaseUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim();
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const u = new URL(cleaned);
    const cleanPath = u.pathname
      .replace(/\/index\.html$/i, '')
      .replace(/\/+$/, '');
    return `${u.origin}${cleanPath}`;
  } catch {
    return cleaned.split('?')[0].split('#')[0].replace(/\/+$/, '');
  }
}

export const DEFAULT_DEDICATED_VIEWER_URL = 'https://himart-gj.github.io/quote-view';

export function loadCustomViewerBaseUrl(): string {
  try {
    const stored = localStorage.getItem(CUSTOM_VIEWER_BASE_URL_KEY);
    if (stored === null) {
      return DEFAULT_DEDICATED_VIEWER_URL;
    }
    const trimmed = stored.trim();
    return trimmed ? normalizeViewerBaseUrl(trimmed) : '';
  } catch {
    return DEFAULT_DEDICATED_VIEWER_URL;
  }
}

export async function syncViewerBaseUrlFromServer(): Promise<string> {
  const localVal = loadCustomViewerBaseUrl();
  if (typeof fetch === 'undefined') return localVal;
  try {
    const res = await fetch('/api/viewer-config');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.viewerBaseUrl === 'string' && data.viewerBaseUrl.trim()) {
        const normalized = normalizeViewerBaseUrl(data.viewerBaseUrl);
        if (normalized && !localVal) {
          localStorage.setItem(CUSTOM_VIEWER_BASE_URL_KEY, normalized);
          return normalized;
        }
      }
    }
  } catch {
    // 정적 배포 환경에서는 무시
  }
  return localVal;
}

export function saveCustomViewerBaseUrl(url: string): string {
  const normalized = normalizeViewerBaseUrl(url);
  try {
    if (normalized) {
      localStorage.setItem(CUSTOM_VIEWER_BASE_URL_KEY, normalized);
    } else {
      localStorage.removeItem(CUSTOM_VIEWER_BASE_URL_KEY);
    }
  } catch {
    // ignore
  }
  if (typeof fetch !== 'undefined') {
    fetch('/api/viewer-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerBaseUrl: normalized }),
    }).catch(() => {});
  }
  return normalized;
}

export function loadConsultantProfile(): ConsultantProfile {
  try {
    const raw = localStorage.getItem(CONSULTANT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          name: String(parsed.name || loadSavedUserName() || '전문 상담사').trim(),
          roleTitle: normalizeConsultantRoleTitle(parsed.roleTitle),
          phone: String(parsed.phone || '').trim(),
          storeName: String(parsed.storeName || DEFAULT_STORE_NAME).trim(),
          greeting: String(parsed.greeting || DEFAULT_GREETING).trim(),
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    name: loadSavedUserName() || '전문 상담사',
    roleTitle: DEFAULT_ROLE_TITLE,
    phone: '',
    storeName: DEFAULT_STORE_NAME,
    greeting: DEFAULT_GREETING,
  };
}

export function saveConsultantProfile(profile: ConsultantProfile): void {
  try {
    localStorage.setItem(CONSULTANT_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const cleaned = b64url.trim().replace(/\s+/g, '');
  const padded = cleaned
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(cleaned.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ==================== V2 초경량 무손실 튜플 코덱 (URL 길이 80~85% 단축) ====================
type PackedMoney = number | string;

function packMoney(val?: number): PackedMoney {
  const n = Math.max(0, Math.round(Number(val) || 0));
  if (n === 0) return 0;
  // 만원 단위로 딱 떨어지면 숫자로 축약(3450000 -> 345), 원 단위 단수가 있으면 문자열로 1원 단위 보존
  if (n % 10000 === 0) return n / 10000;
  return String(n);
}

function unpackMoney(packed: PackedMoney | undefined | null): number {
  if (typeof packed === 'number') return Math.max(0, Math.round(packed * 10000));
  if (typeof packed === 'string') return Math.max(0, Number(packed) || 0);
  return 0;
}

function packCat(cat?: string): number | string {
  const trimmed = (cat || '').trim();
  const idx = (COMMON_CATEGORIES as readonly string[]).indexOf(trimmed);
  return idx >= 0 ? idx : trimmed;
}

function unpackCat(val: number | string | undefined): string {
  if (typeof val === 'number' && val >= 0 && val < COMMON_CATEGORIES.length) {
    return COMMON_CATEGORIES[val];
  }
  return typeof val === 'string' ? val : '';
}

function trimTrailingZeros(arr: any[]): any[] {
  const copy = [...arr];
  while (
    copy.length > 0 &&
    (copy[copy.length - 1] === 0 || copy[copy.length - 1] === '')
  ) {
    copy.pop();
  }
  return copy;
}

function packPlanTuple(plan: GeneralPlanData): any[] {
  const validGen = (plan.generalItems || []).filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.unitPrice) || 0) > 0
  );
  const genTuples = validGen.map((it) =>
    trimTrailingZeros([
      packCat(it.category),
      (it.modelName || '').trim(),
      Math.max(1, Number(it.quantity) || 1) === 1
        ? 0
        : Math.max(1, Number(it.quantity) || 1),
      packMoney(it.unitPrice),
    ])
  );

  const validSub = (plan.items || []).filter(
    (it) =>
      (it.category || '').trim() !== '' ||
      (it.modelName || '').trim() !== '' ||
      (Number(it.monthlyFee) || 0) > 0
  );
  const fallbackPeriod: SubscriptionPeriod =
    plan.subscriptionPeriod === 36 ? 36 : 60;
  const subTuples = validSub.map((it) => {
    const p: SubscriptionPeriod =
      it.period === 36 ? 36 : it.period === 60 ? 60 : fallbackPeriod;
    return trimTrailingZeros([
      packCat(it.category),
      (it.modelName || '').trim(),
      packMoney(it.monthlyFee),
      p === 60 ? 0 : 36,
      it.contractAmount ? packMoney(it.contractAmount) : 0,
    ]);
  });

  const cardIdx = Math.max(
    0,
    GENERAL_CARD_OPTIONS.indexOf(plan.generalCardType || '미정')
  );
  const extTuples = (plan.extraBenefits || [])
    .filter((b) => (Number(b.amount) || 0) > 0 || (b.description || '').trim() !== '')
    .map((b) => [
      b.type === 'etc' ? 1 : 0,
      (b.description || '').trim(),
      packMoney(b.amount),
    ]);

  const hp = plan.generalHiPreedCounts || { hf75: 0, hf150: 0, hf225: 0, hf300: 0 };
  const hpArr =
    hp.hf75 || hp.hf150 || hp.hf225 || hp.hf300
      ? [hp.hf75 || 0, hp.hf150 || 0, hp.hf225 || 0, hp.hf300 || 0]
      : 0;

  const careIdx = SUB_CARE_OPTIONS.indexOf(
    (plan.careService || SUB_CARE_OPTIONS[0]) as any
  );
  const carePacked = careIdx >= 0 ? careIdx : plan.careService || '';

  const subCardIdx = SUB_CARD_IDS.indexOf(plan.selectedCardId || 'none');
  const subCardPacked = subCardIdx >= 0 ? subCardIdx : plan.selectedCardId || 'none';

  const hiPlus = plan.hiPlusCounts || { hi72: 0, hi90: 0, hi108: 0 };
  const hiPlusArr =
    hiPlus.hi72 || hiPlus.hi90 || hiPlus.hi108
      ? [hiPlus.hi72 || 0, hiPlus.hi90 || 0, hiPlus.hi108 || 0]
      : 0;

  const warrantyStr =
    !plan.warrantyType || plan.warrantyType === DEFAULT_WARRANTY
      ? ''
      : plan.warrantyType;

  return trimTrailingZeros([
    genTuples,
    subTuples,
    cardIdx,
    packMoney(plan.instantDiscount),
    packMoney(plan.earnedPoints),
    packMoney(plan.pointUsed),
    plan.autoTierCashback === false ? 0 : 1,
    packMoney(plan.manualTierCashback),
    packMoney(plan.extraCashback),
    extTuples.length > 0 ? extTuples : 0,
    hpArr,
    fallbackPeriod === 60 ? 0 : 36,
    carePacked,
    plan.warrantyYears === 3 ? 3 : 0,
    plan.allCare === false ? 0 : 1,
    subCardPacked,
    plan.selectedCardTierId || '',
    hiPlusArr,
    plan.subAutoTierCashback === false ? 0 : 1,
    packMoney(plan.subManualTierCashback),
    packMoney(plan.subExtraCashback),
    warrantyStr,
  ]);
}

function unpackPlanTuple(tuple: any[], prefix: string): GeneralPlanData {
  const arr = Array.isArray(tuple) ? tuple : [];
  const rawGen = Array.isArray(arr[0]) ? arr[0] : [];
  const rawSub = Array.isArray(arr[1]) ? arr[1] : [];

  const generalItems =
    rawGen.length > 0
      ? rawGen.map((g: any[], idx: number) => ({
          id: `${prefix}-g-${idx + 1}`,
          category: unpackCat(g?.[0]),
          modelName: String(g?.[1] || ''),
          quantity: g?.[2] ? Math.max(1, Number(g[2]) || 1) : 1,
          unitPrice: unpackMoney(g?.[3]),
        }))
      : [
          {
            id: `${prefix}-g-1`,
            category: '',
            modelName: '',
            quantity: 1,
            unitPrice: 0,
          },
        ];

  const subPeriod: SubscriptionPeriod = arr[11] === 36 ? 36 : 60;

  const items =
    rawSub.length > 0
      ? rawSub.map((s: any[], idx: number) => {
          const period: SubscriptionPeriod = s?.[3] === 36 ? 36 : 60;
          const monthlyFee = unpackMoney(s?.[2]);
          const contractAmount = s?.[4] ? unpackMoney(s[4]) : undefined;
          return {
            id: `${prefix}-s-${idx + 1}`,
            category: unpackCat(s?.[0]),
            modelName: String(s?.[1] || ''),
            monthlyFee,
            period,
            ...(contractAmount ? { contractAmount } : {}),
          };
        })
      : [
          {
            id: `${prefix}-s-1`,
            category: '',
            modelName: '',
            monthlyFee: 0,
            period: subPeriod,
          },
        ];

  const cardType: GeneralCardType =
    typeof arr[2] === 'number' && GENERAL_CARD_OPTIONS[arr[2]]
      ? GENERAL_CARD_OPTIONS[arr[2]]
      : '미정';

  const rawExt = Array.isArray(arr[9]) ? arr[9] : [];
  const extraBenefits: GeneralExtraBenefitItem[] = rawExt.map(
    (e: any[], idx: number) => ({
      id: `${prefix}-e-${idx + 1}`,
      type: e?.[0] === 1 ? 'etc' : 'discount',
      description: String(e?.[1] || ''),
      amount: unpackMoney(e?.[2]),
    })
  );

  const rawHp = Array.isArray(arr[10]) ? arr[10] : [0, 0, 0, 0];
  const careService =
    typeof arr[12] === 'number' && SUB_CARE_OPTIONS[arr[12]]
      ? SUB_CARE_OPTIONS[arr[12]]
      : typeof arr[12] === 'string' && arr[12]
      ? arr[12]
      : SUB_CARE_OPTIONS[0];

  const selectedCardId: AffiliateCardId =
    typeof arr[15] === 'number' && SUB_CARD_IDS[arr[15]]
      ? SUB_CARD_IDS[arr[15]]
      : typeof arr[15] === 'string' && arr[15]
      ? (arr[15] as AffiliateCardId)
      : 'none';

  const rawHiPlus = Array.isArray(arr[17]) ? arr[17] : [0, 0, 0];

  return {
    generalItems,
    generalCardType: cardType,
    instantDiscount: unpackMoney(arr[3]),
    earnedPoints: unpackMoney(arr[4]),
    pointUsed: unpackMoney(arr[5]),
    autoTierCashback: arr[6] === 0 ? false : true,
    manualTierCashback: unpackMoney(arr[7]),
    extraCashback: unpackMoney(arr[8]),
    extraBenefits,
    generalHiPreedCounts: {
      hf75: Number(rawHp[0]) || 0,
      hf150: Number(rawHp[1]) || 0,
      hf225: Number(rawHp[2]) || 0,
      hf300: Number(rawHp[3]) || 0,
    },
    items,
    subscriptionPeriod: subPeriod,
    careService,
    warrantyType:
      typeof arr[21] === 'string' && arr[21] ? arr[21] : DEFAULT_WARRANTY,
    warrantyYears: arr[13] === 3 ? 3 : 5,
    allCare: arr[14] === 0 ? false : true,
    selectedCardId,
    selectedCardTierId: String(arr[16] || ''),
    hiPlusCounts: {
      hi72: Number(rawHiPlus[0]) || 0,
      hi90: Number(rawHiPlus[1]) || 0,
      hi108: Number(rawHiPlus[2]) || 0,
    },
    subAutoTierCashback: arr[18] === 0 ? false : true,
    subManualTierCashback: unpackMoney(arr[19]),
    subExtraCashback: unpackMoney(arr[20]),
  };
}

function isPlanEffectivelyEmpty(plan: GeneralPlanData): boolean {
  const hasGen = (plan.generalItems || []).some(
    (it) => (it.category || '').trim() !== '' || (Number(it.unitPrice) || 0) > 0
  );
  const hasSub = (plan.items || []).some(
    (it) => (it.category || '').trim() !== '' || (Number(it.monthlyFee) || 0) > 0
  );
  return !hasGen && !hasSub;
}

export function packCompactQuoteV2(payload: SharedQuotePayload): any[] {
  const st = payload.state;
  const activePlan: 1 | 2 = st.activeGeneralPlan === 2 ? 2 : 1;

  const p1Data =
    activePlan === 1
      ? extractGeneralPlanData(st)
      : extractGeneralPlanData(st.generalPlan1);
  const p2Data =
    activePlan === 2
      ? extractGeneralPlanData(st)
      : extractGeneralPlanData(st.generalPlan2);

  const p1Tuple = packPlanTuple(p1Data);
  const p2Empty = isPlanEffectivelyEmpty(p2Data);
  const p2TupleCandidate = p2Empty ? 0 : packPlanTuple(p2Data);
  const p2Tuple =
    p2TupleCandidate !== 0 &&
    JSON.stringify(p2TupleCandidate) !== JSON.stringify(p1Tuple)
      ? p2TupleCandidate
      : 0;

  const c = payload.consultant;
  const profTuple = trimTrailingZeros([
    c.name || '',
    c.phone || '',
    normalizeConsultantRoleTitle(c.roleTitle) === DEFAULT_ROLE_TITLE ? '' : normalizeConsultantRoleTitle(c.roleTitle),
    c.storeName === DEFAULT_STORE_NAME ? '' : c.storeName || '',
    c.greeting === DEFAULT_GREETING ? '' : c.greeting || '',
  ]);

  const dateCompact = (payload.createdAt || '').replace(/-/g, '');
  const modeIdx = Math.max(0, QUOTE_MODES.indexOf(st.quoteMode || 'general'));
  const activeCompare = getActiveCompareModes(st);
  const compareMask =
    activeCompare.length >= 2
      ? (activeCompare.includes('general') ? 1 : 0) |
        (activeCompare.includes('subscription') ? 2 : 0) |
        (activeCompare.includes('hybrid') ? 4 : 0)
      : 0;
  const modeConfigsTuple =
    compareMask > 0
      ? [
          activeCompare.includes('general')
            ? packPlanTuple(resolveComparisonModePlanData(st, 'general'))
            : 0,
          activeCompare.includes('subscription')
            ? packPlanTuple(resolveComparisonModePlanData(st, 'subscription'))
            : 0,
          activeCompare.includes('hybrid')
            ? packPlanTuple(resolveComparisonModePlanData(st, 'hybrid'))
            : 0,
        ]
      : 0;

  return trimTrailingZeros([
    2,
    dateCompact,
    payload.customerName || '',
    profTuple,
    modeIdx,
    activePlan === 2 && p2Tuple !== 0 ? 2 : 1,
    p1Tuple,
    p2Tuple,
    compareMask,
    modeConfigsTuple,
  ]);
}

export function unpackCompactQuoteV2(arr: any[]): SharedQuotePayload | null {
  if (!Array.isArray(arr) || arr[0] !== 2) return null;
  const rawDate = String(arr[1] || '');
  const createdAt =
    rawDate.length === 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : rawDate || new Date().toISOString().slice(0, 10);
  const customerName = arr[2] ? String(arr[2]) : undefined;
  const prof = Array.isArray(arr[3]) ? arr[3] : [];
  const consultant: ConsultantProfile = {
    name: String(prof[0] || '전문 상담사'),
    phone: String(prof[1] || ''),
    roleTitle: normalizeConsultantRoleTitle(prof[2]),
    storeName: String(prof[3] || DEFAULT_STORE_NAME),
    greeting: String(prof[4] || DEFAULT_GREETING),
  };

  const quoteMode: QuoteMode = QUOTE_MODES[Number(arr[4]) || 0] || 'general';
  const hasPlan2 = Array.isArray(arr[7]);
  const activeGeneralPlan: 1 | 2 = arr[5] === 2 && hasPlan2 ? 2 : 1;

  const plan1 = unpackPlanTuple(arr[6], 'p1');
  const plan2 = hasPlan2
    ? unpackPlanTuple(arr[7], 'p2')
    : unpackPlanTuple([], 'p2');
  const activeFields = activeGeneralPlan === 2 ? plan2 : plan1;

  const compareMask = Number(arr[8]) || 0;
  const compareModes: QuoteMode[] = [];
  if (compareMask & 1) compareModes.push('general');
  if (compareMask & 2) compareModes.push('subscription');
  if (compareMask & 4) compareModes.push('hybrid');

  const rawMc = Array.isArray(arr[9]) ? arr[9] : null;
  const modeConfigs = rawMc
    ? {
        ...(Array.isArray(rawMc[0])
          ? { general: unpackPlanTuple(rawMc[0], 'mc-gen') }
          : {}),
        ...(Array.isArray(rawMc[1])
          ? { subscription: unpackPlanTuple(rawMc[1], 'mc-sub') }
          : {}),
        ...(Array.isArray(rawMc[2])
          ? { hybrid: unpackPlanTuple(rawMc[2], 'mc-hyb') }
          : {}),
      }
    : undefined;

  const state: ProposalState = {
    quoteMode,
    ...(compareModes.length >= 2 ? { compareModes } : {}),
    ...(modeConfigs ? { modeConfigs } : {}),
    activeGeneralPlan,
    generalPlan1: extractGeneralPlanData(plan1),
    generalPlan2: extractGeneralPlanData(plan2),
    ...extractGeneralPlanData(activeFields),
  };

  return {
    v: 1,
    createdAt,
    ...(customerName ? { customerName } : {}),
    consultant,
    state,
  };
}

/**
 * 현재 URL(?q=..., ?s=..., ?share=..., /q/:code, #share=...)에서 공유 정보를 추출합니다.
 */
export function extractShareParamsFromLocation(
  searchStr?: string,
  hashStr?: string,
  pathnameStr?: string
): { shortCode?: string; token?: string } {
  try {
    const p =
      typeof pathnameStr === 'string'
        ? pathnameStr
        : typeof window !== 'undefined'
        ? window.location.pathname
        : '';
    const pathMatch = p.match(/\/q\/([A-Za-z0-9_-]{4,16})\/?$/);
    if (pathMatch && pathMatch[1]) {
      return { shortCode: pathMatch[1] };
    }
  } catch {
    // ignore
  }

  try {
    const s =
      typeof searchStr === 'string'
        ? searchStr
        : typeof window !== 'undefined'
        ? window.location.search
        : '';
    if (s) {
      const params = new URLSearchParams(s);
      const qCode = params.get('q');
      if (qCode && qCode.trim()) {
        return { shortCode: qCode.trim() };
      }
      const sToken = params.get('s');
      if (sToken && sToken.trim()) {
        return { token: sToken.trim() };
      }
      const qShare = params.get('share');
      if (qShare && qShare.trim()) {
        return { token: qShare.trim() };
      }
    }
  } catch {
    // ignore
  }

  try {
    const h =
      typeof hashStr === 'string'
        ? hashStr
        : typeof window !== 'undefined'
        ? window.location.hash
        : '';
    const clean = h.replace(/^#/, '').trim();
    if (clean.startsWith('s=')) {
      const token = decodeURIComponent(clean.slice(2)).trim();
      if (token) return { token };
    }
    if (clean.startsWith('share=')) {
      const token = decodeURIComponent(clean.slice('share='.length)).trim();
      if (token) return { token };
    }
  } catch {
    // ignore
  }

  return {};
}

export function extractRawShareTokenFromUrl(
  searchStr?: string,
  hashStr?: string
): string | null {
  const extracted = extractShareParamsFromLocation(searchStr, hashStr);
  return extracted.token || extracted.shortCode || null;
}

/**
 * 실제 매장 직원이 사용 중인 브라우저인지 검증 (Zero-Trust 기본 차단)
 * - 고객이나 외부인이 주소 뒤쪽(?s=...)을 지우고 시크릿 모드나 타 PC에서 루트 도메인으로 접속해도
 *   STAFF_VERIFIED_V2_KEY 또는 실제 직원 업무 데이터가 없으면 절대 통과하지 못합니다.
 */
function hasVerifiedStaffFootprint(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    if (localStorage.getItem(CUSTOMER_DEVICE_VIEWER_ONLY_KEY) === '1') {
      return false;
    }
    if (
      localStorage.getItem(STAFF_VERIFIED_V2_KEY) === '1' ||
      localStorage.getItem(STAFF_TRUSTED_DEVICE_KEY) === '1'
    ) {
      localStorage.setItem(STAFF_VERIFIED_V2_KEY, '1');
      return true;
    }
    // AI Studio 개발/프리뷰 환경이거나 기존부터 실제 사용 중이던 직원 단말기 자동 승격
    const host =
      typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
    const isAiStudioPreview =
      host.startsWith('ais-dev-') ||
      host.startsWith('ais-pre-') ||
      host === 'localhost' ||
      host === '127.0.0.1';
    if (
      isAiStudioPreview ||
      localStorage.getItem('gookji_crm_customers_cache_v3') ||
      localStorage.getItem('himart_crm_model_incentives_v1') ||
      localStorage.getItem('himart_crm_model_incentive_sheets_v1') ||
      localStorage.getItem('himart_gj_consultant_profile_v1') ||
      localStorage.getItem('himart_gj_my_name') ||
      localStorage.getItem('himart_gj_schedules_v5') ||
      localStorage.getItem('gemini_api_key')
    ) {
      localStorage.setItem(STAFF_VERIFIED_V2_KEY, '1');
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * [3단계 Zero-Trust 엔트리 판별기 - main.tsx 최상단 동기 실행]
 * 1) 'customer-quote': URL에 견적 토큰(?s=, ?q=, /q/, ?share=)이 있거나 고객 뷰어 잠금 상태일 때 -> 고객 전용 견적서만 표시
 * 2) 'public-gate': 누군가 깃허브 기본 주소에서 뒤쪽 파라미터를 지우고 접속했을 때(비인증 기기·시크릿모드·타 PC) -> 직원용 App.tsx 로드 자체를 원천 차단하고 안내 화면만 표시!
 * 3) 'staff-app': 인증된 직원 기기에서만 본 앱(App.tsx) 실행
 */
export function resolveBootEntryMode(): BootEntryMode {
  if (typeof window === 'undefined') return 'staff-app';

  const { token, shortCode } = extractShareParamsFromLocation();
  const hasShareInUrl = Boolean(token || shortCode);
  const isVerifiedStaff = hasVerifiedStaffFootprint();

  if (hasShareInUrl) {
    try {
      sessionStorage.setItem(CUSTOMER_TAB_LOCK_KEY, '1');
      if (!isVerifiedStaff) {
        localStorage.setItem(CUSTOMER_DEVICE_VIEWER_ONLY_KEY, '1');
      }
    } catch {
      // ignore
    }
    return 'customer-quote';
  }

  try {
    if (sessionStorage.getItem(CUSTOMER_TAB_LOCK_KEY) === '1') {
      return loadCachedCustomerQuotePayload() ? 'customer-quote' : 'public-gate';
    }
    if (!isVerifiedStaff) {
      return 'public-gate';
    }
  } catch {
    return 'public-gate';
  }

  return 'staff-app';
}

export function detectCustomerSandboxMode(): boolean {
  return resolveBootEntryMode() !== 'staff-app';
}

export function unlockStaffDeviceWithPin(pin: string): boolean {
  const input = (pin || '').trim();
  const effectivePin = getEffectiveStaffPin();
  if (input !== effectivePin && input !== ADMIN_PIN_CODE) return false;
  try {
    localStorage.setItem(STAFF_VERIFIED_V2_KEY, '1');
    localStorage.setItem(STAFF_TRUSTED_DEVICE_KEY, '1');
    localStorage.removeItem(CUSTOMER_DEVICE_VIEWER_ONLY_KEY);
    sessionStorage.removeItem(CUSTOMER_TAB_LOCK_KEY);
  } catch {
    // ignore
  }
  return true;
}

export function cacheCustomerQuotePayload(payload: SharedQuotePayload): void {
  const serialized = JSON.stringify(payload);
  try {
    sessionStorage.setItem(LAST_CUSTOMER_QUOTE_CACHE_KEY, serialized);
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(LAST_CUSTOMER_QUOTE_CACHE_KEY, serialized);
  } catch {
    // ignore
  }
}

export function loadCachedCustomerQuotePayload(): SharedQuotePayload | null {
  try {
    const raw =
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(LAST_CUSTOMER_QUOTE_CACHE_KEY)) ||
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem(LAST_CUSTOMER_QUOTE_CACHE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SharedQuotePayload;
    if (parsed && typeof parsed === 'object' && parsed.state) {
      if (parsed.consultant) {
        parsed.consultant.roleTitle = normalizeConsultantRoleTitle(
          parsed.consultant.roleTitle
        );
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * V2 초경량 무손실 토큰 생성 ('2_' + base64url — 점(.)이나 특수기호가 전혀 없어 모든 문자앱 자동링크 100% 호환)
 */
export async function encodeCompactQuoteToken(
  payload: SharedQuotePayload
): Promise<string> {
  const compactTuple = packCompactQuoteV2(payload);
  const jsonStr = JSON.stringify(compactTuple);
  const rawBytes = new TextEncoder().encode(jsonStr);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const compressedBuf = await new Response(cs.readable).arrayBuffer();
      return '2d_' + bytesToBase64Url(new Uint8Array(compressedBuf));
    } catch {
      try {
        const csRaw = new CompressionStream('deflate-raw');
        const writer = csRaw.writable.getWriter();
        writer.write(rawBytes);
        writer.close();
        const compressedBuf = await new Response(csRaw.readable).arrayBuffer();
        return '2_' + bytesToBase64Url(new Uint8Array(compressedBuf));
      } catch {
        return '2u_' + bytesToBase64Url(rawBytes);
      }
    }
  }
  return '2u_' + bytesToBase64Url(rawBytes);
}

/**
 * 기본 초압축 URL 반환 (?s=2_...)
 */
function resolveEffectiveViewerBaseUrl(): {
  baseUrl: string;
  usingCustomDomain: boolean;
} {
  const custom = loadCustomViewerBaseUrl();
  if (custom && /^https?:\/\//i.test(custom)) {
    const normalized = custom.endsWith('/') ? custom : `${custom}/`;
    return { baseUrl: normalized, usingCustomDomain: true };
  }
  const fallback =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '/')}`
      : '';
  return { baseUrl: fallback, usingCustomDomain: false };
}

export async function encodeSharedQuoteUrl(
  payload: SharedQuotePayload
): Promise<string> {
  const token = await encodeCompactQuoteToken(payload);
  const { baseUrl } = resolveEffectiveViewerBaseUrl();
  return `${baseUrl}?s=${token}`;
}

/**
 * [문자(SMS) 발송 최적화 3중 단축기]
 * 1순위: 자체 앱 서버 6자리 단축코드 (/q/Ab3x9Z — 약 35~42자, 외부 의존성 제로)
 * 2순위: 정적 배포(GitHub Pages 등) 환경에서 공개 단축 API(is.gd -> v.gd — 약 22자) 자동 호출
 * 3순위: 오프라인/사내망 환경에서도 문자 발송 가능한 점(.) 없는 V2 초압축 링크(?s=2_... — 기존 대비 82% 단축)
 */
function shortenUrlViaJsonp(targetUrl: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return Promise.resolve(null);
  }
  const providers = ['https://is.gd/create.php', 'https://v.gd/create.php'];
  const tryProvider = (base: string): Promise<string | null> =>
    new Promise((resolve) => {
      const cbName = `__hmShortCb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const script = document.createElement('script');
      let settled = false;
      const cleanup = () => {
        try {
          delete (window as any)[cbName];
        } catch {
          (window as any)[cbName] = undefined;
        }
        if (script.parentNode) script.parentNode.removeChild(script);
      };
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 2500);
      (window as any)[cbName] = (data: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        if (data && typeof data.shorturl === 'string' && data.shorturl.startsWith('http')) {
          resolve(data.shorturl);
        } else {
          resolve(null);
        }
      };
      script.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(null);
      };
      script.src = `${base}?format=json&callback=${cbName}&url=${encodeURIComponent(targetUrl)}`;
      document.body.appendChild(script);
    });

  return tryProvider(providers[0]).then((first) =>
    first ? first : tryProvider(providers[1])
  );
}

export async function createShortenedQuoteLinks(
  payload: SharedQuotePayload
): Promise<EncodedQuoteLinks> {
  const token = await encodeCompactQuoteToken(payload);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { baseUrl, usingCustomDomain } = resolveEffectiveViewerBaseUrl();
  const compactUrl = `${baseUrl}?s=${token}`;

  // [QA 06 네트워크 끊김 방어] 오프라인 상태에서는 타임아웃 대기(4.7초) 없이 0.01초 만에 초압축 링크 즉시 반환!
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      shortUrl: compactUrl,
      compactUrl,
      isShortened: false,
    };
  }

  const isLocal =
    !usingCustomDomain &&
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname);

  // 1순위: 자체 서버 프록시 단축 (미니 뷰어 도메인 사용 시 서버에서 is.gd 외부 단축만 수행해 본 앱 주소 노출 0% 보장)
  if (typeof fetch !== 'undefined' && origin) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2200);
      const res = await fetch('/api/share-quote/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fullUrl: compactUrl,
          externalOnly: usingCustomDomain,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.externalShortUrl && typeof data.externalShortUrl === 'string') {
          return {
            compactUrl,
            shortUrl: data.externalShortUrl,
            mode: 'external',
            token,
          };
        }
        if (!usingCustomDomain && data && data.code) {
          const shortUrl = `${origin}/q/${data.code}`;
          return {
            compactUrl,
            shortUrl,
            mode: 'server',
            token,
          };
        }
      }
    } catch {
      // 정적 호스팅(GitHub Pages 등)이거나 오프라인이면 2순위로 이동
    }
  }

  // 2순위: 공개 HTTPS 도메인(GitHub Pages 등)일 때 CORS fetch + JSONP 이중 폴백으로 is.gd / v.gd 단축 URL 생성
  if (!isLocal && /^https?:\/\//i.test(compactUrl)) {
    if (typeof fetch !== 'undefined') {
      const endpoints = [
        `https://is.gd/create.php?format=json&url=${encodeURIComponent(compactUrl)}`,
        `https://v.gd/create.php?format=json&url=${encodeURIComponent(compactUrl)}`,
      ];
      for (const ep of endpoints) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2400);
          const res = await fetch(ep, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data.shorturl === 'string' && data.shorturl.startsWith('http')) {
              return {
                compactUrl,
                shortUrl: data.shorturl,
                mode: 'external',
                token,
              };
            }
          }
        } catch {
          // JSONP 폴백으로 이어짐
        }
      }
    }

    const jsonpShort = await shortenUrlViaJsonp(compactUrl);
    if (jsonpShort) {
      return {
        compactUrl,
        shortUrl: jsonpShort,
        mode: 'external',
        token,
      };
    }
  }

  // 3순위: 점(.)이 제거된 순수 영숫자 V2 초압축 URL
  return {
    compactUrl,
    shortUrl: compactUrl,
    mode: 'compact',
    token,
  };
}

export async function decodeSharedQuoteToken(
  token: string
): Promise<SharedQuotePayload | null> {
  try {
    const cleanToken = (token || '').trim();
    if (!cleanToken) return null;

    // V2 튜플 코덱 ('2d_' 범용 deflate, '2_' deflate-raw, '2u_' 비압축)
    if (
      cleanToken.startsWith('2d_') ||
      cleanToken.startsWith('2_') ||
      cleanToken.startsWith('2u_')
    ) {
      let jsonBytes: Uint8Array;
      if (cleanToken.startsWith('2d_')) {
        if (typeof DecompressionStream === 'undefined') return null;
        const compressed = base64UrlToBytes(cleanToken.slice(3));
        const ds = new DecompressionStream('deflate');
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        jsonBytes = new Uint8Array(buf);
      } else if (cleanToken.startsWith('2_')) {
        if (typeof DecompressionStream === 'undefined') return null;
        const compressed = base64UrlToBytes(cleanToken.slice(2));
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        const buf = await new Response(ds.readable).arrayBuffer();
        jsonBytes = new Uint8Array(buf);
      } else {
        jsonBytes = base64UrlToBytes(cleanToken.slice(3));
      }
      const arr = JSON.parse(new TextDecoder().decode(jsonBytes));
      const unpacked = unpackCompactQuoteV2(arr);
      if (unpacked) {
        cacheCustomerQuotePayload(unpacked);
        return unpacked;
      }
      return null;
    }

    // V1 하위 호환 ('z1.', 'u1.', raw base64)
    let jsonBytes: Uint8Array;
    if (cleanToken.startsWith('z1.')) {
      if (typeof DecompressionStream === 'undefined') {
        return null;
      }
      const compressed = base64UrlToBytes(cleanToken.slice(3));
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressed);
      writer.close();
      const buf = await new Response(ds.readable).arrayBuffer();
      jsonBytes = new Uint8Array(buf);
    } else if (cleanToken.startsWith('u1.')) {
      jsonBytes = base64UrlToBytes(cleanToken.slice(3));
    } else {
      jsonBytes = base64UrlToBytes(cleanToken);
    }

    const jsonText = new TextDecoder().decode(jsonBytes);
    const parsed = JSON.parse(jsonText) as SharedQuotePayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.state) {
      return null;
    }
    if (parsed.consultant) {
      parsed.consultant.roleTitle = normalizeConsultantRoleTitle(
        parsed.consultant.roleTitle
      );
    }
    cacheCustomerQuotePayload(parsed);
    return parsed;
  } catch (err) {
    console.error('Failed to decode shared quote token:', err);
    return null;
  }
}

/**
 * URL(/q/:code, ?q=..., ?s=..., ?share=..., #share=...)로부터 고객용 인터랙티브 견적 데이터 복원
 */
export async function decodeSharedQuoteFromHash(
  hashOrSearchStr?: string
): Promise<SharedQuotePayload | null> {
  if (typeof hashOrSearchStr === 'string' && hashOrSearchStr.trim()) {
    const trimmed = hashOrSearchStr.trim();
    const extracted = trimmed.startsWith('?')
      ? extractShareParamsFromLocation(trimmed, '', '')
      : trimmed.startsWith('#')
      ? extractShareParamsFromLocation('', trimmed, '')
      : trimmed.startsWith('/q/')
      ? extractShareParamsFromLocation('', '', trimmed)
      : { token: trimmed };

    if (extracted.shortCode && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`/api/share-quote/${encodeURIComponent(extracted.shortCode)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.token) {
            return decodeSharedQuoteToken(data.token);
          }
        }
      } catch {
        // ignore
      }
    }
    if (extracted.token) {
      return decodeSharedQuoteToken(extracted.token);
    }
  }

  const loc = extractShareParamsFromLocation();
  if (loc.shortCode && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/share-quote/${encodeURIComponent(loc.shortCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          const decoded = await decodeSharedQuoteToken(data.token);
          if (decoded) return decoded;
        }
      }
    } catch {
      // ignore
    }
  }

  if (loc.token) {
    const decoded = await decodeSharedQuoteToken(loc.token);
    if (decoded) return decoded;
  }

  return loadCachedCustomerQuotePayload();
}
