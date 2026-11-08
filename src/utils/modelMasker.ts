import { ProposalState } from '../types/proposal';

/**
 * 모델명 앞 3글자만 남기고 뒷부분을 '*'로 마스킹합니다.
 * 예:
 * - "RF85C9011AP" -> "RF8********"
 * - "WL21EGZ"     -> "WL2****"
 * - "FG24GN"      -> "FG2***"
 * - "[5년무상AS]플럭스 138cm QLED" -> "[5년무상AS]플럭스********"
 */
export function maskModelCodeAfter3(raw?: string | null): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  // 앞에 [5년무상AS] 같은 대괄호 배지가 붙어 있는 경우 배지는 유지하고 실제 모델명 부분만 앞 3글자 후 마스킹
  const bracketMatch = trimmed.match(/^(\[[^\]]+\]\s*)(.+)$/);
  if (bracketMatch) {
    const prefixBadge = bracketMatch[1];
    const modelBody = bracketMatch[2].trim();
    return `${prefixBadge}${maskCoreTextAfter3(modelBody)}`;
  }

  return maskCoreTextAfter3(trimmed);
}

function maskCoreTextAfter3(text: string): string {
  const chars = Array.from(text.trim());
  if (chars.length === 0) return '';
  if (chars.length <= 3) {
    // 1~3글자 짧은 코드라도 뒤에 최소 '***' 가림 처리를 원할 수 있으나,
    // 품목 약어('TV' 등) 오입력 보호를 위해 영문+숫자 조합 코드일 때만 '***' 보강
    if (/^[A-Za-z0-9]+$/.test(text) && /\d/.test(text)) {
      return `${chars.join('')}***`;
    }
    return chars.join('');
  }

  const visiblePrefix = chars.slice(0, 3).join('');
  const hiddenLen = Math.min(10, Math.max(3, chars.length - 3));
  return `${visiblePrefix}${'*'.repeat(hiddenLen)}`;
}

/**
 * 품목명(category) 칸에 직원이 실수로 모델코드를 함께 적었을 때(예: "냉장고(RF85C9011AP)" 또는 "WL21EGZ")
 * 순수 품목명("냉장고", "세탁건조기", "TV", "QLED TV")은 그대로 살리고 영숫자 모델코드만 앞 3글자 외 가립니다.
 */
export function maskEmbeddedModelInCategory(rawCategory?: string | null): string {
  const trimmed = (rawCategory || '').trim();
  if (!trimmed) return '';

  // 1) 괄호 안에 적힌 영숫자 모델코드 마스킹: 예 "냉장고(RF85C9011AP)" -> "냉장고(RF8********)"
  let result = trimmed.replace(
    /\(([A-Za-z0-9][A-Za-z0-9._-]{3,})\)/g,
    (_full, inner: string) => {
      if (/^(?:36|60)(?:M|개월)$/i.test(inner)) return `(${inner})`;
      return `(${maskModelCodeAfter3(inner)})`;
    }
  );

  // 2) 영문+숫자가 섞인 4글자 이상 모델코드 토큰 마스킹 (예: "워시타워 WL21EGZ" -> "워시타워 WL2****", 단 "2in1", "36M", "60M" 등은 제외)
  result = result.replace(
    /([A-Za-z0-9._-]{4,})/g,
    (token: string) => {
      if (/^(?:2in1|3in1|4in1|36M|60M|100V|220V|2024|2025|2026)$/i.test(token)) return token;
      const hasAlpha = /[A-Za-z]/.test(token);
      const hasDigit = /\d/.test(token);
      if (hasAlpha && hasDigit) {
        return maskModelCodeAfter3(token);
      }
      return token;
    }
  );

  return result;
}

/**
 * ProposalState 전체의 일반품목·구독품목(1안·2안 포함) 모델명을 앞 3글자만 남기고 마스킹한 사본 반환
 */
export function maskProposalStateModels(state: ProposalState): ProposalState {
  const cloned: ProposalState = JSON.parse(JSON.stringify(state));

  const maskGenList = (list: ProposalState['generalItems']) =>
    (list || []).map((it) => ({
      ...it,
      category: maskEmbeddedModelInCategory(it.category),
      name: it.name ? maskEmbeddedModelInCategory(it.name) : it.name,
      modelName: it.modelName ? maskModelCodeAfter3(it.modelName) : '',
      code: it.code ? maskModelCodeAfter3(it.code) : it.code,
    }));

  const maskSubList = (list: ProposalState['items']) =>
    (list || []).map((it) => ({
      ...it,
      category: maskEmbeddedModelInCategory(it.category),
      modelName: it.modelName ? maskModelCodeAfter3(it.modelName) : '',
      modelCode: it.modelCode ? maskModelCodeAfter3(it.modelCode) : it.modelCode,
    }));

  cloned.generalItems = maskGenList(cloned.generalItems);
  cloned.items = maskSubList(cloned.items);

  if (cloned.generalPlan1) {
    cloned.generalPlan1.generalItems = maskGenList(cloned.generalPlan1.generalItems);
    cloned.generalPlan1.items = maskSubList(cloned.generalPlan1.items);
  }
  if (cloned.generalPlan2) {
    cloned.generalPlan2.generalItems = maskGenList(cloned.generalPlan2.generalItems);
    cloned.generalPlan2.items = maskSubList(cloned.generalPlan2.items);
  }
  if (cloned.modeConfigs) {
    if (cloned.modeConfigs.general) {
      cloned.modeConfigs.general.generalItems = maskGenList(cloned.modeConfigs.general.generalItems);
      cloned.modeConfigs.general.items = maskSubList(cloned.modeConfigs.general.items);
    }
    if (cloned.modeConfigs.subscription) {
      cloned.modeConfigs.subscription.generalItems = maskGenList(cloned.modeConfigs.subscription.generalItems);
      cloned.modeConfigs.subscription.items = maskSubList(cloned.modeConfigs.subscription.items);
    }
    if (cloned.modeConfigs.hybrid) {
      cloned.modeConfigs.hybrid.generalItems = maskGenList(cloned.modeConfigs.hybrid.generalItems);
      cloned.modeConfigs.hybrid.items = maskSubList(cloned.modeConfigs.hybrid.items);
    }
  }

  return cloned;
}
