import {
  CustomerFreedCounts,
  CustomerItem,
  CustomerSaleType,
  CustomerStatus,
  PurchasedModelEntry,
  QuoteRecord,
} from '../types/crm';
import { getNowDateTimeStr, getTodayStr } from '../utils/date';
import { extractPerformanceFromProposalState } from '../utils/settlementEngine';
import {
  calculateGeneralPurchaseSummary,
  calculateSubscriptionSummary,
  getGeneralPlan1And2Summaries,
  ProposalState,
} from '../../types/proposal';
import {
  enqueueOfflineMutation,
  flushPendingOutbox,
  idbMirrorGet,
  idbMirrorSet,
} from '../../utils/offlineDbQueue';

export const STORAGE_KEY_CACHE = 'gookji_crm_customers_cache_v3';

let inMemoryCustomersCache: CustomerItem[] | null = null;
export const CRM_CUSTOMERS_UPDATED_EVENT = 'himart_crm_customers_updated';

function normalizePhoneKey(phone: string): string {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeNameKey(name: string): string {
  return String(name || '').trim().toLowerCase();
}

export function getCustomerIdentityKey(c: CustomerItem): string {
  const nameKey = normalizeNameKey(c.name);
  const phoneKey = normalizePhoneKey(c.phone);
  if (nameKey && phoneKey) {
    return `${nameKey}__${phoneKey}`;
  }
  return c.id;
}

/**
 * 과거 인스타 DB 자동연동 중 생성되었던 0원 더미 견적인지 판별
 */
export function isDummyInstaZeroQuote(q?: QuoteRecord | null): boolean {
  if (!q) return false;
  const hasRealAmount =
    (Number(q.paidAmount) || 0) > 0 ||
    (Number(q.netAmount) || 0) > 0 ||
    (Number(q.performanceAmount) || 0) > 0;
  if (hasRealAmount || q.proposalState) return false;
  const title = String(q.title || '').trim();
  const benefit = String(q.benefit || '').trim();
  return (
    title.startsWith('인스타DB') ||
    benefit === '인스타 광고 전용 최대 혜택 안내'
  );
}

/**
 * 보관된 QuoteRecord로부터 고객 카드 최상위 대표 금액·품목·실적 필드를 정확히 추출
 */
export function buildPrimaryFieldsFromQuote(
  quote: QuoteRecord,
  fallbackCustomer?: Partial<CustomerItem>
): Partial<CustomerItem> {
  const extractedPerf = extractPerformanceFromProposalState(quote.proposalState);
  let resolvedPaid = Math.max(0, Number(quote.paidAmount) || 0);
  let resolvedNet = Math.max(0, Number(quote.netAmount) || 0);

  // 혹시라도 quote.netAmount가 0이고 proposalState가 살아있는 경우 proposalState에서 즉시 정밀 재계산
  if ((resolvedNet <= 0 || resolvedPaid <= 0) && quote.proposalState) {
    try {
      const { plan1Data, plan2Data, hasPlan1Data, hasPlan2Data } =
        getGeneralPlan1And2Summaries(quote.proposalState as ProposalState);
      const primaryData = !hasPlan1Data && hasPlan2Data ? plan2Data : plan1Data;
      const mode = (quote.proposalState as ProposalState).quoteMode || quote.quoteMode;
      if (mode === 'subscription') {
        const subSum = calculateSubscriptionSummary(primaryData);
        if (resolvedPaid <= 0) resolvedPaid = Math.max(0, subSum.totalBaseMonthly || 0);
        if (resolvedNet <= 0) resolvedNet = Math.max(0, subSum.finalMonthlyFee || 0);
      } else {
        const genSum = calculateGeneralPurchaseSummary(primaryData);
        if (resolvedPaid <= 0) resolvedPaid = Math.max(0, genSum.payPrice || genSum.sum || 0);
        if (resolvedNet <= 0) resolvedNet = Math.max(0, genSum.rawNet || 0);
      }
    } catch {
      // ignore fallback calc error
    }
  }

  const saleType: CustomerSaleType =
    extractedPerf?.saleType ||
    quote.quoteMode ||
    fallbackCustomer?.saleType ||
    'general';

  const performanceAmount =
    extractedPerf?.performanceAmount ??
    quote.performanceAmount ??
    resolvedPaid;

  return {
    items: (quote.itemSummary || '').trim() || fallbackCustomer?.items || '',
    paidAmount: resolvedPaid,
    netAmount: resolvedNet,
    expectedBenefit: (quote.benefit || '').trim() || fallbackCustomer?.expectedBenefit || '',
    saleType,
    performanceAmount,
    generalProductTotal:
      extractedPerf?.generalProductTotal ?? quote.generalProductTotal ?? 0,
    subscriptionPrincipal:
      extractedPerf?.subscriptionPrincipal ?? quote.subscriptionPrincipal ?? 0,
    freedCounts:
      extractedPerf?.freedCounts ?? quote.freedCounts ?? fallbackCustomer?.freedCounts,
    purchasedModels:
      extractedPerf?.purchasedModels ??
      quote.purchasedModels ??
      fallbackCustomer?.purchasedModels,
  };
}

function isInstaPlaceholderItems(items?: string): boolean {
  const s = String(items || '').trim();
  if (!s) return true;
  return (
    s.includes('인스타 광고') ||
    s.includes('오픈점 최대 지원') ||
    s.includes('구매 부담 경감')
  );
}

/**
 * [자가 치유 엔진]
 * 1) 0원 더미 '인스타DB (...)' 견적이 남아 있으면 자동 제거
 * 2) 기존 견적서가 보관함에 살아있는데 고객 요약카드 최상위 최종혜택가(netAmount)/실결제가(paidAmount)/품목이 0원 또는 인스타 문구로 덮어써진 경우,
 *    보관된 최상위 실제 견적서 데이터로 100% 자동 복원!
 */
export function healCustomerPrimaryQuoteFields(item: CustomerItem): CustomerItem {
  const rawQuotes = Array.isArray(item.quotes) ? item.quotes : [];
  const cleanedQuotes = rawQuotes
    .filter((q) => Boolean(q) && !isDummyInstaZeroQuote(q))
    .slice(0, 5);

  const primaryValidQuote = cleanedQuotes.find(
    (q) =>
      (Number(q.netAmount) || 0) > 0 ||
      (Number(q.paidAmount) || 0) > 0 ||
      (Number(q.performanceAmount) || 0) > 0 ||
      Boolean(q.proposalState)
  );

  if (!primaryValidQuote) {
    if (cleanedQuotes.length !== rawQuotes.length) {
      return { ...item, quotes: cleanedQuotes };
    }
    return item;
  }

  const needsNetHeal = !(Number(item.netAmount) > 0);
  const needsPaidHeal = !(Number(item.paidAmount) > 0);
  const needsItemsHeal = isInstaPlaceholderItems(item.items);
  const needsBenefitHeal =
    !item.expectedBenefit ||
    item.expectedBenefit === '인스타 광고 전용 최대 혜택 안내';
  const needsPerfHeal = !(Number(item.performanceAmount) > 0);

  if (
    !needsNetHeal &&
    !needsPaidHeal &&
    !needsItemsHeal &&
    !needsBenefitHeal &&
    !needsPerfHeal &&
    cleanedQuotes.length === rawQuotes.length
  ) {
    return item;
  }

  const fromQuote = buildPrimaryFieldsFromQuote(primaryValidQuote, item);

  return {
    ...item,
    quotes: cleanedQuotes,
    items: needsItemsHeal ? fromQuote.items || item.items : item.items,
    paidAmount: needsPaidHeal
      ? fromQuote.paidAmount ?? item.paidAmount
      : item.paidAmount,
    netAmount: needsNetHeal
      ? fromQuote.netAmount ?? item.netAmount
      : item.netAmount,
    expectedBenefit: needsBenefitHeal
      ? fromQuote.expectedBenefit ?? item.expectedBenefit
      : item.expectedBenefit,
    saleType:
      needsNetHeal || needsPaidHeal || !item.saleType
        ? fromQuote.saleType || item.saleType
        : item.saleType,
    performanceAmount: needsPerfHeal
      ? fromQuote.performanceAmount ?? item.performanceAmount
      : item.performanceAmount,
    generalProductTotal:
      !(Number(item.generalProductTotal) > 0) &&
      (fromQuote.generalProductTotal || 0) > 0
        ? fromQuote.generalProductTotal
        : item.generalProductTotal,
    subscriptionPrincipal:
      !(Number(item.subscriptionPrincipal) > 0) &&
      (fromQuote.subscriptionPrincipal || 0) > 0
        ? fromQuote.subscriptionPrincipal
        : item.subscriptionPrincipal,
    freedCounts: item.freedCounts ?? fromQuote.freedCounts,
    purchasedModels:
      Array.isArray(item.purchasedModels) && item.purchasedModels.length > 0
        ? item.purchasedModels
        : fromQuote.purchasedModels,
  };
}

/**
 * 견적 보관함에서 특정 견적을 삭제할 때 남은 최상위 견적으로 고객 요약카드(최종혜택가·실결제가·품목·실적)를 즉시 동기화
 */
export function deleteQuoteAndSyncCustomer(
  customer: CustomerItem,
  quoteId: string
): CustomerItem {
  const nextQuotes = (customer.quotes || []).filter(
    (q) => q.id !== quoteId && !isDummyInstaZeroQuote(q)
  );
  if (nextQuotes.length > 0) {
    const topValid =
      nextQuotes.find(
        (q) =>
          (Number(q.netAmount) || 0) > 0 ||
          (Number(q.paidAmount) || 0) > 0 ||
          Boolean(q.proposalState)
      ) || nextQuotes[0];
    const syncedPatch = buildPrimaryFieldsFromQuote(topValid, customer);
    return {
      ...customer,
      ...syncedPatch,
      quotes: nextQuotes,
    };
  }
  return {
    ...customer,
    quotes: [],
  };
}

export function deduplicateCustomers(list: CustomerItem[]): CustomerItem[] {
  const map = new Map<string, CustomerItem>();

  for (const rawItem of list) {
    if (!rawItem || !rawItem.name) continue;
    const item = healCustomerPrimaryQuoteFields(rawItem);
    const key = getCustomerIdentityKey(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...item,
        quotes: Array.isArray(item.quotes) ? item.quotes.slice(0, 5) : [],
      });
    } else {
      const mergedQuotesMap = new Map<string, QuoteRecord>();
      const allQuotes = [...(item.quotes || []), ...(existing.quotes || [])];
      for (const q of allQuotes) {
        if (q && q.id && !isDummyInstaZeroQuote(q) && !mergedQuotesMap.has(q.id)) {
          mergedQuotesMap.set(q.id, q);
        }
      }
      const mergedQuotes = Array.from(mergedQuotesMap.values()).slice(0, 5);

      const itemTouch = item.updatedAtMs || item.deletedAt || 0;
      const existTouch = existing.updatedAtMs || existing.deletedAt || 0;
      const isItemNewer =
        itemTouch !== existTouch
          ? itemTouch > existTouch
          : (item.regDate || '') >= (existing.regDate || '');
      const primary = isItemNewer ? item : existing;
      const secondary = isItemNewer ? existing : item;

      const mergedCandidate: CustomerItem = {
        ...secondary,
        ...primary,
        id: existing.id || item.id,
        paidAmount:
          (Number(primary.paidAmount) || 0) > 0
            ? primary.paidAmount
            : secondary.paidAmount,
        netAmount:
          (Number(primary.netAmount) || 0) > 0
            ? primary.netAmount
            : secondary.netAmount,
        items: !isInstaPlaceholderItems(primary.items)
          ? primary.items
          : secondary.items || primary.items,
        expectedBenefit:
          primary.expectedBenefit &&
          primary.expectedBenefit !== '인스타 광고 전용 최대 혜택 안내'
            ? primary.expectedBenefit
            : secondary.expectedBenefit || primary.expectedBenefit,
        contractDate:
          primary.contractDate !== undefined && primary.contractDate !== ""
            ? primary.contractDate
            : secondary.contractDate || undefined,
        deliveryDate:
          primary.deliveryDate !== undefined
            ? primary.deliveryDate
            : secondary.deliveryDate || "",
        saleType: primary.saleType || secondary.saleType || undefined,
        performanceAmount:
          (Number(primary.performanceAmount) || 0) > 0
            ? primary.performanceAmount
            : secondary.performanceAmount ?? primary.performanceAmount,
        generalProductTotal:
          primary.generalProductTotal ?? secondary.generalProductTotal,
        subscriptionPrincipal:
          primary.subscriptionPrincipal ?? secondary.subscriptionPrincipal,
        freedCounts: primary.freedCounts ?? secondary.freedCounts,
        purchasedModels: primary.purchasedModels ?? secondary.purchasedModels,
        orderNo: primary.orderNo ?? secondary.orderNo ?? '',
        giftItems: primary.giftItems ?? secondary.giftItems ?? '',
        giftSent: Boolean(primary.giftSent ?? secondary.giftSent),
        logisticsConfirmed: Boolean(
          primary.logisticsConfirmed ?? secondary.logisticsConfirmed
        ),
        followUpDate: primary.followUpDate ?? secondary.followUpDate ?? '',
        memo: primary.memo ?? secondary.memo ?? '',
        quotes: mergedQuotes,
        deletedAt: primary.deletedAt,
        updatedAtMs: Math.max(primary.updatedAtMs || 0, secondary.updatedAtMs || 0) || undefined,
      };

      map.set(key, healCustomerPrimaryQuoteFields(mergedCandidate));
    }
  }

  return Array.from(map.values());
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getCachedCustomers(): CustomerItem[] {
  if (inMemoryCustomersCache) {
    return inMemoryCustomersCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const now = Date.now();
        const valid = parsed.filter(
          (c: CustomerItem) => !c.deletedAt || now - c.deletedAt < THIRTY_DAYS_MS
        );
        const deduped = deduplicateCustomers(valid);
        inMemoryCustomersCache = deduped;
        return deduped;
      }
    }
  } catch (e) {
    console.error('Failed to read local customer cache', e);
  }
  return [];
}

export function setCachedCustomers(customers: CustomerItem[]): CustomerItem[] {
  const deduped = deduplicateCustomers(customers);
  // 1순위: 인메모리 캐시 즉시 반영 (localStorage 5MB 초과 시에도 유실 0%)
  inMemoryCustomersCache = deduped;
  try {
    localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(deduped));
  } catch (e) {
    console.error('localStorage quota warning — relying on memory + IndexedDB mirror', e);
  }
  // 대용량 다중 견적 데이터를 IndexedDB에도 즉시 비동기 미러링 (5MB 한계 돌파)
  idbMirrorSet(STORAGE_KEY_CACHE, deduped).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CRM_CUSTOMERS_UPDATED_EVENT));
  }
  return deduped;
}

export async function fetchCustomersFromGas(): Promise<{
  customers: CustomerItem[];
  fromCloud: boolean;
}> {
  const local = getCachedCustomers();
  if (local.length > 0) {
    idbMirrorSet(STORAGE_KEY_CACHE, local).catch(() => {});
    await flushPendingOutbox();
    return { customers: local, fromCloud: false };
  }

  // localStorage가 비어있거나 용량 초과였을 경우 IndexedDB 미러에서 복구
  const idbData = await idbMirrorGet<CustomerItem[]>(STORAGE_KEY_CACHE);
  if (Array.isArray(idbData) && idbData.length > 0) {
    const deduped = deduplicateCustomers(idbData);
    inMemoryCustomersCache = deduped;
    try {
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(deduped));
    } catch {
      // ignore
    }
    return { customers: deduped, fromCloud: false };
  }

  return { customers: [], fromCloud: false };
}

export async function saveCustomerQuote(payload: {
  targetCustomerId?: string;
  name: string;
  phone: string;
  items: string;
  paidAmount: number;
  netAmount: number;
  expectedBenefit: string;
  contractDate?: string;
  deliveryDate: string;
  followUpDate?: string;
  status: CustomerStatus;
  memo: string;
  orderNo?: string;
  giftItems?: string;
  quoteTitle?: string;
  proposalState?: any;
  quoteMode?: 'general' | 'subscription' | 'hybrid';
  saleType?: CustomerSaleType;
  performanceAmount?: number;
  generalProductTotal?: number;
  subscriptionPrincipal?: number;
  freedCounts?: CustomerFreedCounts;
  purchasedModels?: PurchasedModelEntry[];
  plan2Summary?: {
    itemSummary: string;
    paidAmount: number;
    netAmount: number;
    benefit?: string;
    performanceAmount?: number;
  };
  saveMode?: 'overwrite' | 'append';
  overwriteQuoteId?: string;
}): Promise<{
  customers: CustomerItem[];
  savedCustomer: CustomerItem;
  isExistingCustomer: boolean;
  quoteCount: number;
  savedQuoteId: string;
  wasOverwritten: boolean;
}> {
  const current = getCachedCustomers();
  const nowStr = getNowDateTimeStr();
  const todayStr = getTodayStr();

  const extractedPerf = extractPerformanceFromProposalState(payload.proposalState);
  const resolvedSaleType: CustomerSaleType =
    payload.saleType ||
    extractedPerf?.saleType ||
    payload.quoteMode ||
    'general';
  const resolvedGeneralTotal =
    payload.generalProductTotal ?? extractedPerf?.generalProductTotal ?? 0;
  const resolvedSubPrincipal =
    payload.subscriptionPrincipal ?? extractedPerf?.subscriptionPrincipal ?? 0;
  const resolvedPerformanceAmount =
    payload.performanceAmount ??
    extractedPerf?.performanceAmount ??
    payload.paidAmount;
  const resolvedFreedCounts =
    payload.freedCounts ?? extractedPerf?.freedCounts;
  const resolvedPurchasedModels =
    payload.purchasedModels ?? extractedPerf?.purchasedModels;

  const newQuote: QuoteRecord = {
    id: `QT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title:
      payload.quoteTitle?.trim() ||
      `${payload.items.slice(0, 18) || '맞춤 견적'}`,
    createdAt: nowStr,
    itemSummary: payload.items,
    paidAmount: payload.paidAmount,
    netAmount: payload.netAmount,
    benefit: payload.expectedBenefit,
    proposalState: payload.proposalState
      ? JSON.parse(JSON.stringify(payload.proposalState))
      : undefined,
    quoteMode: payload.quoteMode,
    plan2Summary: payload.plan2Summary,
    performanceAmount: resolvedPerformanceAmount,
    generalProductTotal: resolvedGeneralTotal,
    subscriptionPrincipal: resolvedSubPrincipal,
    freedCounts: resolvedFreedCounts,
    purchasedModels: resolvedPurchasedModels,
  };

  let existingIndex = -1;
  if (payload.targetCustomerId) {
    existingIndex = current.findIndex(
      (c) => c.id === payload.targetCustomerId && !c.deletedAt
    );
  }
  if (existingIndex < 0) {
    const targetNameKey = normalizeNameKey(payload.name);
    const targetPhoneKey = normalizePhoneKey(payload.phone);
    existingIndex = current.findIndex((c) => {
      const cName = normalizeNameKey(c.name);
      const cPhone = normalizePhoneKey(c.phone);
      if (targetNameKey && targetPhoneKey) {
        return cName === targetNameKey && cPhone === targetPhoneKey;
      }
      return cName === targetNameKey && cPhone === '';
    });
  }

  let updatedList: CustomerItem[];
  let savedCustomer: CustomerItem;
  let isExistingCustomer = false;
  let savedQuoteId = newQuote.id;
  let wasOverwritten = false;

  if (existingIndex >= 0) {
    isExistingCustomer = true;
    const existing = current[existingIndex];
    const prevQuotes = (Array.isArray(existing.quotes) ? existing.quotes : []).filter(
      (q) => Boolean(q) && !isDummyInstaZeroQuote(q)
    );
    let nextQuotes: QuoteRecord[];
    if (payload.saveMode === 'overwrite' && prevQuotes.length > 0) {
      wasOverwritten = true;
      const targetIdx = payload.overwriteQuoteId
        ? prevQuotes.findIndex((q) => q.id === payload.overwriteQuoteId)
        : 0;
      const replaceIdx = targetIdx >= 0 ? targetIdx : 0;
      const preservedId = prevQuotes[replaceIdx]?.id || newQuote.id;
      savedQuoteId = preservedId;
      const overwrittenQuote: QuoteRecord = {
        ...newQuote,
        id: preservedId,
      };
      const remaining = prevQuotes.filter((_, idx) => idx !== replaceIdx);
      nextQuotes = [overwrittenQuote, ...remaining].slice(0, 5);
    } else {
      nextQuotes = [newQuote, ...prevQuotes].slice(0, 5);
    }

    savedCustomer = {
      ...existing,
      regDate: nowStr,
      contractDate:
        payload.contractDate?.trim() ||
        existing.contractDate ||
        existing.regDate?.slice(0, 10) ||
        todayStr,
      name: payload.name.trim() || existing.name,
      phone: payload.phone.trim() || existing.phone,
      items: payload.items,
      paidAmount: payload.paidAmount,
      netAmount: payload.netAmount,
      expectedBenefit: payload.expectedBenefit,
      saleType: resolvedSaleType,
      performanceAmount: resolvedPerformanceAmount,
      generalProductTotal: resolvedGeneralTotal,
      subscriptionPrincipal: resolvedSubPrincipal,
      freedCounts: resolvedFreedCounts,
      purchasedModels: resolvedPurchasedModels,
      deliveryDate:
        payload.deliveryDate !== undefined
          ? payload.deliveryDate.trim()
          : existing.deliveryDate,
      followUpDate:
        payload.followUpDate !== undefined
          ? payload.followUpDate
          : existing.followUpDate,
      status: payload.status || existing.status,
      memo: payload.memo
        ? existing.memo && !existing.memo.includes(payload.memo)
          ? `${payload.memo}\n${existing.memo}`
          : existing.memo || payload.memo
        : existing.memo,
      orderNo: payload.orderNo || existing.orderNo,
      giftItems: payload.giftItems || existing.giftItems,
      quotes: nextQuotes,
      deletedAt: undefined,
      updatedAtMs: Date.now(),
    };

    updatedList = [
      savedCustomer,
      ...current.filter((_, idx) => idx !== existingIndex),
    ];
  } else {
    savedCustomer = {
      id: `CUST-${Date.now()}`,
      regDate: nowStr,
      contractDate: payload.contractDate?.trim() || todayStr,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      items: payload.items,
      paidAmount: payload.paidAmount,
      netAmount: payload.netAmount,
      expectedBenefit: payload.expectedBenefit,
      saleType: resolvedSaleType,
      performanceAmount: resolvedPerformanceAmount,
      generalProductTotal: resolvedGeneralTotal,
      subscriptionPrincipal: resolvedSubPrincipal,
      freedCounts: resolvedFreedCounts,
      purchasedModels: resolvedPurchasedModels,
      deliveryDate: payload.deliveryDate,
      followUpDate: payload.followUpDate || '',
      status: payload.status,
      memo: payload.memo,
      orderNo: payload.orderNo || '',
      giftItems: payload.giftItems || '',
      giftSent: false,
      logisticsConfirmed: false,
      quotes: [newQuote],
      deletedAt: undefined,
      updatedAtMs: Date.now(),
    };

    updatedList = [savedCustomer, ...current];
  }

  const deduped = setCachedCustomers(updatedList);
  await syncCustomerToGas('upsertCustomer', savedCustomer);

  return {
    customers: deduped,
    savedCustomer,
    isExistingCustomer,
    quoteCount: savedCustomer.quotes?.length || 1,
    savedQuoteId,
    wasOverwritten,
  };
}

export async function fetchCustomers(): Promise<CustomerItem[]> {
  return getCachedCustomers();
}

export async function saveCustomerToSheet(
  customer: CustomerItem
): Promise<boolean> {
  const stamped: CustomerItem = {
    ...customer,
    updatedAtMs: Date.now(),
  };
  const list = getCachedCustomers();
  const idx = list.findIndex((c) => c.id === stamped.id);
  const next =
    idx >= 0
      ? list.map((c, i) => (i === idx ? stamped : c))
      : [stamped, ...list];
  setCachedCustomers(next);
  return true;
}

export async function syncCustomerToGas(
  action: 'create' | 'update' | 'delete' | 'upsertCustomer',
  customer: Partial<CustomerItem> & { id: string }
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueOfflineMutation({
      domain: 'crm',
      action,
      payload: customer,
    });
  }
  return true;
}
