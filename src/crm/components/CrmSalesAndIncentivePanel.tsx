import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Copy,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Link2,
  Cloud,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Repeat,
  Save,
  ShieldCheck,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { CrmModelIncentiveTabSection } from './CrmModelIncentiveTabSection';
import {
  CustomerItem,
  ModelIncentiveRule,
  ModelIncentivesMap,
  SettlementTabId,
} from '../types/crm';
import { formatCurrency, formatShortManwon } from '../utils/date';
import {
  ALLCARE_COUNT_UPDATED_EVENT,
  computeMonthlySettlementReport,
  ConfirmedCustomerSettlementRow,
  getMonthlyAllCareCount,
  hydrateMonthlyAllCareCountsFromIdb,
  loadAllMonthlyAllCareCounts,
  MonthlyAllCareCountsMap,
  setMonthlyAllCareCount,
  downloadModelIncentiveExcelTemplate,
  extractGoogleSheetIdAndGid,
  fetchModelIncentiveFromGoogleSheetUrl,
  fetchRemoteModelIncentiveSheets,
  loadSavedIncentiveGoogleSheetUrl,
  saveIncentiveGoogleSheetUrl,
  getCurrentYearMonth,
  GitHubSyncConfig,
  hydrateModelIncentiveSheetsFromIdb,
  IncentiveMonthBasis,
  loadAllModelIncentiveSheets,
  loadGitHubSyncConfig,
  MODEL_INCENTIVE_UPDATED_EVENT,
  parseIncentiveAmountCell,
  parseModelIncentiveExcelOrCsv,
  parseModelIncentiveExcelWithMeta,
  parseModelIncentiveFreeText,
  parseModelIncentiveImage,
  publishModelIncentiveSheetsToGitHub,
  saveAllModelIncentiveSheets,
  saveGitHubSyncConfig,
  upsertMonthlyIncentiveSheet,
} from '../utils/settlementEngine';

interface CrmSalesAndIncentivePanelProps {
  customers: CustomerItem[];
  isDark: boolean;
  selectedYearMonth: string;
  onChangeYearMonth: (ym: string) => void;
  activeTab: SettlementTabId;
  onChangeTab: (tab: SettlementTabId) => void;
  onSelectCustomer: (customer: CustomerItem) => void;
  onFieldChange?: (id: string, patch: Partial<CustomerItem>) => void;
  onShowToast?: (msg: string) => void;
  defaultExpanded?: boolean;
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y || new Date().getFullYear(), (m || 1) - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatYearMonthShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${String(y).slice(2)}.${String(m).padStart(2, '0')}월`;
}

function formatYearMonthKo(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${y}년 ${m}월`;
}

export const CrmSalesAndIncentivePanel: React.FC<
  CrmSalesAndIncentivePanelProps
> = ({
  customers,
  isDark,
  selectedYearMonth,
  onChangeYearMonth,
  activeTab,
  onChangeTab,
  onSelectCustomer,
  onFieldChange,
  onShowToast,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [incentiveBasis, setIncentiveBasis] =
    useState<IncentiveMonthBasis>('contract');
  const [salesSubView, setSalesSubView] = useState<
    'gross' | 'delivery' | 'subscription' | 'undated'
  >('gross');
  const [editingDeliveryRowId, setEditingDeliveryRowId] = useState<string | null>(null);
  const [editingDeliveryDateVal, setEditingDeliveryDateVal] = useState<string>('');

  const [allCareMap, setAllCareMap] = useState<MonthlyAllCareCountsMap>(() =>
    loadAllMonthlyAllCareCounts()
  );
  const [isEditingAllCare, setIsEditingAllCare] = useState<boolean>(false);
  const [allCareDraft, setAllCareDraft] = useState<string>('');

  useEffect(() => {
    if (defaultExpanded) {
      setIsExpanded(true);
    }
  }, [defaultExpanded, activeTab]);

  const [sheetsMap, setSheetsMap] = useState<ModelIncentivesMap>(() =>
    loadAllModelIncentiveSheets()
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [replaceOnUpload, setReplaceOnUpload] = useState<boolean>(false);

  const [showManualDrawer, setShowManualDrawer] = useState<boolean>(false);
  const [showGsheetDrawer, setShowGsheetDrawer] = useState<boolean>(false);
  const [gsheetUrl, setGsheetUrl] = useState<string>(() =>
    loadSavedIncentiveGoogleSheetUrl()
  );
  const [showRulesDrawer, setShowRulesDrawer] = useState<boolean>(false);
  const [showCloudDrawer, setShowCloudDrawer] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [ghConfig, setGhConfig] = useState<GitHubSyncConfig>(() =>
    loadGitHubSyncConfig()
  );
  const [ruleSearch, setRuleSearch] = useState<string>('');
  const [manualCategory, setManualCategory] = useState<string>('');
  const [manualModelCode, setManualModelCode] = useState<string>('');
  const [manualIncentive, setManualIncentive] = useState<string>('');
  const [bulkPasteText, setBulkPasteText] = useState<string>('');

  const [quickAssignTarget, setQuickAssignTarget] = useState<{
    modelCode: string;
    category: string;
  } | null>(null);
  const [quickAssignAmount, setQuickAssignAmount] = useState<string>('');

  const excelInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hydrateModelIncentiveSheetsFromIdb().then((loaded) => {
      if (Object.keys(loaded).length > 0) {
        setSheetsMap(loaded);
      }
      fetchRemoteModelIncentiveSheets().then((remoteMerged) => {
        if (remoteMerged && Object.keys(remoteMerged).length > 0) {
          setSheetsMap(remoteMerged);
        }
      });
    });
    hydrateMonthlyAllCareCountsFromIdb().then((loadedAllCare) => {
      if (Object.keys(loadedAllCare).length > 0) {
        setAllCareMap(loadedAllCare);
      }
    });
    const sync = () => setSheetsMap(loadAllModelIncentiveSheets());
    const syncAllCare = () => setAllCareMap(loadAllMonthlyAllCareCounts());
    const syncStorage = () => {
      sync();
      syncAllCare();
    };
    window.addEventListener(MODEL_INCENTIVE_UPDATED_EVENT, sync);
    window.addEventListener(ALLCARE_COUNT_UPDATED_EVENT, syncAllCare);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(MODEL_INCENTIVE_UPDATED_EVENT, sync);
      window.removeEventListener(ALLCARE_COUNT_UPDATED_EVENT, syncAllCare);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  useEffect(() => {
    setIsEditingAllCare(false);
  }, [selectedYearMonth]);

  const currentSheet = sheetsMap[selectedYearMonth] || null;
  const prevYearMonth = shiftYearMonth(selectedYearMonth, -1);
  const prevSheet = sheetsMap[prevYearMonth] || null;

  const report = useMemo(
    () =>
      computeMonthlySettlementReport(
        customers,
        selectedYearMonth,
        currentSheet,
        incentiveBasis
      ),
    [customers, selectedYearMonth, currentSheet, incentiveBasis]
  );

  const currentRealYm = getCurrentYearMonth();

  const filteredRules = useMemo(() => {
    const list = currentSheet?.rules || [];
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.modelCode.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        (r.note && r.note.toLowerCase().includes(q))
    );
  }, [currentSheet, ruleSearch]);

  const currentAllCareCount = getMonthlyAllCareCount(
    selectedYearMonth,
    allCareMap
  );

  const handleStepAllCare = (delta: number) => {
    const nextVal = Math.max(0, currentAllCareCount + delta);
    const updated = setMonthlyAllCareCount(selectedYearMonth, nextVal);
    setAllCareMap(updated);
  };

  const commitAllCareDraft = () => {
    const parsed = parseInt(allCareDraft.replace(/[^0-9]/g, ''), 10);
    if (!Number.isNaN(parsed)) {
      const updated = setMonthlyAllCareCount(selectedYearMonth, parsed);
      setAllCareMap(updated);
    }
    setIsEditingAllCare(false);
  };

  const handleOpenOrToggleTab = (
    targetTab: SettlementTabId,
    subView?: 'gross' | 'delivery' | 'subscription'
  ) => {
    if (subView) {
      setSalesSubView(subView);
    }
    if (isExpanded && activeTab === targetTab && (!subView || salesSubView === subView)) {
      setIsExpanded(false);
    } else {
      onChangeTab(targetTab);
      setIsExpanded(true);
    }
  };

  const pushSheetsToAllStaff = async (
    baseMsg: string,
    overrideConfig?: GitHubSyncConfig
  ) => {
    const latestMap = loadAllModelIncentiveSheets();
    setSheetsMap(latestMap);
    const cfg = overrideConfig || loadGitHubSyncConfig();
    if (!cfg.repo.trim() || !cfg.token.trim()) {
      onShowToast?.(baseMsg);
      return;
    }
    setIsSyncingCloud(true);
    try {
      const res = await publishModelIncentiveSheetsToGitHub(latestMap, cfg);
      onShowToast?.(
        res.ok
          ? `${baseMsg} · ☁️ 전 직원 자동 공유 완료!`
          : `${baseMsg} (${res.message})`
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleManualPullOrPush = async () => {
    setIsSyncingCloud(true);
    try {
      const pulled = await fetchRemoteModelIncentiveSheets();
      if (pulled) {
        setSheetsMap(pulled);
      }
      const cfg = loadGitHubSyncConfig();
      if (cfg.repo.trim() && cfg.token.trim()) {
        const latest = loadAllModelIncentiveSheets();
        const pushed = await publishModelIncentiveSheetsToGitHub(latest, cfg);
        onShowToast?.(
          pushed.ok
            ? '☁️ 전 직원 모델 수당 단가표 최신 동기화 완료!'
            : `⚠️ ${pushed.message}`
        );
      } else {
        onShowToast?.(
          pulled
            ? '✅ 서버에서 최신 모델 수당 단가표를 불러왔습니다!'
            : '현재 기기의 단가표가 최신 상태입니다.'
        );
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleSaveGhConfig = async () => {
    saveGitHubSyncConfig(ghConfig);
    if (ghConfig.repo.trim() && ghConfig.token.trim()) {
      await pushSheetsToAllStaff('✅ 동기화 설정 저장', ghConfig);
      setShowCloudDrawer(false);
    } else {
      onShowToast?.('GitHub 동기화 설정이 저장되었습니다.');
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let totalParsed: ModelIncentiveRule[] = [];
      let detectedYm: string | null = null;
      for (const f of files) {
        const meta = await parseModelIncentiveExcelWithMeta(f);
        totalParsed = [...totalParsed, ...meta.rules];
        if (!detectedYm && meta.detectedYearMonth) {
          detectedYm = meta.detectedYearMonth;
        }
      }
      const targetYm = detectedYm || selectedYearMonth;
      if (targetYm !== selectedYearMonth) {
        onChangeYearMonth(targetYm);
      }
      // 200개 이상의 통합 단가표 업로드 시 이전 중복 잔여 코드가 남지 않도록 자동 교체 반영
      const shouldReplace = replaceOnUpload || totalParsed.length >= 200;
      const nextSheet = upsertMonthlyIncentiveSheet(
        targetYm,
        totalParsed,
        `${files[0].name}${files.length > 1 ? ` 외 ${files.length - 1}건` : ''}`,
        shouldReplace
      );
      setSheetsMap(loadAllModelIncentiveSheets());
      setShowRulesDrawer(true);
      const paidCnt = nextSheet.rules.filter((r) => r.incentiveAmount > 0).length;
      const zeroCnt = nextSheet.rules.length - paidCnt;
      const summaryMsg = `✅ ${formatYearMonthKo(targetYm)} 수당 단가표 반영 완료! (인식 ${totalParsed.length}개 → 총 ${nextSheet.rules.length}개 등록${
        zeroCnt > 0 ? ` · 유상 ${paidCnt}개 / 0원안내 ${zeroCnt}개` : ''
      })`;
      setUploadSuccess(summaryMsg);
      await pushSheetsToAllStaff(
        `📊 ${formatYearMonthKo(targetYm)} 단가표 ${nextSheet.rules.length}개 모델 반영 완료`
      );
    } catch (err: any) {
      const errMsg = err?.message || '엑셀·시트 파일 분석 중 오류가 발생했습니다.';
      setUploadError(errMsg);
      onShowToast?.(`⚠️ ${errMsg}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleGoogleSheetSync = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl ?? gsheetUrl).trim();
    if (!targetUrl) {
      const msg = '구글 시트 공유 주소(URL)를 입력해 주세요.';
      setUploadError(msg);
      onShowToast?.(`⚠️ ${msg}`);
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      saveIncentiveGoogleSheetUrl(targetUrl);
      const meta = await fetchModelIncentiveFromGoogleSheetUrl(targetUrl);
      const targetYm = meta.detectedYearMonth || selectedYearMonth;
      if (targetYm !== selectedYearMonth) {
        onChangeYearMonth(targetYm);
      }
      const shouldReplace = replaceOnUpload || meta.rules.length >= 200;
      const nextSheet = upsertMonthlyIncentiveSheet(
        targetYm,
        meta.rules,
        `구글시트 연동 (${meta.rules.length}개 모델)`,
        shouldReplace
      );
      setSheetsMap(loadAllModelIncentiveSheets());
      setShowGsheetDrawer(false);
      setShowRulesDrawer(true);
      const summaryMsg = `✅ ${formatYearMonthKo(targetYm)} 구글 시트 연동 완료! (총 ${nextSheet.rules.length}개 모델 반영${
        meta.zeroRefCount > 0
          ? ` · 지급대상 ${meta.paidCount}개 / 0원안내 ${meta.zeroRefCount}개`
          : ''
      })`;
      setUploadSuccess(summaryMsg);
      await pushSheetsToAllStaff(
        `🔗 ${formatYearMonthKo(targetYm)} 구글시트 단가표 ${nextSheet.rules.length}개 모델 동기화 완료`
      );
    } catch (err: any) {
      const errMsg = err?.message || '구글 시트를 불러오는 중 오류가 발생했습니다.';
      setUploadError(errMsg);
      onShowToast?.(`⚠️ ${errMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      let totalParsed: ModelIncentiveRule[] = [];
      for (const f of files) {
        const rules = await parseModelIncentiveImage(f);
        totalParsed = [...totalParsed, ...rules];
      }
      const nextSheet = upsertMonthlyIncentiveSheet(
        selectedYearMonth,
        totalParsed,
        `사진 스캔 (${files.length}장)`,
        replaceOnUpload
      );
      setSheetsMap(loadAllModelIncentiveSheets());
      setShowRulesDrawer(true);
      setUploadSuccess(
        `✅ 사진 스캔 완료! ${totalParsed.length}개 모델을 추출하여 총 ${nextSheet.rules.length}개가 등록되었습니다.`
      );
      await pushSheetsToAllStaff(
        `📷 사진에서 ${totalParsed.length}개 추출 (누적 ${nextSheet.rules.length}개)`
      );
    } catch (err: any) {
      const errMsg = err?.message || '사진 분석 중 오류가 발생했습니다.';
      setUploadError(errMsg);
      onShowToast?.(`⚠️ ${errMsg}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddSingleRule = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualModelCode.trim().toUpperCase();
    const amt = parseIncentiveAmountCell(manualIncentive, 1);
    if (!code) {
      const msg = '모델명(코드)을 입력해 주세요. (예: RM70F64M2X)';
      setUploadError(msg);
      onShowToast?.(`⚠️ ${msg}`);
      return;
    }
    if (amt <= 0) {
      const msg = '수당 금액을 입력해 주세요. (예: 50000 또는 5만)';
      setUploadError(msg);
      onShowToast?.(`⚠️ ${msg}`);
      return;
    }

    setUploadError(null);
    upsertMonthlyIncentiveSheet(
      selectedYearMonth,
      [
        {
          id: `MAN-${Date.now()}`,
          category: manualCategory.trim() || '가전',
          modelCode: code,
          incentiveAmount: amt,
          saleTypeFilter: 'all',
        },
      ],
      '직접 입력',
      false
    );
    setSheetsMap(loadAllModelIncentiveSheets());
    setManualModelCode('');
    setManualIncentive('');
    setShowRulesDrawer(true);
    setUploadSuccess(`✅ [${code}] 모델 수당 ${formatCurrency(amt)}원이 등록되었습니다!`);
    void pushSheetsToAllStaff(`✅ [${code}] 수당 ${formatCurrency(amt)}원 등록`);
  };

  const handleBulkTextApply = () => {
    const trimmed = bulkPasteText.trim();
    if (extractGoogleSheetIdAndGid(trimmed)) {
      setGsheetUrl(trimmed);
      setBulkPasteText('');
      setShowManualDrawer(false);
      void handleGoogleSheetSync(trimmed);
      return;
    }
    const parsed = parseModelIncentiveFreeText(trimmed);
    if (parsed.length === 0) {
      const errMsg =
        '인식된 모델/수당이 없습니다. 구글시트 표를 복사해 붙여넣거나 "RM70F64M2X 5만" 형태로 입력해 주세요.';
      setUploadError(errMsg);
      onShowToast?.(`⚠️ ${errMsg}`);
      return;
    }
    setUploadError(null);
    const shouldReplace = replaceOnUpload || parsed.length >= 200;
    const next = upsertMonthlyIncentiveSheet(
      selectedYearMonth,
      parsed,
      `시트·텍스트 일괄등록 (${parsed.length}건)`,
      shouldReplace
    );
    setSheetsMap(loadAllModelIncentiveSheets());
    setBulkPasteText('');
    setShowManualDrawer(false);
    setShowRulesDrawer(true);
    setUploadSuccess(
      `✅ 붙여넣기에서 ${parsed.length}개 모델을 인식해 총 ${next.rules.length}개 단가를 적용했습니다!`
    );
    void pushSheetsToAllStaff(
      `✅ ${parsed.length}개 모델 단가 반영 (총 ${next.rules.length}개)`
    );
  };

  const handleQuickAssignSave = () => {
    if (!quickAssignTarget) return;
    const amt = parseIncentiveAmountCell(quickAssignAmount, 1);
    if (amt <= 0) {
      onShowToast?.('⚠️ 수당 금액을 숫자로 입력해 주세요. (예: 50000 또는 5만)');
      return;
    }
    const targetCode = quickAssignTarget.modelCode;
    upsertMonthlyIncentiveSheet(
      selectedYearMonth,
      [
        {
          id: `QCK-${Date.now()}`,
          category: quickAssignTarget.category || '가전',
          modelCode: targetCode.trim().toUpperCase(),
          incentiveAmount: amt,
          saleTypeFilter: 'all',
        },
      ],
      '고객 카드 즉시 지정',
      false
    );
    setSheetsMap(loadAllModelIncentiveSheets());
    setQuickAssignTarget(null);
    setQuickAssignAmount('');
    void pushSheetsToAllStaff(
      `💰 [${targetCode}] +${formatCurrency(amt)}원 단가 반영`
    );
  };

  const handleUpdateRuleAmount = (ruleId: string, nextAmount: number) => {
    if (!currentSheet) return;
    const nextRules = currentSheet.rules.map((r) =>
      r.id === ruleId ? { ...r, incentiveAmount: Math.max(0, nextAmount) } : r
    );
    const nextMap: ModelIncentivesMap = {
      ...sheetsMap,
      [selectedYearMonth]: {
        ...currentSheet,
        updatedAt: new Date().toISOString(),
        rules: nextRules,
      },
    };
    saveAllModelIncentiveSheets(nextMap);
    setSheetsMap(nextMap);
  };

  const handleRuleAmountBlur = () => {
    const cfg = loadGitHubSyncConfig();
    if (cfg.repo.trim() && cfg.token.trim()) {
      void pushSheetsToAllStaff('✏️ 수정된 단가');
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!currentSheet) return;
    const nextRules = currentSheet.rules.filter((r) => r.id !== ruleId);
    const nextMap: ModelIncentivesMap = {
      ...sheetsMap,
      [selectedYearMonth]: {
        ...currentSheet,
        updatedAt: new Date().toISOString(),
        rules: nextRules,
      },
    };
    saveAllModelIncentiveSheets(nextMap);
    setSheetsMap(nextMap);
    void pushSheetsToAllStaff('🗑️ 모델 단가 삭제 반영');
  };

  const handleCopyFromPrevMonth = () => {
    if (!prevSheet || prevSheet.rules.length === 0) return;
    const next = upsertMonthlyIncentiveSheet(
      selectedYearMonth,
      prevSheet.rules,
      `${formatYearMonthKo(prevYearMonth)} 복사본`,
      false
    );
    void pushSheetsToAllStaff(
      `📋 전월 단가표(${next.rules.length}개) 복사 완료`
    );
  };

  const shellCls = isDark
    ? 'bg-[#151A25] border-white/10 text-slate-100'
    : 'bg-white border-[#E4DFD5] text-[#18181B]';
  const subSurfaceCls = isDark
    ? 'bg-[#0E131D] border-white/10'
    : 'bg-[#FAF8F4] border-[#E4DFD5]';
  const mutedCls = isDark ? 'text-slate-400' : 'text-[#78716C]';

  const activeSalesRows: ConfirmedCustomerSettlementRow[] = useMemo(() => {
    if (salesSubView === 'delivery') return report.netDeliveryRows;
    if (salesSubView === 'subscription') return report.grossSubscriptionRows;
    if (salesSubView === 'undated') {
      return report.grossRows.filter((r) => !r.profile.deliveryYearMonth);
    }
    return report.grossRows;
  }, [salesSubView, report]);

  return (
    <section
      id="crm-sales-incentive-hub"
      className={`rounded-2xl border px-3 py-2 shadow-2xs transition ${shellCls}`}
    >
      {/* 슬림 요약 바: 상단 월 선택·수당합계 헤더 + 하단 6칸 대칭 실적/수량 그리드 (모바일 2×3 · 태블릿/폴드 3×2 · 와이드PC 6열) */}
      <div className="space-y-1.5">
        {/* 1행: 월 선택기 + 우측 수당 총합 토글 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-xl border ${subSurfaceCls}`}
            >
              <button
                type="button"
                onClick={() =>
                  onChangeYearMonth(shiftYearMonth(selectedYearMonth, -1))
                }
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                title="이전 달"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-xs font-black font-mono">
                {formatYearMonthShort(selectedYearMonth)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeYearMonth(shiftYearMonth(selectedYearMonth, 1))
                }
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                title="다음 달"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedYearMonth !== currentRealYm && (
              <button
                type="button"
                onClick={() => onChangeYearMonth(currentRealYm)}
                className={`px-2 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                  isDark
                    ? 'bg-sky-400/15 text-sky-300 border-sky-400/30'
                    : 'bg-[#F4ECE1] text-[#8C5A32] border-[#DCCBB2]'
                }`}
              >
                당월
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black shrink-0 cursor-pointer schedule-tactile ${
              isDark
                ? 'bg-[#172234] border-amber-400/35 text-amber-300'
                : 'bg-[#FAF4EA] border-[#DFC9AC] text-[#7C4D25]'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>수당</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">
              +{formatCurrency(report.grandTotalIncentive)}원
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-75" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            )}
          </button>
        </div>

        {/* 2행: 6칸 정렬 지표 그리드 (총판 · 실판 · 프리드 · 모델수당 · 구독[자동집계] · 가전올케어[수량조정]) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5">
          {/* 1. 총판 */}
          <button
            type="button"
            onClick={() => handleOpenOrToggleTab('sales', 'gross')}
            className={`min-h-[36px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer schedule-tactile ${
              isExpanded && activeTab === 'sales' && salesSubView === 'gross'
                ? isDark
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                : subSurfaceCls
            }`}
            title="당월 계약(총판) 확정 내역 보기"
          >
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shrink-0">
              총판
            </span>
            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
              {formatShortManwon(report.grossSalesTotal)}
              <span className={`ml-0.5 text-[10px] font-normal ${mutedCls}`}>
                ({report.grossRows.length})
              </span>
            </span>
          </button>

          {/* 2. 실판 */}
          <button
            type="button"
            onClick={() => handleOpenOrToggleTab('sales', 'delivery')}
            className={`min-h-[36px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer schedule-tactile ${
              isExpanded && activeTab === 'sales' && salesSubView === 'delivery'
                ? isDark
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-sky-50 border-sky-400 text-sky-900'
                : subSurfaceCls
            }`}
            title="당월 배송(실판) 내역 보기"
          >
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-600 text-white shrink-0">
              실판
            </span>
            <span
              className={`font-black font-mono truncate ${
                isDark ? 'text-sky-400' : 'text-blue-600'
              }`}
            >
              {formatShortManwon(report.netDeliverySalesTotal)}
              <span className={`ml-0.5 text-[10px] font-normal ${mutedCls}`}>
                ({report.netDeliveryRows.length})
              </span>
            </span>
          </button>

          {/* 3. 프리드 */}
          <button
            type="button"
            onClick={() => handleOpenOrToggleTab('freed')}
            className={`min-h-[36px] flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer schedule-tactile ${
              isExpanded && activeTab === 'freed'
                ? isDark
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-200'
                  : 'bg-amber-50 border-amber-400 text-amber-900'
                : subSurfaceCls
            }`}
            title="프리드 가입 건수 및 종류별 수당 보기"
          >
            <span className="text-[11px] font-extrabold shrink-0">프리드</span>
            <span className="font-black font-mono text-amber-500 truncate">
              +{formatShortManwon(report.freedSummary.totalIncentive)}
              <span className={`ml-0.5 text-[10px] font-normal ${mutedCls}`}>
                ({report.freedSummary.totalCount})
              </span>
            </span>
          </button>

          {/* 4. 모델수당 */}
          <button
            type="button"
            onClick={() => handleOpenOrToggleTab('models')}
            className={`min-h-[36px] flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer schedule-tactile ${
              isExpanded && activeTab === 'models'
                ? isDark
                  ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-200'
                  : 'bg-indigo-50 border-indigo-400 text-indigo-900'
                : subSurfaceCls
            }`}
            title="월별 단가표 업로드 및 모델별 수당 보기"
          >
            <span className="text-[11px] font-extrabold shrink-0">모델수당</span>
            <span className="font-black font-mono text-sky-500 truncate">
              +{formatShortManwon(report.modelIncentiveTotal)}
              <span className={`ml-0.5 text-[10px] font-normal ${mutedCls}`}>
                ({report.matchedModelUnitCount > 0
                  ? `${report.matchedModelUnitCount}대`
                  : currentSheet?.rules.length
                  ? `단가${currentSheet.rules.length}`
                  : 0})
              </span>
            </span>
          </button>

          {/* 5. 구독 건수 (해당월 구독 판매접수건 자동 집계 · 클릭 시 당월 구독 접수 내역 확인) */}
          <button
            type="button"
            onClick={() => handleOpenOrToggleTab('sales', 'subscription')}
            className={`min-h-[36px] flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer schedule-tactile ${
              isExpanded && activeTab === 'sales' && salesSubView === 'subscription'
                ? isDark
                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                  : 'bg-rose-50 border-rose-400 text-rose-900'
                : subSurfaceCls
            }`}
            title="해당월 구독 판매접수 확정건수 자동 집계 (클릭 시 접수 고객 내역 보기)"
          >
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shrink-0">
              <Repeat className="w-2.5 h-2.5" />
              <span>구독</span>
            </span>
            <span
              className={`font-black font-mono truncate ${
                isDark ? 'text-rose-400' : 'text-rose-600'
              }`}
            >
              {report.grossSubscriptionCount}개
              {report.grossSubscriptionCustomerCount > 0 && (
                <span className={`ml-0.5 text-[10px] font-normal ${mutedCls}`}>
                  ({report.grossSubscriptionCustomerCount}명)
                </span>
              )}
            </span>
          </button>

          {/* 6. 가전올케어 건수 (월별 수량 직접 조정 전용: [-] / 숫자클릭 직접입력 / [+]) */}
          <div
            className={`min-h-[36px] flex items-center justify-between gap-1 px-2 py-1 rounded-xl border text-xs transition ${
              currentAllCareCount > 0
                ? isDark
                  ? 'bg-indigo-500/15 border-indigo-400/45 text-indigo-100'
                  : 'bg-indigo-50/75 border-indigo-300 text-indigo-950'
                : subSurfaceCls
            }`}
            title={`${formatYearMonthKo(selectedYearMonth)} 가전올케어 유치 건수 조정 (메인화면 수당적립 요약에 실시간 반영)`}
          >
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-700 text-amber-200 shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>가전올케어</span>
            </span>

            <div className="inline-flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStepAllCare(-1);
                }}
                disabled={currentAllCareCount <= 0}
                aria-label="가전올케어 수량 감소"
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed schedule-tactile ${
                  isDark
                    ? 'bg-[#172030] border-white/15 hover:bg-[#1E2A3F] text-slate-200'
                    : 'bg-white border-[#D6D3CD] hover:bg-slate-100 text-[#18181B]'
                }`}
              >
                <Minus className="w-3 h-3" />
              </button>

              {isEditingAllCare ? (
                <input
                  type="number"
                  min={0}
                  max={9999}
                  autoFocus
                  value={allCareDraft}
                  onChange={(e) => setAllCareDraft(e.target.value)}
                  onBlur={commitAllCareDraft}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitAllCareDraft();
                    } else if (e.key === 'Escape') {
                      setIsEditingAllCare(false);
                    }
                  }}
                  className={`w-12 h-6 px-1 rounded-md border text-center font-black font-mono text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? 'bg-[#0B0E14] border-indigo-400 text-amber-300'
                      : 'bg-white border-indigo-500 text-indigo-900'
                  }`}
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAllCareDraft(String(currentAllCareCount));
                    setIsEditingAllCare(true);
                  }}
                  title="클릭하여 숫자로 직접 입력"
                  className={`min-w-[34px] px-1 py-0.5 rounded-md text-center font-black font-mono cursor-pointer hover:underline ${
                    isDark ? 'text-amber-300' : 'text-indigo-700'
                  }`}
                >
                  {currentAllCareCount}개
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStepAllCare(1);
                }}
                aria-label="가전올케어 수량 증가"
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition cursor-pointer schedule-tactile ${
                  isDark
                    ? 'bg-indigo-600 border-indigo-400/50 hover:bg-indigo-500 text-amber-200'
                    : 'bg-indigo-700 border-indigo-800 hover:bg-indigo-800 text-white'
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 펼쳐졌을 때만 나타나는 심플·컴팩트 상세 탭 영역 */}
      {isExpanded && (
        <div
          className={`mt-2.5 pt-2.5 border-t space-y-2.5 ${
            isDark ? 'border-white/10' : 'border-[#EAE5DC]'
          }`}
        >
          {/* 컴팩트 탭 바 + 안내 + 닫기 */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div
              className={`inline-flex items-center gap-1 p-0.5 rounded-xl border ${subSurfaceCls}`}
            >
              {[
                {
                  id: 'sales' as SettlementTabId,
                  label: `총판·실판 (${report.grossRows.length}/${report.netDeliveryRows.length})`,
                },
                {
                  id: 'freed' as SettlementTabId,
                  label: `프리드 수당 (${report.freedSummary.totalCount}건)`,
                },
                {
                  id: 'models' as SettlementTabId,
                  label: `모델별 수당 (${report.matchedModelUnitCount}대)`,
                },
              ].map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChangeTab(t.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition ${
                      active
                        ? isDark
                          ? 'bg-[#1E2738] text-white shadow-2xs'
                          : 'bg-[#18181B] text-white shadow-2xs'
                        : mutedCls
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold hidden sm:inline ${mutedCls}`}>
                실적기준: 일반=제품합계 · 구독=구독원금 (확정건 전용)
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className={`p-1 rounded-lg hover:bg-black/5 cursor-pointer ${mutedCls}`}
                title="패널 접기"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 탭 1: 총판 · 실판 컴팩트 내역 */}
          {activeTab === 'sales' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSalesSubView('gross')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                      salesSubView === 'gross'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : subSurfaceCls
                    }`}
                  >
                    총판 {formatCurrency(report.grossSalesTotal)}원 ({report.grossRows.length}건)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesSubView('delivery')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                      salesSubView === 'delivery'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : subSurfaceCls
                    }`}
                  >
                    실판 {formatCurrency(report.netDeliverySalesTotal)}원 ({report.netDeliveryRows.length}건)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesSubView('subscription')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                      salesSubView === 'subscription'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : subSurfaceCls
                    }`}
                  >
                    구독접수 {report.grossSubscriptionCount}개 ({report.grossSubscriptionCustomerCount}명)
                  </button>
                  {report.undatedConfirmedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSalesSubView('undated')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                        salesSubView === 'undated'
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : subSurfaceCls
                      }`}
                    >
                      배송일미정 {report.undatedConfirmedCount}건
                    </button>
                  )}
                </div>

                <span className={`text-[11px] font-mono font-bold ${mutedCls}`}>
                  {salesSubView === 'delivery'
                    ? `일반 ${formatShortManwon(report.netGeneralTotal)} · 구독원금 ${formatShortManwon(report.netSubPrincipalTotal)}`
                    : `일반 ${formatShortManwon(report.grossGeneralTotal)} · 구독원금 ${formatShortManwon(report.grossSubPrincipalTotal)}`}
                </span>
              </div>

              {activeSalesRows.length === 0 ? (
                <div
                  className={`rounded-xl border py-3 px-3 text-center text-[11px] font-bold ${subSurfaceCls} ${mutedCls}`}
                >
                  해당 월의 확정 고객([계약완료]·[발송완료]) 내역이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 schedule-matrix-scroll">
                  {activeSalesRows.map((row) => {
                    const isEditingThisRow = editingDeliveryRowId === row.customer.id;
                    return (
                      <div
                        key={row.customer.id}
                        className={`px-3 py-2 rounded-xl border text-left flex flex-col gap-1.5 schedule-tactile ${subSurfaceCls}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => onSelectCustomer(row.customer)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black truncate">
                                {row.customer.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                {row.profile.saleType === 'subscription'
                                  ? `구독 ${row.profile.subscriptionItemCount}개`
                                  : row.profile.saleType === 'hybrid'
                                  ? `혼합(구독 ${row.profile.subscriptionItemCount}개)`
                                  : '제품합계'}
                              </span>
                            </div>
                            <div className={`text-[11px] truncate ${mutedCls}`}>
                              {row.customer.items || '품목 미입력'}
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                            <div
                              onClick={() => onSelectCustomer(row.customer)}
                              className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 cursor-pointer"
                            >
                              {formatCurrency(row.profile.performanceAmount)}원
                            </div>
                            <div className={`text-[10px] font-mono flex items-center gap-1 ${mutedCls}`}>
                              <span>
                                <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                                {(row.profile.contractDateStr || '-').slice(5)}
                              </span>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isEditingThisRow) {
                                    setEditingDeliveryRowId(null);
                                  } else {
                                    setEditingDeliveryRowId(row.customer.id);
                                    setEditingDeliveryDateVal(row.customer.deliveryDate || '');
                                  }
                                }}
                                title="클릭하여 실판(배송일) 바로 수정"
                                className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold inline-flex items-center gap-0.5 hover:bg-sky-500/25 cursor-pointer"
                              >
                                <Truck className="w-2.5 h-2.5 inline" />
                                <span>
                                  {row.customer.deliveryDate
                                    ? row.customer.deliveryDate.slice(5)
                                    : '실판미정'}
                                </span>
                                <span className="text-[9px] underline ml-0.5">수정</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {isEditingThisRow && onFieldChange && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-1.5 border-t border-current/10 flex items-center justify-between gap-1.5"
                          >
                            <span className="text-[10px] font-black text-sky-600 dark:text-sky-300 shrink-0">
                              🚚 실판(배송일):
                            </span>
                            <input
                              type="date"
                              value={editingDeliveryDateVal}
                              onChange={(e) => setEditingDeliveryDateVal(e.target.value)}
                              className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-sky-400/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                onFieldChange(row.customer.id, {
                                  deliveryDate: editingDeliveryDateVal.trim(),
                                });
                                setEditingDeliveryRowId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10.5px] font-black inline-flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>저장</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 탭 2: 프리드 가입 건수 & 종류별 수당 (심플 컴팩트형) */}
          {activeTab === 'freed' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-xs font-extrabold">
                  총 <strong className="font-mono">{report.freedSummary.totalCount}건</strong> 가입 · 수당{' '}
                  <strong className="font-mono text-amber-500">
                    +{formatCurrency(report.freedSummary.totalIncentive)}원
                  </strong>
                </span>

                <div
                  className={`inline-flex items-center p-0.5 rounded-lg border text-[10px] font-black ${subSurfaceCls}`}
                >
                  <button
                    type="button"
                    onClick={() => setIncentiveBasis('contract')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      incentiveBasis === 'contract'
                        ? isDark
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-[#18181B] text-white'
                        : mutedCls
                    }`}
                  >
                    계약월 기준
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncentiveBasis('delivery')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer ${
                      incentiveBasis === 'delivery'
                        ? isDark
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-[#18181B] text-white'
                        : mutedCls
                    }`}
                  >
                    배송월 기준
                  </button>
                </div>
              </div>

              {/* 5종 컴팩트 수당 칩 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  {
                    key: 'plus',
                    label: '플러스구독(9만)',
                    count: report.freedSummary.plusSubCount,
                    amt: report.freedSummary.plusSubIncentive,
                    sub:
                      report.freedSummary.plusSubCount > 0
                        ? `72(${report.freedSummary.counts.hi72})·90(${report.freedSummary.counts.hi90})·108(${report.freedSummary.counts.hi108})`
                        : '',
                  },
                  {
                    key: 'hf75',
                    label: '프리드 75(6만)',
                    count: report.freedSummary.counts.hf75,
                    amt: report.freedSummary.hf75Incentive,
                    sub: '',
                  },
                  {
                    key: 'hf150',
                    label: '프리드 150(12만)',
                    count: report.freedSummary.counts.hf150,
                    amt: report.freedSummary.hf150Incentive,
                    sub: '',
                  },
                  {
                    key: 'hf225',
                    label: '프리드 225(18만)',
                    count: report.freedSummary.counts.hf225,
                    amt: report.freedSummary.hf225Incentive,
                    sub: '',
                  },
                  {
                    key: 'hf300',
                    label: '프리드 300(24만)',
                    count: report.freedSummary.counts.hf300,
                    amt: report.freedSummary.hf300Incentive,
                    sub: '',
                  },
                ].map((f) => (
                  <div
                    key={f.key}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs ${
                      f.count > 0
                        ? isDark
                          ? 'bg-amber-400/15 border-amber-400/40'
                          : 'bg-amber-50/90 border-amber-300'
                        : subSurfaceCls
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-extrabold truncate">
                        {f.label}
                      </span>
                      <span className="font-black font-mono shrink-0">
                        {f.count}건
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[11px] font-black font-mono text-amber-600 dark:text-amber-400">
                        +{formatShortManwon(f.amt)}
                      </span>
                      {f.sub && (
                        <span className={`text-[9px] font-mono ${mutedCls}`}>
                          {f.sub}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {report.freedCustomerRows.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1 schedule-matrix-scroll">
                  {report.freedCustomerRows.map((row) => (
                    <button
                      key={row.customer.id}
                      type="button"
                      onClick={() => onSelectCustomer(row.customer)}
                      className={`px-3 py-1.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs cursor-pointer ${subSurfaceCls}`}
                    >
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className="font-black">{row.customer.name}</span>
                        {row.profile.freedDetail.summaryBadges.map((b, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      <span className="font-black font-mono text-amber-500 shrink-0">
                        +{formatCurrency(row.customerFreedIncentive)}원
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <CrmModelIncentiveTabSection
            activeTab={activeTab}
            bulkPasteText={bulkPasteText}
            currentSheet={currentSheet}
            excelInputRef={excelInputRef}
            filteredRules={filteredRules}
            ghConfig={ghConfig}
            gsheetUrl={gsheetUrl}
            handleAddSingleRule={handleAddSingleRule}
            handleBulkTextApply={handleBulkTextApply}
            handleCopyFromPrevMonth={handleCopyFromPrevMonth}
            handleDeleteRule={handleDeleteRule}
            handleExcelUpload={handleExcelUpload}
            handleGoogleSheetSync={handleGoogleSheetSync}
            handleManualPullOrPush={handleManualPullOrPush}
            handlePhotoUpload={handlePhotoUpload}
            handleQuickAssignSave={handleQuickAssignSave}
            handleRuleAmountBlur={handleRuleAmountBlur}
            handleSaveGhConfig={handleSaveGhConfig}
            handleUpdateRuleAmount={handleUpdateRuleAmount}
            incentiveBasis={incentiveBasis}
            isDark={isDark}
            isSyncingCloud={isSyncingCloud}
            isUploading={isUploading}
            manualCategory={manualCategory}
            manualIncentive={manualIncentive}
            manualModelCode={manualModelCode}
            mutedCls={mutedCls}
            onSelectCustomer={onSelectCustomer}
            photoInputRef={photoInputRef}
            prevSheet={prevSheet}
            quickAssignAmount={quickAssignAmount}
            quickAssignTarget={quickAssignTarget}
            replaceOnUpload={replaceOnUpload}
            report={report}
            ruleSearch={ruleSearch}
            selectedYearMonth={selectedYearMonth}
            setBulkPasteText={setBulkPasteText}
            setGhConfig={setGhConfig}
            setGsheetUrl={setGsheetUrl}
            setIncentiveBasis={setIncentiveBasis}
            setManualCategory={setManualCategory}
            setManualIncentive={setManualIncentive}
            setManualModelCode={setManualModelCode}
            setQuickAssignAmount={setQuickAssignAmount}
            setQuickAssignTarget={setQuickAssignTarget}
            setReplaceOnUpload={setReplaceOnUpload}
            setRuleSearch={setRuleSearch}
            setShowCloudDrawer={setShowCloudDrawer}
            setShowGsheetDrawer={setShowGsheetDrawer}
            setShowManualDrawer={setShowManualDrawer}
            setShowRulesDrawer={setShowRulesDrawer}
            setUploadError={setUploadError}
            setUploadSuccess={setUploadSuccess}
            shellCls={shellCls}
            showCloudDrawer={showCloudDrawer}
            showGsheetDrawer={showGsheetDrawer}
            showManualDrawer={showManualDrawer}
            showRulesDrawer={showRulesDrawer}
            subSurfaceCls={subSurfaceCls}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
          />
        </div>
      )}
    </section>
  );
};
