import React, { useEffect, useRef, useState } from 'react';
import { calculateGeneralHiPreedSummary, calculateGeneralPurchaseSummary, calculateHiPlusSummary, calculateSubscriptionSummary, getActiveCompareModes, getGeneralPlan1And2Summaries, ProposalState, QuoteMode, switchGeneralPlanInState, switchQuoteModeInState } from '../types/proposal';
import { ArrowLeft, BookOpen, ChevronDown, CreditCard, Download, Eye, EyeOff, FileText, Lock, Printer, Save, Share2, ShieldCheck, ShoppingBag, Sparkles, User } from 'lucide-react';
import { toPng } from 'html-to-image';
import { SpringNumberFlow } from './SpringNumberFlow';
import { ShareQuoteLinkModal } from './CustomerShareQuoteView';
import { maskEmbeddedModelInCategory, maskModelCodeAfter3 } from '../utils/modelMasker';
import { ProposalPreviewSubAndHybrid } from './ProposalPreviewSubAndHybrid';
import { MultiModeTabSwitcherBanner, PreviewModeComparisonBar } from './MultiModeComparisonSection';
import { ProposalPreviewFreedGuide } from './ProposalPreviewFreedGuide';

interface ProposalPreviewProps {
  state: ProposalState;
  onChange: React.Dispatch<React.SetStateAction<ProposalState>>;
  onBackToInput: () => void;
  activeCustomer?: { id: string; name: string; phone?: string; activeQuoteId?: string } | null;
  onOpenSaveToCrm?: () => void;
  onSwitchMode?: (mode: QuoteMode) => void;
  embeddedSplitMode?: boolean;
  isDark?: boolean;
}

const SHEET_WIDTH = 920;

const sanitizeFiveYearText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/3년\s*(무상|A\/?S)/gi, '5년 $1');
};

export const ProposalPreview: React.FC<ProposalPreviewProps> = ({
  state,
  onChange,
  onBackToInput,
  activeCustomer,
  onOpenSaveToCrm,
  onSwitchMode,
  embeddedSplitMode = false,
  isDark = false,
}) => {
  const [isShareLinkOpen, setIsShareLinkOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareInitialMasked, setShareInitialMasked] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const proposalSheetRef = useRef<HTMLDivElement>(null);
  const guideSheetRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [sheetH, setSheetH] = useState(860);
  const [isMobilePhone, setIsMobilePhone] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [mobileReadableMode, setMobileReadableMode] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const useMobileFluid = isMobilePhone && mobileReadableMode && !isExporting && !embeddedSplitMode;
  const [exportingMode, setExportingMode] = useState<'full' | 'masked' | null>(null);
  const [isModelMasked, setIsModelMasked] = useState(false);
  const [tempMaskOverride, setTempMaskOverride] = useState<boolean | null>(null);
  const [isSavePrintOpen, setIsSavePrintOpen] = useState(false);
  const effectiveMaskModels =
    tempMaskOverride !== null ? tempMaskOverride : isModelMasked;

  const fmtModel = (raw?: string | null) =>
    effectiveMaskModels ? maskModelCodeAfter3(raw) : (raw || '').trim();
  const fmtCat = (raw?: string | null) =>
    effectiveMaskModels ? maskEmbeddedModelInCategory(raw) : (raw || '').trim();
  const [activeTab, setActiveTab] = useState<
    'proposal' | 'guide-general' | 'guide-sub'
  >('proposal');

  const activePlan = state.activeGeneralPlan || 1;
  const {
    plan1Summary,
    plan2Summary,
    plan1SubSummary,
    plan2SubSummary,
    hasPlan1Data,
    hasPlan2Data,
  } = getGeneralPlan1And2Summaries(state);
  const hasBothPlans = hasPlan1Data && hasPlan2Data;

  // ==================== 데이터 계산 ====================
  const generalSummary = calculateGeneralPurchaseSummary(state);
  const generalHiPreedSummary = calculateGeneralHiPreedSummary(
    state.generalHiPreedCounts,
    Boolean(state.hideHiPreed)
  );

  const subSummary = calculateSubscriptionSummary(state);
  const representativePeriod = subSummary.representativePeriod;
  const periodLabel = subSummary.periodLabel;

  const currentCard = subSummary.currentCard;
  const currentCardTier = subSummary.currentCardTier;
  const hiSummary = subSummary.hiSummary;

  const totalBaseMonthly = subSummary.totalBaseMonthly;
  const totalPrincipal = subSummary.totalPrincipal;

  const cardMonthlyDiscount = subSummary.cardDiscount;
  const hiPlusMonthlySupport = subSummary.hiPlusMonthly;

  const finalMonthlyFee = subSummary.finalMonthlyFee;
  const finalTotal60Fee = subSummary.finalTotalFee;

  // 안내서 표시용: 프리드 선택이 0건이면 대표 1구좌 기준으로 안내 수치 표시
  const guideGeneralSummary =
    generalHiPreedSummary.totalAccounts > 0
      ? generalHiPreedSummary
      : calculateGeneralHiPreedSummary({
          hf75: 0,
          hf150: 1,
          hf225: 0,
          hf300: 0,
        });

  const guideHiSummary =
    hiSummary.totalAccounts > 0
      ? hiSummary
      : calculateHiPlusSummary(
          { hi72: 0, hi90: 0, hi108: 1 },
          representativePeriod
        );

  const isGuideTab =
    activeTab === 'guide-general' || activeTab === 'guide-sub';

  const handleToggleHideHiPreed = () => {
    const nextHidden = !state.hideHiPreed;
    if (nextHidden && activeTab === 'guide-general') {
      setActiveTab('proposal');
    }
    onChange((prev) => ({
      ...prev,
      hideHiPreed: nextHidden,
      generalPlan1: { ...prev.generalPlan1, hideHiPreed: nextHidden },
      generalPlan2: { ...prev.generalPlan2, hideHiPreed: nextHidden },
    }));
  };

  const handleToggleHideSubPreed = () => {
    const nextHidden = !state.hideSubPreed;
    if (nextHidden && activeTab === 'guide-sub') {
      setActiveTab('proposal');
    }
    onChange((prev) => ({
      ...prev,
      hideSubPreed: nextHidden,
      generalPlan1: { ...prev.generalPlan1, hideSubPreed: nextHidden },
      generalPlan2: { ...prev.generalPlan2, hideSubPreed: nextHidden },
    }));
  };

  // 공유 모달·저장 드롭다운·프리드 안내서 탭에서 뒤로가기 시 먼저 닫기 (스플릿 상담 모드 충돌 분리)
  useEffect(() => {
    if (isGuideTab || isShareLinkOpen || isShareMenuOpen || isSavePrintOpen) {
      try {
        window.history.pushState({ appGuard: true, tag: 'preview-sub' }, '');
      } catch {
        // ignore
      }
    }
    const handler = (): boolean => {
      if (isShareLinkOpen) {
        setIsShareLinkOpen(false);
        return true;
      }
      if (isShareMenuOpen) {
        setIsShareMenuOpen(false);
        return true;
      }
      if (isSavePrintOpen) {
        setIsSavePrintOpen(false);
        return true;
      }
      if (activeTab === 'guide-general' || activeTab === 'guide-sub') {
        setActiveTab('proposal');
        return true;
      }
      return false;
    };
    if (embeddedSplitMode) {
      (window as any).__proposalPreviewSplitBackHandler = handler;
      return () => {
        delete (window as any).__proposalPreviewSplitBackHandler;
      };
    }
    (window as any).__subViewBackHandler = handler;
    return () => {
      delete (window as any).__subViewBackHandler;
    };
  }, [
    activeTab,
    isGuideTab,
    embeddedSplitMode,
    isShareLinkOpen,
    isShareMenuOpen,
    isSavePrintOpen,
  ]);

  // 2D Auto-Fit 스케일링: 가로폭은 무조건 상수 920 고정!
  useEffect(() => {
    const updateScale = () => {
      if (!viewportRef.current) return;
      const activeEl = isGuideTab
        ? guideSheetRef.current
        : proposalSheetRef.current;
      if (!activeEl) return;

      const availW = viewportRef.current.clientWidth;
      const availH = viewportRef.current.clientHeight;
      const sheetW = 920;
      const nextSheetH = Math.max(
        720,
        activeEl.scrollHeight || activeEl.offsetHeight || 960
      );

      setSheetH(nextSheetH);

      const viewportWidth = window.innerWidth || availW;
      setIsMobilePhone(viewportWidth < 640);
      let nextScale: number;

      if (viewportWidth < 640) {
        nextScale = Math.min(1, (availW - 16) / sheetW);
      } else if (viewportWidth >= 1280) {
        nextScale = Math.min(
          1.1,
          (availW - 28) / sheetW,
          (availH - 28) / nextSheetH
        );
      } else {
        nextScale = Math.min(
          1,
          (availW - 24) / sheetW,
          (availH - 24) / nextSheetH
        );
      }

      setScale(Math.max(0.25, nextScale));
    };

    updateScale();
    const rafId = requestAnimationFrame(updateScale);

    const observer = new ResizeObserver(updateScale);
    if (viewportRef.current) observer.observe(viewportRef.current);
    if (proposalSheetRef.current) observer.observe(proposalSheetRef.current);
    if (guideSheetRef.current) observer.observe(guideSheetRef.current);

    window.addEventListener('resize', updateScale);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [activeTab, isGuideTab, state]);

  const handleSwitchGeneralPlan = (targetPlan: 1 | 2) => {
    onChange((prev) => switchGeneralPlanInState(prev, targetPlan));
  };

  const handleDownloadPng = async (maskModels = false) => {
    setIsSavePrintOpen(false);
    const targetNode = isGuideTab
      ? guideSheetRef.current
      : proposalSheetRef.current;
    if (!targetNode || isExporting) return;

    setIsExporting(true);
    setExportingMode(maskModels ? 'masked' : 'full');
    setTempMaskOverride(maskModels);

    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      await new Promise((resolve) => setTimeout(resolve, 60));

      const exportW = SHEET_WIDTH;
      const exportH = Math.max(
        720,
        targetNode.scrollHeight || targetNode.offsetHeight || 960
      );

      const dataUrl = await toPng(targetNode, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: exportW,
        height: exportH,
        style: {
          transform: 'none',
        },
      });
      const link = document.createElement('a');
      const suffix =
        activeTab === 'guide-general'
          ? '하이프리드안내서'
          : activeTab === 'guide-sub'
          ? '구독프리드안내서'
          : maskModels
          ? '맞춤제안서_모델가림'
          : '맞춤제안서';
      link.download = `고객_${suffix}_${new Date()
        .toISOString()
        .slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('이미지 저장 실패:', error);
    } finally {
      setTempMaskOverride(null);
      setExportingMode(null);
      setIsExporting(false);
    }
  };

  const handlePrint = async (maskOverride?: boolean) => {
    setIsSavePrintOpen(false);
    if (typeof maskOverride === 'boolean' && !isGuideTab) {
      setTempMaskOverride(maskOverride);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
      await new Promise((resolve) => setTimeout(resolve, 60));
      window.print();
      setTempMaskOverride(null);
      return;
    }
    window.print();
  };

  // 품목 요약 타이틀 생성 (모델가림 활성 시 품목 칸 내 모델코드도 자동 마스킹)
  const validGeneralNames = state.generalItems
    .map((it) => fmtCat(it.category))
    .filter(Boolean);
  const generalHeaderTitle =
    validGeneralNames.length === 0
      ? '맞춤 가전 패키지 구매 제안서'
      : validGeneralNames.length === 1
      ? `${validGeneralNames[0]} 맞춤 구매 제안서`
      : `${validGeneralNames[0]} 외 ${validGeneralNames.length - 1}건 맞춤 구매 제안서`;

  const validSubNames = state.items
    .map((it) => fmtCat(it.category))
    .filter(Boolean);
  const subHeaderTitle =
    validSubNames.length === 0
      ? `맞춤 가전 구독 제안서 (${periodLabel} 구독)`
      : validSubNames.length === 1
      ? `${validSubNames[0]} 구독 제안서 (${periodLabel} 구독)`
      : `${validSubNames[0]} 외 ${validSubNames.length - 1}건 구독 제안서 (${periodLabel} 구독)`;

  // 일반구매 1단계 즉시할인 세부 내역 한 줄 표기
  const step1DiscountDetails: string[] = [];
  if (generalSummary.instantDiscount > 0) {
    step1DiscountDetails.push(
      `기본 즉시할인 -${generalSummary.instantDiscount.toLocaleString()}원`
    );
  }
  generalSummary.extraDiscountItems.forEach((it) => {
    step1DiscountDetails.push(
      `${it.description || '추가 즉시할인'} -${(
        Number(it.amount) || 0
      ).toLocaleString()}원`
    );
  });
  if (generalSummary.pointUsed > 0) {
    step1DiscountDetails.push(
      `포인트 즉시사용 -${generalSummary.pointUsed.toLocaleString()}원`
    );
  }

  // 일반구매 2단계 캐시백 세부 내역 한 줄 표기
  const step2CashbackDetails: string[] = [];
  if (generalSummary.tierCashback > 0) {
    step2CashbackDetails.push(
      `금액대별 캐시백 -${generalSummary.tierCashback.toLocaleString()}원`
    );
  }
  if (generalSummary.extraCashback > 0) {
    step2CashbackDetails.push(
      `배송익월 추가 캐시백 -${generalSummary.extraCashback.toLocaleString()}원`
    );
  }

  // 일반구매 2단계 추가 혜택 세부 내역 한 줄 표기
  const step2ExtraDetails: string[] = [];
  generalSummary.extraEtcItems.forEach((it) => {
    step2ExtraDetails.push(
      `${it.description || '기타 추가혜택'} -${(
        Number(it.amount) || 0
      ).toLocaleString()}원`
    );
  });
  if (generalSummary.remainingPoints > 0) {
    step2ExtraDetails.push(
      `잔여 적립포인트 -${generalSummary.remainingPoints.toLocaleString()}P`
    );
  }

  // 카드사별 혜택 명칭 분기 (롯데·신한: 캐시백 / 우리·삼성: 청구할인)
  const subCardBenefitLabel =
    currentCard?.benefitType === '캐시백' ||
    currentCard?.id === 'lotte' ||
    currentCard?.id === 'shinhan'
      ? '캐시백'
      : '청구할인';

  // 구독구매 일시 캐시백 세부 내역 및 수식 배지 문구
  const subCashbackDetailParts: string[] = [];
  if (subSummary.subTierCashback > 0) {
    subCashbackDetailParts.push(
      `${currentCard?.shortName || '제휴카드'} 금액대별 캐시백(원금 ${Math.floor(
        totalPrincipal / 10000
      ).toLocaleString()}만원 구간) -${subSummary.subTierCashback.toLocaleString()}원`
    );
  }
  if (subSummary.subExtraCashback > 0) {
    subCashbackDetailParts.push(
      `추가 캐시백 -${subSummary.subExtraCashback.toLocaleString()}원`
    );
  }

  const subFormulaParts = ['월 구독료'];
  if (cardMonthlyDiscount > 0) subFormulaParts.push(`제휴카드${subCardBenefitLabel}`);
  if (hiPlusMonthlySupport > 0) subFormulaParts.push('구독프리드');
  const subFormulaText = subFormulaParts.join(' ➖ ');

  // 혼합 모드 통합 총 할인/지원 혜택 합계
  const hybridTotalDiscountAndSupport =
    generalSummary.totalDiscountAndBenefit + subSummary.totalSubBenefit;

  // 혼합 모드 일반구매 최종 혜택가 + 구독구매 총 체감가 합계
  const hybridCombinedNetTotal = generalSummary.rawNet + finalTotal60Fee;

  const activeCompareModes = getActiveCompareModes(state);

  return (
    <div className={`${embeddedSplitMode ? 'h-full' : 'min-h-[calc(100dvh-44px)]'} w-full flex flex-col ${isDark ? 'bg-[#0E131D]' : 'bg-slate-200'} select-none`}>
      {/* ==================== 상단 고정 액션바 ==================== */}
      <header className={`no-print sticky ${embeddedSplitMode ? 'top-0' : 'top-[52px]'} z-30 min-h-[44px] py-1.5 shrink-0 w-full bg-slate-900/95 backdrop-blur-xs border-b border-slate-800 px-2 sm:px-3 flex flex-wrap items-center justify-between gap-1 sm:gap-1.5 shadow-md`}>
        <div className="flex items-center gap-1 flex-wrap">
          {!embeddedSplitMode && (
            <button
              type="button"
              onClick={onBackToInput}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[11px] border border-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>조건 수정</span>
            </button>
          )}

          {/* 탭 전환 버튼 */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('proposal')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                activeTab === 'proposal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>{state.quoteMode === 'hybrid' ? '1.혼합제안서' : state.quoteMode === 'subscription' ? '1.구독제안서' : '1.일반제안서'}</span>
            </button>

            {state.quoteMode === 'general' && !state.hideHiPreed && (
              <button
                type="button"
                onClick={() => setActiveTab('guide-general')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'guide-general'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>2.하이프리드 안내</span>
                {generalHiPreedSummary.totalAccounts > 0 && (
                  <span className="px-1 py-0.2 rounded-full bg-white/20 text-[10px]">
                    {generalHiPreedSummary.totalAccounts}건
                  </span>
                )}
              </button>
            )}

            {state.quoteMode === 'subscription' && !state.hideSubPreed && (
              <button
                type="button"
                onClick={() => setActiveTab('guide-sub')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'guide-sub'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>2.구독프리드 안내</span>
                {hiSummary.totalAccounts > 0 && (
                  <span className="px-1 py-0.2 rounded-full bg-white/20 text-[10px]">
                    {hiSummary.totalAccounts}구좌
                  </span>
                )}
              </button>
            )}

            {state.quoteMode === 'hybrid' && (
              <>
                {!state.hideHiPreed && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide-general')}
                    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      activeTab === 'guide-general'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>2.하이프리드</span>
                    {generalHiPreedSummary.totalAccounts > 0 && (
                      <span className="px-1 py-0.2 rounded-full bg-slate-900/20 text-[10px]">
                        {generalHiPreedSummary.totalAccounts}
                      </span>
                    )}
                  </button>
                )}
                {!state.hideSubPreed && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('guide-sub')}
                    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                      activeTab === 'guide-sub'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>3.구독프리드</span>
                    {hiSummary.totalAccounts > 0 && (
                      <span className="px-1 py-0.2 rounded-full bg-white/20 text-[10px]">
                        {hiSummary.totalAccounts}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* 프리드 표시/숨김 원터치 토글 (내가 숨기면 제안서·고객 공유 화면에서도 숨겨짐) */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0 gap-0.5">
            {(state.quoteMode === 'general' || state.quoteMode === 'hybrid') && (
              <button
                type="button"
                onClick={handleToggleHideHiPreed}
                title="클릭 시 일반 하이프리드 영역을 제안서 및 고객 공유 화면에서 숨기거나 표시합니다"
                className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md font-extrabold text-[10.5px] transition cursor-pointer whitespace-nowrap ${
                  state.hideHiPreed
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {state.hideHiPreed ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>일반프리드 숨김</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-sky-400" />
                    <span>일반프리드 표시</span>
                  </>
                )}
              </button>
            )}
            {(state.quoteMode === 'subscription' || state.quoteMode === 'hybrid') && (
              <button
                type="button"
                onClick={handleToggleHideSubPreed}
                title="클릭 시 구독프리드(Hi구독 플러스) 영역을 제안서 및 고객 공유 화면에서 숨기거나 표시합니다"
                className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md font-extrabold text-[10.5px] transition cursor-pointer whitespace-nowrap ${
                  state.hideSubPreed
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {state.hideSubPreed ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>구독프리드 숨김</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-rose-400" />
                    <span>구독프리드 표시</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 통합 [1안] / [2안] 즉시 전환 스위치 */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchGeneralPlan(1)}
              className={`px-2 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                activePlan === 1
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {state.quoteMode === 'subscription'
                ? `1안${
                    plan1SubSummary.totalBaseMonthly > 0
                      ? `(월 ${plan1SubSummary.finalMonthlyFee.toLocaleString()}${
                          plan1SubSummary.totalSubCashback > 0
                            ? `·총${Math.round(plan1SubSummary.finalTotalFee / 10000)}만`
                            : ''
                        })`
                      : ''
                  }`
                : state.quoteMode === 'hybrid'
                  ? `1안${
                      plan1Summary.sum > 0 || plan1SubSummary.totalBaseMonthly > 0
                        ? `(${Math.round(
                            (plan1Summary.rawNet + plan1SubSummary.finalTotalFee) / 10000
                          )}만)`
                        : ''
                    }`
                  : `1안${
                      plan1Summary.sum > 0
                        ? `(${plan1Summary.rawNet.toLocaleString()})`
                        : ''
                    }`}
            </button>
            <button
              type="button"
              onClick={() => handleSwitchGeneralPlan(2)}
              className={`px-2 py-1 rounded-md font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap ${
                activePlan === 2
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {state.quoteMode === 'subscription'
                ? `2안${
                    plan2SubSummary.totalBaseMonthly > 0
                      ? `(월 ${plan2SubSummary.finalMonthlyFee.toLocaleString()}${
                          plan2SubSummary.totalSubCashback > 0
                            ? `·총${Math.round(plan2SubSummary.finalTotalFee / 10000)}만`
                            : ''
                        })`
                      : ''
                  }`
                : state.quoteMode === 'hybrid'
                  ? `2안${
                      plan2Summary.sum > 0 || plan2SubSummary.totalBaseMonthly > 0
                        ? `(${Math.round(
                            (plan2Summary.rawNet + plan2SubSummary.finalTotalFee) / 10000
                          )}만)`
                        : ''
                    }`
                  : `2안${
                      plan2Summary.sum > 0
                        ? `(${plan2Summary.rawNet.toLocaleString()})`
                        : ''
                    }`}
            </button>
          </div>

          <PreviewModeComparisonBar
            state={state}
            onChange={onChange}
            onSwitchMode={onSwitchMode}
            onEnsureProposalTab={() => setActiveTab('proposal')}
          />

          {isMobilePhone && !embeddedSplitMode && (
            <button
              type="button"
              onClick={() => setMobileReadableMode((v) => !v)}
              className={`sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg font-extrabold text-[11px] border transition cursor-pointer whitespace-nowrap shrink-0 ${
                mobileReadableMode
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="스마트폰 맞춤 가독뷰와 A4 인쇄원본 축소비율 간 전환"
            >
              <span>{mobileReadableMode ? '📱가독뷰' : '📄원본비율'}</span>
            </button>
          )}
        </div>

        <div className={`grid ${onOpenSaveToCrm ? 'grid-cols-3' : 'grid-cols-2'} sm:flex items-center gap-1.5 sm:gap-1 shrink-0 w-full sm:w-auto sm:ml-0`}>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSavePrintOpen(false);
                setIsShareMenuOpen((v) => !v);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-black text-[11px] shadow-xs transition cursor-pointer whitespace-nowrap"
              title="일반 버전 또는 모델명 앞 3자리 외 가림 버전을 선택해 문자·카톡 링크 발송"
            >
              <Share2 className="w-3 h-3" />
              <span>문자·카톡링크</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {isShareMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsShareMenuOpen(false)}
                />
                <div className="fixed sm:absolute left-3 right-3 sm:left-0 sm:right-auto top-24 sm:top-full sm:mt-2 z-50 w-auto sm:w-72 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl p-2.5 space-y-1.5 no-print">
                  <div className="px-2 py-1 flex items-center justify-between border-b border-slate-800">
                    <span className="text-[11px] font-black text-amber-300">
                      📲 문자 · 카톡 견적링크 버전 선택
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsShareMenuOpen(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsShareMenuOpen(false);
                      setShareInitialMasked(true);
                      setIsShareLinkOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>모델가림 버전 링크 보내기</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-300 text-slate-950 text-[9px] font-black">
                          비교방지
                        </span>
                      </div>
                      <div className="text-[10px] text-violet-100 font-medium mt-0.5">
                        모델명 앞 3글자만 표시하고 뒷자리 *** 가림 발송
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsShareMenuOpen(false);
                      setShareInitialMasked(false);
                      setIsShareLinkOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black">
                        일반 버전 링크 보내기 (전체 모델명)
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                        원본 모델명 전체를 그대로 포함해 발송
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          {onOpenSaveToCrm && (
            <button
              type="button"
              onClick={onOpenSaveToCrm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-xs transition cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3 h-3" />
              <span>고객저장</span>
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsShareMenuOpen(false); setIsSavePrintOpen((v) => !v); }}
              disabled={isExporting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] shadow-xs border border-blue-400/35 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="이미지 저장(모델명 가림 / 원본) 및 인쇄 옵션 열기"
            >
              <Download className="w-3 h-3" />
              <span>
                {isExporting
                  ? exportingMode === 'masked'
                    ? '가림저장중...'
                    : '저장중...'
                  : '저장 · 인쇄'}
              </span>
              {!isGuideTab && isModelMasked && (
                <span className="px-1 py-0.2 rounded bg-amber-300 text-slate-950 text-[9px] font-black">
                  가림ON
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-85" />
            </button>

            {isSavePrintOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSavePrintOpen(false)}
                />
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-24 sm:top-full sm:mt-2 z-50 w-auto sm:w-72 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl p-2.5 space-y-1.5 no-print">
                  <div className="px-2 py-1 flex items-center justify-between border-b border-slate-800">
                    <span className="text-[11px] font-black text-slate-300">
                      📥 제안서 이미지 저장 · 인쇄
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSavePrintOpen(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {!isGuideTab ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadPng(true)}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition flex items-start gap-2.5 cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-black flex items-center gap-1.5">
                            <span>모델가림 이미지 저장</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-300 text-slate-950 text-[9px] font-black">
                              비교방지
                            </span>
                          </div>
                          <div className="text-[10px] text-violet-100 font-medium mt-0.5">
                            앞 3글자만 남기고 뒷자리를 ***로 가려 저장
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPng(false)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-xs font-extrabold">
                          <Download className="w-3.5 h-3.5 text-sky-400" />
                          <span>원본 이미지 저장 (전체 모델명)</span>
                        </span>
                      </button>

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        type="button"
                        onClick={() => handlePrint(true)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-xs font-extrabold">
                          <Printer className="w-3.5 h-3.5 text-amber-300" />
                          <span>모델가림 상태로 인쇄 (앞 3글자만)</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(false)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 transition flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-xs font-extrabold">
                          <Printer className="w-3.5 h-3.5 text-rose-400" />
                          <span>원본 제안서 인쇄 (전체 모델명)</span>
                        </span>
                      </button>

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        type="button"
                        onClick={() => setIsModelMasked((v) => !v)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center justify-between transition cursor-pointer ${
                          isModelMasked
                            ? 'bg-emerald-600/25 border-emerald-400/50 text-emerald-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isModelMasked ? (
                            <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>화면 미리보기 모델가림</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isModelMasked
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isModelMasked ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadPng(false)}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>안내서 이미지 저장</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrint()}
                        className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-rose-400" />
                        <span>안내서 인쇄</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ==================== 복수 구매방식 선택 시 상단 탭 전환 바 (한 장에 섞지 않고 탭으로 개별 전환) ==================== */}
      {activeCompareModes.length >= 2 && activeTab === 'proposal' && (
        <div className="no-print w-full max-w-[920px] mx-auto px-2 sm:px-3 pt-2.5">
          <MultiModeTabSwitcherBanner
            state={state}
            onSelectMode={(m) => {
              if (onSwitchMode) {
                onSwitchMode(m);
              } else {
                onChange((prev) => switchQuoteModeInState(prev, m));
              }
            }}
            compact
          />
        </div>
      )}

      {/* ==================== 중앙 2D Auto-Fit 뷰포트 ==================== */}
      <div
        ref={viewportRef}
        className="print-stage flex-1 min-h-0 w-full flex items-start sm:items-center justify-center overflow-x-hidden p-2 sm:p-3"
      >
        <div
          style={
            useMobileFluid
              ? { width: '100%', height: 'auto' }
              : {
                  width: `${Math.round(920 * scale)}px`,
                  height: `${Math.round(sheetH * scale)}px`,
                }
          }
          className={`sheet-scale-wrapper relative shrink-0 ${
            useMobileFluid ? 'w-full overflow-visible' : 'overflow-hidden'
          }`}
        >
          {/* ===================================================================== */}
          {/* TAB 1: 고객 맞춤 제안서 (#sheet-proposal) */}
          {/* ===================================================================== */}
          {activeTab === 'proposal' && (
            <div
              id="sheet-proposal"
              ref={proposalSheetRef}
              style={
                useMobileFluid
                  ? { width: '100%', minWidth: 0, height: 'auto', transform: 'none' }
                  : {
                      width: '920px',
                      minWidth: '920px',
                      height: 'auto',
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }
              }
              className={`print-sheet shrink-0 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-7 space-y-4 text-slate-900 ${
                useMobileFluid ? 'mobile-fluid-sheet' : ''
              }`}
            >
              {/* -------------------- CASE A: 일반구매 단독 제안서 -------------------- */}
              {state.quoteMode === 'general' && (
                <div className="space-y-4">
                  {/* 상단 헤더 */}
                  <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-extrabold">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                          맞춤 구매 설계안
                        </div>
                        {hasBothPlans && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold">
                            견적 {activePlan}안
                          </span>
                        )}
                        {activeCustomer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-extrabold">
                            <User className="w-3 h-3 text-amber-300" />
                            [{activeCustomer.name} 고객님 맞춤 제안서]
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl font-black tracking-tight text-white break-words">
                        {generalHeaderTitle}
                      </h1>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-extrabold text-white whitespace-nowrap">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        적용 제휴카드: {state.generalCardType === '미정' || state.generalCardType === '일반카드' ? '제휴카드 미적용' : state.generalCardType}
                      </span>
                    </div>
                  </div>

                  {/* 품목 및 총 합계 영역 */}
                  {state.generalItems.length >= 2 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-extrabold text-slate-500">
                          구매 품목 내역 (총 {state.generalItems.length}개 품목)
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          품목별 행사가
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {state.generalItems.map((item, idx) => {
                          const lineTotal =
                            (Number(item.unitPrice) || 0) *
                            Math.max(1, Number(item.quantity) || 1);
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 overflow-hidden"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-black text-slate-900 break-all">
                                  {fmtCat(item.category) || `가전품목 ${idx + 1}`}
                                </span>
                                {item.modelName && (
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono break-all">
                                    {fmtModel(item.modelName)}
                                  </span>
                                )}
                                {item.quantity > 1 && (
                                  <span className="text-xs font-extrabold text-blue-600 shrink-0">
                                    × {item.quantity}개
                                  </span>
                                )}
                              </div>
                              <span className="text-base font-black text-slate-900 shrink-0 whitespace-nowrap">
                                {lineTotal.toLocaleString()}원
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-slate-900 text-white rounded-xl px-5 py-3.5 flex items-center justify-between gap-2">
                        <span className="text-base font-black text-slate-200">
                          총 합계 금액
                        </span>
                        <span className="text-2xl font-black text-white tracking-tight shrink-0 whitespace-nowrap">
                          {generalSummary.sum.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 px-6 py-4 flex items-center justify-between gap-3 overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-blue-600">
                            구매 품목 및 총 합계 금액
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xl font-black text-slate-900 break-all">
                              {fmtCat(state.generalItems[0]?.category) ||
                                '맞춤 가전 패키지'}
                            </span>
                            {state.generalItems[0]?.modelName && (
                              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono break-all">
                                {fmtModel(state.generalItems[0].modelName)}
                              </span>
                            )}
                            {(state.generalItems[0]?.quantity || 1) > 1 && (
                              <span className="text-xs font-extrabold text-blue-600 shrink-0">
                                × {state.generalItems[0].quantity}개
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-500">
                          총 합계 금액
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">
                          {generalSummary.sum.toLocaleString()}원
                        </div>
                      </div>
                    </div>
                  )}

                  {/* [1단계: 고객 실 결제부담금 산출] 카드 */}
                  {generalSummary.totalDiscountAndBenefit > 0 && (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                      {(generalSummary.totalStep1InstantDiscount > 0 ||
                        generalSummary.hiFreedSupport > 0) && (
                        <>
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                              <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                                1
                              </span>
                              1단계: 고객 실 결제부담금 산출
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              총 합계 금액에서 즉시할인 및 지원금 차감
                            </span>
                          </div>

                          <div className="space-y-2">
                            {generalSummary.totalStep1InstantDiscount > 0 && (
                              <div className="flex items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-slate-200">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-black text-slate-900">
                                    (-) 즉시할인 혜택
                                  </div>
                                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                                    {step1DiscountDetails.length > 0
                                      ? step1DiscountDetails.join(' · ')
                                      : '기본 즉시할인 + 추가 즉시할인 + 포인트 즉시사용'}
                                  </div>
                                </div>
                                <div className="text-xl font-black text-blue-600 shrink-0 whitespace-nowrap">
                                  -
                                  {generalSummary.totalStep1InstantDiscount.toLocaleString()}
                                  원
                                </div>
                              </div>
                            )}

                            {!state.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                              <div className="flex items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-blue-200">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-black text-slate-900">
                                    (-) 하이프리드 지원금
                                  </div>
                                  <div className="text-xs font-bold text-blue-600 mt-0.5">
                                    {generalHiPreedSummary.activePlans
                                      .map((p) => `${p.name} (${p.count}건)`)
                                      .join(' + ')}{' '}
                                    결합 지원
                                  </div>
                                </div>
                                <div className="text-xl font-black text-blue-600 shrink-0 whitespace-nowrap">
                                  -{generalSummary.hiFreedSupport.toLocaleString()}
                                  원
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* 💳 고객 실 결제부담금 (실결제가) 강조 박스 */}
                      <div className="bg-blue-600 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-black text-white">
                              💳 고객 실 결제부담금 (실결제가)
                            </div>
                            <div className="text-xs font-bold text-blue-100">
                              매장 결제 시 실제 카드로 결제하시는 금액
                            </div>
                          </div>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight shrink-0 whitespace-nowrap">
                          <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* [2단계: 캐시백 및 추가 혜택 차감 ➔ 최종 혜택가] 카드 */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                    {(generalSummary.totalStep2Cashback > 0 ||
                      generalSummary.totalStep2ExtraBenefit > 0) && (
                      <>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                          <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white text-xs font-black flex items-center justify-center">
                              2
                            </span>
                            2단계: 캐시백 및 추가 혜택 차감 ➔ 최종 혜택가
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            결제 후 돌려받으시는 캐시백 및 추가 혜택 반영
                          </span>
                        </div>

                        <div className="space-y-2">
                          {generalSummary.totalStep2Cashback > 0 && (
                            <div className="flex items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-rose-200">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900">
                                  (-) 캐시백 혜택
                                </div>
                                <div className="text-xs font-bold text-rose-600 mt-0.5">
                                  {step2CashbackDetails.join(' · ')}
                                </div>
                              </div>
                              <div className="text-xl font-black text-rose-600 shrink-0 whitespace-nowrap">
                                -
                                {generalSummary.totalStep2Cashback.toLocaleString()}
                                원
                              </div>
                            </div>
                          )}

                          {generalSummary.totalStep2ExtraBenefit > 0 && (
                            <div className="flex items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-slate-200">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900">
                                  (-) 추가 혜택
                                </div>
                                <div className="text-xs font-bold text-slate-600 mt-0.5">
                                  {step2ExtraDetails.join(' · ')}
                                </div>
                              </div>
                              <div className="text-xl font-black text-rose-600 shrink-0 whitespace-nowrap">
                                -
                                {generalSummary.totalStep2ExtraBenefit.toLocaleString()}
                                원
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* 🎯 최종 혜택가 (체감 구매가) 메인 히어로 강조 박스 */}
                    <div className="bg-rose-50/70 border-2 border-rose-500 rounded-2xl p-6 text-center space-y-2 shadow-xs">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-600 text-white text-xs font-black">
                        <Sparkles className="w-3.5 h-3.5" />
                        🎯 최종 혜택가 (체감 구매가)
                      </div>
                      <div className="text-5xl font-black text-rose-600 tracking-tight py-1">
                        <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                      </div>
                      {(generalSummary.totalStep2Cashback > 0 ||
                        generalSummary.totalStep2ExtraBenefit > 0) && (
                        <div className="text-xs font-bold text-slate-600">
                          실결제가 {generalSummary.payPrice.toLocaleString()}원
                          {generalSummary.totalStep2Cashback > 0 &&
                            ` - 캐시백 ${generalSummary.totalStep2Cashback.toLocaleString()}원`}
                          {generalSummary.totalStep2ExtraBenefit > 0 &&
                            ` - 추가혜택 ${generalSummary.totalStep2ExtraBenefit.toLocaleString()}원`}
                        </div>
                      )}
                      {generalSummary.rawNet < 0 && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                            🎉 가전 구매 후 오히려 +
                            {Math.abs(generalSummary.rawNet).toLocaleString()}원 더
                            이득!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!state.hideHiPreed && generalHiPreedSummary.totalAccounts > 0 && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 text-blue-900 font-extrabold">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          하이프리드 결합 안내: 만기(150회) 시 납입 원금{' '}
                          <strong className="text-blue-700">
                            {generalHiPreedSummary.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                          </strong>
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">
                        월 납입금 {generalHiPreedSummary.totalMonthlyDeposit.toLocaleString()}원 적립형
                      </span>
                    </div>
                  )}
                </div>
              )}

              <ProposalPreviewSubAndHybrid
                activeCustomer={activeCustomer}
                generalHiPreedSummary={generalHiPreedSummary}
                activePlan={activePlan}
                cardMonthlyDiscount={cardMonthlyDiscount}
                currentCard={currentCard}
                currentCardTier={currentCardTier}
                finalMonthlyFee={finalMonthlyFee}
                finalTotal60Fee={finalTotal60Fee}
                fmtCat={fmtCat}
                fmtModel={fmtModel}
                generalSummary={generalSummary}
                hasBothPlans={hasBothPlans}
                hiPlusMonthlySupport={hiPlusMonthlySupport}
                hybridCombinedNetTotal={hybridCombinedNetTotal}
                hybridTotalDiscountAndSupport={hybridTotalDiscountAndSupport}
                periodLabel={periodLabel}
                representativePeriod={representativePeriod}
                state={state}
                subCardBenefitLabel={subCardBenefitLabel}
                subCashbackDetailParts={subCashbackDetailParts}
                subFormulaText={subFormulaText}
                subHeaderTitle={subHeaderTitle}
                subSummary={subSummary}
                totalBaseMonthly={totalBaseMonthly}
                totalPrincipal={totalPrincipal}
              />
            </div>
          )}

        <ProposalPreviewFreedGuide
          activeTab={activeTab}
          guideGeneralSummary={guideGeneralSummary}
          guideHiSummary={guideHiSummary}
          guideSheetRef={guideSheetRef}
          isGuideTab={isGuideTab}
          representativePeriod={representativePeriod}
          scale={scale}
        />
        </div>
      </div>
      <ShareQuoteLinkModal
        isOpen={isShareLinkOpen}
        onClose={() => setIsShareLinkOpen(false)}
        state={state}
        customerName={activeCustomer?.name || ''}
        customerPhone={activeCustomer?.phone || ''}
        initialMaskModels={shareInitialMasked}
        isDark={isDark}
      />
    </div>
  );
};
