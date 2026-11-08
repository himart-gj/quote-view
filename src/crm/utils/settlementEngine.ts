import { idbMirrorGet, idbMirrorSet } from '../../utils/offlineDbQueue';
import {
  DEFAULT_INCENTIVE_GSHEET_URL,
  INCENTIVE_GSHEET_URL_STORAGE_KEY,
  MODEL_INCENTIVE_STORAGE_KEY,
  MODEL_INCENTIVE_UPDATED_EVENT,
  ParsedIncentiveWorkbookResult,
  detectIncentiveYearMonthFromText,
  downloadModelIncentiveExcelTemplate,
  extractGoogleSheetIdAndGid,
  fetchModelIncentiveFromGoogleSheetUrl,
  fetchRemoteModelIncentiveSheets,
  hydrateModelIncentiveSheetsFromIdb,
  loadAllModelIncentiveSheets,
  loadGitHubSyncConfig,
  loadSavedIncentiveGoogleSheetUrl,
  mergeModelIncentiveRules,
  parseIncentiveAmountCell,
  parseModelIncentiveExcelOrCsv,
  parseModelIncentiveExcelWithMeta,
  parseModelIncentiveFreeText,
  parseModelIncentiveImage,
  publishModelIncentiveSheetsToGitHub,
  saveAllModelIncentiveSheets,
  saveGitHubSyncConfig,
  saveIncentiveGoogleSheetUrl,
  syncModelIncentiveSheetsToServer,
  upsertMonthlyIncentiveSheet,
} from './settlementSheetParser';
import type { GitHubSyncConfig } from '../../utils/careTableParser';

export type { GitHubSyncConfig, ParsedIncentiveWorkbookResult };
export {
  DEFAULT_INCENTIVE_GSHEET_URL,
  INCENTIVE_GSHEET_URL_STORAGE_KEY,
  MODEL_INCENTIVE_STORAGE_KEY,
  MODEL_INCENTIVE_UPDATED_EVENT,
  detectIncentiveYearMonthFromText,
  downloadModelIncentiveExcelTemplate,
  extractGoogleSheetIdAndGid,
  fetchModelIncentiveFromGoogleSheetUrl,
  fetchRemoteModelIncentiveSheets,
  hydrateModelIncentiveSheetsFromIdb,
  loadAllModelIncentiveSheets,
  loadGitHubSyncConfig,
  loadSavedIncentiveGoogleSheetUrl,
  mergeModelIncentiveRules,
  parseIncentiveAmountCell,
  parseModelIncentiveExcelOrCsv,
  parseModelIncentiveExcelWithMeta,
  parseModelIncentiveFreeText,
  parseModelIncentiveImage,
  publishModelIncentiveSheetsToGitHub,
  saveAllModelIncentiveSheets,
  saveGitHubSyncConfig,
  saveIncentiveGoogleSheetUrl,
  syncModelIncentiveSheetsToServer,
  upsertMonthlyIncentiveSheet,
};
import {
  calculateGeneralPurchaseSummary,
  calculateSubscriptionSummary,
  getGeneralPlan1And2Summaries,
  ProposalState,
  SubscriptionPeriod,
} from '../../types/proposal';
import {
  CustomerFreedCounts,
  CustomerItem,
  CustomerSaleType,
  ModelIncentiveRule,
  ModelIncentivesMap,
  MonthlyModelIncentiveSheet,
  PurchasedModelEntry,
} from '../types/crm';

export const PLUS_SUBSCRIPTION_INCENTIVE_UNIT = 90_000;

export const GENERAL_FREED_INCENTIVE_UNITS = {
  hf75: 60_000,
  hf150: 120_000,
  hf225: 180_000,
  hf300: 240_000,
} as const;

export const FREED_TIER_SPECS = [
  {
    key: 'plusSub' as const,
    group: 'subscription' as const,
    label: '플러스 구독 (통합)',
    shortLabel: '플러스구독',
    unitIncentive: PLUS_SUBSCRIPTION_INCENTIVE_UNIT,
    description: '종류 무관 (플러스 72·90·108) 건당 9만원',
  },
  {
    key: 'hf75' as const,
    group: 'general' as const,
    label: '일반 하이프리드 75',
    shortLabel: '프리드 75',
    unitIncentive: GENERAL_FREED_INCENTIVE_UNITS.hf75,
    description: '건당 6만원',
  },
  {
    key: 'hf150' as const,
    group: 'general' as const,
    label: '일반 하이프리드 150',
    shortLabel: '프리드 150',
    unitIncentive: GENERAL_FREED_INCENTIVE_UNITS.hf150,
    description: '건당 12만원',
  },
  {
    key: 'hf225' as const,
    group: 'general' as const,
    label: '일반 하이프리드 225',
    shortLabel: '프리드 225',
    unitIncentive: GENERAL_FREED_INCENTIVE_UNITS.hf225,
    description: '건당 18만원',
  },
  {
    key: 'hf300' as const,
    group: 'general' as const,
    label: '일반 하이프리드 300',
    shortLabel: '프리드 300',
    unitIncentive: GENERAL_FREED_INCENTIVE_UNITS.hf300,
    description: '건당 24만원',
  },
] as const;

export function createEmptyFreedCounts(): CustomerFreedCounts {
  return {
    hi72: 0,
    hi90: 0,
    hi108: 0,
    hf75: 0,
    hf150: 0,
    hf225: 0,
    hf300: 0,
  };
}

export function sanitizeFreedCounts(
  raw?: Partial<CustomerFreedCounts> | null
): CustomerFreedCounts {
  return {
    hi72: Math.max(0, Math.floor(Number(raw?.hi72) || 0)),
    hi90: Math.max(0, Math.floor(Number(raw?.hi90) || 0)),
    hi108: Math.max(0, Math.floor(Number(raw?.hi108) || 0)),
    hf75: Math.max(0, Math.floor(Number(raw?.hf75) || 0)),
    hf150: Math.max(0, Math.floor(Number(raw?.hf150) || 0)),
    hf225: Math.max(0, Math.floor(Number(raw?.hf225) || 0)),
    hf300: Math.max(0, Math.floor(Number(raw?.hf300) || 0)),
  };
}

export function calculateFreedIncentiveDetail(counts: CustomerFreedCounts) {
  const safe = sanitizeFreedCounts(counts);
  const plusSubCount = safe.hi72 + safe.hi90 + safe.hi108;
  const generalCount = safe.hf75 + safe.hf150 + safe.hf225 + safe.hf300;
  const totalCount = plusSubCount + generalCount;

  const plusSubIncentive = plusSubCount * PLUS_SUBSCRIPTION_INCENTIVE_UNIT;
  const hf75Incentive = safe.hf75 * GENERAL_FREED_INCENTIVE_UNITS.hf75;
  const hf150Incentive = safe.hf150 * GENERAL_FREED_INCENTIVE_UNITS.hf150;
  const hf225Incentive = safe.hf225 * GENERAL_FREED_INCENTIVE_UNITS.hf225;
  const hf300Incentive = safe.hf300 * GENERAL_FREED_INCENTIVE_UNITS.hf300;

  const generalIncentive =
    hf75Incentive + hf150Incentive + hf225Incentive + hf300Incentive;
  const totalIncentive = plusSubIncentive + generalIncentive;

  const summaryBadges: string[] = [];
  if (plusSubCount > 0) {
    const subParts: string[] = [];
    if (safe.hi72 > 0) subParts.push(`72×${safe.hi72}`);
    if (safe.hi90 > 0) subParts.push(`90×${safe.hi90}`);
    if (safe.hi108 > 0) subParts.push(`108×${safe.hi108}`);
    summaryBadges.push(
      `플러스구독 ${plusSubCount}건(${subParts.join('·')})`
    );
  }
  if (safe.hf75 > 0) summaryBadges.push(`프리드75 ${safe.hf75}건`);
  if (safe.hf150 > 0) summaryBadges.push(`프리드150 ${safe.hf150}건`);
  if (safe.hf225 > 0) summaryBadges.push(`프리드225 ${safe.hf225}건`);
  if (safe.hf300 > 0) summaryBadges.push(`프리드300 ${safe.hf300}건`);

  return {
    counts: safe,
    plusSubCount,
    generalCount,
    totalCount,
    plusSubIncentive,
    hf75Incentive,
    hf150Incentive,
    hf225Incentive,
    hf300Incentive,
    generalIncentive,
    totalIncentive,
    summaryBadges,
    summaryText: summaryBadges.join(', '),
  };
}

export function isConfirmedPurchaseCustomer(c: CustomerItem): boolean {
  if (!c || c.deletedAt) return false;
  return (
    c.status === '계약완료' ||
    c.status === '발송완료' ||
    c.status === '배송완료'
  );
}

export function getCurrentYearMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeIsoDateStr(raw?: string, fallbackYear?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const fullMatch = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (fullMatch) {
    const yyyy = fullMatch[1];
    const mm = String(parseInt(fullMatch[2], 10)).padStart(2, '0');
    const dd = String(parseInt(fullMatch[3], 10)).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const shortMatch = trimmed.match(/^(\d{1,2})[-./](\d{1,2})$/);
  if (shortMatch) {
    const yyyy = fallbackYear || String(new Date().getFullYear());
    const mm = String(parseInt(shortMatch[1], 10)).padStart(2, '0');
    const dd = String(parseInt(shortMatch[2], 10)).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export function extractYearMonthFromDateStr(raw?: string, fallbackYear?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})[-./](\d{1,2})/);
  if (match) {
    const yyyy = match[1];
    const mm = String(parseInt(match[2], 10)).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  const shortMatch = trimmed.match(/^(\d{1,2})[-./](\d{1,2})$/);
  if (shortMatch) {
    const yyyy = fallbackYear || String(new Date().getFullYear());
    const mm = String(parseInt(shortMatch[1], 10)).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  return '';
}

export function getCustomerContractYearMonth(c: CustomerItem): string {
  if (c.contractDate && c.contractDate.trim()) {
    const ym = extractYearMonthFromDateStr(c.contractDate);
    if (ym) return ym;
  }
  return extractYearMonthFromDateStr(c.regDate);
}

export function getCustomerContractDateStr(c: CustomerItem): string {
  const normContract = normalizeIsoDateStr(c.contractDate);
  if (normContract) return normContract;
  const normReg = normalizeIsoDateStr(c.regDate);
  if (normReg) return normReg;
  return '';
}

export function getCustomerDeliveryYearMonth(c: CustomerItem): string {
  const contractYm = getCustomerContractYearMonth(c);
  const fallbackYear = contractYm ? contractYm.slice(0, 4) : String(new Date().getFullYear());
  return extractYearMonthFromDateStr(c.deliveryDate, fallbackYear);
}

function computeExactSubscriptionItemPrincipal(
  item: any,
  fallbackPeriod: SubscriptionPeriod
): number {
  const period: SubscriptionPeriod =
    Number(item?.period) === 36
      ? 36
      : Number(item?.period) === 60
      ? 60
      : fallbackPeriod;
  const monthly = Math.max(0, Number(item?.monthlyFee) || 0);
  const byMonthly = monthly * period;
  const explicitContract = Math.max(0, Number(item?.contractAmount) || 0);

  if (explicitContract > 0) {
    if (monthly === 0 || Math.abs(explicitContract - byMonthly) <= period * 5) {
      return explicitContract;
    }
  }
  return byMonthly;
}

export function extractPerformanceFromProposalState(state?: ProposalState | any): {
  saleType: CustomerSaleType;
  generalProductTotal: number;
  subscriptionPrincipal: number;
  performanceAmount: number;
  freedCounts: CustomerFreedCounts;
  purchasedModels: PurchasedModelEntry[];
} | null {
  if (!state || typeof state !== 'object') return null;

  try {
    const {
      plan1Data,
      plan2Data,
      hasPlan1Data,
      hasPlan2Data,
    } = getGeneralPlan1And2Summaries(state as ProposalState);

    const usePlan2 = !hasPlan1Data && hasPlan2Data;
    const primaryData = usePlan2 ? plan2Data : plan1Data;
    const genSummary = calculateGeneralPurchaseSummary(primaryData);
    const subSummary = calculateSubscriptionSummary(primaryData);

    const mode: CustomerSaleType =
      state.quoteMode === 'subscription'
        ? 'subscription'
        : state.quoteMode === 'hybrid'
        ? 'hybrid'
        : 'general';

    const includeGeneral = mode === 'general' || mode === 'hybrid';
    const includeSub = mode === 'subscription' || mode === 'hybrid';

    const generalProductTotal = includeGeneral ? Math.max(0, genSummary.sum) : 0;

    const fallbackPeriod: SubscriptionPeriod =
      primaryData.subscriptionPeriod === 36 ? 36 : 60;
    const subItems = Array.isArray(primaryData.items) ? primaryData.items : [];
    const computedSubPrincipal = subItems.reduce(
      (acc, it) => acc + computeExactSubscriptionItemPrincipal(it, fallbackPeriod),
      0
    );
    const subscriptionPrincipal = includeSub
      ? Math.max(0, computedSubPrincipal || subSummary.totalPrincipal || 0)
      : 0;

    const performanceAmount = generalProductTotal + subscriptionPrincipal;

    const freedCounts = sanitizeFreedCounts({
      hi72: includeSub ? primaryData.hiPlusCounts?.hi72 || 0 : 0,
      hi90: includeSub ? primaryData.hiPlusCounts?.hi90 || 0 : 0,
      hi108: includeSub ? primaryData.hiPlusCounts?.hi108 || 0 : 0,
      hf75: includeGeneral ? primaryData.generalHiPreedCounts?.hf75 || 0 : 0,
      hf150: includeGeneral ? primaryData.generalHiPreedCounts?.hf150 || 0 : 0,
      hf225: includeGeneral ? primaryData.generalHiPreedCounts?.hf225 || 0 : 0,
      hf300: includeGeneral ? primaryData.generalHiPreedCounts?.hf300 || 0 : 0,
    });

    const purchasedModels: PurchasedModelEntry[] = [];

    if (includeGeneral) {
      (primaryData.generalItems || []).forEach((it, idx) => {
        const cat = (it.category || it.name || '').trim();
        const mod = (it.modelName || it.code || '').trim();
        const qty = Math.max(1, Number(it.quantity ?? it.qty) || 1);
        const unitPrice = Math.max(0, Number(it.unitPrice ?? it.price) || 0);
        if (!cat && !mod && unitPrice <= 0) return;
        purchasedModels.push({
          id: `pm-gen-${idx}-${mod || cat}`,
          category: cat || '일반가전',
          modelName: mod || cat,
          quantity: qty,
          saleType: 'general',
          principalAmount: unitPrice * qty,
        });
      });
    }

    if (includeSub) {
      subItems.forEach((it, idx) => {
        const cat = (it.category || '').trim();
        const mod = (it.modelName || it.modelCode || '').trim();
        const monthly = Math.max(0, Number(it.monthlyFee) || 0);
        if (!cat && !mod && monthly <= 0) return;
        purchasedModels.push({
          id: `pm-sub-${idx}-${mod || cat}`,
          category: cat || '구독가전',
          modelName: mod || cat,
          quantity: 1,
          saleType: 'subscription',
          principalAmount: computeExactSubscriptionItemPrincipal(
            it,
            fallbackPeriod
          ),
        });
      });
    }

    return {
      saleType: mode,
      generalProductTotal,
      subscriptionPrincipal,
      performanceAmount,
      freedCounts,
      purchasedModels,
    };
  } catch {
    return null;
  }
}

/**
 * 괄호 (...) 내부의 쉼표·슬래시(예: MH334KH/A)·플러스 기호는 절대 분리하지 않고,
 * 괄호 바깥의 구분자(쉼표, 플러스, 가운뎃점, 공백 있는 슬래시)로만 품목을 안전하게 분리합니다.
 */
function splitItemsOutsideParens(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') {
      depth++;
      cur += ch;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (depth === 0) {
      if (ch === ',' || ch === '+') {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
        continue;
      }
      if (ch === '·' && /\s*[가-힣A-Za-z]/.test(text.slice(i + 1))) {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
        continue;
      }
      // 슬래시(/)는 모델코드(예: MH334KH/A)가 아닐 때(앞뒤 공백이 있을 때)만 품목 구분자로 처리
      if (ch === '/' && /\s$/.test(cur) && /^\s/.test(text.slice(i + 1))) {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * 모델명 내부 알파벳 X+숫자(예: SM-X620NZAAKOO -> 620)가 수량으로 오인식되는 현상을 원천 차단합니다.
 * 반드시 괄호(모델코드) 바깥 또는 독립된 수량 표기(×2, x 2, 2대, 2개, 2세트)만 추출하며 최대 20개로 안전 상한을 둡니다.
 */
function extractSafeItemQuantity(seg: string): number {
  const withoutParens = seg.replace(/\([^)]*\)/g, ' ');
  const multMatch =
    withoutParens.match(/×\s*(\d{1,2})(?!\d)/) ||
    withoutParens.match(/(?:^|[\s)])[xX*]\s*(\d{1,2})(?=\s*(?:대|개|세트)?\s*$)/) ||
    withoutParens.match(/(?:^|[\s)])(\d{1,2})\s*(?:대|개|세트)(?=\s*$)/);
  if (multMatch) {
    const parsed = parseInt(multMatch[1], 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 20) {
      return parsed;
    }
  }
  return 1;
}

export function parsePurchasedModelsFromItemsText(
  itemsText: string,
  defaultSaleType: 'general' | 'subscription' = 'general'
): PurchasedModelEntry[] {
  const raw = (itemsText || '').trim();
  if (!raw) return [];

  const cleaned = raw.replace(/^\[[^\]]+\]\s*/, '').trim();
  if (!cleaned) return [];

  const segments = splitItemsOutsideParens(cleaned);

  const results: PurchasedModelEntry[] = [];
  segments.forEach((seg, idx) => {
    const qty = extractSafeItemQuantity(seg);

    const parenMatch = seg.match(/^([^(]+)\(([^)]+)\)/);
    if (parenMatch) {
      const cat = parenMatch[1]
        .replace(/^(?:일반|구독)\s*\d*안?\s*/, '')
        .trim();
      const inside = parenMatch[2]
        .replace(/[·\s]*(?:36|60)\s*(?:M|개월)/gi, '')
        .replace(/(?:×\s*\d{1,2}|(?:^|\s)[xX*]\s*\d{1,2}|\d{1,2}\s*(?:대|개|세트))$/g, '')
        .trim();
      if (inside || cat) {
        results.push({
          id: `parsed-${idx}`,
          category: cat || '가전',
          modelName: inside || cat,
          quantity: qty,
          saleType:
            seg.includes('구독') || /\b(?:36|60)M\b/i.test(seg)
              ? 'subscription'
              : defaultSaleType,
          principalAmount: 0,
        });
        return;
      }
    }

    const codeTokenMatch = seg.match(/\b([A-Za-z][A-Za-z0-9._/-]{3,})\b/);
    if (codeTokenMatch) {
      const modelCode = codeTokenMatch[1];
      const catPart = seg
        .replace(modelCode, '')
        .replace(/(?:×\s*\d{1,2}|(?:^|\s)[xX*]\s*\d{1,2}|\d{1,2}\s*(?:대|개|세트))$/g, '')
        .trim();
      results.push({
        id: `parsed-${idx}`,
        category: catPart || '가전',
        modelName: modelCode,
        quantity: qty,
        saleType: defaultSaleType,
        principalAmount: 0,
      });
      return;
    }

    const cleanedModel = seg
      .replace(/(?:×\s*\d{1,2}|(?:^|\s)[xX*]\s*\d{1,2}|\d{1,2}\s*(?:대|개|세트))$/g, '')
      .trim();
    if (cleanedModel && !/^[A-Za-z]?\)$/.test(cleanedModel)) {
      results.push({
        id: `parsed-${idx}`,
        category: '품목',
        modelName: cleanedModel,
        quantity: qty,
        saleType: defaultSaleType,
        principalAmount: 0,
      });
    }
  });

  return results.filter((r) => Boolean(r.modelName));
}

function parseFallbackFreedFromText(benefitAndItems: string): CustomerFreedCounts {
  const counts = createEmptyFreedCounts();
  const txt = benefitAndItems || '';
  if (!txt) return counts;

  const matchCount = (re: RegExp): number => {
    const m = txt.match(re);
    if (!m) return 0;
    return Math.max(1, parseInt(m[1] || '1', 10) || 1);
  };

  if (/플러스\s*72/i.test(txt)) {
    counts.hi72 = matchCount(/플러스\s*72[^\d]*(\d+)\s*(?:구좌|건|개)?/i);
  }
  if (/플러스\s*90/i.test(txt)) {
    counts.hi90 = matchCount(/플러스\s*90[^\d]*(\d+)\s*(?:구좌|건|개)?/i);
  }
  if (/플러스\s*108/i.test(txt)) {
    counts.hi108 = matchCount(/플러스\s*108[^\d]*(\d+)\s*(?:구좌|건|개)?/i);
  }
  if (
    counts.hi72 + counts.hi90 + counts.hi108 === 0 &&
    /구독프리드\s*\(\s*(\d+)\s*구좌\s*\)/.test(txt)
  ) {
    const m = txt.match(/구독프리드\s*\(\s*(\d+)\s*구좌\s*\)/);
    counts.hi90 = Math.max(1, parseInt(m?.[1] || '1', 10) || 1);
  }

  if (/하이프리드\s*75|프리드\s*75/.test(txt)) {
    counts.hf75 = matchCount(/(?:하이)?프리드\s*75[^\d]*(\d+)?/);
  }
  if (/하이프리드\s*150|프리드\s*150/.test(txt)) {
    counts.hf150 = matchCount(/(?:하이)?프리드\s*150[^\d]*(\d+)?/);
  }
  if (/하이프리드\s*225|프리드\s*225/.test(txt)) {
    counts.hf225 = matchCount(/(?:하이)?프리드\s*225[^\d]*(\d+)?/);
  }
  if (/하이프리드\s*300|프리드\s*300/.test(txt)) {
    counts.hf300 = matchCount(/(?:하이)?프리드\s*300[^\d]*(\d+)?/);
  }

  return counts;
}

export interface ResolvedCustomerPerformanceProfile {
  saleType: CustomerSaleType;
  generalProductTotal: number;
  subscriptionPrincipal: number;
  performanceAmount: number;
  subscriptionItemCount: number;
  freedCounts: CustomerFreedCounts;
  freedDetail: ReturnType<typeof calculateFreedIncentiveDetail>;
  purchasedModels: PurchasedModelEntry[];
  contractYearMonth: string;
  contractDateStr: string;
  deliveryYearMonth: string;
  isConfirmed: boolean;
}

export function resolveCustomerPerformanceProfile(
  customer: CustomerItem
): ResolvedCustomerPerformanceProfile {
  const primaryQuote = customer.quotes?.[0];
  const fromProposal = extractPerformanceFromProposalState(
    primaryQuote?.proposalState
  );

  const inferredSubFromText =
    customer.saleType === 'subscription' ||
    primaryQuote?.quoteMode === 'subscription' ||
    (customer.items || '').includes('구독');

  const saleType: CustomerSaleType =
    customer.saleType ||
    fromProposal?.saleType ||
    primaryQuote?.quoteMode ||
    (inferredSubFromText ? 'subscription' : 'general');

  let generalProductTotal = 0;
  let subscriptionPrincipal = 0;
  let performanceAmount = 0;

  if (
    typeof customer.performanceAmount === 'number' &&
    customer.performanceAmount > 0
  ) {
    performanceAmount = customer.performanceAmount;
    if (
      typeof customer.generalProductTotal === 'number' ||
      typeof customer.subscriptionPrincipal === 'number'
    ) {
      generalProductTotal = customer.generalProductTotal || 0;
      subscriptionPrincipal = customer.subscriptionPrincipal || 0;
    } else if (saleType === 'subscription') {
      subscriptionPrincipal = performanceAmount;
    } else {
      generalProductTotal = performanceAmount;
    }
  } else if (
    (typeof customer.generalProductTotal === 'number' && customer.generalProductTotal > 0) ||
    (typeof customer.subscriptionPrincipal === 'number' && customer.subscriptionPrincipal > 0)
  ) {
    generalProductTotal = Math.max(0, Number(customer.generalProductTotal) || 0);
    subscriptionPrincipal = Math.max(0, Number(customer.subscriptionPrincipal) || 0);
    performanceAmount = generalProductTotal + subscriptionPrincipal;
  } else if (fromProposal && fromProposal.performanceAmount > 0) {
    generalProductTotal = fromProposal.generalProductTotal;
    subscriptionPrincipal = fromProposal.subscriptionPrincipal;
    performanceAmount = fromProposal.performanceAmount;
  } else if (
    typeof primaryQuote?.performanceAmount === 'number' &&
    primaryQuote.performanceAmount > 0
  ) {
    performanceAmount = primaryQuote.performanceAmount;
    generalProductTotal = primaryQuote.generalProductTotal || 0;
    subscriptionPrincipal = primaryQuote.subscriptionPrincipal || 0;
  } else {
    const rawPaid = Math.max(0, Number(customer.paidAmount) || 0);
    if (saleType === 'subscription') {
      if (rawPaid > 0 && rawPaid < 400_000) {
        const periodGuess =
          (customer.items || '').includes('36개월') ||
          (customer.items || '').includes('36M')
            ? 36
            : 60;
        subscriptionPrincipal = rawPaid * periodGuess;
      } else {
        subscriptionPrincipal = rawPaid;
      }
      performanceAmount = subscriptionPrincipal;
    } else {
      generalProductTotal = rawPaid;
      performanceAmount = rawPaid;
    }
  }

  let freedCounts: CustomerFreedCounts;
  if (customer.freedCounts) {
    freedCounts = sanitizeFreedCounts(customer.freedCounts);
  } else if (fromProposal) {
    freedCounts = fromProposal.freedCounts;
  } else if (primaryQuote?.freedCounts) {
    freedCounts = sanitizeFreedCounts(primaryQuote.freedCounts);
  } else {
    freedCounts = parseFallbackFreedFromText(
      `${customer.expectedBenefit || ''} ${customer.items || ''}`
    );
  }

  const freedDetail = calculateFreedIncentiveDetail(freedCounts);

  let purchasedModels: PurchasedModelEntry[];
  // 1순위: 견적서 계산기(proposalState)에서 저장된 정밀 모델 내역
  // 2순위: 수기 등록/수정 고객의 경우 과거 모델명 숫자(SM-X620 -> 620개, MH334KH/A -> 2개) 오인식 캐시를 자동 치유하기 위해 customer.items를 최신 안전 파서로 즉시 재해석!
  if (fromProposal && fromProposal.purchasedModels.length > 0) {
    purchasedModels = fromProposal.purchasedModels;
  } else if ((customer.items || '').trim()) {
    purchasedModels = parsePurchasedModelsFromItemsText(
      customer.items,
      saleType === 'subscription' ? 'subscription' : 'general'
    );
  } else if (
    Array.isArray(customer.purchasedModels) &&
    customer.purchasedModels.length > 0
  ) {
    purchasedModels = customer.purchasedModels
      .filter((m) => m && !/^[A-Za-z]?\)$/.test(String(m.modelName || '').trim()))
      .map((m) => ({
        ...m,
        quantity:
          Number(m.quantity) > 20 || Number(m.quantity) < 1
            ? 1
            : Math.floor(Number(m.quantity) || 1),
      }));
  } else if (
    Array.isArray(primaryQuote?.purchasedModels) &&
    primaryQuote.purchasedModels.length > 0
  ) {
    purchasedModels = primaryQuote.purchasedModels
      .filter((m) => m && !/^[A-Za-z]?\)$/.test(String(m.modelName || '').trim()))
      .map((m) => ({
        ...m,
        quantity:
          Number(m.quantity) > 20 || Number(m.quantity) < 1
            ? 1
            : Math.floor(Number(m.quantity) || 1),
      }));
  } else {
    purchasedModels = [];
  }

  // 구독 판매접수 품목(대수/건수) 자동 산출:
  // - 단독 구독(subscription) 및 혼합 견적(hybrid) 내 subscription 품목 수량 합산
  // - 수기 등록 등으로 세부 품목 배열이 비어 있더라도 구독 주문(구독원금>0 또는 구독모드 또는 플러스구독 가입)이면 최소 1개 보장
  const parsedSubUnits = purchasedModels
    .filter((m) => m.saleType === 'subscription')
    .reduce((acc, m) => acc + Math.max(1, Math.floor(Number(m.quantity) || 1)), 0);
  const hasSubscriptionOrder =
    saleType === 'subscription' ||
    subscriptionPrincipal > 0 ||
    freedDetail.plusSubCount > 0;
  const subscriptionItemCount =
    parsedSubUnits > 0 ? parsedSubUnits : hasSubscriptionOrder ? 1 : 0;

  return {
    saleType,
    generalProductTotal,
    subscriptionPrincipal,
    performanceAmount,
    subscriptionItemCount,
    freedCounts,
    freedDetail,
    purchasedModels,
    contractYearMonth: getCustomerContractYearMonth(customer),
    contractDateStr: getCustomerContractDateStr(customer),
    deliveryYearMonth: getCustomerDeliveryYearMonth(customer),
    isConfirmed: isConfirmedPurchaseCustomer(customer),
  };
}

export function normalizeModelMatchKey(raw?: string): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/\.(AKOR\d*|AKR\d*|KOR\d*)$/i, '')
    .replace(/[^A-Z0-9가-힣]+/g, '');
}

export function expandRuleCandidateKeys(rule: ModelIncentiveRule): string[] {
  const keys = new Set<string>();
  const raw = String(rule.modelCode || '').trim();
  if (!raw) return [];
  const fullKey = normalizeModelMatchKey(raw);
  if (fullKey) keys.add(fullKey);

  // 괄호 앞 베이스 코드 (예: ZPC2221(T) -> ZPC2221, CA-DRH0710W(SET) -> CADRH0710W)
  const hasVariantSuffix = /설치|셀프|직배수|일반형|install|self|refill|drainage/i.test(raw);
  const noParen = raw.replace(/\([^)]*\)/g, '').trim();
  const noParenKey = normalizeModelMatchKey(noParen);
  if (noParenKey && noParenKey.length >= 2 && !hasVariantSuffix) {
    keys.add(noParenKey);
  }

  // 괄호 내부 서브 모델코드 전개 (예: MEDICALPHANTOM (BFR-M8080) -> BFRM8080, X60 Master (X60MASTER_SELF / X60MASTER2))
  const parenRegex = /\(([^)]+)\)/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = parenRegex.exec(raw)) !== null) {
    const inner = pMatch[1].trim();
    if (!inner || inner.startsWith('+')) continue;
    const innerParts = inner.split(/[/,]/).map((p) => p.trim()).filter(Boolean);
    for (const part of innerParts) {
      if (part.startsWith('+')) continue;
      if (/^(SET|T|INSTALL|SELF|REFILL|DRAINAGE|BEST|WHITE|BLACK|SILVER)$/i.test(part)) continue;
      const pKey = normalizeModelMatchKey(part);
      if (pKey.length >= 5 && /[A-Z]/.test(pKey) && /\d/.test(pKey)) {
        keys.add(pKey);
      }
    }
  }

  // 슬래시 조합 코드 전개 (예: EARP-0071GAWSD / EARP-0071GAWSDI, GRF-1052ND/PD, EMF520-K/Q/S)
  if (noParen.includes('/')) {
    const parts = noParen.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const firstKey = normalizeModelMatchKey(first);
      if (firstKey.length >= 4) keys.add(firstKey);
      for (let i = 1; i < parts.length; i++) {
        const sub = parts[i];
        const subKey = normalizeModelMatchKey(sub);
        if (subKey.length >= 5) {
          keys.add(subKey);
        } else if (subKey.length >= 1 && first.length > sub.length) {
          const rebuilt = first.slice(0, first.length - sub.length) + sub;
          const rebuiltKey = normalizeModelMatchKey(rebuilt);
          if (rebuiltKey.length >= 4) keys.add(rebuiltKey);
        }
      }
    }
  }

  // 상품명에 실내기 모델명 또는 한글 전용 모델명(메디컬팬텀, 모멘티아, 셀라제 등)이 병기된 경우
  if (rule.productName) {
    const indoorMatch = rule.productName.match(/실내기\s*[:：]?\s*([A-Za-z0-9\-_]+)/);
    if (indoorMatch?.[1]) {
      const indoorKey = normalizeModelMatchKey(indoorMatch[1]);
      if (indoorKey.length >= 5) keys.add(indoorKey);
    }
    const strippedBrand = rule.productName.replace(/^\[[^\]]+\]\s*/, '').trim();
    const firstAlias = strippedBrand.split('/')[0]?.replace(/\([^)]*\)/g, '').trim() || '';
    if (
      firstAlias &&
      /[가-힣]/.test(firstAlias) &&
      firstAlias.length >= 3 &&
      firstAlias.length <= 10 &&
      !/^(셀프|설치|구독서비스|하이마트|기본모델|신제품|전동칫솔|무한잉크|동시구매|일반형|직배수)/.test(firstAlias)
    ) {
      const aliasKey = normalizeModelMatchKey(firstAlias);
      if (aliasKey.length >= 3) keys.add(aliasKey);
    }
  }

  return Array.from(keys);
}

export function matchModelToIncentiveRule(
  modelEntry: PurchasedModelEntry,
  rules: ModelIncentiveRule[]
): ModelIncentiveRule | null {
  if (!rules || rules.length === 0) return null;

  const targetCode = normalizeModelMatchKey(modelEntry.modelName);
  const targetCat = normalizeModelMatchKey(modelEntry.category);
  if (!targetCode && !targetCat) return null;

  const eligibleRules = rules.filter((r) => {
    if (!r.incentiveAmount || r.incentiveAmount <= 0) return false;
    if (
      r.saleTypeFilter &&
      r.saleTypeFilter !== 'all' &&
      r.saleTypeFilter !== modelEntry.saleType
    ) {
      return false;
    }
    return true;
  });

  for (const r of eligibleRules) {
    const candidateKeys = expandRuleCandidateKeys(r);
    for (const rKey of candidateKeys) {
      if (rKey.length >= 2 && targetCode === rKey) {
        return r;
      }
    }
  }

  let bestPrefixRule: ModelIncentiveRule | null = null;
  let bestPrefixLen = 0;

  for (const r of eligibleRules) {
    const rKey = normalizeModelMatchKey(r.modelCode);
    if (rKey.length < 5 || targetCode.length < 5) continue;

    if (targetCode.startsWith(rKey) || rKey.startsWith(targetCode)) {
      const matchLen = Math.min(rKey.length, targetCode.length);
      if (matchLen > bestPrefixLen) {
        bestPrefixLen = matchLen;
        bestPrefixRule = r;
      }
    } else if (targetCode.includes(rKey) && rKey.length >= 6) {
      if (rKey.length > bestPrefixLen) {
        bestPrefixLen = rKey.length;
        bestPrefixRule = r;
      }
    }
  }
  if (bestPrefixRule) return bestPrefixRule;

  for (const r of eligibleRules) {
    if (!r.productName) continue;
    const pKey = normalizeModelMatchKey(r.productName);
    if (pKey.length >= 4 && (targetCode === pKey || targetCat === pKey)) {
      return r;
    }
  }

  return null;
}

export type IncentiveMonthBasis = 'contract' | 'delivery';

export interface CustomerModelIncentiveMatchItem {
  modelEntry: PurchasedModelEntry;
  matchedRule: ModelIncentiveRule | null;
  unitIncentive: number;
  subtotalIncentive: number;
}

export interface ConfirmedCustomerSettlementRow {
  customer: CustomerItem;
  profile: ResolvedCustomerPerformanceProfile;
  modelMatches: CustomerModelIncentiveMatchItem[];
  matchedModelCount: number;
  customerModelIncentive: number;
  customerFreedIncentive: number;
  customerTotalIncentive: number;
}

export interface MonthlySettlementReport {
  yearMonth: string;
  incentiveBasis: IncentiveMonthBasis;
  grossSalesTotal: number;
  grossGeneralTotal: number;
  grossSubPrincipalTotal: number;
  grossRows: ConfirmedCustomerSettlementRow[];
  grossSubscriptionCount: number;
  grossSubscriptionCustomerCount: number;
  grossSubscriptionRows: ConfirmedCustomerSettlementRow[];
  netDeliverySalesTotal: number;
  netGeneralTotal: number;
  netSubPrincipalTotal: number;
  netDeliveryRows: ConfirmedCustomerSettlementRow[];
  netDeliverySubscriptionCount: number;
  undatedConfirmedCount: number;
  freedSummary: ReturnType<typeof calculateFreedIncentiveDetail>;
  freedCustomerRows: ConfirmedCustomerSettlementRow[];
  modelIncentiveTotal: number;
  matchedModelUnitCount: number;
  matchedCustomerCount: number;
  confirmedRowsForIncentive: ConfirmedCustomerSettlementRow[];
  grandTotalIncentive: number;
}

export function computeMonthlySettlementReport(
  customers: CustomerItem[],
  yearMonth: string,
  incentiveSheet?: MonthlyModelIncentiveSheet | null,
  incentiveBasis: IncentiveMonthBasis = 'contract'
): MonthlySettlementReport {
  const rules = incentiveSheet?.rules || [];
  const confirmedCustomers = (customers || []).filter(isConfirmedPurchaseCustomer);

  const buildRow = (c: CustomerItem): ConfirmedCustomerSettlementRow => {
    const profile = resolveCustomerPerformanceProfile(c);
    const modelMatches: CustomerModelIncentiveMatchItem[] =
      profile.purchasedModels.map((m) => {
        const matchedRule = matchModelToIncentiveRule(m, rules);
        const unitIncentive = matchedRule ? matchedRule.incentiveAmount : 0;
        const qty = Math.max(1, Number(m.quantity) || 1);
        return {
          modelEntry: m,
          matchedRule,
          unitIncentive,
          subtotalIncentive: unitIncentive * qty,
        };
      });

    const matchedModelCount = modelMatches.reduce(
      (s, x) => s + (x.matchedRule ? Math.max(1, x.modelEntry.quantity || 1) : 0),
      0
    );
    const customerModelIncentive = modelMatches.reduce(
      (s, x) => s + x.subtotalIncentive,
      0
    );
    const customerFreedIncentive = profile.freedDetail.totalIncentive;

    return {
      customer: c,
      profile,
      modelMatches,
      matchedModelCount,
      customerModelIncentive,
      customerFreedIncentive,
      customerTotalIncentive: customerFreedIncentive + customerModelIncentive,
    };
  };

  const allConfirmedRows = confirmedCustomers.map(buildRow);

  const grossRows = allConfirmedRows.filter(
    (r) => r.profile.contractYearMonth === yearMonth
  );
  const grossSalesTotal = grossRows.reduce(
    (s, r) => s + r.profile.performanceAmount,
    0
  );
  const grossGeneralTotal = grossRows.reduce(
    (s, r) => s + r.profile.generalProductTotal,
    0
  );
  const grossSubPrincipalTotal = grossRows.reduce(
    (s, r) => s + r.profile.subscriptionPrincipal,
    0
  );
  const grossSubscriptionRows = grossRows.filter(
    (r) => r.profile.subscriptionItemCount > 0
  );
  const grossSubscriptionCount = grossSubscriptionRows.reduce(
    (s, r) => s + r.profile.subscriptionItemCount,
    0
  );
  const grossSubscriptionCustomerCount = grossSubscriptionRows.length;

  const netDeliveryRows = allConfirmedRows.filter(
    (r) => r.profile.deliveryYearMonth === yearMonth
  );
  const netDeliverySalesTotal = netDeliveryRows.reduce(
    (s, r) => s + r.profile.performanceAmount,
    0
  );
  const netGeneralTotal = netDeliveryRows.reduce(
    (s, r) => s + r.profile.generalProductTotal,
    0
  );
  const netSubPrincipalTotal = netDeliveryRows.reduce(
    (s, r) => s + r.profile.subscriptionPrincipal,
    0
  );
  const netDeliverySubscriptionCount = netDeliveryRows.reduce(
    (s, r) => s + r.profile.subscriptionItemCount,
    0
  );

  const undatedConfirmedCount = grossRows.filter(
    (r) => !r.profile.deliveryYearMonth
  ).length;

  const confirmedRowsForIncentive =
    incentiveBasis === 'delivery' ? netDeliveryRows : grossRows;

  const aggFreedCounts = createEmptyFreedCounts();
  confirmedRowsForIncentive.forEach((r) => {
    aggFreedCounts.hi72 += r.profile.freedCounts.hi72;
    aggFreedCounts.hi90 += r.profile.freedCounts.hi90;
    aggFreedCounts.hi108 += r.profile.freedCounts.hi108;
    aggFreedCounts.hf75 += r.profile.freedCounts.hf75;
    aggFreedCounts.hf150 += r.profile.freedCounts.hf150;
    aggFreedCounts.hf225 += r.profile.freedCounts.hf225;
    aggFreedCounts.hf300 += r.profile.freedCounts.hf300;
  });

  const freedSummary = calculateFreedIncentiveDetail(aggFreedCounts);
  const freedCustomerRows = confirmedRowsForIncentive.filter(
    (r) => r.profile.freedDetail.totalCount > 0
  );

  const modelIncentiveTotal = confirmedRowsForIncentive.reduce(
    (s, r) => s + r.customerModelIncentive,
    0
  );
  const matchedModelUnitCount = confirmedRowsForIncentive.reduce(
    (s, r) => s + r.matchedModelCount,
    0
  );
  const matchedCustomerCount = confirmedRowsForIncentive.filter(
    (r) => r.customerModelIncentive > 0
  ).length;

  const grandTotalIncentive =
    freedSummary.totalIncentive + modelIncentiveTotal;

  return {
    yearMonth,
    incentiveBasis,
    grossSalesTotal,
    grossGeneralTotal,
    grossSubPrincipalTotal,
    grossRows,
    grossSubscriptionCount,
    grossSubscriptionCustomerCount,
    grossSubscriptionRows,
    netDeliverySalesTotal,
    netGeneralTotal,
    netSubPrincipalTotal,
    netDeliveryRows,
    netDeliverySubscriptionCount,
    undatedConfirmedCount,
    freedSummary,
    freedCustomerRows,
    modelIncentiveTotal,
    matchedModelUnitCount,
    matchedCustomerCount,
    confirmedRowsForIncentive,
    grandTotalIncentive,
  };
}



// ============================================================================
// 월별 가전올케어 수동 수량 저장소 (고객관리 <-> 메인화면 수당적립 요약 실시간 연동)
// ============================================================================

export type MonthlyAllCareCountsMap = Record<string, number>;

export const MONTHLY_ALLCARE_STORAGE_KEY = 'himart_crm_monthly_allcare_counts_v1';
export const ALLCARE_COUNT_UPDATED_EVENT = 'himart-allcare-count-updated';

function sanitizeAllCareMap(raw: unknown): MonthlyAllCareCountsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: MonthlyAllCareCountsMap = {};
  for (const [ym, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const n = Math.max(0, Math.floor(Number(val) || 0));
    out[ym] = n;
  }
  return out;
}

function emitAllCareCountUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ALLCARE_COUNT_UPDATED_EVENT));
  }
}

export function loadAllMonthlyAllCareCounts(): MonthlyAllCareCountsMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(MONTHLY_ALLCARE_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeAllCareMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function getMonthlyAllCareCount(
  yearMonth: string,
  map?: MonthlyAllCareCountsMap
): number {
  const target = map ?? loadAllMonthlyAllCareCounts();
  return Math.max(0, Math.floor(Number(target[yearMonth]) || 0));
}

export async function hydrateMonthlyAllCareCountsFromIdb(): Promise<MonthlyAllCareCountsMap> {
  const local = loadAllMonthlyAllCareCounts();
  try {
    const mirrored = await idbMirrorGet<MonthlyAllCareCountsMap>(
      MONTHLY_ALLCARE_STORAGE_KEY
    );
    const safeMirror = sanitizeAllCareMap(mirrored);
    if (Object.keys(safeMirror).length > 0 && Object.keys(local).length === 0) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          MONTHLY_ALLCARE_STORAGE_KEY,
          JSON.stringify(safeMirror)
        );
      }
      emitAllCareCountUpdated();
      return safeMirror;
    }
    if (Object.keys(safeMirror).length > 0) {
      return { ...safeMirror, ...local };
    }
  } catch {
    // Ignore IDB fallback errors
  }
  return local;
}

export function saveAllMonthlyAllCareCounts(map: MonthlyAllCareCountsMap): void {
  const safe = sanitizeAllCareMap(map);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(MONTHLY_ALLCARE_STORAGE_KEY, JSON.stringify(safe));
    } catch {
      // Ignore storage quota warning
    }
  }
  void idbMirrorSet(MONTHLY_ALLCARE_STORAGE_KEY, safe);
  emitAllCareCountUpdated();
}

export function setMonthlyAllCareCount(
  yearMonth: string,
  nextCount: number
): MonthlyAllCareCountsMap {
  const current = loadAllMonthlyAllCareCounts();
  const clamped = Math.max(0, Math.min(9999, Math.floor(Number(nextCount) || 0)));
  const updated: MonthlyAllCareCountsMap = {
    ...current,
    [yearMonth]: clamped,
  };
  saveAllMonthlyAllCareCounts(updated);
  return updated;
}
