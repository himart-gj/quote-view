import React from 'react';
import { Check, CreditCard, Layers, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import { SpringNumberFlow } from './SpringNumberFlow';
import {
  getSubscriptionSurplusMeta,
  getValidDisplayModelName,
  HiPlusPayoutMethod,
  normalizeSubscriptionPeriod,
  SubscriptionPeriod,
  SubscriptionPhaseSegment,
} from '../types/proposal';
import {
  PreedSafetyGuideBox,
  SubscriptionCardSpendGaugeCard,
  SubscriptionRefundTimelineCard,
} from './ProposalComplianceBlocks';

const sanitizeFiveYearText = (text?: string): string => {
  if (!text) return '';
  return text.replace(/3년\s*(무상|A\/?S)/gi, '5년 $1');
};

const isGenericSubPlaceholderCategory = (raw?: string): boolean => {
  const t = (raw || '').trim();
  return !t || /^(맞춤\s*)?구독\s*(가전|품목)(\s*\d+)?$/i.test(t);
};

const resolveWarrantyExtraText = (raw?: string): string => {
  const cleaned = sanitizeFiveYearText(raw || '').trim();
  if (!cleaned || /^5년\s*무상\s*A\/?S(\s*기본\s*포함)?$/i.test(cleaned)) {
    return '';
  }
  return cleaned;
};

const resolveMastheadCareSummary = (
  items?: any[],
  fallbackCare?: string
): string => {
  const list = Array.isArray(items) && items.length > 0 ? items : [{}];
  const cares = list.map((it) =>
    sanitizeFiveYearText((it?.careService || fallbackCare || '').trim())
  );
  if (cares.every((c) => c.includes('케어없음'))) {
    return '5년 무상 A/S 포함';
  }
  if (cares.every((c) => c.includes('셀프케어'))) {
    return '셀프케어 · 5년 무상 A/S 포함';
  }
  if (cares.some((c) => !c || c.includes('방문케어'))) {
    return '방문케어 · 5년 무상 A/S 포함';
  }
  return '맞춤케어 · 5년 무상 A/S 포함';
};

interface SubscriptionCareServiceCardProps {
  items: any[];
  fallbackPeriod: SubscriptionPeriod;
  fallbackCare?: string;
  fallbackWarranty?: string;
  compact?: boolean;
}

const SubscriptionCareServiceCard: React.FC<SubscriptionCareServiceCardProps> = ({
  items,
  fallbackPeriod,
  fallbackCare,
  fallbackWarranty,
  compact = false,
}) => {
  const list = Array.isArray(items) && items.length > 0 ? items : [{}];
  const isSingle = list.length === 1;

  if (isSingle) {
    const it = list[0] || {};
    const itemPeriod = normalizeSubscriptionPeriod(it.period, fallbackPeriod);
    const rawCat = (it.category || '').trim();
    const realCat = isGenericSubPlaceholderCategory(rawCat) ? '' : rawCat;
    const validModel = getValidDisplayModelName(it.modelName, it.monthlyFee);
    const hasProductHeader = Boolean(realCat || validModel);
    const cleanCare = sanitizeFiveYearText(
      (it.careService || fallbackCare || '방문케어 (전문가 점검·교체)').trim()
    );
    const warrantyExtra = resolveWarrantyExtraText(
      it.warrantyType || fallbackWarranty
    );

    return (
      <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
        <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
            <span className="text-xs sm:text-[13px] font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
              구독 포함 서비스 · 무상 케어 안내
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-extrabold shrink-0 whitespace-nowrap">
            {compact ? '기본 포함' : '추가 비용 0원 · 기본 포함'}
          </span>
        </div>

        <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
          {hasProductHeader && (
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC]/60 dark:bg-slate-800/40 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[10px] font-extrabold shrink-0">
                  구독 가전
                </span>
                {realCat && (
                  <span className="text-xs sm:text-sm font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                    {realCat}
                  </span>
                )}
                {validModel && (
                  <span className="text-[11px] sm:text-xs font-semibold text-[#4E5968] dark:text-slate-300 bg-white dark:bg-slate-900 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                    {validModel}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                {itemPeriod}개월 구독 약정
              </span>
            </div>
          )}

          <div className="px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-extrabold shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
                무상 보증
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                5년 무상 A/S 연장보증 기본 포함
              </span>
            </div>
            <span className="text-[10.5px] sm:text-xs font-bold text-[#4E5968] dark:text-slate-300 break-keep">
              {warrantyExtra || '구독 기간 무상 수리 안심 보증'}
            </span>
          </div>

          <div className="px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[10.5px] font-extrabold shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
                케어 관리
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                {cleanCare}
              </span>
            </div>
            {!hasProductHeader && (
              <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                {itemPeriod}개월 구독 약정
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
      <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
          <span className="text-xs sm:text-[13px] font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
            구독 포함 서비스 · 무상 케어 안내 ({list.length}품목)
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] font-extrabold shrink-0 whitespace-nowrap">
          {compact ? '기본 포함' : '추가 비용 0원 · 기본 포함'}
        </span>
      </div>
      <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
        {list.map((it: any, idx: number) => {
          const itemPeriod = normalizeSubscriptionPeriod(
            it.period,
            fallbackPeriod
          );
          const rawCat = (it.category || '').trim();
          const realCat = isGenericSubPlaceholderCategory(rawCat) ? '' : rawCat;
          const validModel = getValidDisplayModelName(it.modelName, it.monthlyFee);
          const displayTitle =
            realCat || (validModel ? '구독 가전' : `구독 품목 ${idx + 1}`);
          const cleanCare = sanitizeFiveYearText(
            (it.careService || fallbackCare || '방문케어 (전문가 점검·교체)').trim()
          );
          const warrantyExtra = resolveWarrantyExtraText(
            it.warrantyType || fallbackWarranty
          );
          return (
            <div key={it.id || idx} className="px-3.5 sm:px-4 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="w-5 h-5 rounded-md bg-[#F2F4F6] dark:bg-slate-800 text-[#191F28] dark:text-slate-200 border border-[#E5E8EB] dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[13px] sm:text-sm font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                    {displayTitle}
                  </span>
                  {validModel && (
                    <span className="text-[11px] sm:text-xs font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                      {validModel}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300 bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                  {itemPeriod}개월 구독
                </span>
              </div>
              <div className="pl-6 flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold break-keep">
                  <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                  5년 무상 A/S 기본 포함
                  {warrantyExtra ? ` · ${warrantyExtra}` : ''}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[10.5px] font-bold break-keep">
                  <Check className="w-2.5 h-2.5 stroke-[3] shrink-0" />
                  {cleanCare}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SubscriptionReceiptBlockProps {
  subSummary: Record<string, any>;
  hiPlusSummary: Record<string, any>;
  hasSubPreedActive: boolean;
  currentCard: Record<string, any> | undefined;
  currentCardTier: Record<string, any> | undefined;
  subCardBenefitLabel: string;
  subCashbackRows: { key: string; label: string; amount: number }[];
  compact?: boolean;
}

const SubscriptionReceiptBlock: React.FC<SubscriptionReceiptBlockProps> = ({
  subSummary,
  hiPlusSummary,
  hasSubPreedActive,
  currentCard,
  currentCardTier,
  subCardBenefitLabel,
  subCashbackRows,
  compact = false,
}) => {
  const hasPreedBenefit =
    hasSubPreedActive && (Number(subSummary.hiPlusMonthly) || 0) > 0;
  const hasCardBenefit =
    (Number(subSummary.cardDiscount) || 0) > 0 &&
    Boolean(currentCard) &&
    Boolean(currentCardTier);
  const isTwoStep = hasPreedBenefit && hasCardBenefit;

  const phaseSegments: SubscriptionPhaseSegment[] = Array.isArray(
    subSummary.phaseSegments
  )
    ? subSummary.phaseSegments
    : [];
  const isMixed = Boolean(subSummary.isMixedPeriod) && phaseSegments.length >= 2;

  const rawAfterPreed =
    typeof subSummary.baseMonthlyAfterPreed === 'number'
      ? subSummary.baseMonthlyAfterPreed
      : (Number(subSummary.totalBaseMonthly) || 0) -
        (hasPreedBenefit ? Number(subSummary.hiPlusMonthly) || 0 : 0);

  const preedSurplus = getSubscriptionSurplusMeta(
    rawAfterPreed,
    subSummary.hiPlusPayoutMethod
  );
  const finalSurplus = getSubscriptionSurplusMeta(
    subSummary.finalMonthlyFee,
    subSummary.hiPlusPayoutMethod
  );

  const subTermSurplusTotal =
    typeof subSummary.totalTermSurplus === 'number'
      ? subSummary.totalTermSurplus
      : subSummary.finalTotalFee < 0
      ? Math.abs(subSummary.finalTotalFee)
      : finalSurplus.monthlySurplus > 0
      ? finalSurplus.monthlySurplus * subSummary.representativePeriod
      : 0;

  const lotteBillingDiscount = Math.max(
    0,
    Number(subSummary.subLotteBillingDiscount) || 0
  );
  const hasLotteBillingDiscount = lotteBillingDiscount > 0;
  const rawTotalBaseMonthly =
    typeof subSummary.rawTotalBaseMonthly === 'number'
      ? subSummary.rawTotalBaseMonthly
      : Number(subSummary.totalBaseMonthly) || 0;
  const billedPrincipal =
    typeof subSummary.billedPrincipal === 'number'
      ? subSummary.billedPrincipal
      : Math.max(0, (Number(subSummary.totalPrincipal) || 0) - lotteBillingDiscount);

  return (
    <div className="rounded-2xl border border-[#D1D6DB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E] shadow-[0_2px_10px_rgba(25,31,40,0.04)]">
      {!compact && (
        <div className="px-3.5 sm:px-4 py-2.5 bg-[#191F28] dark:bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B78] shrink-0" />
            <span className="text-xs sm:text-[13px] font-black tracking-tight break-keep">
              내 맞춤 구독 결론 영수증 ({subSummary.periodLabel})
            </span>
          </div>
          {subSummary.totalSubBenefit > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
              약정 총 -{subSummary.totalSubBenefit.toLocaleString()}원 혜택
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">
              {resolveMastheadCareSummary(subSummary.displayItems)}
            </span>
          )}
        </div>
      )}

      <div className={`${compact ? 'p-3 space-y-2.5' : 'p-3.5 sm:p-4 space-y-3'}`}>
        {/* 기준선: 가전 원 구독료 합계 */}
        <div className="ledger-row items-start pb-2.5 border-b border-[#E5E8EB] dark:border-slate-700/80">
          <div className="ledger-row-label space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                가전 원 구독료 합계 ({subSummary.displayItems.length}품목)
              </span>
              {hasLotteBillingDiscount && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[10px] sm:text-[10.5px] font-extrabold break-keep">
                  롯데카드 5%(최대 5만원) 청구할인 적용 금액
                </span>
              )}
            </div>
            {hasLotteBillingDiscount ? (
              <div className="text-[10.5px] font-semibold text-[#4E5968] dark:text-slate-300 font-mono tabular-nums break-keep leading-snug">
                할인 전 약정 원금 {subSummary.totalPrincipal.toLocaleString()}원 →{' '}
                <strong className="font-extrabold text-[#1B64DA] dark:text-blue-300">
                  실청구 원금 {billedPrincipal.toLocaleString()}원
                </strong>{' '}
                (-{lotteBillingDiscount.toLocaleString()}원 카드사 청구할인)
                {isMixed &&
                  ` · ${phaseSegments
                    .map((s) => `${s.label} 월 ${s.baseMonthly.toLocaleString()}원`)
                    .join(' / ')}`}
              </div>
            ) : (
              <div className="text-[10.5px] font-semibold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums break-keep">
                약정 원금 {subSummary.totalPrincipal.toLocaleString()}원
                {isMixed &&
                  ` · ${phaseSegments
                    .map((s) => `${s.label} 월 ${s.baseMonthly.toLocaleString()}원`)
                    .join(' / ')}`}
              </div>
            )}
          </div>
          {hasLotteBillingDiscount ? (
            <div className="ledger-row-value flex flex-col items-end text-right shrink-0">
              {rawTotalBaseMonthly > subSummary.totalBaseMonthly && (
                <span className="text-[10.5px] font-semibold text-[#8B95A1] dark:text-slate-400 line-through font-mono tabular-nums whitespace-nowrap">
                  할인 전 월 {rawTotalBaseMonthly.toLocaleString()}원
                </span>
              )}
              <span className="text-sm sm:text-base font-black text-[#1B64DA] dark:text-blue-300 font-mono tabular-nums whitespace-nowrap">
                월 {subSummary.totalBaseMonthly.toLocaleString()}원
              </span>
            </div>
          ) : (
            <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
              월 {subSummary.totalBaseMonthly.toLocaleString()}원
            </span>
          )}
        </div>

        {/* 1단계: Hi구독 플러스 현금지원 차감 (활성 시에만 표시) */}
        {hasPreedBenefit && (
          <div className="space-y-2.5">
            <div className="ledger-row items-center">
              <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[10.5px] font-extrabold shrink-0">
                  기본 지원
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-[#191F28] dark:text-slate-100 break-keep">
                  Hi구독 플러스 월 현금지원
                </span>
                <span className="text-[10.5px] font-semibold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  (총 {hiPlusSummary.totalHiPlusSupport.toLocaleString()}원)
                </span>
              </div>
              <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                월 -{subSummary.hiPlusMonthly.toLocaleString()}원
              </span>
            </div>

            {/* 2단 수식일 때만 중간 결론 노출 */}
            {isTwoStep && (
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#D1D6DB] dark:border-slate-700 p-3 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs sm:text-[13px] font-black text-[#191F28] dark:text-white break-keep">
                      {hasLotteBillingDiscount
                        ? '전월 실적 조건 없이도 기본 월 체감가'
                        : '카드 조건 없이도 기본 월 체감가'}
                    </span>
                    <div className="text-[10.5px] font-semibold text-[#6B7684] dark:text-slate-400">
                      {hasLotteBillingDiscount
                        ? '카드 월 실적 미충족 시에도 적용되는 기본 혜택가'
                        : '제휴카드 미사용 · 실적 부담 없는 기본 혜택가'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[clamp(1.25rem,5.2vw,1.6rem)] font-black tracking-tight text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap leading-none">
                      {preedSurplus.isSurplusZone ? (
                        '월 0원'
                      ) : (
                        <>
                          월{' '}
                          <SpringNumberFlow
                            value={preedSurplus.displayNetMonthly}
                            suffix="원"
                          />
                        </>
                      )}
                    </div>
                    {preedSurplus.monthlySurplus > 0 && (
                      <div className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-0.5">
                        {preedSurplus.surplusInlineText}
                      </div>
                    )}
                  </div>
                </div>

                {isMixed && (
                  <div className="pt-2 border-t border-[#E5E8EB] dark:border-slate-700 grid grid-cols-2 mobile-keep-grid gap-2">
                    {phaseSegments.map((seg) => (
                      <div
                        key={`preed-${seg.key}`}
                        className="min-w-0 rounded-lg bg-white dark:bg-slate-900/70 border border-[#E5E8EB] dark:border-slate-700 px-2.5 py-1.5 flex flex-col justify-between"
                      >
                        <span className="text-[10px] font-bold text-[#6B7684] dark:text-slate-400 break-keep">
                          {seg.label} 기본 체감
                        </span>
                        <span className="text-xs font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap mt-0.5">
                          {seg.surplusAfterPreed > 0
                            ? `월 0원 (+${seg.surplusAfterPreed.toLocaleString()}원)`
                            : `월 ${seg.effectiveAfterPreed.toLocaleString()}원`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2단계: 제휴카드 추가 혜택 (활성 시에만 표시) */}
        {hasCardBenefit && currentCard && currentCardTier && (
          <div className="ledger-row items-center pt-0.5">
            <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-[#FFF1F2] dark:bg-rose-950/60 border border-[#FECDD3] dark:border-rose-800 text-[#E60012] dark:text-rose-300 text-[10.5px] font-extrabold shrink-0">
                {isTwoStep ? '+ 카드 추가' : '카드 혜택'}
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-[#191F28] dark:text-slate-100 break-keep">
                {currentCard.name} 월 {subCardBenefitLabel}
              </span>
              <span className="text-[10.5px] font-semibold text-[#8B95A1] dark:text-slate-400 whitespace-nowrap">
                ({currentCardTier.minSpendShort} 이상)
              </span>
            </div>
            <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#E60012] dark:text-[#FF6B78] font-mono tabular-nums whitespace-nowrap">
              월 -{subSummary.cardDiscount.toLocaleString()}원
            </span>
          </div>
        )}

        {/* 최종 월 체감가 결론 박스 — 블록 내 유일 노출 */}
        <div className="rounded-xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/55 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-black text-[#E60012] dark:text-[#FF6B78] break-keep">
                {isTwoStep
                  ? '제휴카드 추가 적용 시 최종 월 체감가'
                  : hasPreedBenefit
                  ? hasLotteBillingDiscount
                    ? '5% 청구할인 · 기본 지원 반영 최종 월 체감가'
                    : '카드 조건 없이 최종 월 체감가'
                  : hasCardBenefit
                  ? '제휴카드 적용 최종 월 체감가'
                  : hasLotteBillingDiscount
                  ? '롯데카드 5%(최대 5만원) 청구할인 적용 월 구독료'
                  : '월 구독료 합계'}
              </div>
              <div className="text-[10.5px] font-semibold text-[#4E5968] dark:text-slate-300 break-keep">
                {isMixed
                  ? `${phaseSegments[0].label} 기준 · 아래 구간별 변화 확인`
                  : `${subSummary.periodLabel} 약정 기준`}
              </div>
            </div>

            <div className="text-right">
              <div
                className={`${
                  compact
                    ? 'text-[clamp(1.4rem,6vw,1.85rem)]'
                    : 'text-[clamp(1.7rem,7.2vw,2.2rem)]'
                } font-black tracking-tight text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none`}
              >
                {finalSurplus.isSurplusZone ? (
                  '월 0원'
                ) : (
                  <>
                    월{' '}
                    <SpringNumberFlow
                      value={Math.max(0, subSummary.finalMonthlyFee)}
                      suffix="원"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {finalSurplus.surplusBadgeText && (
            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11.5px] sm:text-xs font-black font-mono tabular-nums break-keep">
              {finalSurplus.surplusBadgeText}
            </div>
          )}

          {/* 36+60개월 혼합 약정 시 구간별 최종 월 체감가 나란히 비교 */}
          {isMixed && (
            <div className="pt-2 border-t border-[#FECDD3] dark:border-rose-800/70 grid grid-cols-2 mobile-keep-grid gap-2">
              {phaseSegments.map((seg, idx) => {
                const isLaterPhase = idx > 0;
                return (
                  <div
                    key={`final-${seg.key}`}
                    className={`min-w-0 rounded-xl px-2.5 py-2 border flex flex-col justify-between ${
                      isLaterPhase
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/45 border-emerald-300 dark:border-emerald-700/80'
                        : 'bg-white/90 dark:bg-slate-900/80 border-[#FECDD3] dark:border-rose-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span
                        className={`text-[10.5px] font-extrabold break-keep ${
                          isLaterPhase
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-[#4E5968] dark:text-slate-300'
                        }`}
                      >
                        {seg.label}
                      </span>
                      <span className="text-[9.5px] font-bold text-[#8B95A1] dark:text-slate-400 whitespace-nowrap">
                        {seg.endedItemCount > 0
                          ? `완납 후 ${seg.activeItemCount}품목`
                          : `${seg.activeItemCount}품목`}
                      </span>
                    </div>
                    <div
                      className={`mt-1 text-[clamp(0.875rem,3.8vw,1.05rem)] font-black font-mono tabular-nums whitespace-nowrap ${
                        isLaterPhase
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-[#E60012] dark:text-[#FF5A65]'
                      }`}
                    >
                      {seg.surplusFinalMonthly > 0
                        ? '월 0원'
                        : `월 ${seg.effectiveFinalMonthly.toLocaleString()}원`}
                    </div>
                    {seg.surplusFinalMonthly > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap mt-0.5">
                        +월 {seg.surplusFinalMonthly.toLocaleString()}원 혜택
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 1회성 금액대·추가 캐시백 보너스 (활성 시에만 표시) */}
        {subCashbackRows.length > 0 && (
          <div className="rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/70 px-3 py-2 space-y-1.5">
            {subCashbackRows.map((row) => (
              <div key={row.key} className="ledger-row items-center text-xs">
                <div className="ledger-row-label flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[10px] font-extrabold shrink-0">
                    보너스 환급
                  </span>
                  <span className="font-bold text-[#191F28] dark:text-slate-100 break-keep">
                    {row.label}
                  </span>
                </div>
                <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-300 font-mono tabular-nums whitespace-nowrap">
                  -{row.amount.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 약정 기간 총 체감 합계 바 */}
      <div className="ledger-row items-center px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/80 border-t border-[#E5E8EB] dark:border-slate-700/80 text-xs">
        <div className="ledger-row-label space-y-0.5">
          <span className="font-extrabold text-[#4E5968] dark:text-slate-300">
            {subSummary.periodLabel} 약정 총 체감 합계
          </span>
          {subTermSurplusTotal > 0 && (
            <div className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums break-keep">
              약정 기간 누적 +{subTermSurplusTotal.toLocaleString()}원 초과 혜택 예상
            </div>
          )}
        </div>
        <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
          {finalSurplus.isSurplusZone || subSummary.finalTotalFee <= 0 ? (
            '총 0원'
          ) : (
            <>
              총 <SpringNumberFlow value={subSummary.finalTotalFee} suffix="원" />
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export const CustomerProposalSheet: React.FC<Record<string, any>> = ({
  activePlan,
  currentCard,
  currentCardTier,
  generalHeaderTitle,
  generalHiPreed,
  generalSummary,
  hasBothPlans,
  hideInlineSafetyBox = false,
  hiPlusSummary,
  hybridCombinedNetTotal,
  hybridTotalDiscountAndSupport,
  onSelectPayoutMethod,
  simState,
  subCardBenefitLabel,
  subHeaderTitle,
  subSummary,
}) => {
  const step1DiscountRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.instantDiscount > 0
      ? [
          {
            key: 'instant-base',
            label: '기본 즉시할인',
            amount: generalSummary.instantDiscount,
          },
        ]
      : []),
    ...(generalSummary.extraDiscountItems || []).map((it: any, idx: number) => ({
      key: it.id || `extra-disc-${idx}`,
      label: (it.description || '').trim() || '추가 즉시할인',
      amount: Math.max(0, Number(it.amount) || 0),
    })),
    ...(generalSummary.pointUsed > 0
      ? [
          {
            key: 'point-used',
            label: '포인트 즉시사용',
            amount: generalSummary.pointUsed,
          },
        ]
      : []),
  ];

  const step2CashbackRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.tierCashback > 0
      ? [
          {
            key: 'tier-cashback',
            label: '금액대별 캐시백',
            amount: generalSummary.tierCashback,
          },
        ]
      : []),
    ...(generalSummary.extraCashback > 0
      ? [
          {
            key: 'extra-cashback',
            label: '배송익월 추가 캐시백',
            amount: generalSummary.extraCashback,
          },
        ]
      : []),
  ];

  const step2ExtraRows: { key: string; label: string; amount: number }[] = [
    ...(generalSummary.extraEtcItems || []).map((it: any, idx: number) => ({
      key: it.id || `extra-etc-${idx}`,
      label: (it.description || '').trim() || '추가 혜택',
      amount: Math.max(0, Number(it.amount) || 0),
    })),
    ...(generalSummary.remainingPoints > 0
      ? [
          {
            key: 'remaining-points',
            label: '잔여 포인트 차감',
            amount: generalSummary.remainingPoints,
          },
        ]
      : []),
  ];

  const subCashbackRows: { key: string; label: string; amount: number }[] = [
    ...(subSummary.subTierCashback > 0
      ? [
          {
            key: 'sub-tier-cb',
            label: `${currentCard?.shortName || '제휴카드'} 금액대별 캐시백 (원금 ${Math.floor(
              subSummary.totalPrincipal / 10000
            ).toLocaleString()}만원 구간)`,
            amount: subSummary.subTierCashback,
          },
        ]
      : []),
    ...(subSummary.subExtraCashback > 0
      ? [
          {
            key: 'sub-extra-cb',
            label: '추가 일시 캐시백',
            amount: subSummary.subExtraCashback,
          },
        ]
      : []),
  ];

  const step1TotalDeduct =
    generalSummary.totalStep1InstantDiscount +
    (!simState.hideHiPreed ? generalSummary.hiFreedSupport : 0);
  const step2TotalRefund =
    generalSummary.totalStep2Cashback + generalSummary.totalStep2ExtraBenefit;

  const subSurplus = getSubscriptionSurplusMeta(
    subSummary.finalMonthlyFee,
    subSummary.hiPlusPayoutMethod
  );
  const hasSubPreedActive =
    !simState.hideSubPreed && (hiPlusSummary?.totalAccounts || 0) > 0;
  const hasSubCardActive =
    subSummary.cardDiscount > 0 && Boolean(currentCard) && Boolean(currentCardTier);
  const handlePayoutSelect = onSelectPayoutMethod as
    | ((method: HiPlusPayoutMethod) => void)
    | undefined;

  return (
    <section className="rounded-2xl bg-white dark:bg-[#131C2E] border border-[#D1D6DB] dark:border-slate-700/80 border-t-[4px] border-t-[#E60012] shadow-[0_2px_12px_rgba(25,31,40,0.05)] p-3 sm:p-5 space-y-3 sm:space-y-4 text-[#191F28] dark:text-slate-100 overflow-hidden">
      {/* ==================== CASE A: 일반구매 단독 스토리 제안서 ==================== */}
      {simState.quoteMode === 'general' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 1. 공식 문서 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2.5 sm:pb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  공식 맞춤 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                {generalHeaderTitle}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100 max-w-full break-keep">
              <CreditCard className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
              <span>
                {simState.generalCardType === '미정' ||
                simState.generalCardType === '일반카드'
                  ? '제휴카드 미적용'
                  : simState.generalCardType}
              </span>
            </span>
          </div>

          {/* 2. 핵심 1~2줄 요약 배너 */}
          <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E8EB] dark:border-slate-700/80 px-3 py-2 sm:px-3.5 sm:py-2.5">
            <p className="text-[11.5px] sm:text-[13px] font-semibold text-[#4E5968] dark:text-slate-300 leading-snug break-keep">
              {generalSummary.totalDiscountAndBenefit > 0 && generalSummary.sum > 0 ? (
                <>
                  {generalSummary.displayItems.length}품목 기준가{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-bold text-[#191F28] dark:text-white">
                    {generalSummary.sum.toLocaleString()}원
                  </strong>
                  에서 총{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#1B64DA] dark:text-blue-400">
                    -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원(
                    {Math.min(99, Math.round((generalSummary.totalDiscountAndBenefit / generalSummary.sum) * 100))}%↓)
                  </strong>{' '}
                  적용 · 최종 체감가{' '}
                  <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#E60012] dark:text-[#FF5A65]">
                    {generalSummary.rawNet.toLocaleString()}원
                  </strong>
                </>
              ) : (
                <>
                  선택하신 <strong className="font-extrabold text-[#191F28] dark:text-white">{generalSummary.displayItems.length}품목</strong> 롯데하이마트 공식 맞춤 견적 안내입니다.
                </>
              )}
            </p>
          </div>

          {/* 3. 히어로 가격 카드 + 컴팩트 2열 계산 요약 */}
          <div className="space-y-2">
            {/* 메인 히어로 카드: ③ 최종 혜택 체감 구매가 */}
            <div className="rounded-2xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/50 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-4 shadow-[0_6px_18px_rgba(230,0,18,0.08)]">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  ③ 최종 혜택 체감 구매가
                </span>
                {generalSummary.totalDiscountAndBenefit > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                    총 -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원 혜택
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-[clamp(1.65rem,7vw,2.15rem)] font-black tracking-tight text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-none">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </div>
                <div className="text-[11px] font-bold text-[#4E5968] dark:text-slate-300 break-keep">
                  ① 실결제가 − ② 사후 환급 혜택
                </div>
              </div>
            </div>

            {/* 컴팩트 2열 요약: ① 매장 실결제가 + ② 사후 환급 혜택 */}
            <div className="grid grid-cols-2 mobile-keep-grid gap-2">
              <div className="min-w-0 rounded-xl bg-[#191F28] dark:bg-slate-900 border border-transparent dark:border-slate-700 text-white px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10.5px] font-extrabold text-slate-300 break-keep">
                  ① 오늘 매장 실결제가
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black tracking-tight font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                </div>
                <div className="text-[10px] font-medium text-slate-300 mt-0.5 font-mono tabular-nums truncate">
                  {step1TotalDeduct > 0
                    ? `현장 -${step1TotalDeduct.toLocaleString()}원`
                    : `기준가 ${generalSummary.sum.toLocaleString()}원`}
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/60 px-3 py-2.5 flex flex-col justify-between">
                <span className="text-[10.5px] font-extrabold text-[#1B64DA] dark:text-blue-300 break-keep">
                  ② 사후 환급 혜택
                </span>
                <div className="mt-1 text-[clamp(0.95rem,4vw,1.25rem)] font-black tracking-tight text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                  {step2TotalRefund > 0 ? `-${step2TotalRefund.toLocaleString()}원` : '0원'}
                </div>
                <div className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 truncate">
                  {step2TotalRefund > 0 ? '캐시백·포인트 환급' : '현장 차감 중심'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. STEP 1 · 선택하신 가전 패키지 구성 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 1
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  선택하신 가전 패키지 구성 ({generalSummary.displayItems.length}품목)
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 shrink-0 whitespace-nowrap">
                기준 행사가
              </span>
            </div>
            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {generalSummary.displayItems.map((it: any, idx: number) => {
                const lineAmt =
                  (Number(it.unitPrice) || 0) * Math.max(1, Number(it.quantity) || 1);
                const validModel = getValidDisplayModelName(it.modelName, it.unitPrice);
                return (
                  <div key={it.id || idx} className="ledger-row px-3.5 sm:px-4 py-2.5">
                    <div className="ledger-row-label flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-md bg-[#F2F4F6] dark:bg-slate-800 text-[#191F28] dark:text-slate-200 border border-[#E5E8EB] dark:border-slate-700 text-[11px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[13px] sm:text-sm font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                        {it.category || `가전품목 ${idx + 1}`}
                      </span>
                      {validModel && (
                        <span className="text-[11px] sm:text-xs font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                          {validModel}
                        </span>
                      )}
                      {it.quantity > 1 && (
                        <span className="text-xs font-extrabold text-[#E60012] dark:text-[#FF6B78] shrink-0 whitespace-nowrap">
                          ×{it.quantity}개
                        </span>
                      )}
                    </div>
                    <span className="ledger-row-value text-[13px] sm:text-sm font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                      {lineAmt.toLocaleString()}원
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="ledger-row px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-t border-[#E5E8EB] dark:border-slate-700/80">
              <span className="ledger-row-label text-xs font-extrabold text-[#4E5968] dark:text-slate-300">
                패키지 기준가 합계
              </span>
              <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                {generalSummary.sum.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 5. STEP 2 · 단계별 혜택 차감 순서 */}
          <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 overflow-hidden bg-white dark:bg-[#131C2E]">
            <div className="px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
                  STEP 2
                </span>
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 break-keep">
                  단계별 혜택 차감 순서
                </span>
              </div>
              {generalSummary.totalDiscountAndBenefit > 0 && (
                <span className="text-[11px] font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap shrink-0">
                  총 -{generalSummary.totalDiscountAndBenefit.toLocaleString()}원 혜택
                </span>
              )}
            </div>

            <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
              {step1DiscountRows.map((row) => (
                <div key={row.key} className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      현장차감
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{row.amount.toLocaleString()}원
                  </span>
                </div>
              ))}

              {!simState.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                <div className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[#1B64DA] dark:text-blue-300 text-[11px] font-extrabold shrink-0">
                      현장차감
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      하이프리드 결합 지원금
                    </span>
                    <span className="text-[11px] font-semibold text-[#8B95A1] dark:text-slate-400">
                      ({generalHiPreed.activePlans.map((p: any) => `${p.name} ${p.count}건`).join(' + ')})
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{generalSummary.hiFreedSupport.toLocaleString()}원
                  </span>
                </div>
              )}

              <div className="ledger-row px-3.5 sm:px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70">
                <span className="ledger-row-label text-xs sm:text-sm font-black text-[#191F28] dark:text-white">
                  ① 오늘 매장 카드 실결제가
                </span>
                <span className="ledger-row-value text-sm sm:text-base font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.payPrice} suffix="원" />
                </span>
              </div>

              {[...step2CashbackRows, ...step2ExtraRows].map((row) => (
                <div key={row.key} className="ledger-row px-3.5 sm:px-4 py-2.5">
                  <div className="ledger-row-label flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-[#FFF1F2] dark:bg-rose-950/50 border border-[#FECDD3] dark:border-rose-800 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold shrink-0">
                      사후환급
                    </span>
                    <span className="text-[12.5px] sm:text-sm font-bold text-[#191F28] dark:text-slate-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="ledger-row-value text-[13px] sm:text-sm font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                    -{row.amount.toLocaleString()}원
                  </span>
                </div>
              ))}

              <div className="ledger-row px-3.5 sm:px-4 py-3.5 bg-[#FFF1F2] dark:bg-rose-950/35 border-t-2 border-[#E60012] dark:border-[#FF3B47]">
                <div className="ledger-row-label space-y-0.5">
                  <div className="text-sm sm:text-base font-black text-[#E60012] dark:text-[#FF6B78]">
                    ③ 최종 혜택 체감 구매가
                  </div>
                  {generalSummary.rawNet < 0 && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black font-mono tabular-nums">
                      오히려 +{Math.abs(generalSummary.rawNet).toLocaleString()}원 더 이득
                    </div>
                  )}
                </div>
                <span className="ledger-row-value text-xl sm:text-2xl font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </span>
              </div>
            </div>
          </div>

          {/* 6. STEP 3 · 만기 100% 환급 보증 */}
          {!simState.hideHiPreed && generalHiPreed.totalAccounts > 0 && (
            <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-1.5 text-xs">
              <span className="flex items-start gap-1.5 font-bold text-[#191F28] dark:text-slate-100 leading-relaxed break-keep">
                <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold shrink-0 mt-0.5 whitespace-nowrap">
                  STEP 3
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  하이프리드 만기 100% 환급 안내: 만기(150회[150개월] · 거치 없음) 시 납입 원금{' '}
                  <strong className="font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap">
                    {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 전액 환급
                  </strong>{' '}
                  (서비스 미이용 시)
                </span>
              </span>
              <span className="text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap">
                월 납입금 {generalHiPreed.totalMonthlyDeposit.toLocaleString()}원
              </span>
            </div>
          )}

          <PreedSafetyGuideBox
            hasHiPlus={false}
            hasGeneralHiPreed={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
          />
        </div>
      )}

      {/* ==================== CASE B: 구독구매 단독 제안서 (무중복 4블록 구조) ==================== */}
      {simState.quoteMode === 'subscription' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 공식 구독 제안서 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2 sm:pb-3 flex flex-wrap items-end justify-between gap-1.5">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  공식 구독 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                {subHeaderTitle}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B64DA] dark:text-blue-400 shrink-0" />
              <span>
                {resolveMastheadCareSummary(
                  subSummary.displayItems,
                  simState.careService
                )}
              </span>
            </span>
          </div>

          {/* [블록 1] 내 맞춤 구독 결론 영수증 카드 — 단일 수식 1회 노출 */}
          <SubscriptionReceiptBlock
            subSummary={subSummary}
            hiPlusSummary={hiPlusSummary}
            hasSubPreedActive={hasSubPreedActive}
            currentCard={currentCard}
            currentCardTier={currentCardTier}
            subCardBenefitLabel={subCardBenefitLabel}
            subCashbackRows={subCashbackRows}
          />

          {/* [블록 2] 구독 포함 서비스 · 무상 케어 안내 — 가격 중복 없이 순수 서비스 정리 */}
          <SubscriptionCareServiceCard
            items={subSummary.displayItems}
            fallbackPeriod={subSummary.representativePeriod}
            fallbackCare={simState.careService}
            fallbackWarranty={simState.warrantyType}
          />

          {/* [블록 3] 안심 검증 2종 카드 — 전체 페이지 내 유일 노출 */}
          {(hasSubPreedActive || hasSubCardActive) && (
            <div className="space-y-3">
              {hasSubPreedActive && (
                <SubscriptionRefundTimelineCard
                  hiSummary={hiPlusSummary}
                  payoutMethod={subSummary.hiPlusPayoutMethod}
                  onSelectPayoutMethod={handlePayoutSelect}
                  useMobileFluid
                />
              )}

              {hasSubCardActive && currentCard && currentCardTier && (
                <SubscriptionCardSpendGaugeCard
                  cardName={currentCard.name}
                  benefitLabel={subCardBenefitLabel}
                  cardDiscount={subSummary.cardDiscount}
                  minSpendLabel={currentCardTier.minSpendLabel}
                  targetCardMinSpend={subSummary.targetCardMinSpend || 0}
                  countPreedTowardCardSpend={subSummary.countPreedTowardCardSpend}
                  hasSubPreedActive={hasSubPreedActive}
                  payoutMethod={subSummary.hiPlusPayoutMethod}
                  recognizedPreedSpend={subSummary.recognizedPreedSpend || 0}
                  additionalCardSpendNeeded={subSummary.additionalCardSpendNeeded || 0}
                  representativePeriod={subSummary.representativePeriod}
                />
              )}
            </div>
          )}

          {!hideInlineSafetyBox && (
            <PreedSafetyGuideBox
              hasHiPlus={hasSubPreedActive}
              hasGeneralHiPreed={false}
            />
          )}
        </div>
      )}

      {/* ==================== CASE C: 일반+구독 혼합 제안서 (구독 파트 무중복 4블록 동기화) ==================== */}
      {simState.quoteMode === 'hybrid' && (
        <div className="space-y-3 sm:space-y-4">
          {/* 통합 마스트헤드 */}
          <div className="border-b border-[#E5E8EB] dark:border-slate-700/80 pb-2.5 sm:pb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1 basis-48 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-[#E60012] text-white text-[10.5px] font-black tracking-wider">
                  LOTTE HIMART
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                  <Layers className="w-3 h-3 text-[#1B64DA] dark:text-blue-400" />
                  일반 + 구독 통합 제안서
                </span>
                {hasBothPlans && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-blue-600 text-white text-[11px] font-extrabold">
                    견적 {activePlan}안
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-[#191F28] dark:text-white break-keep leading-snug">
                일반구매 · 구독구매 통합 맞춤 제안서
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5E8EB] dark:border-slate-700 text-[11px] sm:text-xs font-extrabold text-[#191F28] dark:text-slate-100">
                일반카드: {simState.generalCardType === '미정' || simState.generalCardType === '일반카드' ? '미적용' : simState.generalCardType}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/60 border border-[#BFDBFE] dark:border-blue-800 text-[11px] sm:text-xs font-extrabold text-[#1B64DA] dark:text-blue-300">
                구독: {subSummary.periodLabel}
              </span>
            </div>
          </div>

          {/* 통합 최종 혜택 합계 카드 — ① 오늘 일시불 체감 + ② 매월 구독 체감 2분할 직관 요약 */}
          <div className="rounded-2xl bg-gradient-to-br from-[#FFF1F2] via-[#FFF6F7] to-white dark:from-rose-950/55 dark:via-[#161D2F] dark:to-[#131C2E] border-2 border-[#E60012] dark:border-[#FF3B47] p-3.5 sm:p-4 shadow-[0_6px_18px_rgba(230,0,18,0.08)] space-y-2.5">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                일반구매 {generalSummary.displayItems.length}품목 + 구독케어 {subSummary.displayItems.length}품목 핵심 요약
              </span>
              {hybridTotalDiscountAndSupport > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-[#FECDD3] dark:border-rose-700 text-[#E60012] dark:text-rose-300 text-[11px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                  통합 총 -{hybridTotalDiscountAndSupport.toLocaleString()}원 혜택
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5">
              {/* ① 오늘 일시불 구매 체감가 */}
              <div className="rounded-xl bg-white/95 dark:bg-slate-900/80 border border-[#FECDD3] dark:border-rose-800/70 px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[11px] font-extrabold text-[#4E5968] dark:text-slate-300">
                    ① 일반구매 일시불 체감가
                  </span>
                  <span className="text-[10.5px] font-bold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                    실결제 {generalSummary.payPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap leading-tight">
                  <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                </div>
              </div>

              {/* ② 매월 구독 체감 요금 */}
              <div className="rounded-xl bg-white/95 dark:bg-slate-900/80 border border-[#BFDBFE] dark:border-blue-800/70 px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[11px] font-extrabold text-[#1B64DA] dark:text-blue-300">
                    ② 매월 구독 체감 ({subSummary.periodLabel})
                  </span>
                  <span className="text-[10.5px] font-bold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                    {subSurplus.isSurplusZone || subSummary.finalTotalFee <= 0
                      ? subSummary.totalTermSurplus > 0
                        ? `누적 +${subSummary.totalTermSurplus.toLocaleString()}원 혜택`
                        : '총 체감 0원'
                      : `약정 총 ${subSummary.finalTotalFee.toLocaleString()}원`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {subSurplus.isSurplusZone ? (
                    <>
                      <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums whitespace-nowrap leading-tight">
                        월 0원
                      </span>
                      {subSurplus.monthlySurplus > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10.5px] font-extrabold font-mono tabular-nums whitespace-nowrap">
                          {subSurplus.surplusStickyText}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap leading-tight">
                      월 <SpringNumberFlow value={subSummary.finalMonthlyFee} suffix="원" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 하단 만기 통합 최종 체감 합계 및 투명 산출식 */}
            <div className="pt-2 border-t border-[#FECDD3]/80 dark:border-rose-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-extrabold text-[#191F28] dark:text-slate-100">
                  {subSummary.periodLabel} 만기 기준 통합 최종 체감 합계
                </div>
                <div className="text-[11px] font-semibold text-[#4E5968] dark:text-slate-300 font-mono tabular-nums break-keep">
                  {subSummary.finalTotalFee < 0
                    ? `일시불 체감 ${generalSummary.rawNet.toLocaleString()}원 − 구독 누적 초과혜택 ${Math.abs(
                        subSummary.finalTotalFee
                      ).toLocaleString()}원 상계 반영`
                    : `일시불 체감 ${generalSummary.rawNet.toLocaleString()}원 + 구독 ${subSummary.periodLabel} 총 체감 ${subSummary.finalTotalFee.toLocaleString()}원`}
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                <SpringNumberFlow value={hybridCombinedNetTotal} suffix="원" />
              </div>
            </div>
          </div>

          {/* 좌우 2단 분할: 좌측 일반구매 원장 / 우측 구독 무중복 블록 1·2 */}
          <div className="grid grid-cols-1 min-[880px]:grid-cols-2 gap-3.5 items-start">
            {/* 좌측: 일반구매 원장 (기존 계산 구조 유지) */}
            <div className="rounded-2xl border border-[#E5E8EB] dark:border-slate-700/80 bg-white dark:bg-[#131C2E] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 border-b border-[#E5E8EB] dark:border-slate-700/80 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                  <span>일반구매 ({generalSummary.displayItems.length}품목)</span>
                </span>
                <span className="text-[11px] font-bold text-[#8B95A1] dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  합계 {generalSummary.sum.toLocaleString()}원
                </span>
              </div>
              <div className="divide-y divide-[#E5E8EB] dark:divide-slate-700/70">
                {generalSummary.displayItems.map((it: any, idx: number) => {
                  const amt =
                    (Number(it.unitPrice) || 0) * Math.max(1, Number(it.quantity) || 1);
                  const validModel = getValidDisplayModelName(it.modelName, it.unitPrice);
                  return (
                    <div key={it.id || idx} className="ledger-row px-3.5 py-2.5 text-xs">
                      <div className="ledger-row-label flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#191F28] dark:text-slate-100">
                          {idx + 1}. {it.category || `일반가전 ${idx + 1}`}
                        </span>
                        {validModel && (
                          <span className="text-[11px] font-semibold text-[#4E5968] dark:text-slate-300 bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E8EB] dark:border-slate-700 px-1.5 py-0.5 rounded font-mono break-all">
                            {validModel}
                          </span>
                        )}
                        {it.quantity > 1 && (
                          <span className="text-xs font-extrabold text-[#E60012] dark:text-[#FF6B78] shrink-0 whitespace-nowrap">
                            ×{it.quantity}개
                          </span>
                        )}
                      </div>
                      <span className="ledger-row-value font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                        {amt.toLocaleString()}원
                      </span>
                    </div>
                  );
                })}

                {step1DiscountRows.map((row) => (
                  <div key={row.key} className="ledger-row px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) {row.label}
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{row.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}

                {!simState.hideHiPreed && generalSummary.hiFreedSupport > 0 && (
                  <div className="ledger-row px-3.5 py-2 text-xs bg-[#F8FAFC]/60 dark:bg-slate-800/40">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) 하이프리드 지원금
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{generalSummary.hiFreedSupport.toLocaleString()}원
                    </span>
                  </div>
                )}

                <div className="ledger-row px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-800/70 text-xs">
                  <span className="ledger-row-label font-black text-[#191F28] dark:text-white">
                    매장 실결제가
                  </span>
                  <span className="ledger-row-value text-sm font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap">
                    {generalSummary.payPrice.toLocaleString()}원
                  </span>
                </div>

                {[...step2CashbackRows, ...step2ExtraRows].map((row) => (
                  <div key={row.key} className="ledger-row px-3.5 py-2 text-xs">
                    <span className="ledger-row-label font-semibold text-[#4E5968] dark:text-slate-300">
                      (-) {row.label}
                    </span>
                    <span className="ledger-row-value font-extrabold text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap">
                      -{row.amount.toLocaleString()}원
                    </span>
                  </div>
                ))}

                <div className="ledger-row px-3.5 py-3 bg-[#FFF1F2] dark:bg-rose-950/35 border-t border-[#FECDD3] dark:border-rose-800">
                  <div className="ledger-row-label space-y-0.5">
                    <div className="text-xs font-black text-[#E60012] dark:text-[#FF6B78]">
                      일반구매 최종 혜택가
                    </div>
                    {generalSummary.rawNet < 0 && (
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-black font-mono tabular-nums">
                        오히려 +{Math.abs(generalSummary.rawNet).toLocaleString()}원 더 이득
                      </div>
                    )}
                  </div>
                  <span className="ledger-row-value text-base font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap">
                    <SpringNumberFlow value={generalSummary.rawNet} suffix="원" />
                  </span>
                </div>
              </div>
            </div>

            {/* 우측: 구독구매 파트 ([블록 1] 구독 결론 영수증 + [블록 2] 가전·케어 명세) */}
            <div className="space-y-3">
              <SubscriptionReceiptBlock
                compact
                subSummary={subSummary}
                hiPlusSummary={hiPlusSummary}
                hasSubPreedActive={hasSubPreedActive}
                currentCard={currentCard}
                currentCardTier={currentCardTier}
                subCardBenefitLabel={subCardBenefitLabel}
                subCashbackRows={subCashbackRows}
              />

              <SubscriptionCareServiceCard
                compact
                items={subSummary.displayItems}
                fallbackPeriod={subSummary.representativePeriod}
                fallbackCare={simState.careService}
                fallbackWarranty={simState.warrantyType}
              />
            </div>
          </div>

          {/* [블록 3] 안심 검증 카드 — 페이지 내 유일 노출 */}
          <div className="space-y-3">
            {hasSubPreedActive ? (
              <SubscriptionRefundTimelineCard
                hiSummary={hiPlusSummary}
                payoutMethod={subSummary.hiPlusPayoutMethod}
                onSelectPayoutMethod={handlePayoutSelect}
                useMobileFluid
                showGeneralLine={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
                generalHiPreedSummary={!simState.hideHiPreed ? generalHiPreed : null}
              />
            ) : !simState.hideHiPreed && generalHiPreed.totalAccounts > 0 ? (
              <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 px-3.5 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-start gap-1.5 font-bold text-[#191F28] dark:text-slate-100 leading-relaxed break-keep">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    일반 하이프리드 만기 100% 원금 환급 안내 (서비스 미이용 시):
                  </span>
                </span>
                <span className="text-[11.5px] font-extrabold text-emerald-700 dark:text-emerald-300 break-keep leading-relaxed font-mono tabular-nums whitespace-nowrap">
                  거치 없음 · 150회 만기 {generalHiPreed.totalMaturityRefund.toLocaleString()}원 100% 환급
                </span>
              </div>
            ) : null}

            {hasSubCardActive && currentCard && currentCardTier && (
              <SubscriptionCardSpendGaugeCard
                cardName={currentCard.name}
                benefitLabel={subCardBenefitLabel}
                cardDiscount={subSummary.cardDiscount}
                minSpendLabel={currentCardTier.minSpendLabel}
                targetCardMinSpend={subSummary.targetCardMinSpend || 0}
                countPreedTowardCardSpend={subSummary.countPreedTowardCardSpend}
                hasSubPreedActive={hasSubPreedActive}
                payoutMethod={subSummary.hiPlusPayoutMethod}
                recognizedPreedSpend={subSummary.recognizedPreedSpend || 0}
                additionalCardSpendNeeded={subSummary.additionalCardSpendNeeded || 0}
                representativePeriod={subSummary.representativePeriod}
              />
            )}
          </div>

          {!hideInlineSafetyBox && (
            <PreedSafetyGuideBox
              hasHiPlus={hasSubPreedActive}
              hasGeneralHiPreed={!simState.hideHiPreed && generalHiPreed.totalAccounts > 0}
            />
          )}
        </div>
      )}
    </section>
  );
};
