import React from 'react';
import {
  AlertCircle,
  Check,
  CreditCard,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  HI_PLUS_PAYOUT_OPTIONS,
  HiPlusPayoutMethod,
  normalizeHiPlusPayoutMethod,
} from '../types/proposal';

interface CardSpendSimulationBadgeProps {
  enabled?: boolean;
  payoutMethod?: HiPlusPayoutMethod;
  recognizedPreedSpend: number;
  additionalCardSpendNeeded: number;
  targetCardMinSpend: number;
  compact?: boolean;
}

export const CardSpendSimulationBadge: React.FC<
  CardSpendSimulationBadgeProps
> = ({
  enabled,
  payoutMethod,
  recognizedPreedSpend,
  additionalCardSpendNeeded,
  targetCardMinSpend,
  compact = false,
}) => {
  if (!enabled || targetCardMinSpend <= 0) return null;
  const method = normalizeHiPlusPayoutMethod(payoutMethod);
  const isAutoSatisfied = method !== 'bank_bank' && additionalCardSpendNeeded === 0;

  return (
    <div
      className={`mt-1.5 rounded-lg border ${
        isAutoSatisfied
          ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-700/70 text-emerald-800 dark:text-emerald-200'
          : 'bg-[#EFF6FF] dark:bg-blue-950/50 border-[#BFDBFE] dark:border-blue-800/70 text-[#1B64DA] dark:text-blue-300'
      } ${
        compact ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.5 text-[11px]'
      } font-bold leading-snug break-keep flex items-start gap-1.5`}
    >
      <CreditCard
        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
          isAutoSatisfied
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-[#1B64DA] dark:text-blue-400'
        }`}
      />
      <div className="min-w-0">
        {method === 'bank_bank' ? (
          <span>
            통장납 선택 시 카드 실적 인정{' '}
            <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
              0원
            </strong>{' '}
            → 추가로 필요한 카드 사용:{' '}
            <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
              월 {additionalCardSpendNeeded.toLocaleString()}원
            </strong>
          </span>
        ) : additionalCardSpendNeeded === 0 ? (
          <span>
            지원상품 납입금 실적 인정{' '}
            <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
              {recognizedPreedSpend.toLocaleString()}원
            </strong>{' '}
            → 추가로 필요한 카드 사용:{' '}
            <strong className="font-extrabold text-emerald-700 dark:text-emerald-300">
              없음 (납입금만으로 실적 충족)
            </strong>
          </span>
        ) : (
          <span>
            지원상품 납입금 실적 인정{' '}
            <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
              {recognizedPreedSpend.toLocaleString()}원
            </strong>{' '}
            → 추가로 필요한 카드 사용:{' '}
            <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
              월 {additionalCardSpendNeeded.toLocaleString()}원
            </strong>
          </span>
        )}
      </div>
    </div>
  );
};

interface CardDiscountTermNoticeProps {
  cardDiscount: number;
  benefitLabel: string;
  representativePeriod: number;
  compact?: boolean;
}

export const CardDiscountTermNotice: React.FC<CardDiscountTermNoticeProps> = ({
  cardDiscount,
  benefitLabel,
  representativePeriod,
  compact = false,
}) => {
  if (cardDiscount <= 0) return null;
  return (
    <div
      className={`rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 ${
        compact ? 'px-2.5 py-1.5 text-[10.5px]' : 'px-3.5 py-2 text-[11px]'
      } font-bold text-amber-800 dark:text-amber-200 leading-snug break-keep flex items-start gap-1.5`}
    >
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <span>
        ※ 제휴카드 월 {benefitLabel}(
        <span className="font-mono tabular-nums whitespace-nowrap">
          -{cardDiscount.toLocaleString()}원
        </span>
        )은 가전 구독기간({representativePeriod}개월) 동안만 적용되며 이후 종료됩니다.
      </span>
    </div>
  );
};

interface HiPlusInBoxCalloutProps {
  totalAccounts: number;
  totalMonthlyDeposit: number;
  totalMaturityRefund: number;
  compact?: boolean;
}

export const HiPlusInBoxCallout: React.FC<HiPlusInBoxCalloutProps> = ({
  totalAccounts,
  totalMonthlyDeposit,
  totalMaturityRefund,
  compact = false,
}) => {
  if (totalAccounts <= 0) return null;
  return (
    <div
      className={`${
        compact ? 'mt-2 pt-2 space-y-1.5' : 'mt-2.5 pt-2.5 space-y-1.5'
      } border-t border-[#FECDD3] dark:border-rose-800/70`}
    >
      <div
        className={`${
          compact ? 'text-[10.5px]' : 'text-[11.5px]'
        } font-bold text-[#4E5968] dark:text-slate-300 leading-snug break-keep`}
      >
        ※ 지원상품(Hi구독 플러스) 월 납입금{' '}
        <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
          {totalMonthlyDeposit.toLocaleString()}원
        </strong>
        (1~90회 납입)은 별도입니다
      </div>
      <div
        className={`rounded-xl bg-[#EFF6FF] dark:bg-blue-950/50 border border-[#BFDBFE] dark:border-blue-800/70 ${
          compact ? 'px-2.5 py-1.5 text-[10.5px]' : 'px-3 py-2 text-[11px]'
        } font-bold text-[#1B64DA] dark:text-blue-300 leading-snug break-keep`}
      >
        지원상품 총 납입 원금{' '}
        <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-[#191F28] dark:text-white">
          {totalMaturityRefund.toLocaleString()}원
        </strong>
        (90개월) → 120개월 만기 시{' '}
        <strong className="font-mono tabular-nums whitespace-nowrap font-extrabold text-emerald-700 dark:text-emerald-300">
          {totalMaturityRefund.toLocaleString()}원(100%)
        </strong>{' '}
        전액 환급 예정{' '}
        <span className="font-semibold text-[#4E5968] dark:text-slate-300">
          (상조·전환 서비스 미이용 및 만기 완납 시)
        </span>
      </div>
    </div>
  );
};

interface HiPlusInlineSummaryCardProps {
  hiSummary: {
    totalAccounts: number;
    monthlyHiPlusSupport: number;
    totalHiPlusSupport: number;
    totalMonthlyDeposit: number;
    totalMaturityRefund: number;
    comboLabel?: string;
    activePlans?: { plan: { name: string }; count: number }[];
  };
  representativePeriod: number;
  payoutMethod?: HiPlusPayoutMethod;
  onSelectPayoutMethod?: (method: HiPlusPayoutMethod) => void;
  useMobileFluid?: boolean;
  generalHiPreedSummary?: {
    totalAccounts: number;
    totalMaturityRefund: number;
    totalMonthlyDeposit: number;
  } | null;
  showGeneralLine?: boolean;
}

export const HiPlusInlineSummaryCard: React.FC<
  HiPlusInlineSummaryCardProps
> = ({
  hiSummary,
  representativePeriod,
  payoutMethod,
  onSelectPayoutMethod,
  useMobileFluid = false,
  generalHiPreedSummary,
  showGeneralLine = false,
}) => {
  if (!hiSummary || hiSummary.totalAccounts <= 0) return null;
  const activeMethod = normalizeHiPlusPayoutMethod(payoutMethod);
  const selectedOpt =
    HI_PLUS_PAYOUT_OPTIONS.find((o) => o.id === activeMethod) ||
    HI_PLUS_PAYOUT_OPTIONS[0];
  const otherOpts = HI_PLUS_PAYOUT_OPTIONS.filter(
    (o) => o.id !== selectedOpt.id
  );

  const planSummaryLine =
    hiSummary.activePlans && hiSummary.activePlans.length > 0
      ? hiSummary.activePlans
          .map((p) => `${p.plan.name} × ${p.count}구좌`)
          .join(' + ')
      : hiSummary.comboLabel || `Hi구독 플러스 총 ${hiSummary.totalAccounts}구좌`;

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden">
      <div className="px-3.5 sm:px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800/70 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-extrabold shrink-0 whitespace-nowrap">
            STEP 3
          </span>
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-[13px] font-black text-[#191F28] dark:text-slate-100 tracking-tight break-keep">
            지원상품(Hi구독 플러스) 납입 · 100% 만기 환급 안내
          </span>
        </div>
        <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-700/70 px-2.5 py-0.5 rounded-full break-keep tabular-nums">
          {planSummaryLine} (총 {hiSummary.totalAccounts}구좌)
        </span>
      </div>

      <div className="p-3 sm:p-3.5 space-y-3 bg-white/95 dark:bg-[#131C2E]/95">
        {/* 4칸 미니 KPI 카드 — 모바일 390px 2x2 고정 + 천만 원 단위 clamp·whitespace-nowrap 방어 */}
        <div
          className={`grid mobile-keep-grid ${
            useMobileFluid ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-4'
          } gap-2 items-stretch`}
        >
          <div className="min-w-0 rounded-xl bg-[#FFF1F2] dark:bg-rose-950/35 border border-[#FECDD3] dark:border-rose-800/70 px-2.5 py-2 flex flex-col justify-between overflow-hidden">
            <span className="text-[10.5px] font-extrabold text-[#E60012] dark:text-[#FF6B78] tracking-tight break-keep">
              ① 총 지원금
            </span>
            <span className="text-[clamp(0.8125rem,3.6vw,1rem)] sm:text-[clamp(0.875rem,1.45vw,1.02rem)] font-black text-[#E60012] dark:text-[#FF5A65] font-mono tabular-nums whitespace-nowrap tracking-tight mt-0.5">
              {hiSummary.totalHiPlusSupport.toLocaleString()}원
            </span>
            <span className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 leading-snug break-keep tabular-nums">
              월 -{hiSummary.monthlyHiPlusSupport.toLocaleString()}원 ×{' '}
              {representativePeriod}개월
            </span>
          </div>

          <div className="min-w-0 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E5E8EB] dark:border-slate-700 px-2.5 py-2 flex flex-col justify-between overflow-hidden">
            <span className="text-[10.5px] font-extrabold text-[#4E5968] dark:text-slate-300 tracking-tight break-keep">
              ② 1~90회 월 납입금
            </span>
            <span className="text-[clamp(0.8125rem,3.6vw,1rem)] sm:text-[clamp(0.875rem,1.45vw,1.02rem)] font-black text-[#191F28] dark:text-white font-mono tabular-nums whitespace-nowrap tracking-tight mt-0.5">
              월 {hiSummary.totalMonthlyDeposit.toLocaleString()}원
            </span>
            <span className="text-[10px] font-semibold text-[#8B95A1] dark:text-slate-400 mt-0.5 leading-snug break-keep">
              1~90회차 정기 납입
            </span>
          </div>

          <div className="min-w-0 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-800/70 px-2.5 py-2 flex flex-col justify-between overflow-hidden">
            <span className="text-[10.5px] font-extrabold text-[#1B64DA] dark:text-blue-300 tracking-tight break-keep">
              ③ 91~120개월 거치
            </span>
            <span className="text-[clamp(0.8125rem,3.6vw,1rem)] sm:text-[clamp(0.875rem,1.45vw,1.02rem)] font-black text-[#1B64DA] dark:text-blue-400 font-mono tabular-nums whitespace-nowrap tracking-tight mt-0.5">
              월 0원
            </span>
            <span className="text-[10px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 leading-snug break-keep">
              30개월 무납입 거치 유지
            </span>
          </div>

          <div className="min-w-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-2 flex flex-col justify-between overflow-hidden">
            <span className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-300 tracking-tight break-keep">
              ④ 120개월 만기 환급
            </span>
            <span className="text-[clamp(0.8125rem,3.6vw,1rem)] sm:text-[clamp(0.875rem,1.45vw,1.02rem)] font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums whitespace-nowrap tracking-tight mt-0.5">
              {hiSummary.totalMaturityRefund.toLocaleString()}원
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 leading-snug break-keep">
              미이용 시 원금 100% 환급
            </span>
          </div>
        </div>

        {/* 일반 하이프리드 병행 시 보조 안내 (혼합 모드) */}
        {showGeneralLine &&
          generalHiPreedSummary &&
          generalHiPreedSummary.totalAccounts > 0 && (
            <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/70 border border-[#E5E8EB] dark:border-slate-700 px-3 py-2 text-[11px] font-bold text-[#191F28] dark:text-slate-100 flex flex-wrap items-center justify-between gap-2 break-keep">
              <span>
                일반 하이프리드 병행 (거치 없음 · 150회 만기): 월 납입금{' '}
                <strong className="font-mono tabular-nums whitespace-nowrap">
                  {generalHiPreedSummary.totalMonthlyDeposit.toLocaleString()}원
                </strong>
              </span>
              <span className="font-mono tabular-nums whitespace-nowrap font-extrabold text-emerald-700 dark:text-emerald-300">
                150회 만기 100% 환급{' '}
                {generalHiPreedSummary.totalMaturityRefund.toLocaleString()}원
              </span>
            </div>
          )}

        {/* 상조회비 납부·지원금 수령 방식 3종 카드 (뷰어에서는 터치 전환도 지원) */}
        <div className="rounded-xl border border-[#E5E8EB] dark:border-slate-700/80 bg-[#F8FAFC] dark:bg-slate-800/50 p-2.5 space-y-1.5">
          <div className="text-[11px] font-extrabold text-[#191F28] dark:text-slate-100 flex items-center justify-between gap-2">
            <span>상조회비 납부 · 지원금 수령 방식</span>
            <span className="text-[10px] font-semibold text-[#8B95A1] dark:text-slate-400">
              {onSelectPayoutMethod
                ? '터치하여 방식 비교 가능'
                : '선택 기준 · 타 방식 변경 가능'}
            </span>
          </div>

          <div className="rounded-lg bg-[#EFF6FF] dark:bg-blue-950/50 border border-[#1B64DA] dark:border-blue-500 px-2.5 py-1.5 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-[#191F28] dark:text-white flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1B64DA] text-white text-[9.5px] font-extrabold">
                  <Check className="w-2.5 h-2.5" />
                  선택
                </span>
                <span>{selectedOpt.title}</span>
              </div>
              <div className="text-[10.5px] font-semibold text-[#4E5968] dark:text-slate-300 mt-0.5 leading-snug break-keep">
                {selectedOpt.desc}
              </div>
            </div>
          </div>

          <div
            className={`grid ${
              useMobileFluid ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'
            } gap-1.5`}
          >
            {otherOpts.map((opt) =>
              onSelectPayoutMethod ? (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectPayoutMethod(opt.id)}
                  className="text-left rounded-lg bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border border-[#E5E8EB] dark:border-slate-700/70 hover:border-[#1B64DA]/60 px-2.5 py-1.5 text-[#6B7684] dark:text-slate-400 transition cursor-pointer"
                >
                  <div className="text-[10.5px] font-bold text-[#4E5968] dark:text-slate-300">
                    {opt.title}
                  </div>
                  <div className="text-[10px] font-medium text-[#8B95A1] dark:text-slate-400 leading-snug break-keep mt-0.5">
                    {opt.desc}
                  </div>
                </button>
              ) : (
                <div
                  key={opt.id}
                  className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-[#E5E8EB] dark:border-slate-700/70 px-2.5 py-1.5 text-[#6B7684] dark:text-slate-400"
                >
                  <div className="text-[10.5px] font-bold text-[#4E5968] dark:text-slate-300">
                    {opt.title}
                  </div>
                  <div className="text-[10px] font-medium text-[#8B95A1] dark:text-slate-400 leading-snug break-keep mt-0.5">
                    {opt.desc}
                  </div>
                </div>
              )
            )}
          </div>

          <p className="text-[10px] font-medium text-[#8B95A1] dark:text-slate-400 leading-snug break-keep pt-0.5">
            ※ 세부 납부·지원 방식은 가입 시 웅진프리드라이프 가입센터에서 최종
            확인합니다.
          </p>
        </div>
      </div>
    </section>
  );
};

interface PreedSafetyGuideBoxProps {
  hasHiPlus: boolean;
  hasGeneralHiPreed: boolean;
}

export const PreedSafetyGuideBox: React.FC<PreedSafetyGuideBoxProps> = ({
  hasHiPlus,
  hasGeneralHiPreed,
}) => {
  if (!hasHiPlus && !hasGeneralHiPreed) return null;

  const conditionText =
    hasHiPlus && hasGeneralHiPreed
      ? 'Hi구독 플러스(구독 계약 유지 및 1~90회 정상 납입) · 일반 하이프리드(하이마트 제휴카드 35개월 할부 결제 및 1~35회차 자동이체 유지 필수)'
      : hasHiPlus
      ? '가전 구독 계약 유지 및 지원상품(Hi구독 플러스) 1~90회차 정상 납입 유지 시 구독 기간 동안 매월 지원금 지급'
      : '하이마트 제휴카드 35개월 할부 선결제 및 1~35회차 자동이체 유지 필수 (매월 할부 원리금 100% 상쇄)';

  const maturityText =
    hasHiPlus && hasGeneralHiPreed
      ? 'Hi구독 플러스(1~90회 납입 + 30개월 무납입 거치 · 120개월 만기) / 일반 하이프리드(거치기간 없이 1~150회[150개월] 납입 완료 시 만기) 도래 후 해약 신청 시 납입 원금 100% 환급 (상조·전환 서비스 미이용 시)'
      : hasHiPlus
      ? '1~90회 납입 + 30개월 무납입 거치 후 총 120개월 만기 도래 시 해약 신청하면 납입 원금 100% 전액 환급 (상조·전환 서비스 미이용 시)'
      : '별도 거치기간 없이 1~150회(150개월) 납입 완료 후 해약 신청 시 납입 원금 100% 전액 환급 (상조·전환 서비스 미이용 시)';

  const rows = [
    { label: '가입 조건', text: conditionText },
    { label: '만기 환급', text: maturityText },
    {
      label: '중도 해지',
      text: "만기 전 중도 해지 또는 월 부금 3회 이상 연체 시 가전 지원금 지급 중단·환수 및 잔여 할부금·구독료 본인 부담 전환. 해약환급금은 공정거래위원회 '선불식 할부계약의 해제에 따른 해약환급금 산정기준 고시'에 따라 납입 원금보다 적거나 없을 수 있습니다.",
    },
    {
      label: '청약철회',
      text: '할부거래에 관한 법률 제24조에 의거 계약서 수령일(미수령 시 계약일)로부터 14일 이내 청약철회 가능 (단, 가전 지원금·서비스 개시 시 관련 정산 기준 적용).',
    },
    {
      label: '상품 성격',
      text: '예·적금·보험 등 금융상품이 아닌 웅진프리드라이프 선불식 할부거래(상조·라이프케어) 상품이며, 할부거래법 제27조에 따라 선수금의 50%를 제1금융권(우리·신한·하나·KB국민·IBK기업·수협·아이엠뱅크·BNK부산은행) 지급보증·예치 계약으로 보전합니다.',
    },
  ];

  return (
    <section className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#D1D6DB] dark:border-slate-700 px-3.5 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#E5E8EB] dark:border-slate-700">
        <span className="text-[11.5px] font-black text-[#191F28] dark:text-slate-100 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#E60012] dark:text-[#FF6B78] shrink-0" />
          가입 전 꼭 확인하세요
        </span>
        <span className="text-[10px] font-bold text-[#8B95A1] dark:text-slate-400">
          웅진프리드라이프 제휴 결합 필수 안내
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-2 text-[10.5px] leading-snug break-keep"
          >
            <span className="px-1.5 py-0.5 rounded bg-[#191F28] dark:bg-slate-700 text-white text-[9.5px] font-extrabold shrink-0 min-w-[50px] text-center">
              {row.label}
            </span>
            <span className="text-[#4E5968] dark:text-slate-300 font-medium flex-1">
              {row.text}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
