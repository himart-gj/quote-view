import React, { Suspense } from 'react';
import { AppStep } from '../types/proposal';
import { AsCenterModal, CardIssueModal } from './QuickCenterModal';
import { SaveToCrmModal } from '../crm/components/SaveToCrmModal';
import { CardInstallmentModal } from './CardInstallmentModal';
import { ScheduleModal } from './ScheduleModal';
import { AiCommandModal } from './AiCommandModal';
import { CommandOmnibarModal } from './CommandOmnibarModal';
import { PartnerLinksModal } from './PartnerLinksModal';
import { getCachedCustomers } from '../crm/services/gasApi';
import { PastDeliveryCheckModal } from '../crm/components/PastDeliveryCheckModal';
import { PAST_DELIVERY_POPUP_DISMISSED_KEY } from '../crm/CrmApp';
import { Smartphone, Lock, X } from 'lucide-react';

export const AppGlobalModals: React.FC<Record<string, any>> = ({
  activeCrmCustomers,
  activeCustomer,
  aiInitialCommand,
  applyRestoredProposalState,
  careDataset,
  currentState,
  handleConfirmAllDeliveredFromHome,
  handleConfirmDeliveredFromHome,
  handleConfirmStealthPin,
  handleEnterMode,
  handleOpenCustomerInQuoteBuilder,
  installmentDataset,
  isAiCommandModalOpen,
  isAsCenterOpen,
  isCardIssueOpen,
  isDark,
  isHomePastDeliveryOpen,
  isInstallGuideOpen,
  isInstallmentModalOpen,
  isOmnibarOpen,
  isPartnerLinksOpen,
  isSaveToCrmOpen,
  isScheduleModalOpen,
  isStealthPinOpen,
  navigateToStep,
  pastDueCustomersHome,
  setActiveCustomer,
  setActiveMode,
  setAiInitialCommand,
  setCrmCustomers,
  setGeneralState,
  setHybridState,
  setInitialCrmTab,
  setIsAiCommandModalOpen,
  setIsAsCenterOpen,
  setIsCardIssueOpen,
  setIsHomePastDeliveryOpen,
  setIsInstallGuideOpen,
  setIsInstallmentModalOpen,
  setIsOmnibarOpen,
  setIsPartnerLinksOpen,
  setIsSaveToCrmOpen,
  setIsScheduleModalOpen,
  setIsStealthPinOpen,
  setParseError,
  setParseGeneralError,
  setStealthPinError,
  setStealthPinInput,
  setSubscriptionState,
  stealthPinError,
  stealthPinInput,
  step,
  toggleUiTheme,
}) => {
  return (
    <>
      {/* ==================== 카드발급 & AS센터 즉시 모달 ==================== */}
      <CardIssueModal
        isOpen={isCardIssueOpen}
        onClose={() => setIsCardIssueOpen(false)}
      />
      <AsCenterModal
        isOpen={isAsCenterOpen}
        onClose={() => setIsAsCenterOpen(false)}
      />
      <PartnerLinksModal
        isOpen={isPartnerLinksOpen}
        onClose={() => setIsPartnerLinksOpen(false)}
        isDark={isDark}
      />

      {/* ==================== 지연 로딩 모달 묶음 (무이자 / 휴무표) ==================== */}
      <Suspense fallback={null}>
        {isInstallmentModalOpen && (
          <CardInstallmentModal
            isOpen={isInstallmentModalOpen}
            onClose={() => setIsInstallmentModalOpen(false)}
          />
        )}

        {isScheduleModalOpen && (
          <ScheduleModal
            isOpen={isScheduleModalOpen}
            onClose={() => setIsScheduleModalOpen(false)}
            isDark={isDark}
            onToggleTheme={toggleUiTheme}
          />
        )}
      </Suspense>

      {/* ==================== 즉시 응답 모달 (⌘K 통합검색 & ✦ AI 비서 — 청크 지연 제로) ==================== */}
      {isOmnibarOpen && (
          <CommandOmnibarModal
            isOpen={isOmnibarOpen}
            onClose={() => setIsOmnibarOpen(false)}
            isDark={isDark}
            customers={activeCrmCustomers}
            careDataset={careDataset}
            installmentDataset={installmentDataset}
            onNavigateStep={(nextStep) => navigateToStep(nextStep)}
            onEnterQuoteMode={(mode) => handleEnterMode(mode)}
            onOpenCustomerQuote={(cust) =>
              handleOpenCustomerInQuoteBuilder(cust)
            }
            onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
            onOpenInstallmentModal={() => setIsInstallmentModalOpen(true)}
            onOpenCardIssueModal={() => setIsCardIssueOpen(true)}
            onOpenAsCenterModal={() => setIsAsCenterOpen(true)}
            onOpenPartnerLinksModal={() => setIsPartnerLinksOpen(true)}
            onRunInAiCopilot={(cmd) => {
              setAiInitialCommand(cmd);
              setIsAiCommandModalOpen(true);
            }}
          />
        )}

        <AiCommandModal
          isOpen={isAiCommandModalOpen}
          onClose={() => setIsAiCommandModalOpen(false)}
          initialCommand={aiInitialCommand}
          onClearInitialCommand={() => setAiInitialCommand('')}
          currentProposalState={currentState}
          onApplyToQuote={(nextState, targetStep) => {
            if (nextState.quoteMode === 'general') {
              setGeneralState(nextState);
            } else if (nextState.quoteMode === 'subscription') {
              setSubscriptionState(nextState);
            } else {
              setHybridState(nextState);
            }
            setActiveMode(nextState.quoteMode);
            setParseError(null);
            setParseGeneralError(null);
            navigateToStep(targetStep);
          }}
          onCustomerSaved={(savedCust, nextState) => {
            setActiveCustomer({
              id: savedCust.id,
              name: savedCust.name,
              phone: savedCust.phone,
            });
            setCrmCustomers(getCachedCustomers());
            if (nextState.quoteMode === 'general') {
              setGeneralState(nextState);
            } else if (nextState.quoteMode === 'subscription') {
              setSubscriptionState(nextState);
            } else {
              setHybridState(nextState);
            }
            setActiveMode(nextState.quoteMode);
          }}
          onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
          onOpenCareTable={() => navigateToStep('care-table')}
          onOpenInstallmentModal={() => setIsInstallmentModalOpen(true)}
          onOpenAsCenterModal={() => setIsAsCenterOpen(true)}
          onOpenInsuranceView={() => navigateToStep('insurance')}
          onOpenCrmScreen={() => { setInitialCrmTab(undefined); navigateToStep('crm'); }}
          onLoadCrmCustomerQuote={(cust) => {
            const latestQuote =
              Array.isArray(cust.quotes) && cust.quotes.length > 0
                ? cust.quotes[0]
                : undefined;
            applyRestoredProposalState(
              cust,
              latestQuote?.proposalState ?? (cust as any).proposalState,
              latestQuote?.itemSummary ?? cust.items,
              latestQuote?.paidAmount ?? Number(cust.paidAmount),
              latestQuote?.quoteMode
            );
          }}
        />

      {/* ==================== CRM 고객 저장 팝업 모달 ==================== */}
      <SaveToCrmModal
        isOpen={isSaveToCrmOpen}
        onClose={() => setIsSaveToCrmOpen(false)}
        state={currentState}
        activeCustomer={activeCustomer}
        onSavedSuccess={(savedCust) => {
          setActiveCustomer(savedCust);
          setCrmCustomers(getCachedCustomers());
        }}
      />

      {/* ==================== PWA 앱 설치 / 주소창 숨김 안내 모달 ==================== */}
      {isInstallGuideOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          onClick={() => setIsInstallGuideOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    📲 주소창 없는 전용 앱(PWA) 설치 안내
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    홈 화면에 추가하면 주소창 없이 100% 전체화면으로 실행됩니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallGuideOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-slate-700">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1.5">
                <div className="font-black text-blue-950 flex items-center gap-1.5">
                  <span>🤖 안드로이드 스마트폰 / 갤럭시탭 / 매장 PC (크롬·엣지)</span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  1) 브라우저 우측 상단 메뉴 <strong>[⋮]</strong> 또는 주소창 우측의{' '}
                  <strong>[앱 설치 / 모니터 아이콘]</strong>을 누릅니다.
                  <br />
                  2) <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를
                  선택하면 바탕화면에 <strong>국지통합앱</strong> 아이콘이 생성됩니다.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-1.5">
                <div className="font-black text-slate-900 flex items-center gap-1.5">
                  <span>🍎 아이폰 / 아이패드 (Safari 브라우저)</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  1) Safari 하단(아이패드는 상단)의{' '}
                  <strong>[공유 버튼 (네모 위 화살표 ↑)]</strong>을 터치합니다.
                  <br />
                  2) 메뉴를 내려 <strong>[홈 화면에 추가 (+)]</strong>를 누르고 우측 상단{' '}
                  <strong>[추가]</strong>를 터치합니다.
                  <br />
                  3) 홈 화면에 생성된 아이콘으로 실행하면 상·하단 주소창이 100% 사라집니다!
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsInstallGuideOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer"
                >
                  확인했습니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStealthPinOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          onClick={() => setIsStealthPinOpen(false)}
        >
          <div
            className={`w-full max-w-xs rounded-3xl border p-5 space-y-3.5 shadow-2xl ${
              isDark
                ? 'bg-[#141923] border-white/15 text-white'
                : 'bg-white border-[#E4DFD5] text-[#18181B]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>개인 보안 코드 인증</span>
              </span>
              <button
                type="button"
                onClick={() => setIsStealthPinOpen(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={stealthPinInput}
              onChange={(e) => {
                setStealthPinInput(e.target.value);
                setStealthPinError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmStealthPin();
              }}
              placeholder="보안 코드 입력"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-center font-mono text-base font-black ${
                isDark
                  ? 'bg-[#0E131D] border-white/15 text-white'
                  : 'bg-[#FAF8F4] border-[#D6D0C4] text-[#18181B]'
              }`}
            />
            {stealthPinError && (
              <p className="text-xs font-bold text-rose-500 text-center">
                코드가 일치하지 않습니다.
              </p>
            )}
            <button
              type="button"
              onClick={handleConfirmStealthPin}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {step !== 'crm' && step !== 'marketing-db' && (
        <PastDeliveryCheckModal
          isOpen={isHomePastDeliveryOpen}
          customers={pastDueCustomersHome}
          isDark={isDark}
          onConfirmDelivered={handleConfirmDeliveredFromHome}
          onConfirmAllDelivered={handleConfirmAllDeliveredFromHome}
          onClose={() => {
            sessionStorage.setItem(PAST_DELIVERY_POPUP_DISMISSED_KEY, '1');
            setIsHomePastDeliveryOpen(false);
          }}
        />
      )}
    </>
  );
};

interface ScreenErrorBoundaryProps {
  stepKey: string;
  onResetToHome: () => void;
  children: React.ReactNode;
}
interface ScreenErrorBoundaryState {
  error: Error | null;
}
export class ScreenErrorBoundary extends React.Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ScreenErrorBoundaryProps) {
    if (prevProps.stepKey !== this.props.stepKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
          <div className="text-sm font-black text-rose-600">
            화면을 불러오는 중 일시적인 오류가 발생했습니다.
          </div>
          <div className="text-xs opacity-75 max-w-md break-all">
            {this.state.error.message}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                this.props.onResetToHome();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black cursor-pointer"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function getStepShortLabel(s: AppStep): string {
  switch (s) {
    case 'home':
      return '홈';
    case 'crm':
      return '통합고객관리';
    case 'marketing-db':
      return '인스타DB';
    case 'input':
      return '견적서';
    case 'proposal':
      return '제안서';
    case 'care-table':
      return '조견표';
    case 'lotte-plan':
      return '플랜계산기';
    case 'pop-printer':
      return '구독POP';
    case 'himobile':
      return '하이모바일';
    case 'allcare-guide':
      return '올케어';
    case 'insurance':
      return '보험안내';
    default:
      return '홈';
  }
}
