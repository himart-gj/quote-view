import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  FolderOpen,
  Kanban,
  LayoutGrid,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  CustomerItem,
  CustomerStatus,
  FilterTab,
  QuoteRecord,
  SettlementTabId,
  SortOrder,
} from './types/crm';
import {
  CRM_CUSTOMERS_UPDATED_EVENT,
  deleteQuoteAndSyncCustomer,
  fetchCustomersFromGas,
  getCachedCustomers,
  getCustomerIdentityKey,
  setCachedCustomers,
  syncCustomerToGas,
} from './services/gasApi';
import {
  getBriefingSummary,
  triggerDailyMorningNotification,
} from './services/notificationService';
import {
  getDeliveryDDay,
  getPastDueDeliveryCustomers,
  hasUnpaidGift,
  isPendingLogisticsCustomer,
  isUrgentCustomer,
} from './utils/date';
import {
  computeMonthlySettlementReport,
  extractPerformanceFromProposalState,
  getCurrentYearMonth,
  resolveCustomerPerformanceProfile,
} from './utils/settlementEngine';
import { syncMarketingDbTrashFromCrmCustomer } from '../utils/marketingDbEngine';
import { CRMHeader } from './components/CRMHeader';
import { CompactCustomerCard } from './components/CompactCustomerCard';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { SMSModal } from './components/SMSModal';
import { NewCustomerModal } from './components/NewCustomerModal';
import { SettingsModal } from './components/SettingsModal';
import { MorningBriefingModal } from './components/MorningBriefingModal';
import { PastDeliveryCheckModal } from './components/PastDeliveryCheckModal';
import { CrmSalesAndIncentivePanel } from './components/CrmSalesAndIncentivePanel';
import {
  CrmAnalyticsStrip,
  CrmDeliveryCalendar,
  CrmKanbanBoard,
} from './components/CrmKanbanAndAnalytics';

const FILTER_TABS: FilterTab[] = [
  '🔥긴급/오늘할일',
  '🚚물류/배송대기',
  '🎁사은품미지급',
  '신규/미발송',
  '상담진행중',
  '미구매/고민중',
  '계약완료',
  '발송완료',
  '배송완료',
  '취소/보류',
];

const BRIEFING_SHOWN_SESSION_KEY = 'gookji_crm_briefing_shown_session';
export const PAST_DELIVERY_POPUP_DISMISSED_KEY = 'himart_past_delivery_popup_dismissed_session';

type CrmViewMode = 'grid' | 'kanban' | 'calendar';

const CRM_LAST_ACTIVE_TAB_KEY = 'himart_crm_last_tab_v1';

interface CrmAppProps {
  onBackToHome: () => void;
  backLabel?: string;
  onOpenCustomerInQuoteBuilder: (customer: CustomerItem) => void;
  onOpenQuoteRecordInQuoteBuilder: (
    customer: CustomerItem,
    quote: QuoteRecord
  ) => void;
  onCustomersChange?: (customers: CustomerItem[]) => void;
  initialSettlementTab?: SettlementTabId;
  initialSelectedCustomerId?: string | null;
}

export const CrmApp: React.FC<CrmAppProps> = ({
  onBackToHome,
  backLabel,
  onOpenCustomerInQuoteBuilder,
  onOpenQuoteRecordInQuoteBuilder,
  onCustomersChange,
  initialSettlementTab,
  initialSelectedCustomerId,
}) => {
  // 앱 다크모드 실시간 동기화
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') === 'dark'
      : false
  );

  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    const sync = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  const [customers, setCustomers] = useState<CustomerItem[]>(() =>
    getCachedCustomers()
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 월간 총판·실판 및 수당 정산 탭 상태
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() =>
    getCurrentYearMonth()
  );
  const [settlementTab, setSettlementTab] = useState<SettlementTabId>(
    initialSettlementTab || 'sales'
  );

  useEffect(() => {
    if (initialSettlementTab) {
      setSettlementTab(initialSettlementTab);
    }
  }, [initialSettlementTab]);

  const [viewMode, setViewMode] = useState<CrmViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    try {
      const saved = sessionStorage.getItem(CRM_LAST_ACTIVE_TAB_KEY) as FilterTab | null;
      if (saved && (FILTER_TABS as readonly string[]).includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    const cached = getCachedCustomers().filter((c) => !c.deletedAt);
    if (cached.some((c) => isUrgentCustomer(c))) return '🔥긴급/오늘할일';
    if (cached.some((c) => c.status === '상담진행중')) return '상담진행중';
    if (cached.some((c) => c.status === '계약완료')) return '계약완료';
    return '🔥긴급/오늘할일';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(CRM_LAST_ACTIVE_TAB_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('urgentFirst');

  // Undo 실행 취소 히스토리 스택 (최대 15단계)
  const [undoHistory, setUndoHistory] = useState<
    { label: string; snapshot: CustomerItem[] }[]
  >([]);

  // 모달 상태
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialSelectedCustomerId || null
  );

  useEffect(() => {
    if (initialSelectedCustomerId) {
      setCustomers(getCachedCustomers());
      setSelectedCustomerId(initialSelectedCustomerId);
    }
  }, [initialSelectedCustomerId]);
  const [smsCustomer, setSmsCustomer] = useState<CustomerItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [prefillNewCustomer, setPrefillNewCustomer] =
    useState<Partial<CustomerItem> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
  const [isPastDeliveryModalOpen, setIsPastDeliveryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (
      smsCustomer !== null ||
      selectedCustomerId !== null ||
      isNewModalOpen ||
      isSettingsOpen ||
      isBriefingOpen ||
      isPastDeliveryModalOpen
    ) {
      try {
        window.history.pushState({ appGuard: true, tag: 'crm-modal' }, '');
      } catch {
        // ignore
      }
    }
    (window as any).__subViewBackHandler = (): boolean => {
      if (smsCustomer !== null) {
        setSmsCustomer(null);
        return true;
      }
      if (selectedCustomerId !== null) {
        setSelectedCustomerId(null);
        return true;
      }
      if (isNewModalOpen) {
        setIsNewModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isPastDeliveryModalOpen) {
        setIsPastDeliveryModalOpen(false);
        return true;
      }
      if (isBriefingOpen) {
        setIsBriefingOpen(false);
        return true;
      }
      if (viewMode !== 'grid') {
        setViewMode('grid');
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__subViewBackHandler;
    };
  }, [
    smsCustomer,
    selectedCustomerId,
    isNewModalOpen,
    isSettingsOpen,
    isBriefingOpen,
    isPastDeliveryModalOpen,
    viewMode,
  ]);

  // Sonner 스타일 플로팅 토스트 (Undo 지원)
  const [toastState, setToastState] = useState<{
    msg: string;
    canUndo?: boolean;
  } | null>(null);

  const showToast = useCallback((msg: string, canUndo = false) => {
    setToastState({ msg, canUndo });
    setTimeout(() => {
      setToastState((prev) => (prev?.msg === msg ? null : prev));
    }, 4200);
  }, []);

  const pushUndoSnapshot = useCallback(
    (label: string) => {
      setUndoHistory((prev) => [
        ...prev.slice(-14),
        { label, snapshot: customers },
      ]);
    },
    [customers]
  );

  const handleUndoLastAction = useCallback(() => {
    if (undoHistory.length === 0) return;
    const last = undoHistory[undoHistory.length - 1];
    setUndoHistory((prev) => prev.slice(0, -1));
    const deduped = setCachedCustomers(last.snapshot);
    setCustomers(deduped);
    showToast(`↩ 실행 취소됨: ${last.label}`, false);
  }, [undoHistory, showToast]);

  useEffect(() => {
    if (onCustomersChange) {
      onCustomersChange(customers);
    }
  }, [customers, onCustomersChange]);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    const { customers: loaded } = await fetchCustomersFromGas();
    setCustomers(loaded);
    setIsLoading(false);

    const activeLoaded = loaded.filter((c) => !c.deletedAt);
    const alreadyShown = sessionStorage.getItem(BRIEFING_SHOWN_SESSION_KEY);
    const summary = getBriefingSummary(activeLoaded);
    if (!alreadyShown && summary.totalActionCount > 0) {
      sessionStorage.setItem(BRIEFING_SHOWN_SESSION_KEY, '1');
      setIsBriefingOpen(true);
      triggerDailyMorningNotification(activeLoaded, false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    const syncLocal = () => setCustomers(getCachedCustomers());
    window.addEventListener(CRM_CUSTOMERS_UPDATED_EVENT, syncLocal);
    return () => window.removeEventListener(CRM_CUSTOMERS_UPDATED_EVENT, syncLocal);
  }, [loadCustomers]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => !c.deletedAt),
    [customers]
  );
  const pastDueDeliveryCustomers = useMemo(
    () => getPastDueDeliveryCustomers(activeCustomers),
    [activeCustomers]
  );

  useEffect(() => {
    if (
      pastDueDeliveryCustomers.length > 0 &&
      sessionStorage.getItem(PAST_DELIVERY_POPUP_DISMISSED_KEY) !== '1'
    ) {
      setIsPastDeliveryModalOpen(true);
    }
  }, [pastDueDeliveryCustomers.length]);

  const handleConfirmDelivered = async (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    if (!target) return;
    pushUndoSnapshot(`${target.name} 배송완료 처리`);
    const nowMs = Date.now();
    const updated = customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            status: '배송완료' as CustomerStatus,
            logisticsConfirmed: true,
            updatedAtMs: nowMs,
          }
        : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    const keepForGift = hasUnpaidGift(target);
    showToast(
      keepForGift
        ? `🚚 [${target.name}] 배송완료! (🎁 미지급 사은품이 있어 첫 화면에 계속 표시됩니다)`
        : `✅ [${target.name}] 배송완료 처리되어 첫 화면 목록에서 정리되었습니다.`,
      true
    );
    await syncCustomerToGas('update', {
      id: customerId,
      status: '배송완료',
      logisticsConfirmed: true,
    });
  };

  const handleConfirmAllDelivered = async (customerIds: string[]) => {
    if (customerIds.length === 0) return;
    const idSet = new Set(customerIds);
    pushUndoSnapshot(`배송완료 일괄 처리 (${customerIds.length}건)`);
    const nowMs = Date.now();
    const updated = customers.map((c) =>
      idSet.has(c.id)
        ? {
            ...c,
            status: '배송완료' as CustomerStatus,
            logisticsConfirmed: true,
            updatedAtMs: nowMs,
          }
        : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    setIsPastDeliveryModalOpen(false);
    showToast(`✅ 총 ${customerIds.length}건 배송완료 처리되었습니다.`, true);
    for (const cid of customerIds) {
      await syncCustomerToGas('update', {
        id: cid,
        status: '배송완료',
        logisticsConfirmed: true,
      });
    }
  };
  const trashedCustomers = useMemo(
    () => customers.filter((c) => Boolean(c.deletedAt)),
    [customers]
  );

  const selectedCustomer = useMemo(
    () => activeCustomers.find((c) => c.id === selectedCustomerId) || null,
    [activeCustomers, selectedCustomerId]
  );

  const handleStatusChange = async (
    id: string,
    nextStatus: CustomerStatus
  ) => {
    const target = customers.find((c) => c.id === id);
    if (target && target.status === nextStatus) return;
    pushUndoSnapshot(`${target?.name || '고객'} 상태 변경`);
    const nowMs = Date.now();
    const updated = customers.map((c) =>
      c.id === id ? { ...c, status: nextStatus, updatedAtMs: nowMs } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    showToast(
      `📌 [${target?.name || '고객'}] 상태 → [${nextStatus}]`,
      true
    );
    await syncCustomerToGas('update', { id, status: nextStatus, updatedAtMs: nowMs });
  };

  const handleMemoChange = async (id: string, nextMemo: string) => {
    const nowMs = Date.now();
    const updated = customers.map((c) =>
      c.id === id ? { ...c, memo: nextMemo, updatedAtMs: nowMs } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    showToast('📝 상담 메모가 저장되었습니다.');
    await syncCustomerToGas('update', { id, memo: nextMemo, updatedAtMs: nowMs });
  };

  const handleFieldChange = async (
    id: string,
    patch: Partial<CustomerItem>
  ) => {
    const target = customers.find((c) => c.id === id);
    pushUndoSnapshot(`${target?.name || '고객'} 정보 수정`);
    const nowMs = Date.now();
    const stampedPatch: Partial<CustomerItem> = {
      ...patch,
      updatedAtMs: nowMs,
    };
    const updated = customers.map((c) =>
      c.id === id ? { ...c, ...stampedPatch } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    if (selectedCustomerId === id && !deduped.some((c) => c.id === id) && target) {
      const mergedKey = getCustomerIdentityKey({ ...target, ...stampedPatch } as CustomerItem);
      const survivor = deduped.find((c) => !c.deletedAt && getCustomerIdentityKey(c) === mergedKey);
      if (survivor) setSelectedCustomerId(survivor.id);
    }
    if ('logisticsConfirmed' in patch) {
      showToast(
        `🚚 [${target?.name || '고객'}] ${
          patch.logisticsConfirmed ? '물류확정 완료' : '물류대기로 변경'
        }`,
        true
      );
    } else if ('giftSent' in patch) {
      showToast(
        `🎁 [${target?.name || '고객'}] ${
          patch.giftSent ? '사은품 지급완료' : '사은품 미지급으로 변경'
        }`,
        true
      );
    } else {
      showToast(`✅ [${target?.name || '고객'}] 정보가 업데이트되었습니다.`, true);
    }
    await syncCustomerToGas('update', { id, ...patch });
  };

  const handleDeleteQuoteRecord = async (
    customerId: string,
    quoteId: string
  ) => {
    pushUndoSnapshot('보관 견적 삭제');
    const updated = customers.map((c) =>
      c.id === customerId ? deleteQuoteAndSyncCustomer(c, quoteId) : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    showToast('🗑️ 선택한 견적이 삭제되었으며 남은 대표 견적 금액으로 자동 복원되었습니다.', true);
    const target = deduped.find((c) => c.id === customerId);
    if (target) {
      await syncCustomerToGas('update', {
        id: customerId,
        quotes: target.quotes,
        items: target.items,
        paidAmount: target.paidAmount,
        netAmount: target.netAmount,
        expectedBenefit: target.expectedBenefit,
        saleType: target.saleType,
        performanceAmount: target.performanceAmount,
        generalProductTotal: target.generalProductTotal,
        subscriptionPrincipal: target.subscriptionPrincipal,
        freedCounts: target.freedCounts,
        purchasedModels: target.purchasedModels,
      });
    }
  };

  const handleApplyQuoteAsPrimary = async (
    customerId: string,
    quote: QuoteRecord
  ) => {
    pushUndoSnapshot('대표 견적 변경');
    const extractedPerf = extractPerformanceFromProposalState(
      quote.proposalState
    );
    const patch: Partial<CustomerItem> = {
      items: quote.itemSummary,
      paidAmount: quote.paidAmount,
      netAmount: quote.netAmount,
      expectedBenefit: quote.benefit,
      saleType: extractedPerf?.saleType || quote.quoteMode || 'general',
      performanceAmount:
        extractedPerf?.performanceAmount ?? quote.performanceAmount,
      generalProductTotal:
        extractedPerf?.generalProductTotal ?? quote.generalProductTotal,
      subscriptionPrincipal:
        extractedPerf?.subscriptionPrincipal ?? quote.subscriptionPrincipal,
      freedCounts: extractedPerf?.freedCounts ?? quote.freedCounts,
      purchasedModels:
        extractedPerf?.purchasedModels ?? quote.purchasedModels,
    };

    const nowMs = Date.now();
    const updated = customers.map((c) =>
      c.id === customerId ? { ...c, ...patch, updatedAtMs: nowMs } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    showToast(`📌 [${quote.title}] 견적이 대표 견적 및 실적 기준으로 적용되었습니다.`, true);
    await syncCustomerToGas('update', {
      id: customerId,
      ...patch,
    });
  };

  const handleDeleteCustomer = async (id: string) => {
    const deletedAt = Date.now();
    const target = customers.find((c) => c.id === id);
    pushUndoSnapshot(`${target?.name || '고객'} 휴지통 이동`);
    const updated = customers.map((c) =>
      c.id === id ? { ...c, deletedAt, updatedAtMs: deletedAt } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    if (target) {
      syncMarketingDbTrashFromCrmCustomer(target, true);
    }
    showToast(
      `🗑️ [${target?.name || '고객'}]님이 휴지통으로 이동되었습니다.`,
      true
    );
    await syncCustomerToGas('update', { id, deletedAt });
  };

  const handleRestoreCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);
    const nowMs = Date.now();
    const updated = customers.map((c) =>
      c.id === id ? { ...c, deletedAt: undefined, updatedAtMs: nowMs } : c
    );
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    if (target) {
      syncMarketingDbTrashFromCrmCustomer(target, false);
    }
    showToast(`♻️ [${target?.name || '고객'}]님 데이터가 복원되었습니다!`);
    await syncCustomerToGas('update', { id, deletedAt: undefined });
  };

  const handlePermanentDeleteCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);
    const updated = customers.filter((c) => c.id !== id);
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    if (target) {
      syncMarketingDbTrashFromCrmCustomer(target, true);
    }
    await syncCustomerToGas('delete', { id });
  };

  const handleEmptyTrash = () => {
    const trashedList = customers.filter((c) => Boolean(c.deletedAt));
    const updated = customers.filter((c) => !c.deletedAt);
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    for (const tc of trashedList) {
      syncMarketingDbTrashFromCrmCustomer(tc, true);
    }
    showToast('🗑️ 휴지통을 모두 비웠습니다.');
  };

  const handleAddNewCustomer = async (newCustomer: CustomerItem) => {
    pushUndoSnapshot(`${newCustomer.name} 신규 등록`);
    const nowMs = Date.now();
    const stampedNew: CustomerItem = {
      ...newCustomer,
      deletedAt: undefined,
      updatedAtMs: nowMs,
    };
    const targetIdentity = getCustomerIdentityKey(stampedNew);
    const cleanedExisting = customers.filter(
      (c) => !(c.deletedAt && getCustomerIdentityKey(c) === targetIdentity)
    );
    const updated = [stampedNew, ...cleanedExisting];
    const deduped = setCachedCustomers(updated);
    setCustomers(deduped);
    syncMarketingDbTrashFromCrmCustomer(stampedNew, false);
    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    if (viewMode === 'grid') {
      setActiveTab(stampedNew.status);
    }
    showToast(`✅ [${stampedNew.name}] 고객님이 [${stampedNew.status}] 탭에 등록되었습니다.`, true);
    await syncCustomerToGas('create', stampedNew);
  };

  const handleImportCustomers = (imported: CustomerItem[]) => {
    const merged = setCachedCustomers([...imported, ...customers]);
    setCustomers(merged);
  };

  const handleMarkSmsSent = async (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    if (target && target.status === '신규/미발송') {
      await handleStatusChange(customerId, '상담진행중');
    }
  };

  const kpiStats = useMemo(() => {
    const briefing = getBriefingSummary(activeCustomers);
    const urgentCount = activeCustomers.filter((c) =>
      isUrgentCustomer(c)
    ).length;
    const todayTomorrowDeliveryCount =
      briefing.todayDelivery.length + briefing.tomorrowDelivery.length;
    const unconfirmedLogisticsCount = activeCustomers.filter((c) =>
      isPendingLogisticsCustomer(c)
    ).length;
    const unpaidGiftCount = activeCustomers.filter(
      (c) =>
        (c.status === '계약완료' || c.status === '배송완료') && hasUnpaidGift(c)
    ).length;

    const monthlyReport = computeMonthlySettlementReport(
      activeCustomers,
      selectedYearMonth,
      null,
      'contract'
    );

    const pipelineSalesTotal = activeCustomers
      .filter(
        (c) =>
          c.status === '신규/미발송' ||
          c.status === '상담진행중' ||
          c.status === '미구매/고민중'
      )
      .reduce(
        (acc, cur) =>
          acc + resolveCustomerPerformanceProfile(cur).performanceAmount,
        0
      );

    return {
      totalCount: activeCustomers.filter((c) => c.status === '상담진행중').length,
      urgentCount,
      todayTomorrowDeliveryCount,
      unconfirmedLogisticsCount,
      unpaidGiftCount,
      grossSalesTotal: monthlyReport.grossSalesTotal,
      netDeliverySalesTotal: monthlyReport.netDeliverySalesTotal,
      pipelineSalesTotal,
    };
  }, [activeCustomers, selectedYearMonth]);

  const tabCounts = useMemo(() => {
    const map: Record<string, number> = {
      '🔥긴급/오늘할일': activeCustomers.filter((c) => isUrgentCustomer(c))
        .length,
      // 오직 '계약완료'된 고객만 물류/배송대기에 포함 (계약 전 희망배송일 입력 고객 제외!)
      '🚚물류/배송대기': activeCustomers.filter((c) =>
        isPendingLogisticsCustomer(c)
      ).length,
      '🎁사은품미지급': activeCustomers.filter(
        (c) =>
          (c.status === '계약완료' || c.status === '배송완료') &&
          hasUnpaidGift(c)
      ).length,
    };
    FILTER_TABS.forEach((tab) => {
      if (!(tab in map)) {
        map[tab] = activeCustomers.filter((c) => c.status === tab).length;
      }
    });
    return map;
  }, [activeCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = activeCustomers.filter((c) => {
      // 검색어 입력 시에는 전체 탭이 없더라도 놓치는 고객이 없도록 전 단계 통합 검색!
      if (q) {
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.phone.replace(/\D/g, '').includes(q) ||
          c.items.toLowerCase().includes(q) ||
          c.memo.toLowerCase().includes(q) ||
          (c.orderNo && c.orderNo.toLowerCase().includes(q)) ||
          (c.giftItems && c.giftItems.toLowerCase().includes(q))
        );
      }

      if (viewMode === 'grid') {
        if (activeTab === '🔥긴급/오늘할일') {
          if (!isUrgentCustomer(c)) return false;
        } else if (activeTab === '🚚물류/배송대기') {
          if (!isPendingLogisticsCustomer(c)) return false;
        } else if (activeTab === '🎁사은품미지급') {
          if (
            (c.status !== '계약완료' && c.status !== '배송완료') ||
            !hasUnpaidGift(c)
          ) {
            return false;
          }
        } else {
          if (c.status !== activeTab) return false;
        }
      } else if (viewMode === 'kanban') {
        if (c.status === '배송완료' && !hasUnpaidGift(c)) return false;
      }

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.items.toLowerCase().includes(q) ||
        c.memo.toLowerCase().includes(q) ||
        (c.orderNo && c.orderNo.toLowerCase().includes(q)) ||
        (c.giftItems && c.giftItems.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'urgentFirst') {
        const ua = isUrgentCustomer(a) ? 1 : 0;
        const ub = isUrgentCustomer(b) ? 1 : 0;
        if (ua !== ub) return ub - ua;
        return b.regDate.localeCompare(a.regDate);
      }
      if (sortOrder === 'deliveryAsc') {
        const da = getDeliveryDDay(a.deliveryDate).diff;
        const db = getDeliveryDDay(b.deliveryDate).diff;
        const scoreA = da === null ? 9999 : da < 0 ? 5000 + Math.abs(da) : da;
        const scoreB = db === null ? 9999 : db < 0 ? 5000 + Math.abs(db) : db;
        return scoreA - scoreB;
      }
      if (sortOrder === 'amountDesc') {
        return (
          resolveCustomerPerformanceProfile(b).performanceAmount -
          resolveCustomerPerformanceProfile(a).performanceAmount
        );
      }
      return b.regDate.localeCompare(a.regDate);
    });
  }, [activeCustomers, activeTab, searchQuery, sortOrder, viewMode]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDark ? 'bg-[#0B0E14] text-slate-100' : 'bg-[#F4F2ED] text-[#18181B]'
      }`}
    >
      {/* 상단 고정 헤더 */}
      <CRMHeader
        totalCount={kpiStats.totalCount}
        urgentCount={kpiStats.urgentCount}
        todayTomorrowDeliveryCount={kpiStats.todayTomorrowDeliveryCount}
        unconfirmedLogisticsCount={kpiStats.unconfirmedLogisticsCount}
        unpaidGiftCount={kpiStats.unpaidGiftCount}
        pastDueDeliveryCount={pastDueDeliveryCustomers.length}
        onOpenPastDueModal={() => setIsPastDeliveryModalOpen(true)}
        grossSalesTotal={kpiStats.grossSalesTotal}
        netDeliverySalesTotal={kpiStats.netDeliverySalesTotal}
        pipelineSalesTotal={kpiStats.pipelineSalesTotal}
        isLoading={isLoading}
        onRefresh={loadCustomers}
        onOpenNewModal={() => {
          setPrefillNewCustomer(null);
          setIsNewModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onQuickFilter={(tab) => {
          setViewMode('grid');
          setActiveTab(tab);
        }}
        onFocusSettlement={() => {
          document
            .getElementById('crm-sales-incentive-hub')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onBackToHome={onBackToHome}
        backLabel={backLabel}
      />

      {/* Sonner 스타일 하단 플로팅 토스트 (Undo 되돌리기 버튼 내장) */}
      {toastState && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] w-[92vw] max-w-md bg-[#18181B] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/15 flex items-center justify-between gap-2.5 text-xs font-extrabold schedule-sheet-enter">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastState.msg}</span>
          </div>
          {toastState.canUndo && undoHistory.length > 0 && (
            <button
              type="button"
              onClick={handleUndoLastAction}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black shrink-0 cursor-pointer"
            >
              ↩ 되돌리기
            </button>
          )}
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-2.5 space-y-2.5">
        {/* 1) 월간 총판·실판 분리 & 프리드/제품모델별 수당 정산 통합 허브 */}
        <CrmSalesAndIncentivePanel
          customers={activeCustomers}
          isDark={isDark}
          selectedYearMonth={selectedYearMonth}
          onChangeYearMonth={setSelectedYearMonth}
          activeTab={settlementTab}
          onChangeTab={setSettlementTab}
          onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
          onFieldChange={handleFieldChange}
          onShowToast={(msg) => showToast(msg, false)}
          defaultExpanded={Boolean(initialSettlementTab)}
        />

        {/* 1-2) 가망 파이프라인 & 전환율 보조 대시보드 */}
        <CrmAnalyticsStrip
          customers={activeCustomers}
          isDark={isDark}
          onSelectFilter={(tab) => {
            setViewMode('grid');
            setActiveTab(tab);
          }}
        />

        {/* 2) 3대 뷰 모드 전환 (카드 그리드 / 칸반 보드 / 배송 캘린더) + 검색창 + 정렬 */}
        <div
          className={`p-3 rounded-2xl border shadow-2xs space-y-2.5 ${
            isDark
              ? 'bg-[#151A25] border-white/10'
              : 'bg-white border-[#E4DFD5]'
          }`}
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* 좌측: 3대 뷰 전환 세그먼트 컨트롤 */}
            <div
              className={`grid grid-cols-3 sm:inline-flex p-1 rounded-2xl border shrink-0 ${
                isDark
                  ? 'bg-[#0B0E14] border-white/10'
                  : 'bg-[#F4F2ED] border-[#E4DFD5]'
              }`}
            >
              {[
                {
                  id: 'grid' as CrmViewMode,
                  label: '카드 그리드',
                  icon: <LayoutGrid className="w-3.5 h-3.5" />,
                },
                {
                  id: 'kanban' as CrmViewMode,
                  label: '칸반 보드',
                  icon: <Kanban className="w-3.5 h-3.5" />,
                },
                {
                  id: 'calendar' as CrmViewMode,
                  label: '배송 달력',
                  icon: <Calendar className="w-3.5 h-3.5" />,
                },
              ].map((v) => {
                const active = viewMode === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setViewMode(v.id)}
                    className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black whitespace-nowrap shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer schedule-tab-btn ${
                      active
                        ? isDark
                          ? 'bg-[#1E2738] text-sky-300 border border-sky-400/30 shadow-xs'
                          : 'bg-white text-[#18181B] border border-[#D6D0C4] shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-[#68625D] hover:text-[#18181B]'
                    }`}
                  >
                    <span className="shrink-0">{v.icon}</span>
                    <span className="whitespace-nowrap">{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 중앙: 실시간 검색창 (모바일 16px 자동 줌인 방지 적용) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="고객명, 연락처(뒷자리), 모델명, 전표번호, 사은품 검색..."
                className={`w-full pl-10 pr-8 py-2 rounded-xl border text-base sm:text-sm font-medium focus:outline-none ${
                  isDark
                    ? 'bg-[#1B2230] border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-[#FAF8F4] border-[#E4DFD5] text-slate-800 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 우측: 정렬 + 되돌리기 버튼 */}
            <div className="flex items-center gap-2 shrink-0">
              {undoHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoLastAction}
                  className={`px-3 py-2 rounded-xl border text-xs font-black inline-flex items-center gap-1 cursor-pointer schedule-tactile ${
                    isDark
                      ? 'bg-[#1B2230] text-amber-300 border-white/10'
                      : 'bg-[#FAF5EC] text-[#6E4423] border-[#D8C3A8]'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>되돌리기</span>
                </button>
              )}

              {viewMode === 'grid' && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${
                    isDark
                      ? 'bg-[#1B2230] border-white/10 text-slate-200'
                      : 'bg-[#FAF8F4] border-[#E4DFD5] text-slate-700'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-65" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="bg-transparent text-base sm:text-xs font-extrabold focus:outline-none cursor-pointer"
                  >
                    <option value="urgentFirst">🔥 긴급/할일 우선순</option>
                    <option value="deliveryAsc">🚚 배송 임박순 (D-Day)</option>
                    <option value="regDesc">🕒 최근 등록/상담순</option>
                    <option value="amountDesc">💰 실적금액 높은순</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 상태별 필터 탭 (그리드 뷰일 때 노출) */}
          {viewMode === 'grid' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {FILTER_TABS.map((tab) => {
                const active = activeTab === tab;
                const isSpecialUrgent = tab === '🔥긴급/오늘할일';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap flex items-center gap-1.5 cursor-pointer schedule-tactile ${
                      active
                        ? isSpecialUrgent
                          ? 'bg-rose-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-sky-400 text-slate-950 shadow-xs'
                          : 'bg-[#18181B] text-white shadow-xs'
                        : isSpecialUrgent
                        ? isDark
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : isDark
                        ? 'bg-[#1B2230] hover:bg-white/10 text-slate-300 border border-white/10'
                        : 'bg-[#F4F2ED] hover:bg-[#EAE5DC] text-[#57534E] border border-[#E4DFD5]'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        active
                          ? 'bg-black/20 text-current'
                          : isSpecialUrgent
                          ? 'bg-rose-500/20 text-rose-500'
                          : 'bg-black/10'
                      }`}
                    >
                      {tabCounts[tab] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3) 뷰 모드별 메인 스테이지 */}
        {viewMode === 'kanban' ? (
          <CrmKanbanBoard
            customers={filteredCustomers}
            isDark={isDark}
            onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
            onStatusChange={handleStatusChange}
            onOpenSMS={(c) => setSmsCustomer(c)}
            onOpenQuote={(c) => onOpenCustomerInQuoteBuilder(c)}
          />
        ) : viewMode === 'calendar' ? (
          <CrmDeliveryCalendar
            customers={filteredCustomers}
            isDark={isDark}
            onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
          />
        ) : (
          <>
            <div className="flex items-start sm:items-center justify-between gap-2 px-1 text-[11px] sm:text-xs opacity-80 font-semibold">
              <span className="min-w-0 flex-1 leading-snug break-keep">
                💡 물류·사은품 배지를 누르거나 좌우로 밀면 즉시 처리 · 카드 클릭 시 다중 견적 보관함 오픈
              </span>
              <span className="shrink-0 whitespace-nowrap font-extrabold font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                표시 {filteredCustomers.length}명
              </span>
            </div>

            {filteredCustomers.length === 0 ? (
              <div
                className={`rounded-3xl border p-12 text-center space-y-3 ${
                  isDark
                    ? 'bg-[#151A25] border-white/10'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-500/10 text-slate-400 flex items-center justify-center mx-auto">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black">
                  조건에 맞는 고객 내역이 없습니다
                </h3>
                <p className="text-xs opacity-70 max-w-md mx-auto">
                  우측 상단의 [신규 고객 등록] 버튼을 누르거나, 견적서 계산 화면에서 [고객저장]을 누르면 이곳에 자동으로 쌓입니다.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    검색어 초기화
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredCustomers.map((customer) => (
                  <CompactCustomerCard
                    key={customer.id}
                    customer={customer}
                    isDark={isDark}
                    onSelectCustomer={(c) => setSelectedCustomerId(c.id)}
                    onOpenSMS={(c, e) => {
                      e.stopPropagation();
                      setSmsCustomer(c);
                    }}
                    onOpenQuote={(c, e) => {
                      e.stopPropagation();
                      onOpenCustomerInQuoteBuilder(c);
                    }}
                    onToggleLogistics={(c) =>
                      handleFieldChange(c.id, {
                        logisticsConfirmed: !c.logisticsConfirmed,
                      })
                    }
                    onToggleGift={(c) =>
                      handleFieldChange(c.id, {
                        giftSent: !c.giftSent,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <CustomerDetailModal
        customer={selectedCustomer}
        onClose={() => setSelectedCustomerId(null)}
        onStatusChange={handleStatusChange}
        onMemoChange={handleMemoChange}
        onFieldChange={handleFieldChange}
        onDeleteQuoteRecord={handleDeleteQuoteRecord}
        onApplyQuoteAsPrimary={handleApplyQuoteAsPrimary}
        onLoadQuoteRecord={(customer, quote) => {
          onOpenQuoteRecordInQuoteBuilder(customer, quote);
        }}
        onDelete={handleDeleteCustomer}
        onOpenSMS={(c) => setSmsCustomer(c)}
        onOpenQuote={(c) => onOpenCustomerInQuoteBuilder(c)}
      />

      <SMSModal
        customer={smsCustomer}
        onClose={() => setSmsCustomer(null)}
        onMarkSent={handleMarkSmsSent}
      />

      <NewCustomerModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleAddNewCustomer}
        prefillData={prefillNewCustomer}
      />

      <MorningBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        customers={activeCustomers}
        onSelectFilter={(tab) => {
          setViewMode('grid');
          setActiveTab(tab);
        }}
        onOpenSMS={(c) => setSmsCustomer(c)}
        onToggleLogistics={(c) =>
          handleFieldChange(c.id, {
            logisticsConfirmed: !c.logisticsConfirmed,
          })
        }
        onToggleGift={(c) =>
          handleFieldChange(c.id, {
            giftSent: !c.giftSent,
          })
        }
      />

      <PastDeliveryCheckModal
        isOpen={isPastDeliveryModalOpen}
        customers={pastDueDeliveryCustomers}
        isDark={isDark}
        onConfirmDelivered={handleConfirmDelivered}
        onConfirmAllDelivered={handleConfirmAllDelivered}
        onClose={() => {
          sessionStorage.setItem(PAST_DELIVERY_POPUP_DISMISSED_KEY, '1');
          setIsPastDeliveryModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customers={activeCustomers}
        trashedCustomers={trashedCustomers}
        onImportCustomers={handleImportCustomers}
        onRestoreCustomer={handleRestoreCustomer}
        onPermanentDeleteCustomer={handlePermanentDeleteCustomer}
        onEmptyTrash={handleEmptyTrash}
      />
    </div>
  );
};
