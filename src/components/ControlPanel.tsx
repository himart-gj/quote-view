import React, { useEffect, useRef, useState } from 'react';
import { AFFILIATE_CARDS, AffiliateCardId, calculateGeneralHiPreedSummary, calculateGeneralPurchaseSummary, calculateHiPlusSummary, calculateSubscriptionSummary, copyPlan1ToPlan2InState, AFFILIATE_GENERAL_CARD_OPTIONS, GENERAL_CATEGORY_PRESETS, isAffiliateGeneralCardType, MAX_LIFECARE_TOTAL_ACCOUNTS, GENERAL_HIPREED_PLANS, GeneralExtraBenefitItem, GeneralExtraBenefitType, GeneralHiPreedKey, GeneralPurchaseItem, getGeneralPlan1And2Summaries, getSubscriptionPeriodSummary, HiPlusKey, ProposalState, QuoteMode, SUB_CARE_OPTIONS, SubscriptionItem, SubscriptionPeriod, switchGeneralPlanInState } from '../types/proposal';
import { SpringNumberFlow } from './SpringNumberFlow';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../utils/aiImageParser';
import { ArrowLeft, Camera, Check, Copy, CreditCard, Eye, EyeOff, KeyRound, Loader2, Minus, Plus, RotateCcw, Save, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { ControlPanelSubscriptionSection } from './ControlPanelSubscriptionSection';
import { QuoteModeComparisonControlBar } from './MultiModeComparisonSection';

interface ControlPanelProps {
  state: ProposalState;
  onChange: React.Dispatch<React.SetStateAction<ProposalState>>;
  onParseImage: (file: File) => Promise<void>;
  isParsing: boolean;
  parseError: string | null;
  subScanNotice?: string | null;
  onParseGeneralImage?: (file: File) => Promise<void>;
  isParsingGeneral?: boolean;
  parseGeneralError?: string | null;
  onShowProposal: () => void;
  onBackToHome: () => void;
  backLabel?: string;
  activeCustomer?: { id: string; name: string; phone?: string; activeQuoteId?: string } | null;
  onClearActiveCustomer?: () => void;
  onOpenSaveToCrm?: () => void;
  onSwitchMode?: (mode: QuoteMode) => void;
  embeddedSplitMode?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  state,
  onChange,
  onParseImage,
  isParsing,
  parseError,
  subScanNotice = null,
  onParseGeneralImage,
  isParsingGeneral = false,
  parseGeneralError = null,
  onShowProposal,
  onBackToHome,
  backLabel,
  activeCustomer,
  onClearActiveCustomer,
  onOpenSaveToCrm,
  onSwitchMode,
  embeddedSplitMode = false,
}) => {
  const liveGenSummary = calculateGeneralPurchaseSummary(state);
  const liveSubSummary = calculateSubscriptionSummary(state);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // 혼합견적 모드에서 Ctrl+V 시 어느 영역에 붙여넣을지 포커스 추적
  const [lastFocusedSection, setLastFocusedSection] = useState<
    'general' | 'subscription'
  >(state.quoteMode === 'general' ? 'general' : 'subscription');

  // AI 키 설정 모달 상태
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [apiKeySavedToast, setApiKeySavedToast] = useState(false);

  // AI 키 설정 팝업 열림 시 뒤로가기로 팝업만 먼저 닫기
  useEffect(() => {
    if (isApiKeyModalOpen) {
      try {
        window.history.pushState({ appGuard: true, tag: 'apikey-modal' }, '');
      } catch {
        // ignore
      }
    }
    (window as any).__subViewBackHandler = (): boolean => {
      if (isApiKeyModalOpen) {
        setIsApiKeyModalOpen(false);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__subViewBackHandler;
    };
  }, [isApiKeyModalOpen]);

  const showGeneral =
    state.quoteMode === 'general' || state.quoteMode === 'hybrid';
  const showSubscription =
    state.quoteMode === 'subscription' || state.quoteMode === 'hybrid';

  useEffect(() => {
    if (state.quoteMode === 'general') {
      setLastFocusedSection('general');
    } else if (state.quoteMode === 'subscription') {
      setLastFocusedSection('subscription');
    }
  }, [state.quoteMode]);

  // 클립보드 붙여넣기 (Ctrl+V) 감지 - 일반구매 및 구독구매 모두 지원
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isApiKeyModalOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            if (state.quoteMode === 'general') {
              onParseGeneralImage?.(file);
            } else if (state.quoteMode === 'subscription') {
              onParseImage(file);
            } else {
              if (lastFocusedSection === 'general' && onParseGeneralImage) {
                onParseGeneralImage(file);
              } else {
                onParseImage(file);
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [
    isApiKeyModalOpen,
    lastFocusedSection,
    onParseGeneralImage,
    onParseImage,
    state.quoteMode,
  ]);

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(apiKeyInput);
    setApiKeySavedToast(true);
    setTimeout(() => {
      setApiKeySavedToast(false);
      setIsApiKeyModalOpen(false);
    }, 800);
  };

  // ==================== 일반구매 & 구독구매 1안/2안 요약 핸들러 ====================
  const generalSummary = calculateGeneralPurchaseSummary(state);
  const generalHiPreedSummary = calculateGeneralHiPreedSummary(
    state.generalHiPreedCounts,
    Boolean(state.hideHiPreed)
  );
  const { plan1Summary, plan2Summary, plan1SubSummary, plan2SubSummary } =
    getGeneralPlan1And2Summaries(state);
  const bothPlansHavePrice = plan1Summary.sum > 0 && plan2Summary.sum > 0;
  const planNetDiff = plan2Summary.rawNet - plan1Summary.rawNet;

  const bothSubPlansHavePrice =
    plan1SubSummary.totalBaseMonthly > 0 &&
    plan2SubSummary.totalBaseMonthly > 0;
  const subNetDiff =
    plan2SubSummary.finalMonthlyFee - plan1SubSummary.finalMonthlyFee;
  const subTotalNetDiff =
    plan2SubSummary.finalTotalFee - plan1SubSummary.finalTotalFee;

  const handleSelectGeneralPlan = (targetPlan: 1 | 2) => {
    onChange((prev) => switchGeneralPlanInState(prev, targetPlan));
  };

  const handleCopyPlan1ToPlan2 = () => {
    onChange((prev) => copyPlan1ToPlan2InState(prev));
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleGeneralFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file && onParseGeneralImage) {
      await onParseGeneralImage(file);
      e.target.value = '';
    }
  };

  const handleAddGeneralCategory = (categoryName: string) => {
    onChange((prev) => {
      const emptyIdx = prev.generalItems.findIndex(
        (it) =>
          it.category.trim() === '' && (!it.unitPrice || it.unitPrice === 0)
      );
      if (emptyIdx !== -1) {
        return {
          ...prev,
          generalItems: prev.generalItems.map((it, idx) =>
            idx === emptyIdx ? { ...it, category: categoryName } : it
          ),
        };
      }
      const newItem: GeneralPurchaseItem = {
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: categoryName,
        modelName: '',
        quantity: 1,
        unitPrice: 0,
      };
      return {
        ...prev,
        generalItems: [...prev.generalItems, newItem],
      };
    });
  };

  const handleAddEmptyGeneralItem = () => {
    const newItem: GeneralPurchaseItem = {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: '',
      modelName: '',
      quantity: 1,
      unitPrice: 0,
    };
    onChange((prev) => ({
      ...prev,
      generalItems: [...prev.generalItems, newItem],
    }));
  };

  const handleUpdateGeneralItem = (
    id: string,
    patch: Partial<GeneralPurchaseItem>
  ) => {
    onChange((prev) => ({
      ...prev,
      generalItems: prev.generalItems.map((it) =>
        it.id === id ? { ...it, ...patch } : it
      ),
    }));
  };

  const handleRemoveGeneralItem = (id: string) => {
    onChange((prev) => {
      if (prev.generalItems.length <= 1) return prev;
      return {
        ...prev,
        generalItems: prev.generalItems.filter((it) => it.id !== id),
      };
    });
  };

  const handleResetGeneralItems = () => {
    onChange((prev) => ({
      ...prev,
      generalItems: [
        {
          id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: '',
          modelName: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      generalCardType: '미정',
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
    }));
  };

  // 추가 혜택 추가 / 수정 / 삭제
  const handleAddExtraBenefit = () => {
    const newBenefit: GeneralExtraBenefitItem = {
      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'etc',
      description: '',
      amount: 0,
    };
    onChange((prev) => ({
      ...prev,
      extraBenefits: [...(prev.extraBenefits || []), newBenefit],
    }));
  };

  const handleUpdateExtraBenefit = (
    id: string,
    patch: Partial<GeneralExtraBenefitItem>
  ) => {
    onChange((prev) => ({
      ...prev,
      extraBenefits: (prev.extraBenefits || []).map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
  };

  const handleRemoveExtraBenefit = (id: string) => {
    onChange((prev) => ({
      ...prev,
      extraBenefits: (prev.extraBenefits || []).filter((b) => b.id !== id),
    }));
  };

  const handleAdjustGeneralHiPreed = (
    key: GeneralHiPreedKey,
    delta: number
  ) => {
    onChange((prev) => {
      const counts = prev.generalHiPreedCounts;
      const currentTotal =
        (counts.hf75 || 0) +
        (counts.hf150 || 0) +
        (counts.hf225 || 0) +
        (counts.hf300 || 0);
      const hybridSubTotal =
        prev.quoteMode === 'hybrid' && !prev.hideSubPreed
          ? (prev.hiPlusCounts.hi72 || 0) +
            (prev.hiPlusCounts.hi90 || 0) +
            (prev.hiPlusCounts.hi108 || 0)
          : 0;
      const currentVal = counts[key] || 0;
      const nextVal = currentVal + delta;

      if (nextVal < 0) return prev;
      if (delta > 0 && currentTotal + hybridSubTotal >= MAX_LIFECARE_TOTAL_ACCOUNTS) return prev;

      return {
        ...prev,
        generalHiPreedCounts: {
          ...counts,
          [key]: nextVal,
        },
      };
    });
  };

  const handleResetGeneralHiPreed = () => {
    onChange((prev) => ({
      ...prev,
      generalHiPreedCounts: {
        hf75: 0,
        hf150: 0,
        hf225: 0,
        hf300: 0,
      },
    }));
  };

  const handleToggleHideHiPreed = () => {
    onChange((prev) => {
      const nextHidden = !prev.hideHiPreed;
      return {
        ...prev,
        hideHiPreed: nextHidden,
        generalPlan1: { ...prev.generalPlan1, hideHiPreed: nextHidden },
        generalPlan2: { ...prev.generalPlan2, hideHiPreed: nextHidden },
      };
    });
  };

  // ==================== 구독구매 핸들러 ====================
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onParseImage(file);
      e.target.value = '';
    }
  };

  const handleCardSelect = (cardId: AffiliateCardId) => {
    const cardSpec = AFFILIATE_CARDS.find((c) => c.id === cardId);
    onChange((prev) => ({
      ...prev,
      selectedCardId: cardId,
      selectedCardTierId: cardSpec?.tiers[0]?.id || '',
      subAutoTierCashback: true,
      subManualTierCashback: 0,
    }));
  };

  const handleAddSubItem = () => {
    onChange((prev) => {
      const lastItem = prev.items[prev.items.length - 1];
      const defaultPeriod: SubscriptionPeriod =
        lastItem?.period === 36
          ? 36
          : lastItem?.period === 60
          ? 60
          : prev.subscriptionPeriod === 36
          ? 36
          : 60;
      const newItem: SubscriptionItem = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: '',
        modelName: '',
        monthlyFee: 0,
        period: defaultPeriod,
        careService: SUB_CARE_OPTIONS[0],
        warrantyType: '5년 무상 A/S 기본 포함',
      };
      const nextItems = [...prev.items, newItem];
      const repPeriod: SubscriptionPeriod = nextItems.every(
        (it) => (it.period || 60) === 36
      )
        ? 36
        : 60;
      return {
        ...prev,
        items: nextItems,
        subscriptionPeriod: repPeriod,
      };
    });
  };

  const handleRemoveSubItem = (id: string) => {
    onChange((prev) => {
      if (prev.items.length <= 1) return prev;
      const nextItems = prev.items.filter((it) => it.id !== id);
      const repPeriod: SubscriptionPeriod = nextItems.every(
        (it) => (it.period || 60) === 36
      )
        ? 36
        : 60;
      return {
        ...prev,
        items: nextItems,
        subscriptionPeriod: repPeriod,
      };
    });
  };

  const handleResetSubItems = () => {
    onChange((prev) => ({
      ...prev,
      items: [
        {
          id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category: '',
          modelName: '',
          monthlyFee: 0,
          period: 60,
          careService: SUB_CARE_OPTIONS[0],
          warrantyType: '5년 무상 A/S 기본 포함',
        },
      ],
      subscriptionPeriod: 60,
      careService: SUB_CARE_OPTIONS[0],
      warrantyType: 'AS연장보험 + 가전수리올케어',
      warrantyYears: 5,
      allCare: true,
      subAutoTierCashback: true,
      subManualTierCashback: 0,
      subExtraCashback: 0,
      selectedCardId: 'none',
      selectedCardTierId: '',
      hiPlusCounts: {
        hi72: 0,
        hi90: 0,
        hi108: 0,
      },
    }));
  };

  const handleUpdateSubItem = (id: string, patch: Partial<SubscriptionItem>) => {
    onChange((prev) => {
      const nextItems = prev.items.map((it) =>
        it.id === id ? { ...it, ...patch } : it
      );
      const repPeriod: SubscriptionPeriod = nextItems.every(
        (it) => (it.period || 60) === 36
      )
        ? 36
        : 60;
      return {
        ...prev,
        items: nextItems,
        subscriptionPeriod: repPeriod,
      };
    });
  };

  const handleAdjustHiPlus = (key: HiPlusKey, delta: number) => {
    onChange((prev) => {
      const currentTotal =
        (prev.hiPlusCounts.hi72 || 0) +
        (prev.hiPlusCounts.hi90 || 0) +
        (prev.hiPlusCounts.hi108 || 0);
      const hybridGenTotal =
        prev.quoteMode === 'hybrid' && !prev.hideHiPreed
          ? (prev.generalHiPreedCounts.hf75 || 0) +
            (prev.generalHiPreedCounts.hf150 || 0) +
            (prev.generalHiPreedCounts.hf225 || 0) +
            (prev.generalHiPreedCounts.hf300 || 0)
          : 0;
      const currentVal = prev.hiPlusCounts[key] || 0;
      const nextVal = currentVal + delta;

      if (nextVal < 0) return prev;
      if (delta > 0 && currentTotal + hybridGenTotal >= MAX_LIFECARE_TOTAL_ACCOUNTS) return prev;

      return {
        ...prev,
        hiPlusCounts: {
          ...prev.hiPlusCounts,
          [key]: nextVal,
        },
      };
    });
  };

  const handleResetHiPlus = () => {
    onChange((prev) => ({
      ...prev,
      hiPlusCounts: { hi72: 0, hi90: 0, hi108: 0 },
    }));
  };

  const currentCard = AFFILIATE_CARDS.find(
    (c) => c.id === state.selectedCardId
  );
  const subPeriodInfo = getSubscriptionPeriodSummary(
    state.items,
    state.subscriptionPeriod
  );
  const representativePeriod = subPeriodInfo.representativePeriod;
  const periodLabel = subPeriodInfo.periodLabel;
  const totalBaseMonthly = subPeriodInfo.totalBaseMonthly;
  const totalPrincipal = subPeriodInfo.totalPrincipal;

  const hiSummary = calculateHiPlusSummary(
    state.hiPlusCounts,
    representativePeriod,
    Boolean(state.hideSubPreed)
  );

  const cardDiscount = liveSubSummary.cardDiscount;
  const hiPlusMonthly = liveSubSummary.hiPlusMonthly;
  const rawFinalMonthly = liveSubSummary.finalMonthlyFee;

  const hasCustomApiKey = Boolean(getStoredGeminiApiKey());

  return (
    <div className="min-h-[100dvh] w-full bg-slate-100 flex flex-col items-center justify-center p-3 sm:p-5">
      {/* 상단 메뉴 복귀 버튼 & 현재 고객 뱃지 & AI 키 설정 & CRM 고객 저장 버튼 */}
      <div
        className={`w-full ${
          state.quoteMode === 'hybrid'
            ? 'max-w-6xl xl:max-w-7xl'
            : 'max-w-2xl lg:max-w-3xl'
        } mb-2.5 flex flex-wrap items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-extrabold border border-slate-200 shadow-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel || '홈으로'}
          </button>

          {activeCustomer && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black shadow-2xs">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>현재 [{activeCustomer.name} 고객님] 견적 작업 중</span>
              {onClearActiveCustomer && (
                <button
                  type="button"
                  onClick={onClearActiveCustomer}
                  className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[10px] font-black transition cursor-pointer"
                  title="연결된 고객 해제"
                >
                  ✕ 해제
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-600">
            {state.quoteMode === 'general' && '일반구매 견적서'}
            {state.quoteMode === 'subscription' && '구독구매 견적서'}
            {state.quoteMode === 'hybrid' && '일반+구독 혼합견적서'}
          </span>

          <button
            type="button"
            onClick={() => {
              setApiKeyInput(getStoredGeminiApiKey());
              setIsApiKeyModalOpen(true);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border shadow-xs transition cursor-pointer ${
              hasCustomApiKey
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Gemini AI API Key 설정 (1~4번 전 메뉴 공통 적용)"
          >
            <KeyRound className="w-3.5 h-3.5" />
            🔑 AI 키 설정
          </button>

          {onOpenSaveToCrm && (
            <button
              type="button"
              onClick={onOpenSaveToCrm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              💾 CRM 고객 저장
            </button>
          )}
        </div>
      </div>

      <QuoteModeComparisonControlBar
        state={state}
        onChange={onChange}
        onSwitchMode={onSwitchMode}
        onShowProposal={onShowProposal}
      />

      {/* ==================== 전체 폭 공통 배너: [견적 1안] / [견적 2안] / [📋 1안 내용 ➔ 2안 복사] ==================== */}
      <div
        className={`w-full ${
          state.quoteMode === 'hybrid'
            ? 'max-w-6xl xl:max-w-7xl'
            : 'max-w-2xl lg:max-w-3xl'
        } mb-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2`}
      >
        <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto max-w-full">
          <button
            type="button"
            onClick={() => handleSelectGeneralPlan(1)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              state.activeGeneralPlan === 1
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {state.quoteMode === 'general' && (
              <>
                견적 1안
                {plan1Summary.sum > 0 && (
                  <span className="ml-1 text-[10px] opacity-90">
                    (일반 {(plan1Summary.rawNet / 10000).toFixed(0)}만)
                  </span>
                )}
              </>
            )}
            {state.quoteMode === 'subscription' && (
              <>
                견적 1안
                {plan1SubSummary.totalBaseMonthly > 0 && (
                  <span className="ml-1 text-[10px] opacity-90">
                    (월 {plan1SubSummary.finalMonthlyFee.toLocaleString()}원
                    {plan1SubSummary.totalSubCashback > 0
                      ? ` · 총 ${Math.round(plan1SubSummary.finalTotalFee / 10000)}만`
                      : ''}
                    )
                  </span>
                )}
              </>
            )}
            {state.quoteMode === 'hybrid' && (
              <>
                견적 1안 (일반+구독)
                {(plan1Summary.sum > 0 ||
                  plan1SubSummary.totalBaseMonthly > 0) && (
                  <span className="ml-1 text-[10px] opacity-90">
                    · 합산{' '}
                    {Math.round(
                      (plan1Summary.rawNet + plan1SubSummary.finalTotalFee) / 10000
                    )}
                    만 (월 {plan1SubSummary.finalMonthlyFee.toLocaleString()}원)
                  </span>
                )}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectGeneralPlan(2)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              state.activeGeneralPlan === 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {state.quoteMode === 'general' && (
              <>
                견적 2안
                {plan2Summary.sum > 0 && (
                  <span className="ml-1 text-[10px] opacity-90">
                    (일반 {(plan2Summary.rawNet / 10000).toFixed(0)}만)
                  </span>
                )}
              </>
            )}
            {state.quoteMode === 'subscription' && (
              <>
                견적 2안
                {plan2SubSummary.totalBaseMonthly > 0 && (
                  <span className="ml-1 text-[10px] opacity-90">
                    (월 {plan2SubSummary.finalMonthlyFee.toLocaleString()}원
                    {plan2SubSummary.totalSubCashback > 0
                      ? ` · 총 ${Math.round(plan2SubSummary.finalTotalFee / 10000)}만`
                      : ''}
                    )
                  </span>
                )}
              </>
            )}
            {state.quoteMode === 'hybrid' && (
              <>
                견적 2안 (일반+구독)
                {(plan2Summary.sum > 0 ||
                  plan2SubSummary.totalBaseMonthly > 0) && (
                  <span className="ml-1 text-[10px] opacity-90">
                    · 합산{' '}
                    {Math.round(
                      (plan2Summary.rawNet + plan2SubSummary.finalTotalFee) / 10000
                    )}
                    만 (월 {plan2SubSummary.finalMonthlyFee.toLocaleString()}원)
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyPlan1ToPlan2}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs shadow-2xs transition cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5" />
          {copiedNotice
            ? '✓ 2안으로 복사 완료!'
            : '📋 1안 내용 ➔ 2안 복사'}
        </button>
      </div>

      {/* 입력 컨테이너 */}
      <div
        className={
          state.quoteMode === 'hybrid'
            ? 'w-full max-w-6xl xl:max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'
            : 'w-full max-w-2xl lg:max-w-3xl'
        }
      >
        {/* ==================== 일반구매 입력 카드 ==================== */}
        {showGeneral && (
          <div
            onClick={() => setLastFocusedSection('general')}
            onMouseEnter={() => setLastFocusedSection('general')}
            className="w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 space-y-4"
          >
            {/* 숨김 파일 input */}
            <input
              ref={generalFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleGeneralFileChange}
              className="hidden"
            />

            {/* 1. 구매 품목 및 행사가 */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  1. 일반구매 품목 및 행사가 ({state.activeGeneralPlan}안)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => generalFileInputRef.current?.click()}
                    disabled={isParsingGeneral}
                    title="클릭하거나 화면에서 Ctrl+V로 전산 캡처 붙여넣기"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isParsingGeneral ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 판독 중...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 일반전산 사진 자동입력</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEmptyGeneralItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 품목 추가
                  </button>
                  <button
                    type="button"
                    onClick={handleResetGeneralItems}
                    title="품목 목록 초기화"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-extrabold text-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> 초기화
                  </button>
                </div>
              </div>
              {parseGeneralError && (
                <p className="text-xs font-bold text-red-600 text-center">
                  {parseGeneralError}
                </p>
              )}

              {/* 빠른 품목명 버튼 */}
              <div className="flex flex-wrap gap-1">
                {GENERAL_CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleAddGeneralCategory(cat)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-extrabold text-[11px] border border-slate-200 transition cursor-pointer"
                  >
                    +{cat}
                  </button>
                ))}
              </div>

              <div className="max-h-none sm:max-h-[168px] sm:overflow-y-auto space-y-2 sm:space-y-1.5 sm:pr-1">
                {state.generalItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-1.5 items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200"
                  >
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) =>
                        handleUpdateGeneralItem(item.id, {
                          category: e.target.value,
                          name: e.target.value,
                        })
                      }
                      placeholder={`품목명 ${idx + 1}`}
                      className="col-span-5 sm:col-span-3 order-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={item.modelName}
                      onChange={(e) =>
                        handleUpdateGeneralItem(item.id, {
                          modelName: e.target.value,
                          code: e.target.value,
                        })
                      }
                      placeholder="상품코드/모델명"
                      className="col-span-6 sm:col-span-3 order-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
                    />
                    <div className="col-span-4 sm:col-span-2 order-4 sm:order-3 relative">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity || 1}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value) || 1);
                          handleUpdateGeneralItem(item.id, {
                            quantity: q,
                            qty: q,
                          });
                        }}
                        className="w-full pl-2 pr-5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-center text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        개
                      </span>
                    </div>
                    <div className="col-span-8 sm:col-span-3 order-5 sm:order-4 relative">
                      <input
                        type="number"
                        step={10000}
                        value={item.unitPrice || ''}
                        onChange={(e) => {
                          const p = Math.max(0, Number(e.target.value));
                          handleUpdateGeneralItem(item.id, {
                            unitPrice: p,
                            price: p,
                          });
                        }}
                        placeholder="행사가(원)"
                        className="w-full pl-2 pr-5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-900 text-right focus:border-blue-600 focus:outline-none"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        원
                      </span>
                    </div>
                    <div className="col-span-1 sm:col-span-1 order-3 sm:order-5 flex justify-center">
                      {state.generalItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGeneralItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 제휴카드 선택 및 할인/포인트/캐시백 + 추가 혜택 */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>2. 제휴카드 선택 및 할인 · 포인트 · 캐시백</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">
                    제휴카드 전용
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleAddExtraBenefit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold text-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> 추가 혜택 추가
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {AFFILIATE_GENERAL_CARD_OPTIONS.map((cardOpt) => {
                  const active = state.generalCardType === cardOpt;
                  return (
                    <button
                      key={cardOpt}
                      type="button"
                      onClick={() =>
                        onChange((prev) => ({
                          ...prev,
                          generalCardType: cardOpt,
                          autoTierCashback: true,
                        }))
                      }
                      className={`py-1.5 sm:py-2 px-2 rounded-xl font-extrabold text-[11px] sm:text-xs whitespace-nowrap border transition cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cardOpt}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      generalCardType: '미정',
                      autoTierCashback: true,
                    }))
                  }
                  className={`col-span-2 sm:col-span-1 py-1.5 sm:py-2 px-2 rounded-xl font-extrabold text-[11px] sm:text-xs whitespace-nowrap border transition cursor-pointer ${
                    !isAffiliateGeneralCardType(state.generalCardType)
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  제휴카드 미적용
                </button>
              </div>

              {/* 할인/혜택 입력칸 5개 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-extrabold text-slate-600 block mb-1">
                    (-) 즉시할인 합계 / 기타할인1 (원)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={state.instantDiscount || ''}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      onChange((prev) => ({
                        ...prev,
                        instantDiscount: val,
                        generalItems: prev.generalItems.map((it, idx) =>
                          idx === 0 ? { ...it, discount1: val } : it
                        ),
                      }));
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-right text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-extrabold text-slate-600 block mb-1">
                    L.Point 합계 / 기타할인2 (원)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={state.earnedPoints || ''}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      onChange((prev) => ({
                        ...prev,
                        earnedPoints: val,
                        generalItems: prev.generalItems.map((it, idx) =>
                          idx === 0 ? { ...it, discount2: val } : it
                        ),
                      }));
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-right text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold text-slate-600">
                      (-) 포인트 즉시사용
                    </label>
                    <span className="text-[9px] font-bold text-blue-600">
                      잔여 {generalSummary.remainingPoints.toLocaleString()}P
                    </span>
                  </div>
                  <input
                    type="number"
                    step={10000}
                    value={state.pointUsed || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        pointUsed: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-right text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-2 bg-blue-50/70 p-2 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold text-blue-950">
                      (-) 금액대별 캐시백 (원){' '}
                      <span className="text-[9px] font-bold text-blue-600">
                        *실결제가({generalSummary.payPrice.toLocaleString()}원) 기준{' '}
                        {!isAffiliateGeneralCardType(state.generalCardType)
                          ? '(제휴카드 선택 시 자동입력)'
                          : '(제휴카드 자동 적용됨)'}
                      </span>
                    </span>
                  </div>
                  <input
                    type="number"
                    step={10000}
                    value={generalSummary.tierCashback || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        onChange((prev) => ({
                          ...prev,
                          autoTierCashback: false,
                          manualTierCashback: 0,
                        }));
                        return;
                      }
                      const val = Math.max(0, Number(raw));
                      onChange((prev) => ({
                        ...prev,
                        autoTierCashback: false,
                        manualTierCashback: val,
                        generalItems: prev.generalItems.map((it, idx) =>
                          idx === 0 ? { ...it, cashback: val } : it
                        ),
                      }));
                    }}
                    placeholder={
                      !isAffiliateGeneralCardType(state.generalCardType)
                        ? '위에서 제휴카드를 선택하면 자동 계산됩니다'
                        : '0'
                    }
                    className="w-full px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-xs font-black text-right text-blue-700 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <label className="text-[10px] font-extrabold text-slate-600 block mb-1">
                    (-) 배송익월 추가 캐시백
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={state.extraCashback || ''}
                    onChange={(e) =>
                      onChange((prev) => ({
                        ...prev,
                        extraCashback: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-right text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* 동적 추가 혜택 리스트 */}
              {(state.extraBenefits || []).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {(state.extraBenefits || []).map((benefit) => (
                    <div
                      key={benefit.id}
                      className="grid grid-cols-12 gap-1.5 items-center bg-blue-50/50 p-1.5 rounded-xl border border-blue-200"
                    >
                      <select
                        value={benefit.type}
                        onChange={(e) =>
                          handleUpdateExtraBenefit(benefit.id, {
                            type: e.target.value as GeneralExtraBenefitType,
                          })
                        }
                        className="col-span-4 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-slate-800 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="discount">즉시할인</option>
                        <option value="etc">기타혜택(캐시백 등)</option>
                      </select>
                      <input
                        type="text"
                        value={benefit.description}
                        onChange={(e) =>
                          handleUpdateExtraBenefit(benefit.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="혜택 내용(예: 다품목할인, 상품권)"
                        className="col-span-4 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                      <div className="col-span-3 relative">
                        <input
                          type="number"
                          step={10000}
                          value={benefit.amount || ''}
                          onChange={(e) =>
                            handleUpdateExtraBenefit(benefit.id, {
                              amount: Math.max(0, Number(e.target.value)),
                            })
                          }
                          placeholder="금액(원)"
                          className="w-full pl-2 pr-5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-black text-right text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          원
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraBenefit(benefit.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. 하이프리드 75 / 150 / 225 / 300 선택 + 숨기기/보이기 토글 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  3. 하이프리드 (웅진프리드라이프)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!state.hideHiPreed && (
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {state.quoteMode === 'hybrid'
                        ? `합산 ${generalHiPreedSummary.totalAccounts + hiSummary.totalAccounts}개 / 최대 8개`
                        : `총 ${generalHiPreedSummary.totalAccounts}개 / 최대 8개`}{' '}
                      (-{generalHiPreedSummary.totalSupport.toLocaleString()}원)
                    </span>
                  )}
                  {!state.hideHiPreed && generalHiPreedSummary.totalAccounts > 0 && (
                    <button
                      type="button"
                      onClick={handleResetGeneralHiPreed}
                      className="text-[11px] font-extrabold text-slate-600 hover:text-red-600 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-red-50 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> 미적용(초기화)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleHideHiPreed}
                    title="숨김 설정 시 내 화면과 고객이 받는 공유 견적서 화면에서 일반 하이프리드 영역이 완전히 숨겨집니다"
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black border transition cursor-pointer ${
                      state.hideHiPreed
                        ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {state.hideHiPreed ? (
                      <>
                        <EyeOff className="w-3 h-3 text-amber-300" />
                        <span>일반프리드 숨김중 (보이기)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 text-blue-600" />
                        <span>일반프리드 숨기기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {state.hideHiPreed ? (
                <div className="rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-600">
                    🙈 일반 하이프리드 영역이 숨겨진 상태입니다 (제안서 및 고객 공유 화면에서도 표시되지 않습니다)
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleHideHiPreed}
                    className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-black shrink-0 cursor-pointer"
                  >
                    다시 보이기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {GENERAL_HIPREED_PLANS.map((plan) => {
                    const count = state.generalHiPreedCounts[plan.id] || 0;
                    const active = count > 0;
                    const canAdd =
                      generalHiPreedSummary.totalAccounts +
                        (state.quoteMode === 'hybrid' ? hiSummary.totalAccounts : 0) <
                      MAX_LIFECARE_TOTAL_ACCOUNTS;

                    return (
                      <div
                        key={plan.id}
                        className={`p-2 sm:p-2.5 rounded-2xl border-2 flex flex-col justify-between transition ${
                          active
                            ? 'bg-blue-50/70 border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="text-center mb-1.5 sm:mb-2">
                          <div
                            className={`text-[11px] sm:text-xs font-black whitespace-nowrap ${
                              active ? 'text-blue-700' : 'text-slate-800'
                            }`}
                          >
                            {plan.buttonLabel}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-extrabold text-rose-600 mt-0.5 whitespace-nowrap">
                            -{(plan.supportAmount / 10000).toLocaleString()}만원 지원
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() =>
                              handleAdjustGeneralHiPreed(plan.id, -1)
                            }
                            disabled={count === 0}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className={`text-xs font-black ${
                              active ? 'text-blue-700' : 'text-slate-700'
                            }`}
                          >
                            {count}개
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustGeneralHiPreed(plan.id, 1)}
                            disabled={!canAdd}
                            className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 일반구매 하단 실시간 요약 & [1안 vs 2안] 비교 박스 (단독 일반 & 혼합견적 모두 표시) */}
            <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-blue-800">
                  실시간 일반구매 ({state.activeGeneralPlan}안) 요약
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  총 합계 {generalSummary.sum.toLocaleString()}원
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl px-3 py-2 border border-blue-200 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-600">
                    💳 실 결제부담금
                  </span>
                  <span className="text-sm font-black text-blue-700">
                    {generalSummary.payPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="bg-rose-50/80 rounded-xl px-3 py-2 border border-rose-300 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-rose-700">
                    🎯 최종 혜택가
                  </span>
                  <span className="text-base font-black text-rose-600">
                    {generalSummary.rawNet.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 1안과 2안 모두 금액이 입력된 경우 비교 배지 표시 */}
              {bothPlansHavePrice && (
                <div className="bg-slate-900 text-white rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <div className="font-bold">
                    <span className="text-blue-300 font-black">
                      [1안 최종 혜택가: {plan1Summary.rawNet.toLocaleString()}원]
                    </span>{' '}
                    vs{' '}
                    <span className="text-amber-300 font-black">
                      [2안 최종 혜택가: {plan2Summary.rawNet.toLocaleString()}원]
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 font-black text-emerald-300">
                    차액:{' '}
                    {planNetDiff > 0
                      ? `+${planNetDiff.toLocaleString()}`
                      : planNetDiff.toLocaleString()}
                    원
                  </span>
                </div>
              )}
            </div>

            {/* 단독 일반구매 모드일 때 확인 버튼 */}
            {state.quoteMode === 'general' && (
              <button
                type="button"
                onClick={onShowProposal}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Check className="w-5 h-5" />
                확인 (고객 맞춤 제안서 보기) ➔
              </button>
            )}
          </div>
        )}

        <ControlPanelSubscriptionSection
          bothSubPlansHavePrice={bothSubPlansHavePrice}
          cardDiscount={cardDiscount}
          currentCard={currentCard}
          fileInputRef={fileInputRef}
          generalHiPreedSummary={generalHiPreedSummary}
          handleAddSubItem={handleAddSubItem}
          handleAdjustHiPlus={handleAdjustHiPlus}
          handleCardSelect={handleCardSelect}
          handleFileChange={handleFileChange}
          handleRemoveSubItem={handleRemoveSubItem}
          handleResetHiPlus={handleResetHiPlus}
          handleResetSubItems={handleResetSubItems}
          handleUpdateSubItem={handleUpdateSubItem}
          hiPlusMonthly={hiPlusMonthly}
          hiSummary={hiSummary}
          isParsing={isParsing}
          liveSubSummary={liveSubSummary}
          onChange={onChange}
          onShowProposal={onShowProposal}
          parseError={parseError}
          periodLabel={periodLabel}
          plan1SubSummary={plan1SubSummary}
          plan2SubSummary={plan2SubSummary}
          rawFinalMonthly={rawFinalMonthly}
          representativePeriod={representativePeriod}
          setLastFocusedSection={setLastFocusedSection}
          showSubscription={showSubscription}
          state={state}
          subNetDiff={subNetDiff}
          subScanNotice={subScanNotice}
          subTotalNetDiff={subTotalNetDiff}
          totalBaseMonthly={totalBaseMonthly}
          totalPrincipal={totalPrincipal}
        />
      </div>

      {/* 혼합견적 모드일 때 하단 통합 확인 버튼 */}
      {state.quoteMode === 'hybrid' && (
        <div className="w-full max-w-6xl xl:max-w-7xl mt-4">
          <button
            type="button"
            onClick={onShowProposal}
            className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Check className="w-5 h-5" />
            확인 (일반+구독 혼합 제안서 보기) ➔
          </button>
        </div>
      )}

      {/* ==================== 🔑 AI 키 설정 모달 ==================== */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    🔑 Gemini AI 키 설정
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500">
                    1~4번 모든 견적기 및 POP 출력기에서 공통으로 사용됩니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">
                Gemini API Key 입력
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... (미입력 시 기본 환경변수 키 자동 사용)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                • 입력한 키는 내 기기 브라우저(localStorage:{' '}
                <code className="text-blue-600 font-bold">gemini_api_key</code>
                )에 안전하게 저장됩니다.
                <br />• 비워두면 시스템 기본 GEMINI_API_KEY가 자동으로 연결됩니다.
              </p>
            </div>

            {apiKeySavedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black text-center">
                ✓ AI 키가 저장되었습니다! (전 메뉴 공통 적용 완료)
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setApiKeyInput('');
                  setStoredGeminiApiKey('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold transition cursor-pointer"
              >
                초기화
              </button>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 모바일 엄지 영역 실시간 체감가 요약 & 제안서 바로보기 고정 독 (스플릿 모드가 아닐 때 노출) */}
      {!embeddedSplitMode && (
        <div className="safe-bottom-dock fixed bottom-0 inset-x-0 z-30 bg-[#18181B]/95 backdrop-blur-md text-white border-t border-white/15 px-3 py-2.5 shadow-2xl md:hidden no-print">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-amber-300 truncate">
                {state.quoteMode === 'subscription'
                  ? liveSubSummary.totalSubCashback > 0
                    ? `구독 (${liveSubSummary.periodLabel}) · 최종 체감 ${liveSubSummary.finalTotalFee.toLocaleString()}원`
                    : `실시간 구독 (${liveSubSummary.periodLabel}) 월 체감가`
                  : state.quoteMode === 'hybrid'
                  ? `혼합 통합 최종 체감가 ${(liveGenSummary.rawNet + liveSubSummary.finalTotalFee).toLocaleString()}원`
                  : `실시간 최종 혜택 체감가 (총 -${liveGenSummary.totalDiscountAndBenefit.toLocaleString()}원)`}
              </div>
              <div className="text-sm sm:text-base font-black text-white font-mono truncate">
                {state.quoteMode === 'subscription' ? (
                  <>
                    월 <SpringNumberFlow value={liveSubSummary.finalMonthlyFee} suffix="원" />
                  </>
                ) : state.quoteMode === 'hybrid' ? (
                  <>
                    <SpringNumberFlow value={liveGenSummary.rawNet} suffix="원" /> + 월{' '}
                    <SpringNumberFlow value={liveSubSummary.finalMonthlyFee} suffix="원" />
                  </>
                ) : (
                  <SpringNumberFlow value={liveGenSummary.rawNet} suffix="원" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenSaveToCrm && (
                <button
                  type="button"
                  onClick={onOpenSaveToCrm}
                  className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer schedule-tactile"
                  title="CRM 고객 저장"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onShowProposal}
                className="px-4 py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black shadow-md cursor-pointer schedule-tactile whitespace-nowrap"
              >
                제안서 보기 ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
