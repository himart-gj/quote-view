import React from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatCurrency } from '../utils/date';
import {
  downloadModelIncentiveExcelTemplate,
  loadGitHubSyncConfig,
} from '../utils/settlementEngine';

function formatShortManwon(val: number): string {
  const n = Math.round(Number(val) || 0);
  if (n === 0) return "0원";
  if (Math.abs(n) >= 10000) {
    const man = n / 10000;
    return Number.isInteger(man) ? `${man.toLocaleString()}만` : `${man.toFixed(1)}만`;
  }
  return `${n.toLocaleString()}원`;
}

export const CrmModelIncentiveTabSection: React.FC<Record<string, any>> = ({
  activeTab,
  bulkPasteText,
  currentSheet,
  excelInputRef,
  filteredRules,
  ghConfig,
  gsheetUrl,
  handleAddSingleRule,
  handleBulkTextApply,
  handleCopyFromPrevMonth,
  handleDeleteRule,
  handleExcelUpload,
  handleGoogleSheetSync,
  handleManualPullOrPush,
  handlePhotoUpload,
  handleQuickAssignSave,
  handleRuleAmountBlur,
  handleSaveGhConfig,
  handleUpdateRuleAmount,
  incentiveBasis,
  isDark,
  isSyncingCloud,
  isUploading,
  manualCategory,
  manualIncentive,
  manualModelCode,
  mutedCls,
  onSelectCustomer,
  photoInputRef,
  prevSheet,
  quickAssignAmount,
  quickAssignTarget,
  replaceOnUpload,
  report,
  ruleSearch,
  selectedYearMonth,
  setBulkPasteText,
  setGhConfig,
  setGsheetUrl,
  setIncentiveBasis,
  setManualCategory,
  setManualIncentive,
  setManualModelCode,
  setQuickAssignAmount,
  setQuickAssignTarget,
  setReplaceOnUpload,
  setRuleSearch,
  setShowCloudDrawer,
  setShowGsheetDrawer,
  setShowManualDrawer,
  setShowRulesDrawer,
  setUploadError,
  setUploadSuccess,
  shellCls,
  showCloudDrawer,
  showGsheetDrawer,
  showManualDrawer,
  showRulesDrawer,
  subSurfaceCls,
  uploadError,
  uploadSuccess,
}) => {
  return (
    <>
          {/* 탭 3: 제품 모델별 수당 (심플 컴팩트형) */}
          {activeTab === 'models' && (
            <div className="space-y-2">
              {/* 한 줄 업로드·관리 툴바 */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => photoInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    <span>사진 업로드</span>
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => excelInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                    title="구글 시트에서 다운로드한 Excel(.xlsx) 또는 CSV(.csv) 파일 업로드"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3 h-3" />
                    )}
                    <span>{isUploading ? '처리 중...' : '엑셀·시트파일'}</span>
                  </button>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.gsheet,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
                    multiple
                    disabled={isUploading}
                    onChange={handleExcelUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => setShowGsheetDrawer((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black inline-flex items-center gap-1 cursor-pointer ${
                      showGsheetDrawer
                        ? 'bg-teal-600 text-white border-teal-600'
                        : isDark
                        ? 'bg-teal-500/15 text-teal-300 border-teal-400/35 hover:bg-teal-500/25'
                        : 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                    }`}
                    title="구글 시트 공유 링크(URL)로 최신 단가표 즉시 불러오기"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>구글시트 연동</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowManualDrawer((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black inline-flex items-center gap-1 cursor-pointer ${subSurfaceCls}`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>직접입력</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRulesDrawer((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer ${subSurfaceCls}`}
                  >
                    <span>단가표({currentSheet?.rules.length || 0})</span>
                    {showRulesDrawer ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {prevSheet && prevSheet.rules.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyFromPrevMonth}
                      className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${subSurfaceCls}`}
                      title="전월 단가표 불러오기"
                    >
                      <Copy className="w-3 h-3" />
                      <span>전월복사</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      downloadModelIncentiveExcelTemplate(
                        selectedYearMonth,
                        currentSheet?.rules || []
                      )
                    }
                    className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${subSurfaceCls}`}
                    title="엑셀 양식 또는 현재 단가표 다운로드"
                  >
                    <Download className="w-3 h-3" />
                    <span>양식</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={handleManualPullOrPush}
                    className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${subSurfaceCls}`}
                    title="서버에서 최신 단가표 새로고침 / 내 단가표 즉시 공유"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin text-sky-500' : ''}`}
                    />
                    <span>동기화</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGhConfig(loadGitHubSyncConfig());
                      setShowCloudDrawer((v) => !v);
                    }}
                    className={`px-2 py-1.5 rounded-xl border text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer ${
                      ghConfig.repo.trim() && ghConfig.token.trim()
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : subSurfaceCls
                    }`}
                    title="전 직원 단가표 자동 공유(GitHub) 설정 — 휴무표·조견표 설정과 자동 연동됩니다"
                  >
                    <Cloud className="w-3 h-3" />
                    <span>
                      {ghConfig.repo.trim() && ghConfig.token.trim()
                        ? '전직원공유 ON'
                        : '공유설정'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-mono text-sky-500">
                    매칭 {report.matchedModelUnitCount}대 · +{formatCurrency(report.modelIncentiveTotal)}원
                  </span>
                  <div
                    className={`inline-flex items-center p-0.5 rounded-lg border text-[10px] font-black ${subSurfaceCls}`}
                  >
                    <button
                      type="button"
                      onClick={() => setIncentiveBasis('contract')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        incentiveBasis === 'contract'
                          ? isDark
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#18181B] text-white'
                          : mutedCls
                      }`}
                    >
                      계약월
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncentiveBasis('delivery')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        incentiveBasis === 'delivery'
                          ? isDark
                            ? 'bg-sky-400 text-slate-950'
                            : 'bg-[#18181B] text-white'
                          : mutedCls
                      }`}
                    >
                      배송월
                    </button>
                  </div>
                </div>
              </div>

              {uploadSuccess && (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 text-[11px] font-extrabold flex items-center justify-between gap-2">
                  <span>{uploadSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setUploadSuccess(null)}
                    className="opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                  >
                    닫기
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center justify-between gap-2">
                  <span>⚠️ {uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                  >
                    닫기
                  </button>
                </div>
              )}

              {showGsheetDrawer && (
                <div className={`p-2.5 rounded-xl border space-y-2 text-xs ${subSurfaceCls}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">
                      🔗 구글 시트 단가표 바로 불러오기 (시트 공유: &lsquo;링크가 있는 모든 사용자&rsquo; 권장)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGsheetDrawer(false)}
                      className="text-[11px] font-bold opacity-70 cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                    <input
                      type="url"
                      value={gsheetUrl}
                      onChange={(e) => setGsheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/... 주소 붙여넣기"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono ${shellCls}`}
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => void handleGoogleSheetSync()}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-black shrink-0 inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>시트 즉시 불러오기</span>
                    </button>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${mutedCls}`}>
                    💡 비공개 시트인 경우 구글 시트 상단 <strong>[파일 → 다운로드 → Microsoft Excel(.xlsx)]</strong>로 저장한 뒤 위 <strong>[엑셀·시트파일]</strong> 버튼으로 올리셔도 472개 전 모델이 오차 없이 자동 인식됩니다.
                  </p>
                </div>
              )}

              {showCloudDrawer && (
                <div className={`p-2.5 rounded-xl border space-y-2 text-xs ${subSurfaceCls}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">
                      ☁️ 전 직원 단가표 자동 공유 (휴무표·조견표 GitHub 설정과 자동 연동 · 고객정보 제외)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCloudDrawer(false)}
                      className="text-[11px] font-bold opacity-70 cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                    <input
                      type="text"
                      value={ghConfig.repo}
                      onChange={(e) =>
                        setGhConfig((p) => ({ ...p, repo: e.target.value }))
                      }
                      placeholder="저장소 (예: 아이디/저장소명)"
                      className={`sm:col-span-5 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono ${shellCls}`}
                    />
                    <input
                      type="password"
                      value={ghConfig.token}
                      onChange={(e) =>
                        setGhConfig((p) => ({ ...p, token: e.target.value }))
                      }
                      placeholder="GitHub 토큰 (ghp_...)"
                      className={`sm:col-span-5 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono ${shellCls}`}
                    />
                    <button
                      type="button"
                      onClick={handleSaveGhConfig}
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black cursor-pointer"
                    >
                      저장·배포
                    </button>
                  </div>
                </div>
              )}

              {showManualDrawer && (
                <div className={`p-2.5 rounded-xl border space-y-2 ${subSurfaceCls}`}>
                  <form
                    onSubmit={handleAddSingleRule}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-1.5"
                  >
                    <input
                      type="text"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      placeholder="품목(냉장고)"
                      className={`sm:col-span-3 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-bold ${shellCls}`}
                    />
                    <input
                      type="text"
                      value={manualModelCode}
                      onChange={(e) => setManualModelCode(e.target.value)}
                      placeholder="모델코드(RM70F64M2X)"
                      className={`sm:col-span-5 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono font-bold ${shellCls}`}
                    />
                    <input
                      type="text"
                      value={manualIncentive}
                      onChange={(e) => setManualIncentive(e.target.value)}
                      placeholder="수당(5만)"
                      className={`sm:col-span-2 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono font-bold ${shellCls}`}
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-black cursor-pointer"
                    >
                      + 추가
                    </button>
                  </form>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="한 줄/여러 줄 붙여넣기 (예: RM70F64M2X 5만, OLED65C4 10만)"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg border text-base sm:text-xs font-mono ${shellCls}`}
                    />
                    <button
                      type="button"
                      onClick={handleBulkTextApply}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-black shrink-0 cursor-pointer"
                    >
                      일괄 반영
                    </button>
                  </div>
                </div>
              )}

              {showRulesDrawer && (
                <div className={`p-2.5 rounded-xl border space-y-2 ${subSurfaceCls}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={ruleSearch}
                        onChange={(e) => setRuleSearch(e.target.value)}
                        placeholder="브랜드·모델코드·품목·모델명 검색 (예: 쿠첸, 테팔, 제스파, CP-AQS100)"
                        className={`w-full pl-7 pr-2.5 py-1 rounded-lg border text-base sm:text-xs ${shellCls}`}
                      />
                    </div>
                    <label className="inline-flex items-center gap-1 text-[10px] font-bold shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceOnUpload}
                        onChange={(e) => setReplaceOnUpload(e.target.checked)}
                        className="rounded accent-indigo-600"
                      />
                      <span>업로드시 교체</span>
                    </label>
                  </div>

                  {filteredRules.length === 0 ? (
                    <div className={`py-2 text-center text-[11px] font-bold ${mutedCls}`}>
                      등록된 모델 단가가 없습니다.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 schedule-matrix-scroll">
                      {filteredRules.map((r) => (
                        <div
                          key={r.id}
                          className={`px-2.5 py-1 rounded-lg border flex items-center justify-between gap-2 text-xs ${shellCls}`}
                        >
                          <div className="min-w-0 flex items-center gap-1.5 truncate">
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-500 text-[10px] font-black shrink-0">
                              {r.category}
                            </span>
                            <span className="font-mono font-black truncate">
                              {r.modelCode}
                            </span>
                            {r.productName && (
                              <span className={`text-[10px] truncate hidden sm:inline ${mutedCls}`}>
                                {r.productName}
                              </span>
                            )}
                            {r.incentiveAmount === 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[9px] font-extrabold shrink-0">
                                0원·안내
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              value={r.incentiveAmount}
                              onChange={(e) =>
                                handleUpdateRuleAmount(
                                  r.id,
                                  Number(e.target.value) || 0
                                )
                              }
                              onBlur={handleRuleAmountBlur}
                              className={`w-20 px-1.5 py-0.5 rounded border text-right font-mono font-bold text-base sm:text-xs ${subSurfaceCls}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r.id)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {quickAssignTarget && (
                <div
                  className={`rounded-xl border px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isDark
                      ? 'bg-indigo-950/50 border-indigo-400/40'
                      : 'bg-indigo-50 border-indigo-200'
                  }`}
                >
                  <span className="font-black">
                    ⚡ [{quickAssignTarget.category}]{' '}
                    <span className="font-mono text-indigo-500">
                      {quickAssignTarget.modelCode}
                    </span>{' '}
                    수당 지정
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={quickAssignAmount}
                      onChange={(e) => setQuickAssignAmount(e.target.value)}
                      placeholder="예: 5만"
                      className={`w-28 px-2 py-1 rounded-lg border text-base sm:text-xs font-mono font-bold ${shellCls}`}
                    />
                    <button
                      type="button"
                      onClick={handleQuickAssignSave}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-black inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> 반영
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAssignTarget(null)}
                      className="px-2 py-1 text-[11px] font-bold opacity-70 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {report.confirmedRowsForIncentive.length === 0 ? (
                <div
                  className={`rounded-xl border py-3 px-3 text-center text-[11px] font-bold ${subSurfaceCls} ${mutedCls}`}
                >
                  구매 확정([계약완료]·[발송완료]) 고객이 등록되면 구매 모델에서 자동 계산됩니다. (미구매 제외)
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 schedule-matrix-scroll">
                  {report.confirmedRowsForIncentive.map((row) => (
                    <div
                      key={row.customer.id}
                      onClick={() => onSelectCustomer(row.customer)}
                      className={`px-3 py-2 rounded-xl border space-y-1.5 cursor-pointer ${
                        row.customerModelIncentive > 0
                          ? isDark
                            ? 'bg-[#142030] border-sky-400/40'
                            : 'bg-white border-sky-300'
                          : subSurfaceCls
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-black truncate">
                          {row.customer.name} 고객님
                        </span>
                        <span
                          className={`font-black font-mono shrink-0 ${
                            row.customerModelIncentive > 0 ? 'text-sky-500' : mutedCls
                          }`}
                        >
                          +{formatCurrency(row.customerModelIncentive)}원
                        </span>
                      </div>

                      <div
                        className="flex flex-wrap items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.modelMatches.length === 0 ? (
                          <span className={`text-[10px] ${mutedCls}`}>
                            세부 모델 미입력
                          </span>
                        ) : (
                          row.modelMatches.map((mm, mIdx) => {
                            const matched = Boolean(mm.matchedRule);
                            return matched ? (
                              <span
                                key={`${mm.modelEntry.id}-${mIdx}`}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                              >
                                {mm.modelEntry.modelName}
                                {mm.modelEntry.quantity > 1 ? `×${mm.modelEntry.quantity}` : ''}{' '}
                                +{formatShortManwon(mm.subtotalIncentive)}
                              </span>
                            ) : (
                              <button
                                key={`${mm.modelEntry.id}-${mIdx}`}
                                type="button"
                                onClick={() => {
                                  setQuickAssignTarget({
                                    modelCode: mm.modelEntry.modelName,
                                    category: mm.modelEntry.category,
                                  });
                                  setQuickAssignAmount('');
                                }}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${subSurfaceCls}`}
                              >
                                {mm.modelEntry.modelName} +단가지정
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

    </>
  );
};
