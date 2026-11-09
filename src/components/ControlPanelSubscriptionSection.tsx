import React from 'react';
import { AFFILIATE_CARDS, isSubTierCashbackEligibleCard, MAX_LIFECARE_TOTAL_ACCOUNTS, HI_PLUS_PLANS, SUB_CARE_OPTIONS, SubscriptionPeriod } from '../types/proposal';
import { Camera, Check, CreditCard, Eye, EyeOff, Loader2, Minus, Plus, RotateCcw, ShieldCheck, X } from 'lucide-react';

export const ControlPanelSubscriptionSection: React.FC<Record<string, any>> = ({
  bothSubPlansHavePrice,
  cardDiscount,
  currentCard,
  fileInputRef,
  generalHiPreedSummary,
  handleAddSubItem,
  handleAdjustHiPlus,
  handleCardSelect,
  handleFileChange,
  handleRemoveSubItem,
  handleResetHiPlus,
  handleResetSubItems,
  handleUpdateSubItem,
  hiPlusMonthly,
  hiSummary,
  isParsing,
  liveSubSummary,
  onChange,
  onShowProposal,
  parseError,
  periodLabel,
  plan1SubSummary,
  plan2SubSummary,
  rawFinalMonthly,
  representativePeriod,
  setLastFocusedSection,
  showSubscription,
  state,
  subNetDiff,
  subScanNotice,
  subTotalNetDiff,
  totalBaseMonthly,
  totalPrincipal,
}) => {
  const handleToggleHideSubPreed = () => {
    onChange((prev: any) => {
      const nextHidden = !prev.hideSubPreed;
      return {
        ...prev,
        hideSubPreed: nextHidden,
        generalPlan1: { ...prev.generalPlan1, hideSubPreed: nextHidden },
        generalPlan2: { ...prev.generalPlan2, hideSubPreed: nextHidden },
      };
    });
  };

  return (
    <>
        {/* ==================== 구독구매 입력 카드 ==================== */}
        {showSubscription && (
          <div
            onClick={() => setLastFocusedSection('subscription')}
            onMouseEnter={() => setLastFocusedSection('subscription')}
            className="w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-6 space-y-4"
          >
            {/* 숨김 파일 input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* 1. 구독 품목 및 월요금 + 품목별 개별 개월수/케어서비스 */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-900">
                  1. 구독 품목 및 월요금 ({state.activeGeneralPlan}안)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                    title="클릭하거나 화면에서 Ctrl+V로 구독 전산 캡처 붙여넣기"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI 판독 중...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>📸 구독전산 사진 자동입력</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSubItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 품목 추가
                  </button>
                  <button
                    type="button"
                    onClick={handleResetSubItems}
                    title="구독 품목 목록 초기화"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-extrabold text-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> 초기화
                  </button>
                </div>
              </div>
              {subScanNotice && (
                <p className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-1.5 px-3 text-center">
                  {subScanNotice}
                </p>
              )}
              {parseError && (
                <p className="text-xs font-bold text-red-600 text-center">
                  {parseError}
                </p>
              )}

              {/* 품목 행 + 품목별 개별 [36개월 | 60개월] 토글 & 케어서비스 선택/입력 줄 */}
              <div className="max-h-none sm:max-h-[260px] sm:overflow-y-auto space-y-2.5 sm:space-y-2 sm:pr-1">
                {state.items.map((item: any, index: number) => {
                  const itemPeriod: SubscriptionPeriod =
                    item.period === 36
                      ? 36
                      : item.period === 60
                      ? 60
                      : state.subscriptionPeriod === 36
                      ? 36
                      : 60;
                  const itemWarrantyBadge = '5년 무상 A/S 기본 포함';

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5"
                    >
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) =>
                            handleUpdateSubItem(item.id, {
                              category: e.target.value,
                            })
                          }
                          placeholder={`품목명 ${index + 1}`}
                          className="col-span-5 sm:col-span-3 order-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={item.modelName}
                          onChange={(e) =>
                            handleUpdateSubItem(item.id, {
                              modelName: e.target.value,
                              modelCode: e.target.value,
                            })
                          }
                          placeholder="모델코드"
                          className="col-span-6 sm:col-span-2 order-2 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
                        />
                        {/* 품목별 개별 [36개월 | 60개월] 선택 토글 */}
                        <div className="col-span-5 sm:col-span-3 order-4 sm:order-3 flex justify-center">
                          <div className="inline-flex w-full bg-white p-0.5 rounded-lg border border-slate-200">
                            {([36, 60] as SubscriptionPeriod[]).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() =>
                                  handleUpdateSubItem(item.id, {
                                    period: p,
                                    warrantyType: '5년 무상 A/S 기본 포함',
                                  })
                                }
                                className={`flex-1 py-1 rounded-md font-extrabold text-[11px] sm:text-[11px] transition cursor-pointer whitespace-nowrap ${
                                  itemPeriod === p
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900'
                                }`}
                              >
                                {p}개월
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-7 sm:col-span-3 order-5 sm:order-4 relative">
                          <input
                            type="number"
                            step={1000}
                            value={item.monthlyFee || ''}
                            onChange={(e) =>
                              handleUpdateSubItem(item.id, {
                                monthlyFee: Math.max(0, Number(e.target.value)),
                              })
                            }
                            placeholder="월 납부요금"
                            className="w-full pl-2 pr-5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-900 text-right focus:border-blue-600 focus:outline-none"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            원
                          </span>
                        </div>
                        <div className="col-span-1 sm:col-span-1 order-3 sm:order-5 flex justify-center">
                          {state.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 아래쪽 줄: 품목별 개별 케어서비스 선택/입력 + 우측 품목별 개월수 & 보장서비스 배지 */}
                      <div className="grid grid-cols-12 gap-1.5 items-center pt-0.5">
                        <select
                          value={
                            SUB_CARE_OPTIONS.includes(item.careService)
                              ? item.careService
                              : 'custom'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== 'custom') {
                              handleUpdateSubItem(item.id, {
                                careService: val,
                                careType: val,
                              });
                            }
                          }}
                          className="col-span-6 sm:col-span-4 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-extrabold text-slate-700 focus:border-blue-600 focus:outline-none"
                        >
                          {SUB_CARE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="custom">직접 입력 / AI추출</option>
                        </select>

                        <input
                          type="text"
                          value={item.careService || ''}
                          onChange={(e) =>
                            handleUpdateSubItem(item.id, {
                              careService: e.target.value,
                              careType: e.target.value,
                            })
                          }
                          placeholder="케어서비스 (예: 안심케어_1)"
                          className="col-span-6 sm:col-span-4 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus:border-blue-600 focus:outline-none"
                        />

                        <div className="col-span-12 sm:col-span-4 flex items-center justify-end gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-200/80 text-[10px] font-black text-slate-700 shrink-0">
                            {itemPeriod}개월
                          </span>
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-[10px] font-extrabold text-rose-700 truncate"
                            title={`${itemPeriod}개월 구독 · ${itemWarrantyBadge} 기본 보장`}
                          >
                            🛡️ {itemWarrantyBadge}
                          </span>
                        </div>
                      </div>

                      {item.contractAmount && item.contractAmount > 0 ? (
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1 pt-0.5">
                          <span>
                            계약/결제금액:{' '}
                            <strong className="text-slate-800">
                              {item.contractAmount.toLocaleString()}원
                            </strong>
                          </span>
                          {item.cardName && (
                            <span className="text-blue-600 font-extrabold">
                              전산 인식 카드: {item.cardName}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-slate-500 px-1">
                <span className="text-rose-600 font-extrabold">
                  ✓ 구독기간: {periodLabel} (원금 합계{' '}
                  {totalPrincipal.toLocaleString()}원 · 전 품목 5년 무상 A/S 기본 보장)
                </span>
                <span className="text-slate-800 font-extrabold">
                  총 월 구독료 합계: {totalBaseMonthly.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 2. 제휴카드 및 월 사용금액 구간 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>2. 구독 제휴카드 선택 및 월 사용금액 구간</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">
                  제휴카드 전용
                </span>
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {AFFILIATE_CARDS.map((card) => {
                  const selected = state.selectedCardId === card.id;
                  const hasPrincipalTier = isSubTierCashbackEligibleCard(card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleCardSelect(card.id)}
                      className={`py-1.5 sm:py-2 px-1 sm:px-1.5 rounded-xl font-extrabold text-[11px] sm:text-xs whitespace-nowrap border transition cursor-pointer flex flex-col items-center justify-center ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{card.shortName}</span>
                      {hasPrincipalTier && (
                        <span
                          className={`text-[8.5px] font-black leading-tight mt-0.5 px-1 rounded ${
                            selected
                              ? 'bg-amber-300 text-slate-950'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          300만↑캐백
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleCardSelect('none')}
                  className={`py-1.5 sm:py-2 px-1 sm:px-1.5 rounded-xl font-extrabold text-[11px] sm:text-xs whitespace-nowrap border transition cursor-pointer ${
                    state.selectedCardId === 'none'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  제휴카드 미적용
                </button>
              </div>

              {currentCard && (
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  {currentCard.tiers.map((tier: any) => {
                    const active = state.selectedCardTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() =>
                          onChange((prev: any) => ({
                            ...prev,
                            selectedCardTierId: tier.id,
                          }))
                        }
                        className={`py-1.5 sm:py-2 px-1.5 sm:px-2 rounded-xl border text-center transition cursor-pointer ${
                          active
                            ? 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-600/15'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 whitespace-nowrap">
                          {tier.minSpendShort}
                        </div>
                        <div className="text-[11px] sm:text-xs font-black text-blue-600 whitespace-nowrap">
                          -{tier.monthlyDiscount.toLocaleString()}원
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 삼성·신한 300만↑ 금액대별 캐시백 자동 감지 안내 배너 & 구독 추가 캐시백 입력 칸 */}
              <div className="pt-1.5 space-y-2">
                {liveSubSummary.isTierCashbackCard && (
                  <div
                    className={`rounded-xl px-3 py-2 border text-[11px] font-bold flex items-center justify-between gap-2 flex-wrap ${
                      totalPrincipal >= 3000000
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    {totalPrincipal >= 3000000 ? (
                      <span>
                        ✨ <strong>{currentCard?.shortName}</strong> 구독원금{' '}
                        <strong>{totalPrincipal.toLocaleString()}원</strong> (300만↑ 구간 충족) ➔ 금액대별 캐시백{' '}
                        <strong className="text-emerald-700">
                          -{liveSubSummary.autoSubTierCashback.toLocaleString()}원
                        </strong>{' '}
                        자동 적용!
                      </span>
                    ) : (
                      <span>
                        💡 <strong>{currentCard?.shortName}</strong>는 구독원금 300만원 이상 시 금액대별 캐시백(15만~100만원)이 추가 지급됩니다. (현재 원금{' '}
                        <strong>{totalPrincipal.toLocaleString()}원</strong> ·{' '}
                        <strong className="text-rose-600">
                          {(3000000 - totalPrincipal).toLocaleString()}원
                        </strong>{' '}
                        추가 시 15만원 지급)
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* 좌측: 삼성·신한 구독원금 300만↑ 금액대별 캐시백 */}
                  <div
                    className={`p-2.5 rounded-xl border ${
                      liveSubSummary.subTierCashback > 0
                        ? 'bg-blue-50/75 border-blue-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-[10.5px] font-extrabold text-blue-950">
                        (-) 금액대별 캐시백 (삼성·신한 제휴카드 300만↑)
                      </label>
                      {state.subAutoTierCashback === false ? (
                        <button
                          type="button"
                          onClick={() =>
                            onChange((prev: any) => ({
                              ...prev,
                              subAutoTierCashback: true,
                              subManualTierCashback: 0,
                            }))
                          }
                          className="text-[9.5px] font-black text-blue-600 hover:underline cursor-pointer"
                        >
                          자동계산 복원
                        </button>
                      ) : (
                        <span className="text-[9.5px] font-bold text-blue-600">
                          {liveSubSummary.isTierCashbackCard
                            ? totalPrincipal >= 3000000
                              ? '원금기준 자동적용'
                              : '원금 300만 미만'
                            : '삼성·신한 제휴카드 전용'}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step={10000}
                      value={liveSubSummary.subTierCashback || ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          onChange((prev: any) => ({
                            ...prev,
                            subAutoTierCashback: false,
                            subManualTierCashback: 0,
                          }));
                          return;
                        }
                        onChange((prev: any) => ({
                          ...prev,
                          subAutoTierCashback: false,
                          subManualTierCashback: Math.max(0, Number(raw) || 0),
                        }));
                      }}
                      placeholder={
                        liveSubSummary.isTierCashbackCard
                          ? '300만원 이상 시 자동 계산'
                          : '삼성·신한 제휴카드 선택 시 자동 계산'
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 text-base sm:text-xs font-black text-right text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 우측: 구독 추가 캐시백 */}
                  <div
                    className={`p-2.5 rounded-xl border ${
                      liveSubSummary.subExtraCashback > 0
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="text-[10.5px] font-extrabold text-slate-800">
                        (-) 구독 추가 캐시백 · 1회 입금 (최종 체감가 차감)
                      </label>
                      <div className="flex items-center gap-1">
                        {[50000, 100000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() =>
                              onChange((prev: any) => ({
                                ...prev,
                                subExtraCashback:
                                  Math.max(0, Number(prev.subExtraCashback) || 0) + amt,
                              }))
                            }
                            className="px-1.5 py-0.2 rounded bg-white hover:bg-rose-100 border border-slate-200 text-[9.5px] font-extrabold text-rose-700 cursor-pointer"
                          >
                            +{amt / 10000}만
                          </button>
                        ))}
                        {(state.subExtraCashback || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onChange((prev: any) => ({
                                ...prev,
                                subExtraCashback: 0,
                              }))
                            }
                            className="px-1.5 py-0.2 rounded bg-slate-200 hover:bg-slate-300 text-[9.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="number"
                      step={10000}
                      value={state.subExtraCashback || ''}
                      onChange={(e) =>
                        onChange((prev: any) => ({
                          ...prev,
                          subExtraCashback: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      placeholder="추가 캐시백 금액 입력 (예: 100000)"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-base sm:text-xs font-black text-right text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 구독프리드 (Hi구독 플러스) + 숨기기/보이기 토글 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  3. 구독프리드 (Hi구독 플러스)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!state.hideSubPreed && (
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {state.quoteMode === 'hybrid'
                        ? `합산 ${generalHiPreedSummary.totalAccounts + hiSummary.totalAccounts}개 / 최대 8개`
                        : `총 ${hiSummary.totalAccounts}개 / 최대 8개`}{' '}
                      (월 -{hiSummary.monthlyHiPlusSupport.toLocaleString()}원)
                    </span>
                  )}
                  {!state.hideSubPreed && hiSummary.totalAccounts > 0 && (
                    <button
                      type="button"
                      onClick={handleResetHiPlus}
                      className="text-[11px] font-extrabold text-slate-600 hover:text-red-600 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-red-50 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> 미적용(초기화)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleHideSubPreed}
                    title="숨김 설정 시 내 화면과 고객이 받는 공유 견적서 화면에서 구독프리드 영역이 완전히 숨겨집니다"
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black border transition cursor-pointer ${
                      state.hideSubPreed
                        ? 'bg-slate-800 text-amber-300 border-slate-700 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {state.hideSubPreed ? (
                      <>
                        <EyeOff className="w-3 h-3 text-amber-300" />
                        <span>구독프리드 숨김중 (보이기)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 text-indigo-600" />
                        <span>구독프리드 숨기기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {state.hideSubPreed ? (
                <div className="rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-600">
                    🙈 구독프리드(Hi구독 플러스) 영역이 숨겨진 상태입니다 (제안서 및 고객 공유 화면에서도 표시되지 않습니다)
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleHideSubPreed}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-[11px] font-black shrink-0 cursor-pointer"
                  >
                    다시 보이기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {HI_PLUS_PLANS.map((plan) => {
                    const count = state.hiPlusCounts[plan.id] || 0;
                    const active = count > 0;
                    const canAdd =
                      hiSummary.totalAccounts +
                        (state.quoteMode === 'hybrid'
                          ? generalHiPreedSummary.totalAccounts
                          : 0) <
                      MAX_LIFECARE_TOTAL_ACCOUNTS;
                    const monthlyUnitSupport =
                      representativePeriod === 36
                        ? plan.monthlySupport36
                        : plan.monthlySupport60;

                    return (
                      <div
                        key={plan.id}
                        className={`p-2 sm:p-3 rounded-2xl border-2 flex flex-col justify-between transition ${
                          active
                            ? 'bg-blue-50/70 border-blue-600 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="text-center mb-1.5 sm:mb-2">
                          <div
                            className={`text-[11px] sm:text-sm font-black whitespace-nowrap ${
                              active ? 'text-blue-700' : 'text-slate-800'
                            }`}
                          >
                            {plan.buttonLabel}
                          </div>
                          <div className="text-[9.5px] sm:text-[11px] font-extrabold text-rose-600 mt-0.5 truncate">
                            월 -{monthlyUnitSupport.toLocaleString()}원
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleAdjustHiPlus(plan.id, -1)}
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
                            onClick={() => handleAdjustHiPlus(plan.id, 1)}
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

            {/* 구독구매 실시간 월 체감 구독료 + 일시 캐시백 반영 최종 체감가 요약 바 */}
            <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-black text-rose-700">
                    실시간 월 체감 구독료 ({state.activeGeneralPlan}안 ·{' '}
                    {periodLabel})
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold">
                    기본 월 {totalBaseMonthly.toLocaleString()}원 - 제휴카드{' '}
                    {cardDiscount.toLocaleString()}원
                    {!state.hideSubPreed && (
                      <> - 프리드 {hiPlusMonthly.toLocaleString()}원</>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg sm:text-xl font-black text-rose-600">
                    월 {rawFinalMonthly.toLocaleString()}원
                  </div>
                </div>
              </div>

              {(totalBaseMonthly > 0 || liveSubSummary.totalSubCashback > 0) && (
                <div
                  className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                    liveSubSummary.totalSubCashback > 0
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white/90 border border-rose-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold">
                    {liveSubSummary.totalSubCashback > 0 ? (
                      <>
                        🎁 1회 입금 캐시백{' '}
                        <strong>
                          -{liveSubSummary.totalSubCashback.toLocaleString()}원
                        </strong>{' '}
                        차감 반영 ({periodLabel} 납부합계{' '}
                        {liveSubSummary.totalTermBillingBeforeCashback.toLocaleString()}원 기준)
                      </>
                    ) : (
                      <>
                        🎯 최종 {periodLabel} 체감가 합계 (원금{' '}
                        {totalPrincipal.toLocaleString()}원)
                      </>
                    )}
                  </div>
                  <div className="font-black text-sm sm:text-base shrink-0">
                    최종 체감가 {liveSubSummary.finalTotalFee.toLocaleString()}원
                  </div>
                </div>
              )}

              {bothSubPlansHavePrice && (
                <div className="bg-slate-900 text-white rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <div className="font-bold">
                    <span className="text-rose-300 font-black">
                      [1안: 월 {plan1SubSummary.finalMonthlyFee.toLocaleString()}원 · 총{' '}
                      {plan1SubSummary.finalTotalFee.toLocaleString()}원]
                    </span>{' '}
                    vs{' '}
                    <span className="text-amber-300 font-black">
                      [2안: 월 {plan2SubSummary.finalMonthlyFee.toLocaleString()}원 · 총{' '}
                      {plan2SubSummary.finalTotalFee.toLocaleString()}원]
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 font-black text-emerald-300">
                    {subNetDiff !== 0
                      ? `월 ${
                          subNetDiff > 0
                            ? `+${subNetDiff.toLocaleString()}`
                            : subNetDiff.toLocaleString()
                        }원 · 총 ${
                          subTotalNetDiff > 0
                            ? `+${subTotalNetDiff.toLocaleString()}`
                            : subTotalNetDiff.toLocaleString()
                        }원`
                      : `총 체감 차액: ${
                          subTotalNetDiff > 0
                            ? `+${subTotalNetDiff.toLocaleString()}`
                            : subTotalNetDiff.toLocaleString()
                        }원`}
                  </span>
                </div>
              )}
            </div>

            {/* 단독 구독구매 모드일 때 확인 버튼 */}
            {state.quoteMode === 'subscription' && (
              <button
                type="button"
                onClick={onShowProposal}
                className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-base shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Check className="w-5 h-5" />
                확인 (고객 맞춤 제안서 보기) ➔
              </button>
            )}
          </div>
        )}
    </>
  );
};
