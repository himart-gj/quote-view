import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Calendar,
  CheckCircle2,
  ClipboardPaste,
  Coins,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  EyeOff,
  FileSpreadsheet,
  Image as ImageIcon,
  Lock,
  MailOpen,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  addOrReviveManualLeadInStore,
  buildAllLeadTombstoneKeys,
  buildLeadAutoSummary,
  copyBusinessCardImageToClipboard,
  DEFAULT_INSTA_SHEET_URL,
  getCanonicalPhoneDigits,
  getEffectiveBusinessCardDataUri,
  getOwnerDbPin,
  getReadyMadeAppsScriptCode,
  HandoverStaffOption,
  hydrateMarketingDbStoreFromIdb,
  importLeadsFromFile,
  importLeadsFromRawText,
  loadHandoverStaffOptions,
  loadMarketingDbStore,
  lockOwnerMarketingDb,
  makeLeadFingerprint,
  MARKETING_DB_UPDATED_EVENT,
  MARKETING_LEAD_STATUSES,
  MarketingDbStore,
  MarketingLeadItem,
  MarketingLeadStatus,
  MarketingSmsTemplate,
  normalizeKoreanLeadPhone,
  normalizeLeadDateTime,
  pushMarketingStateToGasBackup,
  renderSmsTemplateForLead,
  saveMarketingDbStore,
  saveMarketingLeadToCrm,
  setOwnerDbPin,
  shareBusinessCardFileWithText,
  syncLeadsFromGoogleSheet,
  syncMarketingDbTrashFromCrmCustomer,
  warmUpBusinessCardCache,
} from '../utils/marketingDbEngine';
import { compressImageFile } from '../utils/aiImageParser';
import { DEFAULT_OWNER_BUSINESS_CARD_DATA_URI } from '../utils/ownerBusinessCardAsset';
import {
  buildPrimaryFieldsFromQuote,
  CRM_CUSTOMERS_UPDATED_EVENT,
  deleteQuoteAndSyncCustomer,
  getCachedCustomers,
  setCachedCustomers,
  syncCustomerToGas,
} from '../crm/services/gasApi';
import { CustomerDetailModal } from '../crm/components/CustomerDetailModal';
import { SMSModal } from '../crm/components/SMSModal';
import { CustomerItem, CustomerStatus, QuoteRecord } from '../crm/types/crm';
import { safeCopyText } from '../utils/mobileQaRuntime';

export const UNASSIGNED_HANDOVER_STAFF = '담당 미지정';

const MDB_LAST_STATUS_TAB_KEY = 'himart_mdb_last_tab_v1';
const MDB_LAST_HANDOVER_SUB_KEY = 'himart_mdb_last_handover_sub_v1';
const MDB_LAST_SELLER_SUB_KEY = 'himart_mdb_last_seller_sub_v1';
const VALID_MDB_TABS: readonly StatusFilterTab[] = ['신규', '문자전송', '상담진행중', '무응답', '타직원인계', '계약완료', '휴지통'];

export interface MarketingDbManagerViewProps {
  onBackToHome: () => void;
  backLabel?: string;
  onLockAndHideMenu: () => void;
  onOpenCustomerInCrm: (customerId?: string) => void;
  onOpenCustomerInQuoteBuilder: (customer: CustomerItem) => void;
  onOpenQuoteRecordInQuoteBuilder?: (
    customer: CustomerItem,
    quote: QuoteRecord
  ) => void;
  isDark?: boolean;
}

export type StatusFilterTab = MarketingLeadStatus | '휴지통';

export function getStatusBadgeStyle(status: MarketingLeadStatus, isDark: boolean): string {
  switch (status) {
    case '신규':
      return isDark
        ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
        : 'bg-rose-50 text-rose-700 border-rose-300';
    case '문자전송':
      return isDark
        ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
        : 'bg-blue-50 text-blue-700 border-blue-300';
    case '상담진행중':
      return isDark
        ? 'bg-violet-500/20 text-violet-300 border-violet-400/40'
        : 'bg-violet-50 text-violet-800 border-violet-300';
    case '무응답':
      return isDark
        ? 'bg-slate-500/20 text-slate-300 border-slate-400/35'
        : 'bg-stone-100 text-stone-600 border-stone-300';
    case '타직원인계':
      return isDark
        ? 'bg-amber-500/20 text-amber-300 border-amber-400/45'
        : 'bg-amber-50 text-amber-800 border-amber-400';
    case '계약완료':
      return isDark
        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50'
        : 'bg-emerald-50 text-emerald-800 border-emerald-400';
  }
}

export function getStatusActiveBtnStyle(status: MarketingLeadStatus): string {
  switch (status) {
    case '신규':
      return 'bg-rose-600 text-white border-rose-600 shadow-2xs';
    case '문자전송':
      return 'bg-blue-600 text-white border-blue-600 shadow-2xs';
    case '상담진행중':
      return 'bg-violet-600 text-white border-violet-600 shadow-2xs';
    case '무응답':
      return 'bg-stone-600 text-white border-stone-600 shadow-2xs';
    case '타직원인계':
      return 'bg-amber-600 text-white border-amber-600 shadow-2xs';
    case '계약완료':
      return 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
  }
}


export const MarketingDbTabsAndGrid: React.FC<{ ctx: any }> = ({ ctx }) => {
  const {
    bulkHandoverTarget,
    cardSurface,
    contractSellerBreakdown,
    contractSellerTab,
    findLinkedCrmCustomer,
    formatMonthLabel,
    getDefaultRenderedTextForLead,
    handleBulkHandoverLeads,
    handleBulkMarkContractCompleted,
    handleChangeHandoverStaff,
    handleChangeRevenue,
    handleChangeStatus,
    handleCopyStaffHandoverSummary,
    handleEmptyDbTrash,
    handleOpenSmsPreview,
    handlePermanentPurgeLead,
    handleQuickSendDefaultSms,
    handleRestoreLead,
    handleSaveOrOpenCrm,
    handleSoftDeleteLeads,
    handleSyncRevenueToCrm,
    handleUpdateMemo,
    handoverStaffTabs,
    handoverSubTab,
    inputSurface,
    isCardAttachedForLead,
    isDark,
    isSearchingAll,
    isSelectMode,
    searchQuery,
    selectedContractSellerProfile,
    selectedIds,
    selectedMonth,
    setBulkHandoverTarget,
    setContractSellerTab,
    setHandoverSubTab,
    setIsSelectMode,
    setSearchQuery,
    setSelectedIds,
    setStatusTab,
    staffOptions,
    stats,
    statusTab,
    store,
    subSurface,
    toggleCardAttachForLead,
    trashedLeads,
    triggerDirectFileShareWithCard,
    triggerNativeSmsSend,
    visibleLeads
  } = ctx;

  return (
    <>
        {/* ==================== 3. 6대 진행 상태 탭 (전체 보기 없음) & 하위 직원별 서브탭 ==================== */}
        <div className={`rounded-2xl border p-3 space-y-2.5 ${cardSurface}`}>
          {/* 3-1) 메인 6대 상태 탭 + 휴지통 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                {
                  id: '신규',
                  label: `🔥 신규 (${stats.statusCounts['신규']})`,
                },
                {
                  id: '문자전송',
                  label: `📩 문자전송 (${stats.statusCounts['문자전송']})`,
                },
                {
                  id: '상담진행중',
                  label: `🤝 상담진행중 (${stats.statusCounts['상담진행중']})`,
                },
                {
                  id: '무응답',
                  label: `⏳ 무응답 (${stats.statusCounts['무응답']})`,
                },
                {
                  id: '타직원인계',
                  label: `↪ 타직원인계 (${stats.statusCounts['타직원인계']})`,
                },
                {
                  id: '계약완료',
                  label: `🎉 계약완료 (${stats.statusCounts['계약완료']})`,
                },
                {
                  id: '휴지통',
                  label: `🗑️ 휴지통 (${trashedLeads.length})`,
                },
              ] as { id: StatusFilterTab; label: string }[]
            ).map((tab) => {
              const active = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusTab(tab.id);
                    setIsSelectMode(false);
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                    active
                      ? tab.id === '타직원인계'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : tab.id === '계약완료'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : `${subSurface} opacity-85 hover:opacity-100`
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3-2) [타직원인계] 탭 선택 시 하단에 열리는 인계 직원별 선택 서브탭 */}
          {statusTab === '타직원인계' && !isSearchingAll && (
            <div
              className={`rounded-2xl border p-2.5 space-y-2 ${
                isDark
                  ? 'bg-amber-950/25 border-amber-400/35'
                  : 'bg-amber-50/75 border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>인계 직원별 보기 (계약완료로 변경 시 계약완료 탭으로 즉시 이동)</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setHandoverSubTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                    handoverSubTab === 'ALL'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : `${subSurface} opacity-85 hover:opacity-100`
                  }`}
                >
                  전체 인계건 ({stats.statusCounts['타직원인계']}명)
                </button>
                {handoverStaffTabs.map((stTab) => {
                  const active = handoverSubTab === stTab.name;
                  return (
                    <button
                      key={stTab.name}
                      type="button"
                      onClick={() => setHandoverSubTab(stTab.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                        active
                          ? 'bg-amber-600 text-white border-amber-600'
                          : `${subSurface} opacity-90 hover:opacity-100`
                      }`}
                    >
                      👤 {stTab.name} ({stTab.count}명)
                    </button>
                  );
                })}
                {handoverStaffTabs.length === 0 && (
                  <span className="text-xs opacity-70 px-1 py-0.5">
                    현재 진행 중인 타 직원 인계건이 없습니다.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 3-3) [계약완료] 탭 선택 시 하단에 열리는 [직접 판매 vs 타 직원 이름] 선택 서브탭 & 직원별 누적 판매 금액 보드 */}
          {statusTab === '계약완료' && !isSearchingAll && (
            <div
              className={`rounded-2xl border p-2.5 space-y-2.5 ${
                isDark
                  ? 'bg-emerald-950/25 border-emerald-400/35'
                  : 'bg-emerald-50/75 border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  <span>판매 담당자별 모아보기 &amp; 누적 판매 금액 확인</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setContractSellerTab('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                    contractSellerTab === 'ALL'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : `${subSurface} opacity-85 hover:opacity-100`
                  }`}
                >
                  전체 계약완료 ({contractSellerBreakdown.totalPeriodCount}건)
                </button>

                <button
                  type="button"
                  onClick={() => setContractSellerTab('DIRECT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                    contractSellerTab === 'DIRECT'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : `${subSurface} opacity-90 hover:opacity-100`
                  }`}
                >
                  👑 직접 판매 ({contractSellerBreakdown.direct.periodCount}건)
                </button>

                {contractSellerBreakdown.staffSellers.map((seller) => {
                  const active = contractSellerTab === seller.staffName;
                  return (
                    <button
                      key={seller.staffName}
                      type="button"
                      onClick={() => setContractSellerTab(seller.staffName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border whitespace-nowrap cursor-pointer transition ${
                        active
                          ? 'bg-amber-600 text-white border-amber-600'
                          : `${subSurface} opacity-90 hover:opacity-100`
                      }`}
                    >
                      👤 {seller.staffName} ({seller.periodCount}건)
                    </button>
                  );
                })}
              </div>

              {/* 특정 판매자(직접 판매 or 특정 타 직원) 탭 선택 시 해당 담당자의 누적 판매 금액 박스 표시 */}
              {selectedContractSellerProfile ? (
                <div
                  className={`rounded-xl border px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isDark
                      ? 'bg-[#111923] border-white/15'
                      : 'bg-white border-emerald-300'
                  }`}
                >
                  <div className="text-xs font-black">
                    {selectedContractSellerProfile.label}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap font-mono text-xs">
                    {selectedMonth !== 'ALL' && (
                      <span className="font-bold opacity-80">
                        {formatMonthLabel(selectedMonth)}:{' '}
                        <strong>
                          {selectedContractSellerProfile.periodCount}건 ·{' '}
                          {selectedContractSellerProfile.periodRevenue.toLocaleString()}원
                        </strong>
                      </span>
                    )}
                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                      누적 판매 금액: 총{' '}
                      {selectedContractSellerProfile.allTimeCount}건 ·{' '}
                      {selectedContractSellerProfile.allTimeRevenue.toLocaleString()}원
                    </span>
                  </div>
                </div>
              ) : (
                contractSellerBreakdown.hasAnyStaffContract && (
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold pt-0.5">
                    <span className="opacity-75">담당자별 누적 판매액:</span>
                    <button
                      type="button"
                      onClick={() => setContractSellerTab('DIRECT')}
                      className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono font-black cursor-pointer"
                    >
                      직접 판매{' '}
                      {contractSellerBreakdown.direct.allTimeRevenue.toLocaleString()}원
                    </button>
                    {contractSellerBreakdown.staffSellers.map((s) => (
                      <button
                        key={s.staffName}
                        type="button"
                        onClick={() => setContractSellerTab(s.staffName)}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono font-black cursor-pointer"
                      >
                        {s.staffName} {s.allTimeRevenue.toLocaleString()}원
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* 3-4) 검색창 + 다중 선택 관리 버튼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 opacity-50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="고객명 · 연락처 · 요약내용 · 메모 · 인계직원 검색 (전 단계 통합검색)"
                className={`w-full pl-9 pr-8 py-2 rounded-xl border text-base sm:text-xs font-bold ${inputSurface}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {statusTab === '휴지통' && trashedLeads.length > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyDbTrash}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  🗑️ 휴지통 비우기 ({trashedLeads.length}명)
                </button>
              )}
              {statusTab !== '휴지통' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode((v) => !v);
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-2 rounded-xl border text-xs font-black whitespace-nowrap cursor-pointer ${
                    isSelectMode
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : subSurface
                  }`}
                >
                  {isSelectMode
                    ? '선택닫기'
                    : statusTab === '타직원인계'
                    ? '선택 일괄계약·관리'
                    : '선택 일괄인계·삭제'}
                </button>
              )}

              {isSelectMode && visibleLeads.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.length === visibleLeads.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(visibleLeads.map((l) => l.id));
                    }
                  }}
                  className={`px-2.5 py-2 rounded-xl border text-xs font-black whitespace-nowrap cursor-pointer ${subSurface}`}
                >
                  {selectedIds.length === visibleLeads.length
                    ? '전체해제'
                    : `전체선택(${visibleLeads.length})`}
                </button>
              )}
            </div>
          </div>

          {isSearchingAll && (
            <div className="text-[11px] font-black text-indigo-600 dark:text-sky-300 px-1">
              🔍 모든 진행 단계에서 &lsquo;{searchQuery}&rsquo; 검색 결과{' '}
              {visibleLeads.length}건을 표시 중입니다.
            </div>
          )}

          {/* 다중 선택 시 열리는 [일괄 직원 인계] / [일괄 계약완료 전환] / [선택 삭제] 바 */}
          {isSelectMode && selectedIds.length > 0 && statusTab !== '휴지통' && (
            <div
              className={`rounded-2xl border p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 ${
                isDark
                  ? 'bg-amber-950/35 border-amber-400/40'
                  : 'bg-amber-50/90 border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <span className="text-xs font-black text-amber-800 dark:text-amber-200 shrink-0">
                  ✓ {selectedIds.length}명 선택됨:
                </span>

                {statusTab === '타직원인계' && (
                  <button
                    type="button"
                    onClick={() => handleBulkMarkContractCompleted(selectedIds)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black whitespace-nowrap cursor-pointer"
                  >
                    🎉 {selectedIds.length}명 일괄 계약완료로 넘기기
                  </button>
                )}

                <select
                  value={bulkHandoverTarget}
                  onChange={(e) => setBulkHandoverTarget(e.target.value)}
                  className={`flex-1 min-w-[155px] px-2.5 py-1.5 rounded-xl border text-base sm:text-xs font-bold ${inputSurface}`}
                >
                  <option value={UNASSIGNED_HANDOVER_STAFF}>
                    ↪ {UNASSIGNED_HANDOVER_STAFF}
                  </option>
                  {staffOptions.map((st) => (
                    <option key={st.name} value={st.name}>
                      ↪ {st.name} ({st.role} ·{' '}
                      {st.isOffToday ? `오늘휴무[${st.todayCode}]` : '오늘근무'})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleBulkHandoverLeads(selectedIds, bulkHandoverTarget)
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  {statusTab === '타직원인계'
                    ? '담당직원 일괄변경'
                    : `↪ ${selectedIds.length}명 타직원인계로 이동`}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSoftDeleteLeads(selectedIds)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black whitespace-nowrap cursor-pointer"
              >
                🗑️ {selectedIds.length}명 삭제
              </button>
            </div>
          )}
        </div>

        {/* ==================== 4. 고객 DB 카드 리스트 ==================== */}
        {visibleLeads.length === 0 ? (
          <div
            className={`rounded-3xl border p-10 text-center space-y-2 ${cardSurface}`}
          >
            <Database className="w-8 h-8 mx-auto opacity-40" />
            <div className="text-sm font-black">
              현재 [{statusTab}] 단계에 해당하는 고객이 없습니다.
            </div>
            <p className="text-xs opacity-70">
              다른 진행 상태 탭을 눌러 확인하시거나 상단 [시트 동기화] · [직접추가]를 이용해 주세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visibleLeads.map((lead) => {
              const linkedCrm = findLinkedCrmCustomer(lead);
              const isChecked = selectedIds.includes(lead.id);
              const cleanPhoneDigits = (lead.phone || '').replace(/[^0-9+]/g, '');
              const isHandedOverLead =
                lead.status === '타직원인계' || Boolean(lead.handoverStaff);

              return (
                <div
                  key={lead.id}
                  className={`rounded-3xl border p-4 space-y-3 shadow-2xs transition ${
                    lead.status === '계약완료'
                      ? isDark
                        ? 'bg-[#13221E] border-emerald-500/45'
                        : 'bg-white border-2 border-emerald-500'
                      : lead.status === '타직원인계'
                      ? isDark
                        ? 'bg-[#1E1910] border-amber-500/45'
                        : 'bg-white border-2 border-amber-400'
                      : cardSurface
                  }`}
                >
                  {/* 1) 고객명 · 전화번호 · [문자내역 바로보기] · 접수일시 · 삭제 버튼 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isSelectMode && statusTab !== '휴지통' && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, lead.id]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.filter((id) => id !== lead.id)
                              );
                            }
                          }}
                          className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
                        />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-black tracking-tight">
                            {lead.customerName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10.5px] font-black ${getStatusBadgeStyle(
                              lead.status,
                              isDark
                            )}`}
                          >
                            {lead.status}
                          </span>
                          {lead.handoverStaff ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/45 text-[10px] font-black">
                              👤 {lead.status === '계약완료' ? '타직원 판매: ' : '인계: '}
                              {lead.handoverStaff}
                            </span>
                          ) : (
                            lead.status === '계약완료' && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-400/35 text-[10px] font-black">
                                👑 직접 판매
                              </span>
                            )
                          )}
                          {!lead.handoverStaff && linkedCrm && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                              ✓ 내 고객관리 연동됨
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                          {lead.phone ? (
                            <>
                              <a
                                href={`tel:${cleanPhoneDigits}`}
                                className="font-mono font-black text-blue-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                                title="전화 걸기"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{lead.phone}</span>
                              </a>
                              {/* 자동 입력 문구 없이 주고받은 문자 내역만 확인하는 빈 문자앱 이동 버튼 */}
                              <a
                                href={`sms:${cleanPhoneDigits}`}
                                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-black inline-flex items-center gap-1 transition ${
                                  isDark
                                    ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border-indigo-400/35'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                                }`}
                                title="자동 문구 없이 이 번호와 주고받은 문자 대화내역(문자앱) 바로 보기"
                              >
                                <MailOpen className="w-3 h-3 shrink-0" />
                                <span>문자내역</span>
                              </a>
                            </>
                          ) : (
                            <span className="opacity-50 text-xs">연락처 없음</span>
                          )}
                          <span className="text-[11px] font-mono opacity-65">
                            · {lead.platform || '인스타그램'} · {lead.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    {statusTab === '휴지통' ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestoreLead(lead)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black cursor-pointer"
                        >
                          복원
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentPurgeLead(lead.id)}
                          className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-[11px] font-black cursor-pointer"
                        >
                          영구삭제
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSoftDeleteLeads([lead.id])}
                        title="이 고객 삭제 (휴지통 보관 및 시트 재동기화 차단)"
                        className="p-1.5 rounded-xl opacity-55 hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-500 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 2) 시트 업데이트 자동 요약 박스 + 상담 메모 */}
                  <div className={`rounded-2xl border p-3 space-y-2 ${subSurface}`}>
                    <div className="text-xs font-black leading-snug text-indigo-700 dark:text-sky-300">
                      📌 요약: {lead.autoSummary}
                    </div>
                    {(lead.interestBenefit || lead.preferredContact) && (
                      <div className="text-[11px] opacity-75 leading-relaxed">
                        • 신청원문: {lead.interestBenefit || '-'}
                        {lead.preferredContact
                          ? ` / ${lead.preferredContact}`
                          : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={lead.memo || ''}
                        onChange={(e) => handleUpdateMemo(lead.id, e.target.value)}
                        placeholder="진행/상담/인계 요약 메모 입력 (예: 12월 입주, 냉장고·세탁기 견적 희망)"
                        className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border text-base sm:text-xs font-semibold ${inputSurface}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateMemo(lead.id, (lead.memo || '').trim())}
                        title="메모 저장"
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>저장</span>
                      </button>
                    </div>
                  </div>

                  {statusTab !== '휴지통' && (
                    <>
                      {/* 3) 6단계 진행 상태 변경 버튼 (신규 / 문자전송 / 상담진행중 / 무응답 / 타직원인계 / 계약완료) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-extrabold opacity-75">
                          <span>진행 상태 변경</span>
                          {lead.smsSentAt && (
                            <span className="font-mono text-[10px]">
                              최근 문자: {lead.smsSentAt}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                          {MARKETING_LEAD_STATUSES.map((st) => {
                            const active = lead.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleChangeStatus(lead, st)}
                                className={`py-1.5 px-1 rounded-xl text-[11px] font-black border transition cursor-pointer whitespace-nowrap ${
                                  active
                                    ? getStatusActiveBtnStyle(st)
                                    : `${subSurface} opacity-80 hover:opacity-100`
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4) 계약완료 시 발생매출 입력 박스 (회사 보고용 DB 총매출 자동 합산 + 직접 판매는 내 고객관리 연동) */}
                      {lead.status === '계약완료' && (
                        <div
                          className={`rounded-2xl border-2 p-3 space-y-2 ${
                            isDark
                              ? 'bg-emerald-950/35 border-emerald-500/40'
                              : 'bg-emerald-50/80 border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              <span>
                                {lead.handoverStaff
                                  ? `계약완료 발생매출 (${lead.handoverStaff} 판매 · DB 총매출 합산)`
                                  : '계약완료 발생매출 (직접 판매 · DB매출 + 내 실적)'}
                              </span>
                            </span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {[1000000, 3000000, 5000000, 10000000].map(
                                (inc) => (
                                  <button
                                    key={inc}
                                    type="button"
                                    onClick={() =>
                                      handleChangeRevenue(
                                        lead,
                                        (lead.revenueAmount || 0) + inc
                                      )
                                    }
                                    className="px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-black text-emerald-700 dark:text-emerald-300 cursor-pointer"
                                  >
                                    +{inc / 10000}만
                                  </button>
                                )
                              )}
                              {lead.revenueAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleChangeRevenue(lead, 0)}
                                  className="px-1.5 py-0.5 rounded-lg bg-stone-200 dark:bg-slate-800 text-[10px] font-bold cursor-pointer"
                                >
                                  0원
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step={10000}
                                value={lead.revenueAmount || ''}
                                onChange={(e) =>
                                  handleChangeRevenue(
                                    lead,
                                    Number(e.target.value) || 0
                                  )
                                }
                                placeholder="발생매출 금액 입력 (예: 8500000)"
                                className={`w-full pl-3 pr-7 py-2 rounded-xl border text-base sm:text-xs font-black font-mono text-right ${inputSurface}`}
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60">
                                원
                              </span>
                            </div>
                            {!lead.handoverStaff && (
                              <button
                                type="button"
                                onClick={() => handleSyncRevenueToCrm(lead)}
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>매출 저장·고객카드 반영</span>
                              </button>
                            )}
                          </div>

                          {lead.revenueAmount > 0 && (
                            <div className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 text-right font-mono">
                              {lead.handoverStaff
                                ? `${lead.handoverStaff} 판매 DB매출: `
                                : '내 직접판매 DB매출: '}
                              {lead.revenueAmount.toLocaleString()}원 (
                              {(lead.revenueAmount / 10000).toLocaleString()}만원)
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5) 타 직원 인계 이름 지정 / 판매 담당자 선택 바 */}
                      {isHandedOverLead ? (
                        <div
                          className={`rounded-2xl border p-2.5 space-y-2 ${
                            isDark
                              ? 'bg-amber-950/30 border-amber-400/40'
                              : 'bg-amber-50/85 border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {lead.status === '계약완료'
                                  ? '👤 타 직원 판매 담당자'
                                  : '↪ 인계받은 직원 이름 선택'}
                              </span>
                              {lead.handoverAt && (
                                <span className="font-mono text-[10px] opacity-75">
                                  ({lead.handoverAt})
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleChangeHandoverStaff(lead, '')}
                              className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-400/50 text-[10.5px] font-black text-amber-800 dark:text-amber-300 cursor-pointer"
                            >
                              {lead.status === '계약완료'
                                ? '👑 직접 판매로 변경'
                                : '↩ 직접 상담으로 복귀'}
                            </button>
                          </div>

                          <select
                            value={lead.handoverStaff || UNASSIGNED_HANDOVER_STAFF}
                            onChange={(e) =>
                              handleChangeHandoverStaff(lead, e.target.value)
                            }
                            className={`w-full px-2.5 py-1.5 rounded-xl border text-base sm:text-xs font-black ${inputSurface}`}
                          >
                            <option value={UNASSIGNED_HANDOVER_STAFF}>
                              ↪ {UNASSIGNED_HANDOVER_STAFF} (직원 선택 전)
                            </option>
                            {staffOptions.map((st) => (
                              <option key={st.name} value={st.name}>
                                👤 {st.name} ({st.role} ·{' '}
                                {st.isOffToday
                                  ? `오늘휴무[${st.todayCode}]`
                                  : '오늘근무'}
                                )
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[11px] font-extrabold opacity-80 flex items-center gap-1 shrink-0">
                            <Users className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              {lead.status === '계약완료'
                                ? '판매 구분 변경:'
                                : '타 직원 인계 지정:'}
                            </span>
                          </span>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleChangeHandoverStaff(lead, e.target.value);
                              }
                            }}
                            className={`flex-1 max-w-[245px] px-2.5 py-1.5 rounded-xl border text-base sm:text-xs font-bold ${inputSurface}`}
                          >
                            <option value="">
                              {lead.status === '계약완료'
                                ? '👑 직접 판매 (내 고객관리/실적)'
                                : '👑 내가 직접 상담'}
                            </option>
                            <option value={UNASSIGNED_HANDOVER_STAFF}>
                              ↪ 타직원인계 ({UNASSIGNED_HANDOVER_STAFF})
                            </option>
                            {staffOptions.map((st) => (
                              <option key={st.name} value={st.name}>
                                ↪ {st.name} ({st.role} ·{' '}
                                {st.isOffToday
                                  ? `오늘휴무[${st.todayCode}]`
                                  : '오늘근무'}
                                )
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 6) 하단 액션 바 */}
                      {isHandedOverLead ? (
                        <div className="pt-1.5 border-t border-black/5 dark:border-white/10 grid grid-cols-2 min-[400px]:grid-cols-12 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyStaffHandoverSummary(lead)}
                            className="col-span-2 min-[400px]:col-span-5 py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">직원전달 요약복사</span>
                          </button>

                          {cleanPhoneDigits ? (
                            <a
                              href={`sms:${cleanPhoneDigits}`}
                              className={`col-span-1 min-[400px]:col-span-3 py-2.5 px-2 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1 ${subSurface}`}
                              title="자동 문구 없이 주고받은 문자 대화내역만 보기"
                            >
                              <MailOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate">문자내역</span>
                            </a>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={() => handleQuickSendDefaultSms(lead)}
                            className="col-span-1 min-[400px]:col-span-4 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3 shrink-0" />
                            <span className="truncate">안내문자 발송</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-1.5 border-t border-black/5 dark:border-white/10 space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleCardAttachForLead(lead)}
                              className={`px-2.5 py-1 rounded-xl border text-[11px] font-black inline-flex items-center gap-1.5 cursor-pointer transition ${
                                isCardAttachedForLead(lead)
                                  ? isDark
                                    ? 'bg-indigo-500/25 text-amber-200 border-indigo-400/50'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                  : `${subSurface} opacity-75 hover:opacity-100`
                              }`}
                            >
                              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                              {lead.status === '신규' ? (
                                <span>
                                  {isCardAttachedForLead(lead)
                                    ? '✓ 신규고객 명함사진 자동동봉 ON'
                                    : '명함사진 동봉 OFF (터치 시 켜기)'}
                                </span>
                              ) : (
                                <span>
                                  {isCardAttachedForLead(lead)
                                    ? '✓ 명함사진 함께 보내기 선택됨'
                                    : '+ 명함사진 함께 보내기 (선택)'}
                                </span>
                              )}
                            </button>

                            {isCardAttachedForLead(lead) && (
                              (store.config.businessCardSendMethod || 'share-sheet') === 'share-sheet' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerNativeSmsSend(
                                      lead,
                                      getDefaultRenderedTextForLead(lead),
                                      true
                                    )
                                  }
                                  title="수신번호와 문구를 문자앱에 먼저 채우고 명함 사진은 키보드 클립보드에 복사합니다"
                                  className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-200 border border-amber-400/40 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Send className="w-3 h-3 shrink-0" />
                                  <span>번호자동 문자앱(명함복사)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerDirectFileShareWithCard(
                                      lead,
                                      getDefaultRenderedTextForLead(lead)
                                    )
                                  }
                                  title="명함 이미지 파일과 문구를 MMS/카톡 공유창으로 직접 첨부하여 보냅니다 (전화번호 자동 복사)"
                                  className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-200 border border-amber-400/40 text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3 shrink-0" />
                                  <span>MMS·카톡 명함파일 직접첨부</span>
                                </button>
                              )
                            )}
                          </div>

                          {/* 하단 원터치 실행 버튼 (폴드 커버 등 초소형 화면 자동배열 보호) */}
                          <div className="grid grid-cols-2 min-[380px]:grid-cols-12 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickSendDefaultSms(lead)}
                              className={`col-span-1 min-[380px]:col-span-5 py-2.5 px-2 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                                isCardAttachedForLead(lead)
                                  ? 'bg-indigo-600 hover:bg-indigo-500'
                                  : 'bg-blue-600 hover:bg-blue-500'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {isCardAttachedForLead(lead)
                                  ? '명함+문자 발송'
                                  : '정해진 문자발송'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenSmsPreview(lead)}
                              title="문자 문구 및 명함 미리보기 / 다른 템플릿 선택"
                              className={`col-span-1 min-[380px]:col-span-2 py-2.5 px-1.5 rounded-xl border text-[11px] font-black flex items-center justify-center cursor-pointer ${subSurface}`}
                            >
                              문구변경
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSaveOrOpenCrm(
                                  lead,
                                  linkedCrm ? 'open-crm' : 'save-only'
                                )
                              }
                              className={`col-span-1 min-[380px]:col-span-3 py-2.5 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer border ${
                                linkedCrm
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                                  : isDark
                                  ? 'bg-[#1B2230] hover:bg-[#253047] text-amber-300 border-amber-400/35'
                                  : 'bg-[#FAF5EB] hover:bg-[#F2E8D5] text-[#6E4423] border-[#D8C3A8]'
                              }`}
                            >
                              {linkedCrm ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">고객관리열기</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">고객카드저장</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSaveOrOpenCrm(lead, 'open-quote')
                              }
                              title="고객카드 자동 저장 후 바로 견적기 화면으로 연결"
                              className="col-span-1 min-[380px]:col-span-2 py-2.5 px-1.5 rounded-xl bg-[#18181B] dark:bg-sky-500 hover:opacity-90 text-white dark:text-slate-950 text-[11px] font-black flex items-center justify-center gap-0.5 cursor-pointer"
                            >
                              <Calculator className="w-3 h-3 shrink-0" />
                              <span>견적</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </>
  );
};
