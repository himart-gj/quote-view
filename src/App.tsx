import React, { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppStep, createInitialState, extractGeneralPlanData, hasMeaningfulGeneralItems, hasMeaningfulSubItems, ProposalState, QuoteMode, resolveComparisonModePlanData, SUB_CARE_OPTIONS, SubscriptionPeriod } from './types/proposal';
import { ControlPanel } from './components/ControlPanel';
import { ProposalPreview } from './components/ProposalPreview';
import { fetchRemoteSchedules } from './components/ScheduleModal';
import { fetchRemoteModelIncentiveSheets } from './crm/utils/settlementEngine';
import { decodeSharedQuoteFromHash, SharedQuotePayload } from './utils/shareQuoteCodec';
import { flushPendingOutbox, useOfflineSyncStatus } from './utils/offlineDbQueue';
import { installLifecycleResumeAndUpdateGuard } from './utils/mobileQaRuntime';
import { PopPrinterApp } from './pop/PopPrinterApp';
import { CrmApp } from './crm/CrmApp';
import { HiMobileView } from './components/HiMobileView';
import { InsuranceGuideView } from './components/InsuranceGuideView';
import { CareTableView } from './components/CareTableView';
import { LottePlanCalcView } from './components/LottePlanCalcView';
import { AllCareGuideView } from './components/AllCareGuideView';
import { CustomerShareQuoteView } from './components/CustomerShareQuoteView';
import { isOwnerMarketingDbUnlocked, loadMarketingDbStore, MARKETING_DB_UPDATED_EVENT, syncLeadsFromGoogleSheet, verifyAndUnlockOwnerDb } from './utils/marketingDbEngine';
import MarketingDbManagerView from './components/MarketingDbManagerView';
import { CustomerItem, QuoteRecord, SettlementTabId } from './crm/types/crm';
import { CRM_CUSTOMERS_UPDATED_EVENT, getCachedCustomers, setCachedCustomers, syncCustomerToGas } from './crm/services/gasApi';
import { getPastDueDeliveryCustomers, isPendingLogisticsCustomer, isUrgentCustomer } from './crm/utils/date';
import { PAST_DELIVERY_POPUP_DISMISSED_KEY } from './crm/CrmApp';
import { CareTableDataset, fetchRemoteCareDataset, loadLocalCareDataset, saveLocalCareDataset } from './utils/careTableParser';
import { fetchRemoteInstallmentDataset, loadLocalInstallmentDataset, saveLocalInstallmentDataset } from './utils/installmentParser';
import { mapGeneralCardName, mapSubscriptionAffiliateCard, parseGeneralImageWithFallback, parseSubscriptionImageWithFallback, sanitizeFiveYearWarrantyText } from './utils/aiImageParser';
import { Columns2 } from 'lucide-react';
import { AppHeaderAndHome } from './components/AppHeaderAndHome';
import { AppGlobalModals, getStepShortLabel, ScreenErrorBoundary } from './components/AppGlobalModals';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function App() {
  const [activeMode, setActiveMode] = useState<QuoteMode>('subscription');
  const [step, setStep] = useState<AppStep>('home');
  const [stepHistory, setStepHistory] = useState<AppStep[]>([]);
  const stepHistoryRef = useRef<AppStep[]>([]);
  const currentStepRef = useRef<AppStep>('home');

  // 3개 메뉴 완전 개별 상태 분리
  const [generalState, setGeneralState] = useState<ProposalState>(() =>
    createInitialState('general')
  );
  const [subscriptionState, setSubscriptionState] = useState<ProposalState>(
    () => createInitialState('subscription')
  );
  const [hybridState, setHybridState] = useState<ProposalState>(() =>
    createInitialState('hybrid')
  );

  // CRM 연동 상태: 현재 작업 중인 고객 및 저장 모달
  const [activeCustomer, setActiveCustomer] = useState<{
    id: string;
    name: string;
    phone?: string;
    activeQuoteId?: string;
  } | null>(null);
  const [isSaveToCrmOpen, setIsSaveToCrmOpen] = useState(false);
  const [crmCustomers, setCrmCustomers] = useState<CustomerItem[]>(() =>
    getCachedCustomers()
  );
  const [initialCrmTab, setInitialCrmTab] = useState<SettlementTabId | undefined>(undefined);

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState(null as string | null);
  const [subScanNotice, setSubScanNotice] = useState<string | null>(null);
  const subScanNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [isParsingGeneral, setIsParsingGeneral] = useState(false);
  const [parseGeneralError, setParseGeneralError] = useState(
    null as string | null
  );

  // PWA 설치 프롬프트 및 전체화면 상태
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    );
  });
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState<boolean>(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] =
    useState<boolean>(false);
  const [isCardIssueOpen, setIsCardIssueOpen] = useState<boolean>(false);
  const [isAsCenterOpen, setIsAsCenterOpen] = useState<boolean>(false);
  const [isPartnerLinksOpen, setIsPartnerLinksOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] =
    useState<boolean>(false);
  const [isAiCommandModalOpen, setIsAiCommandModalOpen] =
    useState<boolean>(false);
  const [aiInitialCommand, setAiInitialCommand] = useState<string>('');
  const [isOmnibarOpen, setIsOmnibarOpen] = useState<boolean>(false);
  const [isHomePastDeliveryOpen, setIsHomePastDeliveryOpen] = useState<boolean>(false);
  // ==================== 국지현 전용 비공개 [마케팅 DB관리] 스텔스 상태 ====================
  const [isOwnerDbUnlocked, setIsOwnerDbUnlocked] = useState<boolean>(() =>
    isOwnerMarketingDbUnlocked()
  );
  const [ownerDbTick, setOwnerDbTick] = useState<number>(0);
  const [initialCrmCustomerId, setInitialCrmCustomerId] = useState<
    string | null
  >(null);

  useEffect(() => {
    currentStepRef.current = step;
  }, [step]);

  // 스마트 화면 이동 스택 (어느 화면에서 넘어왔든 1단계씩 직전 화면으로 정확히 복귀)
  const navigateToStep = useCallback(
    (nextStep: AppStep, opts?: { reset?: boolean }) => {
      const cur = currentStepRef.current;
      if (opts?.reset || nextStep === 'home') {
        stepHistoryRef.current = [];
        setStepHistory([]);
        currentStepRef.current = 'home';
        setInitialCrmCustomerId(null);
        setStep('home');
        return;
      }
      if (nextStep === cur) {
        if (nextStep === 'crm') {
          setCrmCustomers(getCachedCustomers());
        }
        return;
      }
      const prevStack = stepHistoryRef.current;
      const existingIdx = prevStack.indexOf(nextStep);
      const nextStack =
        existingIdx >= 0
          ? prevStack.slice(0, existingIdx)
          : [...prevStack, cur].slice(-12);
      stepHistoryRef.current = nextStack;
      setStepHistory(nextStack);
      currentStepRef.current = nextStep;
      if (cur === 'crm' && nextStep !== 'crm') {
        setInitialCrmCustomerId(null);
      }
      if (nextStep === 'crm') {
        setCrmCustomers(getCachedCustomers());
      }
      setStep(nextStep);
    },
    []
  );

  const handleNavigateBack = useCallback(() => {
    const prevStack = stepHistoryRef.current;
    if (prevStack.length > 0) {
      const target = prevStack[prevStack.length - 1];
      const nextStack = prevStack.slice(0, -1);
      stepHistoryRef.current = nextStack;
      setStepHistory(nextStack);
      currentStepRef.current = target;
      if (target === 'crm') {
        setInitialCrmCustomerId(null);
        setCrmCustomers(getCachedCustomers());
      }
      setStep(target);
      return;
    }
    stepHistoryRef.current = [];
    setStepHistory([]);
    currentStepRef.current = 'home';
    setInitialCrmCustomerId(null);
    setStep('home');
  }, []);

  const previousStep: AppStep =
    stepHistory.length > 0 ? stepHistory[stepHistory.length - 1] : 'home';
  const backButtonLabel =
    previousStep === 'home' ? '홈으로' : `${getStepShortLabel(previousStep)}로`;
  const [isStealthPinOpen, setIsStealthPinOpen] = useState<boolean>(false);
  const [stealthPinInput, setStealthPinInput] = useState<string>('');
  const [stealthPinError, setStealthPinError] = useState<boolean>(false);
  const homeTapTimestampsRef = useRef<number[]>([]);
  const [sharedQuotePayload, setSharedQuotePayload] =
    useState<SharedQuotePayload | null>(null);
  const [isSplitConsultation, setIsSplitConsultation] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1180 : false
  );

  useEffect(() => {
    const handleSplitResize = () => {
      if (window.innerWidth < 768) {
        setIsSplitConsultation(false);
      }
    };
    window.addEventListener('resize', handleSplitResize);
    window.addEventListener('orientationchange', handleSplitResize);
    return () => {
      window.removeEventListener('resize', handleSplitResize);
      window.removeEventListener('orientationchange', handleSplitResize);
    };
  }, []);

  // [QA 02 백그라운드 복귀 · QA 08 업데이트 직후 · QA 09 푸시 알림 진입]
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('entry') === 'briefing') {
        currentStepRef.current = 'crm';
        setStep('crm');
        params.delete('entry');
        const rest = params.toString();
        window.history.replaceState(
          { appGuard: true, tag: 'push-entry' },
          '',
          `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash || ''}`
        );
      }
    } catch {
      // ignore malformed URL query
    }

    return installLifecycleResumeAndUpdateGuard({
      onResumeSync: () => {
        setCrmCustomers(getCachedCustomers());
        setIsOwnerDbUnlocked(isOwnerMarketingDbUnlocked());
        flushPendingOutbox().catch(() => {});
      },
      onPushNavigate: (targetUrl) => {
        setCrmCustomers(getCachedCustomers());
        if (targetUrl.includes('entry=briefing') || targetUrl.includes('crm')) {
          navigateToStep('crm');
        }
      },
    });
  }, []);
  const { isOnline, pendingCount } = useOfflineSyncStatus();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // UI 테마 상태: 'light' (Apple Bento Warm Ivory 기본값) | 'dark' (Titanium Dark Pro)
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('himart_ui_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', uiTheme);
    }
    try {
      localStorage.setItem('himart_ui_theme', uiTheme);
    } catch {
      // ignore
    }
  }, [uiTheme]);

  const toggleUiTheme = useCallback(() => {
    setUiTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);
  const isDark = uiTheme === 'dark';

  // 안심케어 조견표 & 무이자 데이터셋 (0.01초 ⌘K 옴니바 통합 검색 연동)
  const [careDataset, setCareDataset] = useState<CareTableDataset | null>(() =>
    loadLocalCareDataset()
  );
  const [installmentDataset, setInstallmentDataset] = useState(() => loadLocalInstallmentDataset());

  // 카톡 공유 링크(?share=... 또는 #share=...) 감지 시 고객 전용 뷰로 단방향 잠금 (직원 앱 복귀 불가)
  useEffect(() => {
    const checkShareUrl = () => {
      const hasQueryShare = window.location.search.includes('share=');
      const hasHashShare = (window.location.hash || '').startsWith('#share=');
      if (hasQueryShare || hasHashShare) {
        decodeSharedQuoteFromHash().then((decoded) => {
          if (decoded) setSharedQuotePayload(decoded);
        });
      }
    };
    checkShareUrl();
    window.addEventListener('hashchange', checkShareUrl);
    return () => window.removeEventListener('hashchange', checkShareUrl);
  }, []);

  // 전역 Ctrl+K / Cmd+K 통합 검색 옴니바 단축키
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOmnibarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 최신 화면 및 모달 상태를 참조하기 위한 Ref
  const latestAppStateRef = useRef({
    step,
    isOmnibarOpen,
    isAiCommandModalOpen,
    isSaveToCrmOpen,
    isInstallGuideOpen,
    isInstallmentModalOpen,
    isCardIssueOpen,
    isAsCenterOpen,
    isPartnerLinksOpen,
    isScheduleModalOpen,
    isMenuOpen,
    isStealthPinOpen,
    isHomePastDeliveryOpen,
  });

  useEffect(() => {
    latestAppStateRef.current = {
      step,
      isOmnibarOpen,
      isAiCommandModalOpen,
      isSaveToCrmOpen,
      isInstallGuideOpen,
      isInstallmentModalOpen,
      isCardIssueOpen,
      isAsCenterOpen,
      isPartnerLinksOpen,
      isScheduleModalOpen,
      isMenuOpen,
      isStealthPinOpen,
      isHomePastDeliveryOpen,
    };
  }, [
    step,
    isOmnibarOpen,
    isAiCommandModalOpen,
    isSaveToCrmOpen,
    isInstallGuideOpen,
    isInstallmentModalOpen,
    isCardIssueOpen,
    isAsCenterOpen,
    isPartnerLinksOpen,
    isScheduleModalOpen,
    isMenuOpen,
    isStealthPinOpen,
    isHomePastDeliveryOpen,
  ]);

  // 히스토리 가드 주입 헬퍼 (모바일 뒤로가기 시 앱 강제 종료 원천 차단)
  const pushAppHistoryGuard = useCallback((tag?: string) => {
    try {
      window.history.pushState(
        { appGuard: true, tag: tag || 'nav', ts: Date.now() },
        ''
      );
    } catch {
      // ignore
    }
  }, []);

  // 단계나 메뉴가 바뀔 때마다 드롭다운 닫기 및 히스토리 가드 엔트리 1개 추가
  useEffect(() => {
    setIsMenuOpen(false);
    pushAppHistoryGuard(`step-${step}-${activeMode}`);
  }, [step, activeMode, pushAppHistoryGuard]);

  // 어떤 모달이나 햄버거 메뉴가 열릴 때마다 히스토리 가드 엔트리 1개 추가
  useEffect(() => {
    if (
      isOmnibarOpen ||
      isAiCommandModalOpen ||
      isMenuOpen ||
      isSaveToCrmOpen ||
      isInstallGuideOpen ||
      isScheduleModalOpen ||
      isInstallmentModalOpen ||
      isCardIssueOpen ||
      isAsCenterOpen ||
      isPartnerLinksOpen ||
      isStealthPinOpen ||
      isHomePastDeliveryOpen
    ) {
      pushAppHistoryGuard('modal-open');
    }
  }, [
    isOmnibarOpen,
    isAiCommandModalOpen,
    isMenuOpen,
    isSaveToCrmOpen,
    isInstallGuideOpen,
    isScheduleModalOpen,
    isInstallmentModalOpen,
    isCardIssueOpen,
    isAsCenterOpen,
    isPartnerLinksOpen,
    isStealthPinOpen,
    isHomePastDeliveryOpen,
    pushAppHistoryGuard,
  ]);

  // 드롭다운 바깥 영역 클릭 시 자동 닫기
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // 최초 1회만 등록되는 스마트폰 물리/제스처 뒤로가기 인터셉터 (우선순위 0~4순위 계층 처리)
  useEffect(() => {
    try {
      window.history.replaceState({ appGuard: true, tag: 'init-base', ts: Date.now() }, '');
    } catch {
      // ignore
    }
    pushAppHistoryGuard('init');

    const handlePopState = () => {
      const current = latestAppStateRef.current;

      if (current.isOmnibarOpen) {
        setIsOmnibarOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isAiCommandModalOpen) {
        setIsAiCommandModalOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }

      const modalInternalHandler = (window as any).__modalInternalBackHandler as
        | (() => boolean)
        | undefined;
      if (typeof modalInternalHandler === 'function') {
        const handledInsideModal = modalInternalHandler();
        if (handledInsideModal) {
          pushAppHistoryGuard('modal-sub');
          return;
        }
      }

      if (current.isStealthPinOpen) {
        setIsStealthPinOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isHomePastDeliveryOpen) {
        setIsHomePastDeliveryOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isMenuOpen) {
        setIsMenuOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isSaveToCrmOpen) {
        setIsSaveToCrmOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isInstallGuideOpen) {
        setIsInstallGuideOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isScheduleModalOpen) {
        setIsScheduleModalOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isInstallmentModalOpen) {
        setIsInstallmentModalOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isCardIssueOpen) {
        setIsCardIssueOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isAsCenterOpen) {
        setIsAsCenterOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }
      if (current.isPartnerLinksOpen) {
        setIsPartnerLinksOpen(false);
        pushAppHistoryGuard('modal-close');
        return;
      }

      const splitPreviewBackHandler = (window as any)
        .__proposalPreviewSplitBackHandler as (() => boolean) | undefined;
      if (typeof splitPreviewBackHandler === 'function') {
        if (splitPreviewBackHandler()) {
          pushAppHistoryGuard('split-preview-sub');
          return;
        }
      }

      const subBackHandler = (window as any).__subViewBackHandler as
        | (() => boolean)
        | undefined;
      if (typeof subBackHandler === 'function') {
        const handledBySubView = subBackHandler();
        if (handledBySubView) {
          pushAppHistoryGuard('subview');
          return;
        }
      }

      if (current.step !== 'home') {
        handleNavigateBack();
        pushAppHistoryGuard('step-back');
        return;
      }

      pushAppHistoryGuard('home-stay');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pushAppHistoryGuard, handleNavigateBack]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setIsInstallGuideOpen(false);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallAppClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch {
        setIsInstallGuideOpen(true);
      }
    } else {
      setIsInstallGuideOpen(true);
    }
  }, [deferredPrompt]);

  // CRM 고객 변경 이벤트 발생 시 메인 홈(수당적립·구독건수·TODAY 브리핑) 및 통합검색 캐시 즉시 동기화
  useEffect(() => {
    const syncCustomers = () => setCrmCustomers(getCachedCustomers());
    window.addEventListener(CRM_CUSTOMERS_UPDATED_EVENT, syncCustomers);
    window.addEventListener('storage', syncCustomers);
    return () => {
      window.removeEventListener(CRM_CUSTOMERS_UPDATED_EVENT, syncCustomers);
      window.removeEventListener('storage', syncCustomers);
    };
  }, []);

  // 메인 홈 화면 진입 시 최신 CRM 캐시 및 안심케어 조견표 · 무이자 할부 행사표 동기화
  useEffect(() => {
    if (step === 'home') {
      setCrmCustomers(getCachedCustomers());
      const local = loadLocalCareDataset();
      if (local) setCareDataset(local);
      fetchRemoteCareDataset()
        .then((remote) => {
          if (remote) {
            saveLocalCareDataset(remote);
            setCareDataset(remote);
          }
        })
        .catch(() => {
          // ignore
        });

      const localInst = loadLocalInstallmentDataset();
      fetchRemoteInstallmentDataset()
        .then((remoteInst) => {
          if (
            remoteInst &&
            remoteInst.updatedAt &&
            (!localInst.updatedAt ||
              remoteInst.updatedAt >= localInst.updatedAt)
          ) {
            saveLocalInstallmentDataset(remoteInst);
            setInstallmentDataset(remoteInst);
          }
        })
        .catch(() => {
          // ignore
        });

      fetchRemoteSchedules().catch(() => {
        // ignore
      });
      fetchRemoteModelIncentiveSheets().catch(() => {
        // ignore
      });
    }
  }, [step]);

  // 조견표 업데이트 월 표시 배지 텍스트 자동 추출
  const careUpdateMonthBadge = useMemo(() => {
    if (!careDataset) return '📅 기본 조견표 적용중';

    const combinedTitle = `${careDataset.versionTitle || ''} ${
      careDataset.fileName || ''
    }`;
    const monthMatch = combinedTitle.match(/(\d{1,2})\s*월/);
    if (monthMatch) {
      const m = parseInt(monthMatch[1], 10);
      if (m >= 1 && m <= 12) {
        return `📅 ${m}월 조견표 업데이트 완료`;
      }
    }

    if (careDataset.updatedAt) {
      const dateParts = careDataset.updatedAt.match(
        /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/
      );
      if (dateParts) {
        const yyyy = dateParts[1];
        const mmNum = parseInt(dateParts[2], 10);
        const mmPad = String(mmNum).padStart(2, '0');
        const ddPad = String(parseInt(dateParts[3], 10)).padStart(2, '0');
        return `📅 ${mmNum}월분 업데이트 (${yyyy}.${mmPad}.${ddPad})`;
      }
      const parsedDate = new Date(careDataset.updatedAt);
      if (!isNaN(parsedDate.getTime())) {
        const yyyy = parsedDate.getFullYear();
        const mmNum = parsedDate.getMonth() + 1;
        const mmPad = String(mmNum).padStart(2, '0');
        const ddPad = String(parsedDate.getDate()).padStart(2, '0');
        return `📅 ${mmNum}월분 업데이트 (${yyyy}.${mmPad}.${ddPad})`;
      }
    }

    return '📅 기본 조견표 적용중';
  }, [careDataset]);

  // ==================== 국지현 전용 비공개 [마케팅 DB관리] 스텔스 동기화 ====================
  useEffect(() => {
    const syncOwnerDb = () => {
      setIsOwnerDbUnlocked(isOwnerMarketingDbUnlocked());
      setOwnerDbTick((t) => t + 1);
    };
    window.addEventListener(MARKETING_DB_UPDATED_EVENT, syncOwnerDb);
    return () =>
      window.removeEventListener(MARKETING_DB_UPDATED_EVENT, syncOwnerDb);
  }, []);

  useEffect(() => {
    if (!isOwnerDbUnlocked || step === 'marketing-db') return;
    const runBgSync = () => {
      void syncLeadsFromGoogleSheet(loadMarketingDbStore());
    };
    runBgSync();
    const timer = setInterval(runBgSync, 60000);
    const onVis = () => {
      if (document.visibilityState === 'visible') runBgSync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isOwnerDbUnlocked, step]);

  const ownerDbQuickSummary = useMemo(() => {
    if (!isOwnerDbUnlocked) {
      return { totalActive: 0, newCount: 0, handoverTabCount: 0, monthRevenue: 0 };
    }
    const dbStore = loadMarketingDbStore();
    const active = dbStore.leads.filter((l) => !l.deletedAt);
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    const newCount = active.filter((l) => l.status === '신규').length;
    const handoverTabCount = active.filter((l) => l.status === '타직원인계').length;
    const monthRevenue = active
      .filter((l) => l.yearMonth === curYm && l.status === '계약완료')
      .reduce((s, l) => s + (Number(l.revenueAmount) || 0), 0);
    return {
      totalActive: active.length,
      newCount,
      handoverTabCount,
      monthRevenue,
    };
  }, [isOwnerDbUnlocked, ownerDbTick, step]);

  const handleHomeButtonClick = () => {
    navigateToStep('home', { reset: true });
    const now = Date.now();
    const recent = homeTapTimestampsRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    homeTapTimestampsRef.current = recent;
    if (recent.length >= 5) {
      homeTapTimestampsRef.current = [];
      if (isOwnerMarketingDbUnlocked()) {
        setIsOwnerDbUnlocked(true);
        navigateToStep('marketing-db');
      } else {
        setStealthPinInput('');
        setStealthPinError(false);
        setIsStealthPinOpen(true);
      }
    }
  };

  const handleConfirmStealthPin = () => {
    if (verifyAndUnlockOwnerDb(stealthPinInput)) {
      setIsOwnerDbUnlocked(true);
      setIsStealthPinOpen(false);
      setStealthPinInput('');
      navigateToStep('marketing-db');
    } else {
      setStealthPinError(true);
    }
  };

  // 현재 열려 있는 화면 이름 배지 텍스트
  const currentScreenBadgeLabel = useMemo(() => {
    if (step === 'home') return '메인 홈';
    if (step === 'crm') return '👑 통합 고객관리';
    if (step === 'marketing-db') return '📊 마케팅 DB관리';
    if (step === 'input' || step === 'proposal') {
      if (activeMode === 'general') return '1. 일반 견적';
      if (activeMode === 'subscription') return '2. 구독 견적';
      return '3. 혼합 견적';
    }
    if (step === 'lotte-plan') return '4. 플랜 계산기';
    if (step === 'pop-printer') return '5. 구독 POP';
    if (step === 'himobile') return '6. 하이 모바일';
    if (step === 'allcare-guide') return '7. 가전 올케어';
    if (step === 'insurance') return '8. 보험 청구안내';
    if (step === 'care-table') return '📋 안심케어 조견표';
    return '메인 홈';
  }, [step, activeMode]);

  const urgentCount = useMemo(() => {
    return crmCustomers
      .filter((c) => !c.deletedAt)
      .filter((c) => isUrgentCustomer(c)).length;
  }, [crmCustomers]);

  const rawCurrentState =
    activeMode === 'general'
      ? generalState
      : activeMode === 'subscription'
      ? subscriptionState
      : hybridState;

  const currentState = useMemo<ProposalState>(() => {
    const genSnap = extractGeneralPlanData(generalState);
    const subSnap = extractGeneralPlanData(subscriptionState);
    const hybSnap = extractGeneralPlanData(hybridState);
    return {
      ...rawCurrentState,
      modeConfigs: {
        ...(rawCurrentState.modeConfigs || {}),
        general: genSnap,
        subscription: subSnap,
        hybrid: hybSnap,
      },
    };
  }, [rawCurrentState, generalState, subscriptionState, hybridState]);

  const setCurrentState: React.Dispatch<React.SetStateAction<ProposalState>> =
    useCallback(
      (updater) => {
        let syncedCompareModes: QuoteMode[] | undefined = undefined;
        let compareModesChanged = false;

        const applyWithSnapshotSync = (prev: ProposalState): ProposalState => {
          const prevWithConfigs: ProposalState = {
            ...prev,
            modeConfigs: {
              ...(prev.modeConfigs || {}),
              general: extractGeneralPlanData(generalState),
              subscription: extractGeneralPlanData(subscriptionState),
              hybrid: extractGeneralPlanData(hybridState),
            },
          };
          const nextState =
            typeof updater === 'function' ? updater(prevWithConfigs) : updater;
          if (
            JSON.stringify(nextState.compareModes || []) !==
            JSON.stringify(prev.compareModes || [])
          ) {
            compareModesChanged = true;
            syncedCompareModes = nextState.compareModes;
          }
          const snapshot = extractGeneralPlanData(nextState);
          if (nextState.activeGeneralPlan === 2) {
            return {
              ...nextState,
              generalPlan2: snapshot,
            };
          }
          return {
            ...nextState,
            generalPlan1: snapshot,
          };
        };

        if (activeMode === 'general') {
          setGeneralState(applyWithSnapshotSync);
        } else if (activeMode === 'subscription') {
          setSubscriptionState(applyWithSnapshotSync);
        } else {
          setHybridState(applyWithSnapshotSync);
        }

        setTimeout(() => {
          if (compareModesChanged) {
            setGeneralState((p) => ({ ...p, compareModes: syncedCompareModes }));
            setSubscriptionState((p) => ({ ...p, compareModes: syncedCompareModes }));
            setHybridState((p) => ({ ...p, compareModes: syncedCompareModes }));
          }
        }, 0);
      },
      [activeMode, generalState, subscriptionState, hybridState]
    );

  const handleSwitchQuoteModeInPlace = useCallback(
    (nextMode: QuoteMode) => {
      if (nextMode === 'general' && !hasMeaningfulGeneralItems(generalState)) {
        const seeded = resolveComparisonModePlanData(currentState, 'general');
        if (hasMeaningfulGeneralItems(seeded)) {
          setGeneralState((prev) => ({
            ...prev,
            ...seeded,
            quoteMode: 'general',
            generalPlan1: seeded,
          }));
        }
      } else if (
        nextMode === 'subscription' &&
        !hasMeaningfulSubItems(subscriptionState)
      ) {
        const seeded = resolveComparisonModePlanData(currentState, 'subscription');
        if (hasMeaningfulSubItems(seeded)) {
          setSubscriptionState((prev) => ({
            ...prev,
            ...seeded,
            quoteMode: 'subscription',
            generalPlan1: seeded,
          }));
        }
      } else if (nextMode === 'hybrid') {
        const hasGen = hasMeaningfulGeneralItems(hybridState);
        const hasSub = hasMeaningfulSubItems(hybridState);
        if (!hasGen || !hasSub) {
          const seeded = resolveComparisonModePlanData(currentState, 'hybrid');
          setHybridState((prev) => ({
            ...prev,
            ...seeded,
            quoteMode: 'hybrid',
            generalPlan1: seeded,
          }));
        }
      }
      setActiveMode(nextMode);
      setParseError(null);
      setParseGeneralError(null);
    },
    [currentState, generalState, subscriptionState, hybridState]
  );

  const handleEnterMode = (mode: QuoteMode) => {
    setActiveMode(mode);
    setParseError(null);
    setParseGeneralError(null);
    navigateToStep('input');
  };

  // CRM에서 저장된 ProposalState 스냅샷 또는 고객 기본 정보를 신규 견적기로 복원
  const applyRestoredProposalState = useCallback(
    (
      customer: CustomerItem,
      savedProposalState?: any,
      fallbackItemSummary?: string,
      fallbackPaidAmount?: number,
      fallbackQuoteMode?: QuoteMode,
      activeQuoteId?: string
    ) => {
      setActiveCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        activeQuoteId: activeQuoteId || customer.quotes?.[0]?.id,
      });

      if (savedProposalState && typeof savedProposalState === 'object') {
        const targetMode: QuoteMode =
          savedProposalState.quoteMode === 'general' ||
          savedProposalState.quoteMode === 'subscription' ||
          savedProposalState.quoteMode === 'hybrid'
            ? savedProposalState.quoteMode
            : fallbackQuoteMode || 'general';

        const base = createInitialState(targetMode);
        const parsed = JSON.parse(JSON.stringify(savedProposalState));

        const mergedPlan1 = extractGeneralPlanData({
          ...base.generalPlan1,
          ...(parsed.generalPlan1 || {}),
          items:
            Array.isArray(parsed.generalPlan1?.items) &&
            parsed.generalPlan1.items.length > 0
              ? parsed.generalPlan1.items
              : Array.isArray(parsed.items) && parsed.items.length > 0
              ? parsed.items
              : base.generalPlan1.items,
          subscriptionPeriod:
            parsed.generalPlan1?.subscriptionPeriod ||
            parsed.subscriptionPeriod ||
            base.generalPlan1.subscriptionPeriod,
          careService:
            parsed.generalPlan1?.careService ||
            parsed.careService ||
            base.generalPlan1.careService,
          warrantyType:
            parsed.generalPlan1?.warrantyType ||
            parsed.warrantyType ||
            base.generalPlan1.warrantyType,
          warrantyYears: 5,
          allCare:
            parsed.generalPlan1?.allCare ??
            parsed.allCare ??
            base.generalPlan1.allCare,
          selectedCardId:
            parsed.generalPlan1?.selectedCardId ||
            parsed.selectedCardId ||
            base.generalPlan1.selectedCardId,
          selectedCardTierId:
            parsed.generalPlan1?.selectedCardTierId ??
            parsed.selectedCardTierId ??
            base.generalPlan1.selectedCardTierId,
          hiPlusCounts:
            parsed.generalPlan1?.hiPlusCounts ||
            parsed.hiPlusCounts ||
            base.generalPlan1.hiPlusCounts,
          hideHiPreed: Boolean(
            parsed.generalPlan1?.hideHiPreed ?? parsed.hideHiPreed
          ),
          hideSubPreed: Boolean(
            parsed.generalPlan1?.hideSubPreed ?? parsed.hideSubPreed
          ),
          subAutoTierCashback:
            parsed.generalPlan1?.subAutoTierCashback ??
            parsed.subAutoTierCashback ??
            true,
          subManualTierCashback:
            parsed.generalPlan1?.subManualTierCashback ??
            parsed.subManualTierCashback ??
            0,
          subExtraCashback:
            parsed.generalPlan1?.subExtraCashback ??
            parsed.subExtraCashback ??
            0,
        });

        const mergedPlan2 = extractGeneralPlanData({
          ...base.generalPlan2,
          ...(parsed.generalPlan2 || {}),
        });

        const activePlanNum: 1 | 2 = parsed.activeGeneralPlan === 2 ? 2 : 1;
        const activePlanFields =
          activePlanNum === 2 ? mergedPlan2 : mergedPlan1;

        const restored: ProposalState = {
          ...base,
          ...parsed,
          ...activePlanFields,
          quoteMode: targetMode,
          activeGeneralPlan: activePlanNum,
          generalPlan1: mergedPlan1,
          generalPlan2: mergedPlan2,
        };

        if (parsed.modeConfigs && typeof parsed.modeConfigs === 'object') {
          if (parsed.modeConfigs.general) {
            const gBase = createInitialState('general');
            const gSnap = extractGeneralPlanData({ ...gBase, ...parsed.modeConfigs.general });
            setGeneralState({
              ...gBase,
              ...gSnap,
              quoteMode: 'general',
              compareModes: parsed.compareModes,
              generalPlan1: gSnap,
            });
          }
          if (parsed.modeConfigs.subscription) {
            const sBase = createInitialState('subscription');
            const sSnap = extractGeneralPlanData({ ...sBase, ...parsed.modeConfigs.subscription });
            setSubscriptionState({
              ...sBase,
              ...sSnap,
              quoteMode: 'subscription',
              compareModes: parsed.compareModes,
              generalPlan1: sSnap,
            });
          }
          if (parsed.modeConfigs.hybrid) {
            const hBase = createInitialState('hybrid');
            const hSnap = extractGeneralPlanData({ ...hBase, ...parsed.modeConfigs.hybrid });
            setHybridState({
              ...hBase,
              ...hSnap,
              quoteMode: 'hybrid',
              compareModes: parsed.compareModes,
              generalPlan1: hSnap,
            });
          }
        }

        if (targetMode === 'general') {
          setGeneralState(restored);
        } else if (targetMode === 'subscription') {
          setSubscriptionState(restored);
        } else {
          setHybridState(restored);
        }
        setActiveMode(targetMode);
        setParseError(null);
        setParseGeneralError(null);
        navigateToStep('input');
        return;
      }

      // proposalState 스냅샷이 없는 일반 등록 고객인 경우 첫 품목에 자동 세팅
      const summaryStr = (fallbackItemSummary ?? customer.items ?? '').trim();
      const paidNum = Number(fallbackPaidAmount ?? customer.paidAmount ?? 0) || 0;
      const isSub =
        fallbackQuoteMode === 'subscription' || summaryStr.includes('구독');
      const targetMode: QuoteMode = isSub ? 'subscription' : 'general';

      if (targetMode === 'subscription') {
        const nextSub = createInitialState('subscription');
        const firstSubItem = {
          id: `sub-crm-${Date.now()}`,
          category: summaryStr || '맞춤 구독 가전',
          modelName: '',
          monthlyFee: paidNum,
          period: 60 as SubscriptionPeriod,
          careService: SUB_CARE_OPTIONS[0],
        };
        nextSub.items = [firstSubItem];
        nextSub.generalPlan1 = extractGeneralPlanData(nextSub);
        setSubscriptionState(nextSub);
      } else {
        const nextGen = createInitialState('general');
        const firstItem = {
          id: `gen-crm-${Date.now()}`,
          category: summaryStr || '맞춤 가전 패키지',
          modelName: '',
          quantity: 1,
          unitPrice: paidNum,
        };
        nextGen.generalItems = [firstItem];
        nextGen.generalPlan1 = extractGeneralPlanData(nextGen);
        setGeneralState(nextGen);
      }

      setActiveMode(targetMode);
      setParseError(null);
      setParseGeneralError(null);
      navigateToStep('input');
    },
    [navigateToStep]
  );

  const handleOpenCustomerInQuoteBuilder = useCallback(
    (customer: CustomerItem) => {
      const latestQuote = customer.quotes?.[0];
      applyRestoredProposalState(
        customer,
        latestQuote?.proposalState,
        latestQuote?.itemSummary || customer.items,
        latestQuote?.paidAmount || customer.paidAmount,
        latestQuote?.quoteMode
      );
    },
    [applyRestoredProposalState]
  );

  const handleOpenQuoteRecordInQuoteBuilder = useCallback(
    (customer: CustomerItem, quote: QuoteRecord) => {
      applyRestoredProposalState(
        customer,
        quote.proposalState,
        quote.itemSummary,
        quote.paidAmount,
        quote.quoteMode,
        quote.id
      );
    },
    [applyRestoredProposalState]
  );

  // [1번 사진 대응] 일반구매(general) 및 혼합견적(hybrid) 일반전산 사진 자동입력
  const handleParseGeneralImage = useCallback(
    async (file: File) => {
      setIsParsingGeneral(true);
      setParseGeneralError(null);

      try {
        const result = await parseGeneralImageWithFallback(file);
        const extractedItems = Array.isArray(result.items) ? result.items : [];

        if (extractedItems.length === 0) {
          throw new Error(
            '일반 구매 본품 품목을 찾지 못했습니다. 사진을 다시 확인해 주세요.'
          );
        }

        const instantDiscount = Math.max(0, Number(result.instantDiscount) || 0);
        const lpointTotal = Math.max(0, Number(result.lpointTotal) || 0);
        const tierCashback = Math.max(0, Number(result.tierCashback) || 0);
        let extraCashback = Math.max(0, Number(result.extraCashback) || 0);
        const finalBenefitPrice = Math.max(
          0,
          Number(result.finalBenefitPrice) || 0
        );

        const mappedItems = extractedItems.map((it, idx) => {
          const qty = Math.max(1, Number(it.quantity ?? it.qty) || 1);
          const unitPrice = Math.max(0, Number(it.unitPrice ?? it.price) || 0);
          return {
            id: `gen-ai-${Date.now()}-${idx}`,
            category: it.category || it.name || `품목 ${idx + 1}`,
            name: it.name || it.category || `품목 ${idx + 1}`,
            code: it.code || it.modelName || '',
            modelName: it.modelName || it.code || '',
            qty,
            quantity: qty,
            price: unitPrice * qty,
            unitPrice,
            discount1: idx === 0 ? instantDiscount : 0,
            discount2: idx === 0 ? lpointTotal : 0,
            cashback: idx === 0 ? tierCashback : 0,
          };
        });

        const sumOfItems = mappedItems.reduce(
          (acc, it) => acc + it.unitPrice * it.quantity,
          0
        );

        if (finalBenefitPrice > 0 && sumOfItems > finalBenefitPrice) {
          const currentCalculatedNet =
            sumOfItems -
            instantDiscount -
            lpointTotal -
            tierCashback -
            extraCashback;
          if (currentCalculatedNet > finalBenefitPrice) {
            extraCashback += currentCalculatedNet - finalBenefitPrice;
          }
        }

        const detectedCardType = mapGeneralCardName(
          result.cardName,
          tierCashback > 0
        );

        setCurrentState((prev) => {
          const updatedPlanFields = {
            generalItems: mappedItems,
            generalCardType: detectedCardType,
            instantDiscount,
            earnedPoints: lpointTotal,
            pointUsed: 0,
            autoTierCashback: false,
            manualTierCashback: tierCashback,
            extraCashback,
          };

          const nextState: ProposalState = {
            ...prev,
            ...updatedPlanFields,
          };

          const snapshot = extractGeneralPlanData(nextState);
          if (nextState.activeGeneralPlan === 2) {
            nextState.generalPlan2 = snapshot;
          } else {
            nextState.generalPlan1 = snapshot;
          }

          return nextState;
        });
      } catch (err: any) {
        setParseGeneralError(
          err?.message || '일반전산 이미지 분석 중 오류가 발생했습니다.'
        );
      } finally {
        setIsParsingGeneral(false);
      }
    },
    [setCurrentState]
  );

  // [2번 사진 대응] 구독구매(subscription) 및 혼합견적(hybrid) 맞춤 구독 견적 계산기 사진 자동입력
  const handleParseImage = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);

      try {
        const data = await parseSubscriptionImageWithFallback(file);
        const extractedItems = Array.isArray(data.items) ? data.items : [];
        const firstItem = extractedItems[0] || ({} as any);

        const detectedPeriod: SubscriptionPeriod =
          Number(firstItem.period) === 36
            ? 36
            : Number((data as any).period) === 36
            ? 36
            : 60;

        const rawCardName = data.cardName || firstItem.cardName || '';
        const mappedCard = mapSubscriptionAffiliateCard(rawCardName);

        const resolvedWarrantyType = sanitizeFiveYearWarrantyText(
          data.warrantyType ||
            firstItem.warrantyType ||
            'AS연장보험 + 가전수리올케어'
        );

        setCurrentState((prev) => {
          const existingValidItems = prev.items.filter(
            (it) =>
              (it.category || '').trim() !== '' ||
              (it.modelName || '').trim() !== '' ||
              (Number(it.monthlyFee) || 0) > 0
          );

          const mappedItems =
            extractedItems.length > 0
              ? extractedItems.map((it: any, idx: number) => {
                  const itemPeriod: SubscriptionPeriod =
                    Number(it.period) === 36
                      ? 36
                      : Number(it.period) === 60
                      ? 60
                      : detectedPeriod;
                  const cleanCareService = sanitizeFiveYearWarrantyText(
                    it.careService || SUB_CARE_OPTIONS[0]
                  );
                  const cleanCareType = sanitizeFiveYearWarrantyText(
                    it.careType || it.careService || SUB_CARE_OPTIONS[0]
                  );
                  const cleanWarrantyType = sanitizeFiveYearWarrantyText(
                    it.warrantyType || resolvedWarrantyType || '5년 무상 A/S 기본 포함'
                  );
                  return {
                    id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                    category:
                      it.category ||
                      `구독 가전 ${existingValidItems.length + idx + 1}`,
                    modelName:
                      it.modelName || it.modelCode || data.urlModelCode || '',
                    modelCode:
                      it.modelCode || it.modelName || data.urlModelCode || '',
                    monthlyFee:
                      Number(it.monthlyFee) > 0 ? Number(it.monthlyFee) : 0,
                    period: itemPeriod,
                    contractAmount:
                      Number(it.contractAmount) > 0
                        ? Number(it.contractAmount)
                        : Number(data.contractAmount) || 0,
                    careService: cleanCareService,
                    careType: cleanCareType,
                    warrantyType: cleanWarrantyType,
                    cardName: it.cardName || rawCardName,
                  };
                })
              : [];

          const nextItems =
            mappedItems.length === 0
              ? prev.items
              : existingValidItems.length === 0
              ? mappedItems
              : [...existingValidItems, ...mappedItems];

          if (mappedItems.length > 0) {
            const firstAdded = mappedItems[0];
            const addedLabel = firstAdded.modelName
              ? `${firstAdded.category} (${firstAdded.modelName})`
              : firstAdded.category;
            if (subScanNoticeTimerRef.current) {
              clearTimeout(subScanNoticeTimerRef.current);
            }
            setSubScanNotice(
              `✓ [${addedLabel}] 품목이 구독 목록에 추가되었습니다! (현재 총 ${nextItems.length}품목)`
            );
            subScanNoticeTimerRef.current = setTimeout(() => {
              setSubScanNotice(null);
            }, 3000);
          }

          const repPeriod: SubscriptionPeriod = nextItems.every(
            (it) => (it.period || 60) === 36
          )
            ? 36
            : 60;

          const scannedExtraCashback = extractedItems.reduce(
            (acc: number, it: any) =>
              acc + Math.max(0, Number(it?.extraCashback) || 0),
            0
          );

          return {
            ...prev,
            items: nextItems,
            subExtraCashback:
              scannedExtraCashback > 0
                ? existingValidItems.length === 0
                  ? scannedExtraCashback
                  : Math.max(0, Number(prev.subExtraCashback) || 0) +
                    scannedExtraCashback
                : prev.subExtraCashback,
            subscriptionPeriod: repPeriod,
            careService: sanitizeFiveYearWarrantyText(
              firstItem.careService || prev.careService
            ),
            warrantyType: resolvedWarrantyType,
            warrantyYears: 5,
            allCare: data.allCare ?? true,
            subAutoTierCashback: mappedCard ? true : (prev.subAutoTierCashback ?? true),
            selectedCardId:
              mappedCard.cardId !== 'none'
                ? mappedCard.cardId
                : prev.selectedCardId,
            selectedCardTierId:
              mappedCard.cardId !== 'none'
                ? mappedCard.tierId
                : prev.selectedCardTierId,
          };
        });
      } catch (err: any) {
        setParseError(err?.message || '이미지 분석 중 오류가 발생했습니다.');
      } finally {
        setIsParsing(false);
      }
    },
    [setCurrentState]
  );

  // 홈 화면 상단 TODAY BRIEFING 배너용 통계 계산 + 배송일 경과 확인 팝업 연동
  const activeCrmCustomers = useMemo(
    () => crmCustomers.filter((c) => !c.deletedAt),
    [crmCustomers]
  );
  const pastDueCustomersHome = useMemo(
    () => getPastDueDeliveryCustomers(activeCrmCustomers),
    [activeCrmCustomers]
  );

  useEffect(() => {
    if (
      step === 'home' &&
      pastDueCustomersHome.length > 0 &&
      sessionStorage.getItem(PAST_DELIVERY_POPUP_DISMISSED_KEY) !== '1'
    ) {
      setIsHomePastDeliveryOpen(true);
    }
  }, [step, pastDueCustomersHome.length]);

  const handleConfirmDeliveredFromHome = useCallback(
    async (customerId: string) => {
      const updated = crmCustomers.map((c) =>
        c.id === customerId
          ? { ...c, status: '배송완료' as const, logisticsConfirmed: true }
          : c
      );
      const deduped = setCachedCustomers(updated);
      setCrmCustomers(deduped);
      await syncCustomerToGas('update', {
        id: customerId,
        status: '배송완료',
        logisticsConfirmed: true,
      });
    },
    [crmCustomers]
  );

  const handleConfirmAllDeliveredFromHome = useCallback(
    async (customerIds: string[]) => {
      const idSet = new Set(customerIds);
      const updated = crmCustomers.map((c) =>
        idSet.has(c.id)
          ? { ...c, status: '배송완료' as const, logisticsConfirmed: true }
          : c
      );
      const deduped = setCachedCustomers(updated);
      setCrmCustomers(deduped);
      setIsHomePastDeliveryOpen(false);
      for (const cid of customerIds) {
        await syncCustomerToGas('update', {
          id: cid,
          status: '배송완료',
          logisticsConfirmed: true,
        });
      }
    },
    [crmCustomers]
  );
  const unconfirmedLogisticsCountHome = useMemo(
    () => activeCrmCustomers.filter((c) => isPendingLogisticsCustomer(c)).length,
    [activeCrmCustomers]
  );
  const unpaidGiftCountHome = useMemo(
    () =>
      activeCrmCustomers.filter(
        (c) =>
          (c.status === '계약완료' || c.status === '배송완료') &&
          Boolean(c.giftItems && c.giftItems.trim()) &&
          !c.giftSent
      ).length,
    [activeCrmCustomers]
  );

  if (sharedQuotePayload) {
    return (
      <Suspense
        fallback={
          <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F2ED] text-[#18181B] text-sm font-black">
            맞춤 비교 견적서를 불러오는 중입니다...
          </div>
        }
      >
        <CustomerShareQuoteView payload={sharedQuotePayload} />
      </Suspense>
    );
  }

  return (
    <div
      className={`app-shell-bg min-h-[100dvh] w-full flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#0B0E14] text-slate-100' : 'bg-[#F4F2ED] text-[#18181B]'
      }`}
    >
        <AppHeaderAndHome
          activeCrmCustomers={activeCrmCustomers}
          activeMode={activeMode}
          backButtonLabel={backButtonLabel}
          careUpdateMonthBadge={careUpdateMonthBadge}
          currentScreenBadgeLabel={currentScreenBadgeLabel}
          handleEnterMode={handleEnterMode}
          handleHomeButtonClick={handleHomeButtonClick}
          handleInstallAppClick={handleInstallAppClick}
          handleNavigateBack={handleNavigateBack}
          isDark={isDark}
          isMenuOpen={isMenuOpen}
          isOnline={isOnline}
          isOwnerDbUnlocked={isOwnerDbUnlocked}
          isStandalone={isStandalone}
          menuContainerRef={menuContainerRef}
          navigateToStep={navigateToStep}
          ownerDbQuickSummary={ownerDbQuickSummary}
          pendingCount={pendingCount}
          pushAppHistoryGuard={pushAppHistoryGuard}
          setInitialCrmTab={setInitialCrmTab}
          setIsAiCommandModalOpen={setIsAiCommandModalOpen}
          setIsAsCenterOpen={setIsAsCenterOpen}
          setIsCardIssueOpen={setIsCardIssueOpen}
          setIsInstallmentModalOpen={setIsInstallmentModalOpen}
          setIsMenuOpen={setIsMenuOpen}
          setIsOmnibarOpen={setIsOmnibarOpen}
          setIsPartnerLinksOpen={setIsPartnerLinksOpen}
          setIsScheduleModalOpen={setIsScheduleModalOpen}
          step={step}
          toggleUiTheme={toggleUiTheme}
          unconfirmedLogisticsCountHome={unconfirmedLogisticsCountHome}
          unpaidGiftCountHome={unpaidGiftCountHome}
          urgentCount={urgentCount}
        />

      {/* ==================== STEP 1: 조건 입력 & 폴드/PC 실시간 좌우 스플릿 상담 스테이지 ==================== */}
      {step === 'input' && (
        <div className="flex-1 w-full flex flex-col">
          <div
            className={`hidden md:flex items-center justify-between px-4 py-2 border-b no-print ${
              isDark
                ? 'bg-[#151A25] border-white/10 text-slate-200'
                : 'bg-[#FAF5EC] border-[#E4DFD5] text-[#18181B]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-black">
              <Columns2 className="w-4 h-4 text-amber-500" />
              <span>
                폴드·태블릿 실시간 상담 스테이지:{' '}
                {isSplitConsultation
                  ? '좌측에서 조건을 바꾸면 우측 제안서 체감가가 실시간으로 롤링됩니다'
                  : '넓은 단일 입력 화면 모드'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSplitConsultation((v) => !v)}
                className={`px-3 py-1 rounded-xl text-xs font-black border cursor-pointer schedule-tactile ${
                  isSplitConsultation
                    ? isDark
                      ? 'bg-sky-400 text-slate-950 border-sky-300'
                      : 'bg-[#18181B] text-white border-[#18181B]'
                    : isDark
                    ? 'bg-[#1B2230] text-slate-200 border-white/10'
                    : 'bg-white text-[#18181B] border-[#D6D0C4]'
                }`}
              >
                {isSplitConsultation
                  ? '✓ 좌우 실시간 스플릿 켜짐'
                  : '📐 좌우 실시간 스플릿 켜기'}
              </button>
              <button
                type="button"
                onClick={() => navigateToStep('proposal')}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
              >
                전체화면 제안서 전환 →
              </button>
            </div>
          </div>

          {isSplitConsultation ? (
            <div className="flex-1 w-full flex flex-col md:grid md:grid-cols-12 md:h-[calc(100dvh-92px)] md:overflow-hidden">
              <div className="md:col-span-5 lg:col-span-5 md:h-full md:overflow-y-auto md:border-r border-black/10">
                <ControlPanel
                  state={currentState}
                  onChange={setCurrentState}
                  onParseImage={handleParseImage}
                  isParsing={isParsing}
                  parseError={parseError}
                  subScanNotice={subScanNotice}
                  onParseGeneralImage={handleParseGeneralImage}
                  isParsingGeneral={isParsingGeneral}
                  parseGeneralError={parseGeneralError}
                  onShowProposal={() => navigateToStep('proposal')}
                  onBackToHome={handleNavigateBack}
                  backLabel={backButtonLabel}
                  activeCustomer={activeCustomer}
                  onClearActiveCustomer={() => setActiveCustomer(null)}
                  onOpenSaveToCrm={() => setIsSaveToCrmOpen(true)}
                  onSwitchMode={handleSwitchQuoteModeInPlace}
                  embeddedSplitMode
                />
              </div>
              <div className="hidden md:block md:col-span-7 lg:col-span-7 md:h-full md:overflow-y-auto">
                <ProposalPreview
                  state={currentState}
                  onChange={setCurrentState}
                  onBackToInput={() => setIsSplitConsultation(false)}
                  activeCustomer={activeCustomer}
                  onOpenSaveToCrm={() => setIsSaveToCrmOpen(true)}
                  onSwitchMode={handleSwitchQuoteModeInPlace}
                  embeddedSplitMode
                  isDark={isDark}
                />
              </div>
            </div>
          ) : (
            <ControlPanel
              state={currentState}
              onChange={setCurrentState}
              onParseImage={handleParseImage}
              isParsing={isParsing}
              parseError={parseError}
              subScanNotice={subScanNotice}
              onParseGeneralImage={handleParseGeneralImage}
              isParsingGeneral={isParsingGeneral}
              parseGeneralError={parseGeneralError}
              onShowProposal={() => navigateToStep('proposal')}
              onBackToHome={handleNavigateBack}
              backLabel={backButtonLabel}
              activeCustomer={activeCustomer}
              onClearActiveCustomer={() => setActiveCustomer(null)}
              onOpenSaveToCrm={() => setIsSaveToCrmOpen(true)}
              onSwitchMode={handleSwitchQuoteModeInPlace}
            />
          )}
        </div>
      )}

      {/* ==================== STEP 2: 제안서 / 프리드 안내서 미리보기 화면 ==================== */}
      {step === 'proposal' && (
        <ProposalPreview
          state={currentState}
          onChange={setCurrentState}
          onBackToInput={handleNavigateBack}
          activeCustomer={activeCustomer}
          onOpenSaveToCrm={() => setIsSaveToCrmOpen(true)}
          onSwitchMode={handleSwitchQuoteModeInPlace}
          isDark={isDark}
        />
      )}

      {/* ==================== 지연 로딩(React.lazy) 서브 뷰 영역 ==================== */}
      <ScreenErrorBoundary
        stepKey={step}
        onResetToHome={() => navigateToStep('home', { reset: true })}
      >
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center py-20 text-xs sm:text-sm font-black opacity-70">
            화면을 준비하고 있습니다...
          </div>
        }
      >
        {step === 'lotte-plan' && (
          <LottePlanCalcView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
        {step === 'pop-printer' && (
          <PopPrinterApp
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
        {step === 'crm' && (
          <CrmApp
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
            onOpenCustomerInQuoteBuilder={handleOpenCustomerInQuoteBuilder}
            onOpenQuoteRecordInQuoteBuilder={handleOpenQuoteRecordInQuoteBuilder}
            onCustomersChange={(list) => setCrmCustomers(list)}
            initialSettlementTab={initialCrmTab}
            initialSelectedCustomerId={initialCrmCustomerId}
          />
        )}
        {step === 'marketing-db' && (isOwnerDbUnlocked || isOwnerMarketingDbUnlocked()) && (
          <MarketingDbManagerView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
            onLockAndHideMenu={() => {
              setIsOwnerDbUnlocked(false);
              navigateToStep('home', { reset: true });
            }}
            onOpenCustomerInCrm={(custId) => {
              setInitialCrmTab(undefined);
              setInitialCrmCustomerId(custId || null);
              setCrmCustomers(getCachedCustomers());
              navigateToStep('crm');
            }}
            onOpenCustomerInQuoteBuilder={(cust) => {
              setCrmCustomers(getCachedCustomers());
              handleOpenCustomerInQuoteBuilder(cust);
            }}
            onOpenQuoteRecordInQuoteBuilder={(cust, quote) => {
              setCrmCustomers(getCachedCustomers());
              handleOpenQuoteRecordInQuoteBuilder(cust, quote);
            }}
            isDark={isDark}
          />
        )}
        {step === 'himobile' && (
          <HiMobileView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
        {step === 'insurance' && (
          <InsuranceGuideView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
        {step === 'allcare-guide' && (
          <AllCareGuideView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
        {step === 'marketing-db' && !isOwnerDbUnlocked && !isOwnerMarketingDbUnlocked() && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
            <p className="text-sm font-black">개인 보안 코드 인증이 필요합니다.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStealthPinInput('');
                  setStealthPinError(false);
                  setIsStealthPinOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
              >
                보안 코드 입력
              </button>
              <button
                type="button"
                onClick={handleNavigateBack}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-black cursor-pointer"
              >
                {backButtonLabel}
              </button>
            </div>
          </div>
        )}
        {step === 'care-table' && (
          <CareTableView
            onBackToHome={handleNavigateBack}
            backLabel={backButtonLabel}
          />
        )}
      </Suspense>
      </ScreenErrorBoundary>

        <AppGlobalModals
          activeCrmCustomers={activeCrmCustomers}
          activeCustomer={activeCustomer}
          aiInitialCommand={aiInitialCommand}
          applyRestoredProposalState={applyRestoredProposalState}
          careDataset={careDataset}
          currentState={currentState}
          handleConfirmAllDeliveredFromHome={handleConfirmAllDeliveredFromHome}
          handleConfirmDeliveredFromHome={handleConfirmDeliveredFromHome}
          handleConfirmStealthPin={handleConfirmStealthPin}
          handleEnterMode={handleEnterMode}
          handleOpenCustomerInQuoteBuilder={handleOpenCustomerInQuoteBuilder}
          installmentDataset={installmentDataset}
          isAiCommandModalOpen={isAiCommandModalOpen}
          isAsCenterOpen={isAsCenterOpen}
          isCardIssueOpen={isCardIssueOpen}
          isDark={isDark}
          isHomePastDeliveryOpen={isHomePastDeliveryOpen}
          isInstallGuideOpen={isInstallGuideOpen}
          isInstallmentModalOpen={isInstallmentModalOpen}
          isOmnibarOpen={isOmnibarOpen}
          isPartnerLinksOpen={isPartnerLinksOpen}
          isSaveToCrmOpen={isSaveToCrmOpen}
          isScheduleModalOpen={isScheduleModalOpen}
          isStealthPinOpen={isStealthPinOpen}
          navigateToStep={navigateToStep}
          pastDueCustomersHome={pastDueCustomersHome}
          setActiveCustomer={setActiveCustomer}
          setActiveMode={setActiveMode}
          setAiInitialCommand={setAiInitialCommand}
          setCrmCustomers={setCrmCustomers}
          setGeneralState={setGeneralState}
          setHybridState={setHybridState}
          setInitialCrmTab={setInitialCrmTab}
          setIsAiCommandModalOpen={setIsAiCommandModalOpen}
          setIsAsCenterOpen={setIsAsCenterOpen}
          setIsCardIssueOpen={setIsCardIssueOpen}
          setIsHomePastDeliveryOpen={setIsHomePastDeliveryOpen}
          setIsInstallGuideOpen={setIsInstallGuideOpen}
          setIsInstallmentModalOpen={setIsInstallmentModalOpen}
          setIsOmnibarOpen={setIsOmnibarOpen}
          setIsPartnerLinksOpen={setIsPartnerLinksOpen}
          setIsSaveToCrmOpen={setIsSaveToCrmOpen}
          setIsScheduleModalOpen={setIsScheduleModalOpen}
          setIsStealthPinOpen={setIsStealthPinOpen}
          setParseError={setParseError}
          setParseGeneralError={setParseGeneralError}
          setStealthPinError={setStealthPinError}
          setStealthPinInput={setStealthPinInput}
          setSubscriptionState={setSubscriptionState}
          stealthPinError={stealthPinError}
          stealthPinInput={stealthPinInput}
          step={step}
          toggleUiTheme={toggleUiTheme}
        />
    </div>
  );
}

export default App;
