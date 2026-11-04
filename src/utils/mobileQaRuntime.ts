import React, { ComponentType, LazyExoticComponent, lazy } from 'react';

const CHUNK_RELOAD_GUARD_KEY = 'himart_chunk_reload_guard_ts_v1';

/**
 * [QA 05 권한 거부 방어] 클립보드 권한 차단/WebView 환경에서도 절대 에러 없이 동작하는 안전 복사기
 */
export async function safeCopyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한 거부(NotAllowedError) 또는 비보안 컨텍스트 시 즉시 폴백 실행
  }

  if (typeof document === 'undefined' || !document.body) return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * [QA 08 업데이트 직후 방어] 배포 직후 이전 버전 캐시에서 지연 로딩 청크 해시가 바뀌었을 때
 * 흰 화면(ChunkLoadError) 대신 1회 안전 새로고침으로 최신 번들을 즉시 로드합니다.
 */
export function tryRecoverFromStaleChunkError(err?: unknown): boolean {
  if (typeof window === 'undefined') return false;
  const msg = String((err as any)?.message || err || '');
  const isChunkErr =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Unable to preload CSS');

  if (!isChunkErr) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || 0);
    if (now - last > 15000) {
      sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      tryRecoverFromStaleChunkError(err);
      throw err;
    }
  });
}

/**
 * [QA 01 화면 회전 · QA 03 키보드 가림 · QA 07 작은 화면/노치]
 * - 모바일 가상 키보드가 올라올 때 visualViewport 높이를 실시간 계측해 --kb-height 반영
 * - 모달 및 폼 내부 input/textarea 포커스 시 키보드에 입력창과 하단 저장/전송 버튼이 가려지지 않도록 자동 스크롤
 * - 폴드 접기/펼치기 및 가로/세로 회전 직후 지연된 뷰포트 폭 재계산 이벤트 발행
 */
export function installMobileViewportAndKeyboardGuard(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;
  let focusScrollTimer: ReturnType<typeof setTimeout> | null = null;
  let orientationTimerA: ReturnType<typeof setTimeout> | null = null;
  let orientationTimerB: ReturnType<typeof setTimeout> | null = null;

  const updateViewportMetrics = () => {
    const vv = window.visualViewport;
    if (!vv) {
      root.style.setProperty('--kb-height', '0px');
      root.setAttribute('data-keyboard-open', 'false');
      return;
    }
    const rawDiff = window.innerHeight - vv.height - vv.offsetTop;
    const kbHeight = rawDiff > 110 ? Math.round(rawDiff) : 0;
    root.style.setProperty('--kb-height', `${kbHeight}px`);
    root.setAttribute('data-keyboard-open', kbHeight > 0 ? 'true' : 'false');
  };

  const scrollFocusedFieldAboveKeyboard = (target: HTMLElement | null) => {
    if (!target) return;
    const tag = target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
    const inputType = (target as HTMLInputElement).type;
    if (
      inputType === 'checkbox' ||
      inputType === 'radio' ||
      inputType === 'file' ||
      inputType === 'range'
    ) {
      return;
    }

    const isTouchMobile =
      window.innerWidth < 900 ||
      window.matchMedia?.('(pointer: coarse)').matches;
    if (!isTouchMobile) return;

    if (focusScrollTimer) clearTimeout(focusScrollTimer);
    focusScrollTimer = setTimeout(() => {
      try {
        updateViewportMetrics();
        target.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth',
        });
      } catch {
        // ignore older browser scrollIntoView options error
      }
    }, 220);
  };

  const handleFocusIn = (e: FocusEvent) => {
    scrollFocusedFieldAboveKeyboard(e.target as HTMLElement | null);
  };

  const handleOrientationChange = () => {
    if (orientationTimerA) clearTimeout(orientationTimerA);
    if (orientationTimerB) clearTimeout(orientationTimerB);
    orientationTimerA = setTimeout(() => {
      updateViewportMetrics();
      window.dispatchEvent(new Event('resize'));
    }, 120);
    orientationTimerB = setTimeout(() => {
      updateViewportMetrics();
      window.dispatchEvent(new Event('resize'));
    }, 340);
  };

  updateViewportMetrics();
  window.visualViewport?.addEventListener('resize', updateViewportMetrics);
  window.visualViewport?.addEventListener('scroll', updateViewportMetrics);
  window.addEventListener('resize', updateViewportMetrics);
  window.addEventListener('orientationchange', handleOrientationChange);
  document.addEventListener('focusin', handleFocusIn, true);

  return () => {
    if (focusScrollTimer) clearTimeout(focusScrollTimer);
    if (orientationTimerA) clearTimeout(orientationTimerA);
    if (orientationTimerB) clearTimeout(orientationTimerB);
    window.visualViewport?.removeEventListener('resize', updateViewportMetrics);
    window.visualViewport?.removeEventListener('scroll', updateViewportMetrics);
    window.removeEventListener('resize', updateViewportMetrics);
    window.removeEventListener('orientationchange', handleOrientationChange);
    document.removeEventListener('focusin', handleFocusIn, true);
  };
}

/**
 * [QA 02 백그라운드 복귀 · QA 08 업데이트 직후 · QA 09 푸시 알림 진입]
 * - 문자앱/전화/카톡 전환 후 앱으로 돌아올 때(visibilitychange / pageshow) 캐시 재동기화 및 오프라인 큐 플러시
 * - 서비스워커 백그라운드 업데이트 확인 및 푸시 알림 클릭 시 목표 화면 포커스 라우팅
 */
export function installLifecycleResumeAndUpdateGuard(options: {
  onResumeSync: () => void;
  onPushNavigate?: (urlOrAction: string) => void;
}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const triggerResume = () => {
    if (document.visibilityState === 'hidden') return;
    options.onResumeSync();
    if ('serviceWorker' in navigator && navigator.onLine !== false) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.update().catch(() => {}))
        .catch(() => {});
    }
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      triggerResume();
    }
  };

  const handlePageShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      triggerResume();
    }
  };

  const handleVitePreloadError = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (tryRecoverFromStaleChunkError(customEvt?.payload || 'Unable to preload CSS')) {
      e.preventDefault();
    }
  };

  const handleSwMessage = (e: MessageEvent) => {
    if (e?.data && e.data.type === 'HIMART_PUSH_NAVIGATE' && options.onPushNavigate) {
      options.onPushNavigate(String(e.data.url || './'));
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('vite:preloadError', handleVitePreloadError as EventListener);
  navigator.serviceWorker?.addEventListener?.('message', handleSwMessage);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener(
      'vite:preloadError',
      handleVitePreloadError as EventListener
    );
    navigator.serviceWorker?.removeEventListener?.('message', handleSwMessage);
  };
}
