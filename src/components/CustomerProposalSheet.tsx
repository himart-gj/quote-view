import React from 'react';
import { CreditCard, Gift, Layers, RefreshCw, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { SpringNumberFlow } from './SpringNumberFlow';

const sanitizeFiveYearText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/3년\s*(무상|A\/?S)/gi, '5년 $1');
};

export const CustomerProposalSheet: React.FC<Record<string, any>> = ({
  activePlan,
  currentCard,
  currentCardTier,
  generalHeaderTitle,
  generalHiPreed,
  generalSummary,
  hasBothPlans,
  hiPlusSummary,
  hybridCombinedNetTotal,
  hybridTotalDiscountAndSupport,
  simState,
  step1DiscountDetails,
  step2CashbackDetails,
  step2ExtraDetails,
  subCardBenefitLabel,
  subCashbackDetailParts,
  subFormulaText,
  subHeaderTitle,
  subSummary,
}) => {
  return (
    <>
        {/* ==================== 메인 고객 맞춤 제안서 시트 (통합앱 고객 제안서 배열과 100% 동일 순서) ==================== */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 text-slate-900">
          {/* -------------------- CASE A: 일반구매 단독 제안서 (가전 합계 -> 즉시할인 -> 결제가 -> 캐시백/추가혜택 -> 최종가) -------------------- */}
          {simState.quoteMode === 'general' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* 1. 상단 제안서 헤더 */}
              <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-extrabold">
                      <ShoppingBag className="w-3 h-3 text-blue-400" />
                      맞춤 구매 설계안
                    </span>
                    {hasBothPlans && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold">
                        견적 {activePlan}안
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    {generalHeaderTitle}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-extrabold text-white shrink-0">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  적용 제휴카드:{' '}
                  {simState.generalCardType === '미정' ||
                  simState.generalCardType === '일반카드'
                    ? '제휴카드 미적용'
                    : simState.generalCardType}
                </span>
              </div>

              {/* 2. [가전 합계] 구매 품목 내역 및 총 합계 금액 */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-extrabold text-slate-500">
                    구매 품목 내역 (총 {generalSummary.displayItems.length}개 품목)
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    품목별 행사가
                  </span>
                </div>
                <div className="space-y-1.5">
                  {generalSummary.displayItems.map((it, idx) => {
                    const lineAmt =
                      (Number(it.unitPrice) || 0) *
                      Math.max(1, Number(it.quantity) || 1);
                    return (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            {it.category || `가전품목 ${idx + 1}`}
                          </span>
                          {it.modelName && (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              {it.modelName}
                            </span>
                          )}
                          {it.quantity > 1 && (
                            <span className="text-xs font-extrabold text-blue-600">
                              × {it.quantity}개
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono shrink-0">
                          {lineAmt.toLocaleString()}원
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-200">
                    총 합계 금액
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-white font-mono tracking-tight">
                    {generalSummary.sum.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 3. [1단계: 즉시할인 · 하이프리드 지원금 차감 -> 고객 실 결제부담금(결제가)] */}
              {generalSummary.totalDiscountAndBenefit > 0 && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                  {(generalSummary.totalStep1InstantDiscount > 0 ||
                    generalSummary.hiFreedSupport > 0) && (
                    <>
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900">
                          <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                            1
                          </span>
                          1단계: 고객 실 결제부담금 산출
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                          즉시할인 및 하이프리드 지원금 차감
                        </span>
                      </div>

                      <div className="space-y-2">
                        {generalSummary.totalStep1InstantDiscount > 0 && (
                          <div className="flex items-center justify-between gap-2 bg-white px-3.5 sm:px-4 py-3 rounded-xl border border-slate-200">
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-black text-slate-900">
                                (-) 즉시할인 혜택
                              </div>
                              <div className="text-[11px] font-bold text-slate-500 mt-0.5 leading-snug">
                                {step1DiscountDetails.length > 0
                                  ? step1DiscountDetails.join(' · ')
                                  : '기본 즉시할인 + 추가 즉시할인 + 포인트 즉시사용'}
                              </div>
                            </div>
                            <div className="text-sm sm:text-lg font-black text-blue-600 font-mono shrink-0">
                              -{generalSummary.totalStep1InstantDiscount.toLocaleString()}원
                            </div>
                          </div>
                        )}

                        {generalSummary.hiFreedSupport > 0 && (
                          <div className="flex items-center justify-between gap-2 bg-white px-3.5 sm:px-4 py-3 rounded-xl border border-blue-200">
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-black text-slate-900">
                                (-) 하이프리드 지원금
                              </div>
                              <div className="text-[11px] font-bold text-blue-600 mt-0.5 leading-snug">
                                {generalHiPreed.activePlans
                                  .map((p) => `${p.name} (${p.count}건)`)
                                  .join(' + ')}{' '}
                                결합 지원
                              </div>
                            </div>
                            <div className="text-sm sm:text-lg font-black text-blue-600 font-mono shrink-0">
                              -{generalSummary.hiFreedSupport.toLocaleString()}원
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 💳 고객 실 결제부담금 (실결제가) */}
                  <div className="bg-blue-600 text-white rounded-2xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-white">
                          💳 고객 실 결제부담금 (실결제가)
                        </div>
                        <div className="text-[11px] font-bold text-blue-100 truncate">
                          매장 결제 시 실제 카드로 결제하시는 금액
                        </div>
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight shrink-0">
                      <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. [2단계: 캐시백 및 추가 혜택 차감 -> 최종 혜택가(최종가)] */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                {(generalSummary.totalStep2Cashback > 0 ||
                  generalSummary.totalStep2ExtraBenefit > 0) && (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900">
                        <span className="w-5 h-5 rounded-lg bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          2
                        </span>
                        2단계: 캐시백 및 추가 혜택 차감 ➔ 최종 혜택가
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
                        결제 후 돌려받는 캐시백·추가 혜택 반영
                      </span>
                    </div>

                    <div className="space-y-2">
                      {generalSummary.totalStep2Cashback > 0 && (
                        <div className="flex items-center justify-between gap-2 bg-white px-3.5 sm:px-4 py-3 rounded-xl border border-rose-200">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900">
                              (-) 캐시백 혜택
                            </div>
                            <div className="text-[11px] font-bold text-rose-600 mt-0.5 leading-snug">
                              {step2CashbackDetails.join(' · ')}
                            </div>
                          </div>
                          <div className="text-sm sm:text-lg font-black text-rose-600 font-mono shrink-0">
                            -{generalSummary.totalStep2Cashback.toLocaleString()}원
                          </div>
                        </div>
                      )}

                      {generalSummary.totalStep2ExtraBenefit > 0 && (
                        <div className="flex items-center justify-between gap-2 bg-white px-3.5 sm:px-4 py-3 rounded-xl border border-slate-200">
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-black text-slate-900">
                              (-) 추가 혜택
                            </div>
                            <div className="text-[11px] font-bold text-slate-600 mt-0.5 leading-snug">
                              {step2ExtraDetails.join(' · ')}
                            </div>
                          </div>
                          <div className="text-sm sm:text-lg font-black text-rose-600 font-mono shrink-0">
                            -{generalSummary.totalStep2ExtraBenefit.toLocaleString()}원
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 🎯 최종 혜택가 (체감 구매가) */}
                <div className="bg-rose-50/75 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 text-center space-y-1.5 shadow-2xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black">
                    <Sparkles className="w-3.5 h-3.5" />
                    🎯 최종 혜택가 (체감 구매가)
                  </div>
                  <div className="text-3xl sm:text-5xl font-black text-rose-600 font-mono tracking-tight py-0.5">
                    <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                  </div>
                  {(generalSummary.totalStep2Cashback > 0 ||
                    generalSummary.totalStep2ExtraBenefit > 0) && (
                    <div className="text-[11px] sm:text-xs font-bold text-slate-600">
                      실결제가 {generalSummary.payPrice.toLocaleString()}원
                      {generalSummary.totalStep2Cashback > 0 &&
                        ` - 캐시백 ${generalSummary.totalStep2Cashback.toLocaleString()}원`}
                      {generalSummary.totalStep2ExtraBenefit > 0 &&
                        ` - 추가혜택 ${generalSummary.totalStep2ExtraBenefit.toLocaleString()}원`}
                    </div>
                  )}
                  {generalSummary.totalDiscountAndBenefit > 0 && (
                    <div className="text-[11px] font-extrabold text-emerald-700">
                      총 할인·캐시백·지원 혜택 -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원 반영
                    </div>
                  )}
                  {generalSummary.rawNet < 0 && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                        🎉 가전 구매 후 오히려 +
                        {Math.abs(generalSummary.rawNet).toLocaleString()}원 더 이득!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. 하이프리드 선택 시 하단 만기 환급 안내 바 */}
              {generalHiPreed.totalAccounts > 0 && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-blue-950 font-extrabold leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      하이프리드 결합 안내: 만기(150회) 시 납입 원금{' '}
                      <strong className="text-blue-700">
                        {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                      </strong>
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    월 납입금 {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원 적립형
                  </span>
                </div>
              )}
            </div>
          )}

          {/* -------------------- CASE B: 구독구매 단독 제안서 (구독 합계 -> 월 할인/지원 -> 월 체감구독료 -> 일시캐시백 -> 최종 체감가) -------------------- */}
          {simState.quoteMode === 'subscription' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* 1. 상단 제안서 헤더 */}
              <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[11px] font-extrabold">
                      <RefreshCw className="w-3 h-3 text-rose-400" />
                      맞춤 구독 설계안
                    </span>
                    {hasBothPlans && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold">
                        견적 {activePlan}안
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    {subHeaderTitle}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-extrabold text-white shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  품목별 맞춤 케어 · 5년 무상 A/S 보장
                </span>
              </div>

              {/* 2. [구독 합계] 구독 가전 내역 및 총 월 구독료 합계 */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-extrabold text-slate-500">
                    구독 가전 내역 (총 {subSummary.displayItems.length}개 품목)
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    품목별 월 구독료 ({subSummary.periodLabel})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {subSummary.displayItems.map((it, idx) => {
                    const itemPeriod =
                      it.period === 36
                        ? 36
                        : it.period === 60
                        ? 60
                        : subSummary.representativePeriod;
                    const cleanCare = sanitizeFiveYearText(
                      it.careService || '전문가 방문케어'
                    );
                    return (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-black text-slate-900">
                              {it.category || `구독 가전 ${idx + 1}`}
                            </span>
                            {it.modelName && (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                {it.modelName}
                              </span>
                            )}
                            <span className="text-[10.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                              [{itemPeriod}개월 구독]
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 mt-1 pl-6">
                            🛡️ {cleanCare} · 5년 무상 A/S 보장
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 font-mono shrink-0">
                          월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-200">
                    총 월 구독료 합계 ({subSummary.periodLabel} 구독)
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-white font-mono tracking-tight">
                    월 {subSummary.totalBaseMonthly.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 3. 매월 할인·지원 차감 내역 (제휴카드 월 할인 + 구독프리드 월 지원금) */}
              {(subSummary.cardDiscount > 0 || subSummary.hiPlusMonthly > 0) && (
                <div className="space-y-2">
                  {subSummary.cardDiscount > 0 && currentCard && currentCardTier && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900">
                            (-) 제휴카드 월 {subCardBenefitLabel} ({currentCard.name})
                          </div>
                          <div className="text-[11px] font-bold text-blue-700">
                            {currentCardTier.minSpendLabel} ·{' '}
                            {subSummary.representativePeriod}개월간 매월{' '}
                            {subCardBenefitLabel}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm sm:text-xl font-black text-blue-600 font-mono shrink-0">
                        월 -{subSummary.cardDiscount.toLocaleString()}원
                      </div>
                    </div>
                  )}

                  {subSummary.hiPlusMonthly > 0 && (
                    <div className="bg-blue-50/80 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900">
                            (-) 구독프리드 (Hi구독 플러스) 월 지원금
                          </div>
                          <div className="text-[11px] font-bold text-indigo-700">
                            {subSummary.representativePeriod}개월간 매월 캐시백 지원
                          </div>
                        </div>
                      </div>
                      <div className="text-sm sm:text-xl font-black text-indigo-600 font-mono shrink-0">
                        월 -{subSummary.hiPlusMonthly.toLocaleString()}원
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. 메인 월 체감 구독료 강조 박스 */}
              <div className="bg-rose-50/75 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 text-center space-y-1.5 shadow-2xs">
                {(subSummary.cardDiscount > 0 || subSummary.hiPlusMonthly > 0) && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-white border border-rose-200 text-[11px] font-extrabold text-slate-700">
                    <span>{subFormulaText}</span>
                  </div>
                )}
                <div className="text-xs sm:text-sm font-black text-rose-600 pt-0.5">
                  {subSummary.totalSubCashback > 0
                    ? `💳 월 체감 구독료 (${subSummary.periodLabel} 구독)`
                    : `🎯 최종 월 체감가 (${subSummary.periodLabel} 구독)`}
                </div>
                <div className="text-3xl sm:text-5xl font-black text-rose-600 font-mono tracking-tight py-0.5">
                  월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                </div>
                {subSummary.totalSubCashback > 0 && (
                  <div className="text-[11px] sm:text-xs font-bold text-slate-600">
                    {subSummary.periodLabel} 월 납부 합계{' '}
                    {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원
                    (약정 원금 {subSummary.totalPrincipal.toLocaleString()}원)
                  </div>
                )}
                {subSummary.finalMonthlyFee < 0 && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                      🎉 월 구독료 0원 + 매월 +
                      {Math.abs(subSummary.finalMonthlyFee).toLocaleString()}원씩 더 이득!
                    </span>
                  </div>
                )}
              </div>

              {/* 5. 일시 입금 캐시백(1회 입금) 차감 ➔ 🎯 최종 기간 체감가 */}
              {subSummary.totalSubCashback > 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
                  <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          (-) 구독 일시 입금 캐시백 혜택 (1회 입금)
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700 leading-snug">
                          {subCashbackDetailParts.join(' · ')} · 최종 체감가에서 일시 차감
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-xl font-black text-emerald-600 font-mono">
                        -{subSummary.totalSubCashback.toLocaleString()}원
                      </div>
                      <div className="text-[10.5px] font-extrabold text-emerald-800">
                        1회 일시 입금
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-4 flex items-center justify-between gap-2 shadow-xs">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-amber-300">
                        🎯 최종 {subSummary.periodLabel} 체감가 (일시 캐시백 차감 반영)
                      </div>
                      <div className="text-[11px] font-bold text-slate-300 mt-0.5 leading-relaxed">
                        {subSummary.periodLabel} 월 납부 합계{' '}
                        {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원
                        ➖ 일시 입금 캐시백{' '}
                        {subSummary.totalSubCashback.toLocaleString()}원{' '}
                        <span className="whitespace-nowrap">
                          (원금 {subSummary.totalPrincipal.toLocaleString()}원)
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <span className="text-xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight whitespace-nowrap">
                        <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-200 whitespace-nowrap shrink-0">
                    최종 {subSummary.periodLabel} 체감가 합계
                  </span>
                  <div className="flex items-baseline gap-1.5 flex-wrap justify-end text-right">
                    <span className="text-lg sm:text-2xl font-black text-white font-mono whitespace-nowrap">
                      <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 whitespace-nowrap">
                      (원금 {subSummary.totalPrincipal.toLocaleString()}원)
                    </span>
                  </div>
                </div>
              )}

              {/* 6. 구독프리드 선택 시 하단 만기 환급 안내 바 */}
              {hiPlusSummary.totalAccounts > 0 && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-indigo-950 font-extrabold leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      구독프리드(Hi구독 플러스) 안내: 납입기간 90회(30회는 거치만 · 120회 만기) 시 납입 원금{' '}
                      <strong className="text-indigo-700">
                        {hiPlusSummary.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                      </strong>
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                    월 납입금 {hiPlusSummary.totalMonthlyDeposit.toLocaleString()}원 · 납입기간 90회 (30회는 거치만)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* -------------------- CASE C: 일반+구독 혼합 제안서 (통합앱 혼합 제안서 배열과 100% 동일 순서) -------------------- */}
          {simState.quoteMode === 'hybrid' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* 1. 혼합 상단 헤더 */}
              <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-extrabold">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      맞춤 혼합 설계안
                    </span>
                    {hasBothPlans && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold">
                        견적 {activePlan}안 적용
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-xl font-black tracking-tight text-white">
                    일반구매 · 구독구매 통합 맞춤 제안서
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-extrabold text-blue-300">
                    일반 카드:{' '}
                    {simState.generalCardType === '미정' ||
                    simState.generalCardType === '일반카드'
                      ? '미적용'
                      : simState.generalCardType}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-extrabold text-rose-300">
                    구독: {subSummary.periodLabel}
                  </span>
                </div>
              </div>

              {/* 2. 파트 A(일반구매) & 파트 B(구독구매) 대칭 배치 (모바일 1열 · 폴드/태블릿/PC 2열) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-start">
                {/* [파트 A. 일반구매: 가전 합계 -> 즉시할인/프리드 -> 결제가 -> 캐시백/추가혜택 -> 최종 혜택가] */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs sm:text-sm font-black text-blue-700 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4" />
                      파트 A. 일반구매 (일시불)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {generalSummary.displayItems.length}개 품목
                    </span>
                  </div>

                  {/* 가전 품목 및 총 합계 금액 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
                    {generalSummary.displayItems.map((it, idx) => {
                      const amt =
                        (Number(it.unitPrice) || 0) *
                        Math.max(1, Number(it.quantity) || 1);
                      return (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700"
                        >
                          <span className="min-w-0">
                            {idx + 1}. {it.category || `일반가전 ${idx + 1}`}
                            {it.modelName ? ` (${it.modelName})` : ''}
                            {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                          </span>
                          <span className="font-black text-slate-900 font-mono shrink-0">
                            {amt.toLocaleString()}원
                          </span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">
                        총 합계 금액
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        {generalSummary.sum.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 1단계: 즉시할인 · 하이프리드 차감 -> 고객 실 결제부담금 */}
                  {generalSummary.totalDiscountAndBenefit > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      {(generalSummary.totalStep1InstantDiscount > 0 ||
                        generalSummary.hiFreedSupport > 0) && (
                        <div className="text-xs font-black text-blue-700">
                          [1단계: 고객 실 결제부담금 산출]
                        </div>
                      )}
                      {generalSummary.totalStep1InstantDiscount > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                          <span>(-) 즉시할인 혜택</span>
                          <span className="font-black text-blue-600 font-mono shrink-0">
                            -{generalSummary.totalStep1InstantDiscount.toLocaleString()}원
                          </span>
                        </div>
                      )}
                      {generalSummary.hiFreedSupport > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                          <span>(-) 하이프리드 지원금</span>
                          <span className="font-black text-blue-600 font-mono shrink-0">
                            -{generalSummary.hiFreedSupport.toLocaleString()}원
                          </span>
                        </div>
                      )}
                      <div className="bg-blue-600 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-black">
                          💳 고객 실 결제부담금
                        </span>
                        <span className="text-base font-black font-mono shrink-0">
                          <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2단계: 캐시백 및 추가 혜택 차감 -> 최종 혜택가 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                    {(generalSummary.totalStep2Cashback > 0 ||
                      generalSummary.totalStep2ExtraBenefit > 0) && (
                      <div className="text-xs font-black text-rose-600">
                        [2단계: 캐시백 및 추가 혜택 차감]
                      </div>
                    )}
                    {generalSummary.totalStep2Cashback > 0 && (
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                        <span>(-) 캐시백 혜택</span>
                        <span className="font-black text-rose-600 font-mono shrink-0">
                          -{generalSummary.totalStep2Cashback.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {generalSummary.totalStep2ExtraBenefit > 0 && (
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                        <span>(-) 추가 혜택</span>
                        <span className="font-black text-rose-600 font-mono shrink-0">
                          -{generalSummary.totalStep2ExtraBenefit.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <div className="bg-rose-50/80 border-2 border-rose-500 rounded-xl p-3.5 text-center space-y-1">
                      <div className="text-xs font-black text-rose-600">
                        🎯 최종 혜택가 (체감 구매가)
                      </div>
                      <div className="text-2xl font-black text-rose-600 font-mono">
                        <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* [파트 B. 구독구매: 총 월 구독료 합계 -> 월 할인/지원 -> 월 체감 구독료 -> 일시캐시백 -> 최종 체감가] */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs sm:text-sm font-black text-rose-600 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4" />
                      파트 B. 구독구매 ({subSummary.periodLabel})
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {subSummary.displayItems.length}개 품목
                    </span>
                  </div>

                  {/* 구독 품목 및 총 월 구독료 합계 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                    {subSummary.displayItems.map((it, idx) => {
                      const itemPeriod =
                        it.period === 36
                          ? 36
                          : it.period === 60
                          ? 60
                          : subSummary.representativePeriod;
                      const cleanCare = sanitizeFiveYearText(
                        it.careService || '전문가 방문케어'
                      );
                      return (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>
                                {idx + 1}. {it.category || `구독가전 ${idx + 1}`}
                                {it.modelName ? ` (${it.modelName})` : ''}
                              </span>
                              <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                                [{itemPeriod}개월 구독]
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              🛡️ {cleanCare} · 5년 무상 A/S 보장
                            </div>
                          </div>
                          <span className="font-black text-slate-900 font-mono shrink-0">
                            월 {(Number(it.monthlyFee) || 0).toLocaleString()}원
                          </span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700">
                        총 월 구독료 합계
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono">
                        월 {subSummary.totalBaseMonthly.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 월 할인 및 지원금 차감 */}
                  {(subSummary.cardDiscount > 0 || subSummary.hiPlusMonthly > 0) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="text-xs font-black text-slate-700">
                        [1단계: 월 할인 및 지원금 차감]
                      </div>
                      {subSummary.cardDiscount > 0 &&
                        currentCard &&
                        currentCardTier && (
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                            <span>
                              (-) 제휴카드 월 {subCardBenefitLabel} ({currentCard.shortName} ·{' '}
                              {currentCardTier.minSpendShort})
                            </span>
                            <span className="font-black text-blue-600 font-mono shrink-0">
                              월 -{subSummary.cardDiscount.toLocaleString()}원
                            </span>
                          </div>
                        )}
                      {subSummary.hiPlusMonthly > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                          <span>(-) 구독프리드 월 지원금</span>
                          <span className="font-black text-indigo-600 font-mono shrink-0">
                            월 -{subSummary.hiPlusMonthly.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 월 체감 구독료 강조 박스 */}
                  <div className="bg-rose-50/80 border-2 border-rose-500 rounded-xl p-3.5 text-center space-y-1">
                    {(subSummary.cardDiscount > 0 || subSummary.hiPlusMonthly > 0) && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-rose-200 text-[10px] font-extrabold text-slate-600">
                        {subFormulaText}
                      </div>
                    )}
                    <div className="text-xs font-black text-rose-600 pt-0.5">
                      {subSummary.totalSubCashback > 0
                        ? `💳 월 체감 구독료 (${subSummary.periodLabel})`
                        : `🎯 최종 월 체감가 (${subSummary.periodLabel})`}
                    </div>
                    <div className="text-2xl font-black text-rose-600 font-mono">
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </div>
                  </div>

                  {/* 2단계: 일시 입금 캐시백 차감 박스 */}
                  {subSummary.totalSubCashback > 0 && (
                    <div className="bg-emerald-50/90 rounded-xl border border-emerald-300 p-3 space-y-1.5">
                      <div className="text-[11px] font-black text-emerald-900">
                        [2단계: 일시 입금 캐시백 차감 · 1회 입금]
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>{subSummary.periodLabel} 월 납부 합계</span>
                        <span className="font-extrabold text-slate-800 font-mono">
                          {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원
                        </span>
                      </div>
                      {subSummary.subTierCashback > 0 && (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                          <span>
                            (-) {currentCard?.shortName || '제휴카드'} 금액대별 캐시백
                          </span>
                          <span className="font-black text-emerald-600 font-mono">
                            -{subSummary.subTierCashback.toLocaleString()}원
                          </span>
                        </div>
                      )}
                      {subSummary.subExtraCashback > 0 && (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                          <span>(-) 구독 추가 캐시백 (1회 입금)</span>
                          <span className="font-black text-emerald-600 font-mono">
                            -{subSummary.subExtraCashback.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 구독 최종 기간 체감가 리본 바 (원금 한 글자 줄바꿈 원천 방지) */}
                  <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-amber-300 whitespace-nowrap shrink-0">
                      🎯 최종 {subSummary.periodLabel} 체감가
                    </span>
                    <span className="font-black text-white font-mono text-right flex flex-wrap items-baseline justify-end gap-x-1.5">
                      <span className="whitespace-nowrap">
                        <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
                      </span>
                      <span className="font-bold text-slate-400 text-[11px] whitespace-nowrap">
                        (원금 {subSummary.totalPrincipal.toLocaleString()}원)
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 혼합 제안서 최하단 통합 합산 바 */}
              <div className="bg-slate-900 text-white rounded-2xl px-4 sm:px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-100 leading-relaxed break-keep">
                    일반구매 최종 혜택가 ({generalSummary.rawNet.toLocaleString()}원) +
                    구독구매 {subSummary.periodLabel} 최종 체감가 (
                    {subSummary.finalTotalFee.toLocaleString()}원 · 월{' '}
                    {subSummary.finalMonthlyFee.toLocaleString()}원
                    {subSummary.totalSubCashback > 0 &&
                      ` · 일시캐시백 -${subSummary.totalSubCashback.toLocaleString()}원 반영`}
                    )
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold text-slate-400">
                    일반 실결제 부담금 {generalSummary.payPrice.toLocaleString()}원
                    {hybridTotalDiscountAndSupport > 0 &&
                      ` · 통합 총 할인/캐시백/지원 혜택 -${hybridTotalDiscountAndSupport.toLocaleString()}원`}
                  </div>
                </div>
                <div className="text-right ml-auto">
                  <div className="text-xs font-extrabold text-amber-300 mb-0.5 whitespace-nowrap">
                    🎯 일반구매 + 구독구매 최종 혜택가 합계
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight whitespace-nowrap">
                    <SpringNumberFlow value={hybridCombinedNetTotal} suffix="원" />
                  </div>
                </div>
              </div>

              {/* 4. 혼합 프리드 결합 만기 환급 안내 바 */}
              {(generalHiPreed.totalAccounts > 0 ||
                hiPlusSummary.totalAccounts > 0) && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-indigo-950 font-extrabold">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      프리드 결합 만기 환급 안내 (서비스 미이용 시 납입 원금 100% 전액 환급):
                    </span>
                  </span>
                  <span className="text-[11.5px] font-extrabold text-indigo-800 break-keep">
                    {generalHiPreed.totalAccounts > 0 &&
                      `일반 하이프리드 만기(150회) ${generalHiPreed.totalMaturityRefund.toLocaleString()}원 환급`}
                    {generalHiPreed.totalAccounts > 0 &&
                      hiPlusSummary.totalAccounts > 0 &&
                      ' · '}
                    {hiPlusSummary.totalAccounts > 0 &&
                      `구독프리드 (납입기간 90회 · 30회는 거치만 / 120회 만기) ${hiPlusSummary.totalMaturityRefund.toLocaleString()}원 환급`}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
    </>
  );
};
