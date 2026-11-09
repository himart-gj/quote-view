import React from 'react';
import { SubscriptionPeriod } from '../types/proposal';
import { CreditCard, Gift, Layers, RefreshCw, ShieldCheck, ShoppingBag, User } from 'lucide-react';
import { SpringNumberFlow } from './SpringNumberFlow';

const sanitizeFiveYearText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/3년\s*(무상|A\/?S)/gi, '5년 $1');
};

export const ProposalPreviewSubAndHybrid: React.FC<Record<string, any>> = ({
  activeCustomer,
  activePlan,
  cardMonthlyDiscount,
  currentCard,
  currentCardTier,
  finalMonthlyFee,
  finalTotal60Fee,
  fmtCat,
  fmtModel,
  generalHiPreedSummary,
  generalSummary,
  hasBothPlans,
  hiPlusMonthlySupport,
  hybridCombinedNetTotal,
  hybridTotalDiscountAndSupport,
  periodLabel,
  representativePeriod,
  state,
  subCardBenefitLabel,
  subCashbackDetailParts,
  subFormulaText,
  subHeaderTitle,
  subSummary,
  totalBaseMonthly,
  totalPrincipal,
}) => {
  return (
    <>
              {/* -------------------- CASE B: 구독구매 단독 제안서 -------------------- */}
              {state.quoteMode === 'subscription' && (
                <div className="space-y-4">
                  {/* 상단 헤더 */}
                  <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-extrabold">
                          <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                          맞춤 구독 설계안
                        </div>
                        {hasBothPlans && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-extrabold">
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
                        {subHeaderTitle}
                      </h1>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-extrabold text-white whitespace-nowrap">
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        품목별 맞춤 케어 · 5년 무상 A/S 보장
                      </span>
                    </div>
                  </div>

                  {/* 품목 및 총 월 구독료 합계 영역 */}
                  {state.items.length >= 2 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-extrabold text-slate-500">
                          구독 가전 내역 (총 {state.items.length}개 품목)
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          품목별 월 구독료 ({periodLabel})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {state.items.map((item: any, idx: number) => {
                          const itemPeriod: SubscriptionPeriod =
                            item.period === 36
                              ? 36
                              : item.period === 60
                              ? 60
                              : state.subscriptionPeriod === 36
                              ? 36
                              : 60;
                          const itemWarrantyText = '5년 무상 A/S 보장';
                          const cleanCareService = sanitizeFiveYearText(
                            item.careService || '전문가 방문케어'
                          );
                          return (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 overflow-hidden"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-sm font-black text-slate-900 break-all">
                                    {fmtCat(item.category) || `구독 가전 ${idx + 1}`}
                                  </span>
                                  {item.modelName && (
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono break-all">
                                      {fmtModel(item.modelName)}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
                                    [{itemPeriod}개월 구독]
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-500 mt-1 pl-7">
                                  🛡️ {cleanCareService} · {itemWarrantyText}
                                </div>
                              </div>
                              <span className="text-base font-black text-slate-900 shrink-0 whitespace-nowrap text-right">
                                월 {(Number(item.monthlyFee) || 0).toLocaleString()}
                                원{' '}
                                <span className="text-xs font-extrabold text-rose-600">
                                  ({itemPeriod}개월)
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-slate-900 text-white rounded-xl px-5 py-3.5 flex items-center justify-between gap-2">
                        <span className="text-base font-black text-slate-200">
                          총 월 구독료 합계 ({periodLabel} 구독)
                        </span>
                        <span className="text-2xl font-black text-white tracking-tight shrink-0 whitespace-nowrap">
                          월 {totalBaseMonthly.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const singleItem = state.items[0];
                      const singlePeriod: SubscriptionPeriod =
                        singleItem?.period === 36
                          ? 36
                          : singleItem?.period === 60
                          ? 60
                          : state.subscriptionPeriod === 36
                          ? 36
                          : 60;
                      const singleWarrantyText = '5년 무상 A/S 보장';
                      const cleanSingleCareService = sanitizeFiveYearText(
                        singleItem?.careService || '전문가 방문케어'
                      );
                      return (
                        <div className="bg-slate-50 rounded-2xl border-2 border-slate-200 px-6 py-4 flex items-center justify-between gap-3 overflow-hidden">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                              <RefreshCw className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-rose-600">
                                구독 품목 및 총 월 구독료 합계 ({singlePeriod}개월
                                구독)
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xl font-black text-slate-900 break-all">
                                  {fmtCat(singleItem?.category) || '맞춤 구독 가전'}
                                </span>
                                {singleItem?.modelName && (
                                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono break-all">
                                    {fmtModel(singleItem.modelName)}
                                  </span>
                                )}
                                <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md shrink-0">
                                  [{singlePeriod}개월 구독]
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-500 mt-1">
                                🛡️ {cleanSingleCareService} · {singleWarrantyText}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-500">
                              총 월 구독료 합계
                            </div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                              월 {totalBaseMonthly.toLocaleString()}원{' '}
                              <span className="text-sm font-extrabold text-rose-600">
                                ({singlePeriod}개월)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* 매월 할인·지원 차감 내역 */}
                  {(cardMonthlyDiscount > 0 || (!state.hideSubPreed && hiPlusMonthlySupport > 0)) && (
                    <div className="space-y-2.5">
                      {cardMonthlyDiscount > 0 && currentCard && currentCardTier && (
                        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <CreditCard className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-black text-slate-900">
                                (-) 제휴카드 월 {subCardBenefitLabel} ({currentCard.name})
                              </div>
                              <div className="text-xs font-bold text-blue-700">
                                {currentCardTier.minSpendLabel} ·{' '}
                                {representativePeriod}개월간 매월 {subCardBenefitLabel}
                              </div>
                            </div>
                          </div>
                          <div className="text-2xl font-black text-blue-600 shrink-0 whitespace-nowrap">
                            월 -{cardMonthlyDiscount.toLocaleString()}원
                          </div>
                        </div>
                      )}

                      {!state.hideSubPreed && hiPlusMonthlySupport > 0 && (
                        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-black text-slate-900">
                                (-) 구독프리드 (Hi구독 플러스) 월 지원금
                              </div>
                              <div className="text-xs font-bold text-indigo-700">
                                {representativePeriod}개월간 매월 캐시백 지원
                              </div>
                            </div>
                          </div>
                          <div className="text-2xl font-black text-indigo-600 shrink-0 whitespace-nowrap">
                            월 -{hiPlusMonthlySupport.toLocaleString()}원
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 메인 월 체감 구독료 강조 박스 */}
                  <div className="bg-rose-50/70 border-2 border-rose-500 rounded-2xl p-6 text-center space-y-2 shadow-xs">
                    {(cardMonthlyDiscount > 0 || (!state.hideSubPreed && hiPlusMonthlySupport > 0)) && (
                      <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-rose-200 text-xs font-extrabold text-slate-700">
                        <span>{subFormulaText}</span>
                      </div>
                    )}
                    <div className="text-sm font-black text-rose-600 pt-1">
                      {subSummary.totalSubCashback > 0
                        ? `💳 월 체감 구독료 (${periodLabel} 구독)`
                        : `🎯 최종 월 체감가 (${periodLabel} 구독)`}
                    </div>
                    <div className="text-5xl font-black text-rose-600 tracking-tight py-1">
                      월 <SpringNumberFlow value={finalMonthlyFee} suffix="원" />
                    </div>
                    {subSummary.totalSubCashback > 0 && (
                      <div className="text-xs font-bold text-slate-600">
                        {periodLabel} 월 납부 합계{' '}
                        {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원 (약정 원금{' '}
                        {totalPrincipal.toLocaleString()}원)
                      </div>
                    )}
                    {finalMonthlyFee < 0 && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black">
                          🎉 월 구독료 0원 + 매월 +
                          {Math.abs(finalMonthlyFee).toLocaleString()}원씩 더 이득!
                          (총 +{Math.abs(finalTotal60Fee).toLocaleString()}원 추가
                          이익!)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 일시 지급 캐시백(1회 입금)이 있을 때: 캐시백 차감 단계 ➔ 🎯 최종 기간 체감가 히어로 */}
                  {subSummary.totalSubCashback > 0 ? (
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl px-5 py-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Gift className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-black text-slate-900">
                              (-) 구독 일시 입금 캐시백 혜택 (1회 입금)
                            </div>
                            <div className="text-xs font-bold text-emerald-700">
                              {subCashbackDetailParts.join(' · ')} · 최종 체감가에서 일시 차감
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 whitespace-nowrap">
                          <div className="text-2xl font-black text-emerald-600">
                            -{subSummary.totalSubCashback.toLocaleString()}원
                          </div>
                          <div className="text-[11px] font-extrabold text-emerald-800">
                            1회 일시 입금
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-amber-300">
                            🎯 최종 {periodLabel} 체감가 (일시 캐시백 차감 반영)
                          </div>
                          <div className="text-xs font-bold text-slate-300 mt-0.5">
                            {periodLabel} 월 납부 합계{' '}
                            {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원 ➖ 일시 입금 캐시백{' '}
                            {subSummary.totalSubCashback.toLocaleString()}원{' '}
                            <span className="whitespace-nowrap">
                              (원금 {totalPrincipal.toLocaleString()}원)
                            </span>
                          </div>
                          {finalMonthlyFee >= 0 && finalTotal60Fee < 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-black">
                              🎉 일시 캐시백 반영 시 0원 + 총 +
                              {Math.abs(finalTotal60Fee).toLocaleString()}원 추가 이득!
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 pl-4 whitespace-nowrap">
                          <span className="text-3xl font-black text-amber-400 tracking-tight">
                            <SpringNumberFlow value={finalTotal60Fee} suffix="원" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 일시 캐시백이 없을 때: 기본 최하단 요약 리본 바 */
                    <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-2">
                      <span className="text-base font-black text-slate-200 whitespace-nowrap shrink-0">
                        최종 {periodLabel} 체감가 합계
                      </span>
                      <div className="flex items-baseline gap-2.5 flex-wrap justify-end text-right">
                        <span className="text-2xl font-black text-white whitespace-nowrap">
                          <SpringNumberFlow value={finalTotal60Fee} suffix="원" />
                        </span>
                        <span className="text-sm font-bold text-slate-400 whitespace-nowrap">
                          (원금 {totalPrincipal.toLocaleString()}원)
                        </span>
                      </div>
                    </div>
                  )}

                  {!state.hideSubPreed && subSummary.hiSummary?.totalAccounts > 0 && (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 text-indigo-950 font-extrabold">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          구독프리드(Hi구독 플러스) 안내: 납입기간 90회(30회는 거치만 · 120회 만기) 시 납입 원금{' '}
                          <strong className="text-indigo-700">
                            {subSummary.hiSummary.totalMaturityRefund.toLocaleString()}원 100% 전액 환급 (서비스 미이용 시)
                          </strong>
                        </span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 shrink-0 whitespace-nowrap">
                        월 납입금 {subSummary.hiSummary.totalMonthlyDeposit.toLocaleString()}원 · 납입기간 90회 (30회는 거치만)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- CASE C: 일반+구독 혼합 제안서 -------------------- */}
              {state.quoteMode === 'hybrid' && (
                <div className="space-y-4">
                  {/* 상단 헤더 */}
                  <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-extrabold">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          맞춤 혼합 설계안
                        </div>
                        {hasBothPlans && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold">
                            일반 견적 {activePlan}안 적용
                          </span>
                        )}
                        {activeCustomer && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-extrabold">
                            <User className="w-3 h-3 text-amber-300" />
                            [{activeCustomer.name} 고객님 맞춤 제안서]
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl font-black tracking-tight text-white">
                        일반구매 · 구독구매 통합 맞춤 제안서
                      </h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-extrabold text-blue-300 whitespace-nowrap">
                        일반 제휴카드: {state.generalCardType === '미정' || state.generalCardType === '일반카드' ? '미적용' : state.generalCardType}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-extrabold text-rose-300 whitespace-nowrap">
                        구독: {periodLabel}
                      </span>
                    </div>
                  </div>

                  {/* 좌우 2단 대칭 배치 (min-w-0 overflow-hidden 적용으로 폴드8 울트라 펼침 화면 긴 모델명 텍스트 삐져나감 원천 차단) */}
                  <div className="grid grid-cols-2 gap-4 items-start">
                    {/* 좌측: [파트 A. 일반구매] */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
                        <span className="text-sm font-black text-blue-700 flex items-center gap-1.5 min-w-0">
                          <ShoppingBag className="w-4 h-4 shrink-0" />
                          <span className="truncate">파트 A. 일반구매 (일시불)</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500 shrink-0 whitespace-nowrap">
                          {state.generalItems.length}개 품목
                        </span>
                      </div>

                      {/* 품목 및 총 합계 */}
                      {state.generalItems.length >= 2 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5 overflow-hidden">
                          {state.generalItems.map((it: any, idx: number) => {
                            const amt =
                              (Number(it.unitPrice) || 0) *
                              Math.max(1, Number(it.quantity) || 1);
                            return (
                              <div
                                key={it.id}
                                className="flex items-start justify-between gap-2 text-xs font-bold text-slate-700"
                              >
                                <span className="min-w-0 flex-1 break-all leading-snug">
                                  {idx + 1}. {fmtCat(it.category) || `일반가전 ${idx + 1}`}
                                  {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                                  {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                                </span>
                                <span className="font-black text-slate-900 font-mono shrink-0 whitespace-nowrap">
                                  {amt.toLocaleString()}원
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-700 shrink-0">
                              총 합계 금액
                            </span>
                            <span className="text-base font-black text-slate-900 font-mono shrink-0 whitespace-nowrap">
                              {generalSummary.sum.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-2 overflow-hidden">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-extrabold text-blue-600">
                              구매 품목
                            </div>
                            <div className="text-sm font-black text-slate-900 break-all leading-snug mt-0.5">
                              {fmtCat(state.generalItems[0]?.category) || '일반구매 가전'}
                              {state.generalItems[0]?.modelName
                                ? ` (${fmtModel(state.generalItems[0].modelName)})`
                                : ''}
                            </div>
                          </div>
                          <div className="text-right shrink-0 whitespace-nowrap pl-1">
                            <div className="text-[10px] font-bold text-slate-500">
                              총 합계 금액
                            </div>
                            <div className="text-base font-black text-slate-900 font-mono">
                              {generalSummary.sum.toLocaleString()}원
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 1단계 */}
                      {generalSummary.totalDiscountAndBenefit > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                          {(generalSummary.totalStep1InstantDiscount > 0 ||
                            (!state.hideHiPreed && generalSummary.hiFreedSupport > 0)) && (
                            <div className="text-xs font-black text-blue-700">
                              [1단계: 고객 실 결제부담금 산출]
                            </div>
                          )}
                          {generalSummary.totalStep1InstantDiscount > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                              <span className="min-w-0">(-) 즉시할인 혜택</span>
                              <span className="font-black text-blue-600 font-mono shrink-0 whitespace-nowrap">
                                -
                                {generalSummary.totalStep1InstantDiscount.toLocaleString()}
                                원
                              </span>
                            </div>
                          )}
                          {!state.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                              <span className="min-w-0">(-) 하이프리드 지원금</span>
                              <span className="font-black text-blue-600 font-mono shrink-0 whitespace-nowrap">
                                -{generalSummary.hiFreedSupport.toLocaleString()}원
                              </span>
                            </div>
                          )}
                          <div className="bg-blue-600 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-black whitespace-nowrap">
                              💳 고객 실 결제부담금
                            </span>
                            <span className="text-base font-black font-mono shrink-0 whitespace-nowrap">
                              {generalSummary.payPrice.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 2단계 */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                        {(generalSummary.totalStep2Cashback > 0 ||
                          generalSummary.totalStep2ExtraBenefit > 0) && (
                          <div className="text-xs font-black text-rose-600">
                            [2단계: 캐시백 및 추가 혜택 차감]
                          </div>
                        )}
                        {generalSummary.totalStep2Cashback > 0 && (
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                            <span className="min-w-0">(-) 캐시백 혜택</span>
                            <span className="font-black text-rose-600 font-mono shrink-0 whitespace-nowrap">
                              -{generalSummary.totalStep2Cashback.toLocaleString()}원
                            </span>
                          </div>
                        )}
                        {generalSummary.totalStep2ExtraBenefit > 0 && (
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                            <span className="min-w-0">(-) 추가 혜택</span>
                            <span className="font-black text-rose-600 font-mono shrink-0 whitespace-nowrap">
                              -{generalSummary.totalStep2ExtraBenefit.toLocaleString()}
                              원
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

                    {/* 우측: [파트 B. 구독구매] */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
                        <span className="text-sm font-black text-rose-600 flex items-center gap-1.5 min-w-0">
                          <RefreshCw className="w-4 h-4 shrink-0" />
                          <span className="truncate">파트 B. 구독구매 ({periodLabel})</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500 shrink-0 whitespace-nowrap">
                          {state.items.length}개 품목
                        </span>
                      </div>

                      {/* 품목 및 총 월 구독료 합계 (긴 모델명 자동 줄바꿈 + 오른쪽 가격 잘림 0%) */}
                      {state.items.length >= 2 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 overflow-hidden">
                          {state.items.map((it: any, idx: number) => {
                            const itemPeriod: SubscriptionPeriod =
                              it.period === 36
                                ? 36
                                : it.period === 60
                                ? 60
                                : state.subscriptionPeriod === 36
                                ? 36
                                : 60;
                            const itemWarrantyText = '5년 무상 A/S 보장';
                            const cleanCareService = sanitizeFiveYearText(
                              it.careService || '전문가 방문케어'
                            );
                            return (
                              <div
                                key={it.id}
                                className="flex items-start justify-between text-xs gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap leading-snug">
                                    <span className="break-all">
                                      {idx + 1}. {fmtCat(it.category) || `구독가전 ${idx + 1}`}
                                      {it.modelName ? ` (${fmtModel(it.modelName)})` : ''}
                                    </span>
                                    <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md shrink-0">
                                      [{itemPeriod}개월 구독]
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                    🛡️ {cleanCareService} · {itemWarrantyText}
                                  </div>
                                </div>
                                <span className="font-black text-slate-900 font-mono shrink-0 whitespace-nowrap text-right">
                                  월 {(Number(it.monthlyFee) || 0).toLocaleString()}
                                  원{' '}
                                  <span className="text-[10.5px] font-extrabold text-rose-600">
                                    ({itemPeriod}M)
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-700 shrink-0">
                              총 월 구독료 합계
                            </span>
                            <span className="text-base font-black text-slate-900 font-mono shrink-0 whitespace-nowrap">
                              월 {totalBaseMonthly.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const singleItem = state.items[0];
                          const singlePeriod: SubscriptionPeriod =
                            singleItem?.period === 36
                              ? 36
                              : singleItem?.period === 60
                              ? 60
                              : state.subscriptionPeriod === 36
                              ? 36
                              : 60;
                          const singleWarrantyText = '5년 무상 A/S 보장';
                          const cleanSingleCareService = sanitizeFiveYearText(
                            singleItem?.careService || '전문가 방문케어'
                          );
                          return (
                            <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-2.5 overflow-hidden">
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-extrabold text-rose-600">
                                  구독 품목
                                </div>
                                <div className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap leading-snug mt-0.5">
                                  <span className="break-all">
                                    {fmtCat(singleItem?.category) || '구독 가전'}
                                    {singleItem?.modelName
                                      ? ` (${fmtModel(singleItem.modelName)})`
                                      : ''}
                                  </span>
                                  <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md shrink-0">
                                    [{singlePeriod}개월 구독]
                                  </span>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 mt-1">
                                  🛡️ {cleanSingleCareService} · {singleWarrantyText}
                                </div>
                              </div>
                              <div className="text-right shrink-0 whitespace-nowrap pl-1">
                                <div className="text-[10px] font-bold text-slate-500">
                                  총 월 구독료 합계
                                </div>
                                <div className="text-base font-black text-slate-900 font-mono">
                                  월 {totalBaseMonthly.toLocaleString()}원
                                </div>
                                <div className="text-[10.5px] font-extrabold text-rose-600">
                                  ({singlePeriod}개월 구독)
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* 월 할인 및 지원금 차감 */}
                      {(cardMonthlyDiscount > 0 || (!state.hideSubPreed && hiPlusMonthlySupport > 0)) && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                          <div className="text-xs font-black text-slate-700">
                            월 할인 및 지원금 차감
                          </div>
                          {cardMonthlyDiscount > 0 &&
                            currentCard &&
                            currentCardTier && (
                              <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                                <span className="min-w-0 break-keep">
                                  (-) 제휴카드 월 {subCardBenefitLabel} ({currentCard.shortName} ·{' '}
                                  {currentCardTier.minSpendShort})
                                </span>
                                <span className="font-black text-blue-600 font-mono shrink-0 whitespace-nowrap">
                                  월 -{cardMonthlyDiscount.toLocaleString()}원
                                </span>
                              </div>
                            )}
                          {!state.hideSubPreed && hiPlusMonthlySupport > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                              <span className="min-w-0">(-) 구독프리드 월 지원금</span>
                              <span className="font-black text-indigo-600 font-mono shrink-0 whitespace-nowrap">
                                월 -{hiPlusMonthlySupport.toLocaleString()}원
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 메인 히어로: 월 체감 구독료 */}
                      <div className="bg-rose-50/80 border-2 border-rose-500 rounded-xl p-4 text-center space-y-1">
                        {(cardMonthlyDiscount > 0 || (!state.hideSubPreed && hiPlusMonthlySupport > 0)) && (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-rose-200 text-[10px] font-extrabold text-slate-600">
                            {subFormulaText}
                          </div>
                        )}
                        <div className="text-xs font-black text-rose-600 pt-0.5">
                          {subSummary.totalSubCashback > 0
                            ? `💳 월 체감 구독료 (${periodLabel})`
                            : `🎯 최종 월 체감가 (${periodLabel})`}
                        </div>
                        <div className="text-2xl font-black text-rose-600 font-mono">
                          월 {finalMonthlyFee.toLocaleString()}원
                        </div>
                      </div>

                      {/* 일시 입금 캐시백 차감 박스 */}
                      {subSummary.totalSubCashback > 0 && (
                        <div className="bg-emerald-50/90 rounded-xl border border-emerald-300 p-3 space-y-1.5">
                          <div className="text-[11px] font-black text-emerald-900">
                            [일시 입금 캐시백 차감 · 1회 입금]
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                            <span>{periodLabel} 월 납부 합계</span>
                            <span className="font-extrabold text-slate-800 font-mono shrink-0 whitespace-nowrap">
                              {subSummary.totalTermBillingBeforeCashback.toLocaleString()}원
                            </span>
                          </div>
                          {subSummary.subTierCashback > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-800">
                              <span className="min-w-0">
                                (-) {currentCard?.shortName || '제휴카드'} 금액대별 캐시백
                              </span>
                              <span className="font-black text-emerald-600 font-mono shrink-0 whitespace-nowrap">
                                -{subSummary.subTierCashback.toLocaleString()}원
                              </span>
                            </div>
                          )}
                          {subSummary.subExtraCashback > 0 && (
                            <div className="flex items-center justify-between gap-2 text-xs font-bold text-emerald-800">
                              <span className="min-w-0">(-) 구독 추가 캐시백 (1회 입금)</span>
                              <span className="font-black text-emerald-600 font-mono shrink-0 whitespace-nowrap">
                                -{subSummary.subExtraCashback.toLocaleString()}원
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 최하단 요약 리본 바: 최종 기간 체감가 */}
                      <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-extrabold text-amber-300 whitespace-nowrap shrink-0">
                          🎯 최종 {periodLabel} 체감가
                        </span>
                        <span className="font-black text-white font-mono text-right flex flex-wrap items-baseline justify-end gap-x-1.5">
                          <span className="whitespace-nowrap">{finalTotal60Fee.toLocaleString()}원</span>
                          <span className="font-bold text-slate-400 text-[11px] whitespace-nowrap">
                            (원금 {totalPrincipal.toLocaleString()}원)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ==================== 혼합 제안서 최하단 통합 합산 바 ==================== */}
                  <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex items-center justify-between gap-4 shadow-md">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-100 break-keep leading-relaxed">
                        일반구매 최종 혜택가 ({generalSummary.rawNet.toLocaleString()}
                        원) + 구독구매 {periodLabel} 최종 체감가 (
                        {finalTotal60Fee.toLocaleString()}원 · 월{' '}
                        {finalMonthlyFee.toLocaleString()}원
                        {subSummary.totalSubCashback > 0 &&
                          ` · 일시캐시백 -${subSummary.totalSubCashback.toLocaleString()}원 반영`}
                        )
                      </div>
                      <div className="text-xs font-bold text-slate-400">
                        일반 실결제 부담금 {generalSummary.payPrice.toLocaleString()}
                        원
                        {hybridTotalDiscountAndSupport > 0 &&
                          ` · 통합 총 할인/캐시백/지원 혜택 -${hybridTotalDiscountAndSupport.toLocaleString()}원`}
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2 whitespace-nowrap">
                      <div className="text-xs font-extrabold text-amber-300 mb-0.5">
                        🎯 일반구매 + 구독구매 최종 혜택가 합계
                      </div>
                      <div className="text-3xl font-black text-amber-400 tracking-tight font-mono">
                        {hybridCombinedNetTotal.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {((!state.hideHiPreed && generalHiPreedSummary?.totalAccounts > 0) ||
                    (!state.hideSubPreed && subSummary.hiSummary?.totalAccounts > 0)) && (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5 text-indigo-950 font-extrabold">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          프리드 결합 만기 환급 안내 (서비스 미이용 시 납입 원금 100% 전액 환급):
                        </span>
                      </span>
                      <span className="text-[11.5px] font-extrabold text-indigo-800 break-keep">
                        {!state.hideHiPreed &&
                          generalHiPreedSummary?.totalAccounts > 0 &&
                          `일반 하이프리드 만기(150회) ${generalHiPreedSummary.totalMaturityRefund.toLocaleString()}원 환급`}
                        {!state.hideHiPreed &&
                          generalHiPreedSummary?.totalAccounts > 0 &&
                          !state.hideSubPreed &&
                          subSummary.hiSummary?.totalAccounts > 0 &&
                          ' · '}
                        {!state.hideSubPreed &&
                          subSummary.hiSummary?.totalAccounts > 0 &&
                          `구독프리드 (납입기간 90회 · 30회는 거치만 / 120회 만기) ${subSummary.hiSummary.totalMaturityRefund.toLocaleString()}원 환급`}
                      </span>
                    </div>
                  )}
                </div>
              )}
    </>
  );
};
