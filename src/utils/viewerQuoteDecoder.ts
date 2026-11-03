import {
  AffiliateCardId,
  extractGeneralPlanData,
  GENERAL_CARD_OPTIONS,
  GeneralCardType,
  GeneralExtraBenefitItem,
  GeneralPlanData,
  ProposalState,
  QuoteMode,
  SUB_CARE_OPTIONS,
  SubscriptionPeriod,
} from '../types/proposal';

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

type PackedMoney = number | string;

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

function unpackMoney(packed: PackedMoney | undefined | null): number {
  if (typeof packed === 'number') return Math.max(0, Math.round(packed * 10000));
  if (typeof packed === 'string') return Math.max(0, Number(packed) || 0);
  return 0;
}

function unpackCat(val: number | string | undefined): string {
  if (typeof val === 'number' && val >= 0 && val < COMMON_CATEGORIES.length) {
    return COMMON_CATEGORIES[val];
  }
  return typeof val === 'string' ? val : '';
}

function unpackPlanTuple(rawPlan: any, prefix: string): GeneralPlanData {
  const arr = Array.isArray(rawPlan) ? rawPlan : [];
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
          const itemPeriod: SubscriptionPeriod = s?.[3] === 36 ? 36 : subPeriod;
          const contractAmt = unpackMoney(s?.[4]);
          return {
            id: `${prefix}-s-${idx + 1}`,
            category: unpackCat(s?.[0]),
            modelName: String(s?.[1] || ''),
            monthlyFee: unpackMoney(s?.[2]),
            period: itemPeriod,
            careService:
              typeof arr[12] === 'number' && SUB_CARE_OPTIONS[arr[12]]
                ? SUB_CARE_OPTIONS[arr[12]]
                : typeof arr[12] === 'string' && arr[12]
                ? arr[12]
                : SUB_CARE_OPTIONS[0],
            ...(contractAmt > 0 ? { contractAmount: contractAmt } : {}),
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

  const state: ProposalState = {
    quoteMode,
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

function extractTokenFromLocation(searchStr?: string, hashStr?: string): string | null {
  try {
    const s =
      typeof searchStr === 'string'
        ? searchStr
        : typeof window !== 'undefined'
        ? window.location.search
        : '';
    if (s) {
      const params = new URLSearchParams(s);
      const tok = params.get('s') || params.get('share');
      if (tok && tok.trim()) return tok.trim();
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
    if (clean.startsWith('s=')) return decodeURIComponent(clean.slice(2)).trim();
    if (clean.startsWith('share=')) return decodeURIComponent(clean.slice(6)).trim();
  } catch {
    // ignore
  }
  return null;
}

export async function decodeSharedQuoteToken(
  token: string
): Promise<SharedQuotePayload | null> {
  try {
    const cleanToken = (token || '').trim();
    if (!cleanToken) return null;

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
      return unpackCompactQuoteV2(arr);
    }

    let jsonBytes: Uint8Array;
    if (cleanToken.startsWith('z1.')) {
      if (typeof DecompressionStream === 'undefined') return null;
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
    if (!parsed || typeof parsed !== 'object' || !parsed.state) return null;
    if (parsed.consultant) {
      parsed.consultant.roleTitle = normalizeConsultantRoleTitle(
        parsed.consultant.roleTitle
      );
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function decodeQuoteFromCurrentUrl(
  urlQueryOrHash?: string
): Promise<SharedQuotePayload | null> {
  if (typeof urlQueryOrHash === 'string' && urlQueryOrHash.trim()) {
    const t = urlQueryOrHash.trim();
    const token = t.startsWith('?')
      ? extractTokenFromLocation(t, '')
      : t.startsWith('#')
      ? extractTokenFromLocation('', t)
      : t;
    return token ? decodeSharedQuoteToken(token) : null;
  }
  const token = extractTokenFromLocation();
  if (!token) return null;
  return decodeSharedQuoteToken(token);
}
