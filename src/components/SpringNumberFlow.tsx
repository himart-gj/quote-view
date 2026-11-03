import React, { useEffect, useRef, useState } from 'react';

export interface SpringNumberFlowProps {
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
  formatFn?: (val: number) => string;
}

/**
 * NumberFlow 오픈소스 패턴 기반 물리 이징 숫자 롤링 컴포넌트
 * - 금액 변화 시 60FPS로 부드럽게 카운팅되며 tabular-nums로 자릿수 흔들림을 방지합니다.
 * - 인쇄(@media print) 및 PNG 캡처 시에는 항상 최종 목표 숫자를 정적으로 노출해 캡처 오차를 차단합니다.
 */
export const SpringNumberFlow: React.FC<SpringNumberFlowProps> = ({
  value,
  suffix = '',
  prefix = '',
  durationMs = 420,
  className = '',
  formatFn,
}) => {
  const safeTarget = Number.isFinite(value) ? Math.round(value) : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const [trend, setTrend] = useState<'up' | 'down' | 'idle'>('idle');
  const prevRef = useRef<number>(safeTarget);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = safeTarget;

    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    // 접근성: 모션 축소 설정 시 즉시 반영
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      prevRef.current = endVal;
      setDisplayValue(endVal);
      return;
    }

    setTrend(endVal < startVal ? 'down' : 'up');
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Emil Kowalski strong ease-out curve approximation: 1 - (1 - t)^3.4
      const eased = 1 - Math.pow(1 - t, 3.4);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayValue(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = endVal;
        setDisplayValue(endVal);
        setTrend('idle');
      }
    };

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [safeTarget, durationMs]);

  const formattedLive = formatFn
    ? formatFn(displayValue)
    : displayValue.toLocaleString('ko-KR');
  const formattedExact = formatFn
    ? formatFn(safeTarget)
    : safeTarget.toLocaleString('ko-KR');

  return (
    <span
      className={`inline-flex items-baseline font-mono tabular-nums tracking-tight ${className}`}
      style={{
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {/* 화면 라이브 애니메이션 값 */}
      <span
        className={`no-print-number-anim inline-block transition-transform duration-150 ${
          trend === 'down'
            ? 'translate-y-[0.5px]'
            : trend === 'up'
            ? '-translate-y-[0.5px]'
            : ''
        }`}
      >
        {prefix}
        {formattedLive}
        {suffix}
      </span>
      {/* 인쇄 전용 정적 값 (인쇄 시에만 표시) */}
      <span className="only-print-number-static hidden">
        {prefix}
        {formattedExact}
        {suffix}
      </span>
    </span>
  );
};
