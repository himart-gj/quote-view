import React from 'react';
import { Award, Gift, HeartHandshake, Info, ShieldCheck } from 'lucide-react';

// 매장 정책에 따라 한화리조트 연간 우대 박수를 간편 전환 (20 | 10)
const HANWHA_RESORT_ANNUAL_NIGHTS: 10 | 20 = 20;

const LIFE_CARE_SERVICES = [
  {
    title: '홈인테리어 (현대리바트)',
    desc: '주방·욕실·중문 등 현대리바트 맞춤형 공간 리모델링 패키지',
  },
  {
    title: '크루즈 · 해외여행',
    desc: '전문 인솔자 동행 해외 크루즈 및 프리미엄 여행 패키지',
  },
  {
    title: '웨딩 · 허니문 패키지',
    desc: '스튜디오·드레스·메이크업 맞춤 웨딩 및 허니문 지원',
  },
  {
    title: '결혼정보 (노블레스 수현)',
    desc: '노블레스 수현 제휴 1:1 전담 매칭 성혼 프로그램',
  },
  {
    title: '수연 서비스 (칠순 · 리마인드)',
    desc: '부모님 환갑·칠순·팔순 상차림 및 리마인드 웨딩·가족사진',
  },
  {
    title: '골프 패키지',
    desc: '국내외 명문 골프장 라운딩·숙박 올인원 투어 패키지',
  },
  {
    title: '해외 어학연수 · 돌잔치',
    desc: '해외 명문 영어캠프·연수 또는 베이비파스텔 돌상·성장앨범',
  },
  {
    title: '장지 서비스 (봉안당 · 수목장)',
    desc: '전문가 사전 상담 기반 봉안당·수목장·봉안묘 안심 설계',
  },
];

const MEMBERSHIP_BENEFITS = [
  {
    title: '한화리조트 무기명 회원가 우대',
    desc: `전국 한화리조트 비성수기 평일(일~목) 회원가 선착순 · 금요일/성수기 추첨(+1만원, 토요일 제외 / 5년간 연 ${HANWHA_RESORT_ANNUAL_NIGHTS}박)`,
  },
  {
    title: '리조트 워터파크 · 사우나 · 스키 할인',
    desc: '설악 워터피아·경주 뽀로로 아쿠아빌리지 40%, 직영 사우나 50%(최대 5인), 한화 평창 투숙 시 휘닉스 스키 30%(4인)',
  },
  {
    title: '종합 건강검진 우대 서비스',
    desc: 'KMI한국의학연구소 · 한국건강관리협회(메디체크) · 하나로의료재단 회원 우대가 (본인·직계가족 연 1회, 개인 한정)',
  },
  {
    title: '직영 쉴낙원 장례식장 빈소 할인',
    desc: '전국 웅진프리드라이프 직영 쉴낙원 장례식장(경기·오산동탄·인천·김포 등 15개소↑) 빈소 사용료 30% 할인',
  },
  {
    title: 'KTX · 공항 프라이빗 무브(MOVV) 우대',
    desc: '모빌리티 플랫폼 무브 제휴 KTX 할인 및 공항·병원·웨딩·골프 전용 쇼퍼 이동 서비스 회원 특별 할인',
  },
  {
    title: '홈케어 · 반려동물 라이프케어 우대',
    desc: '입주·이사청소 및 가전 크리닝 1:1 홈케어 우대, 프리미엄 반려동물 돌봄·장례 서비스 회원 우대',
  },
];

export const ProposalPreviewFreedGuide: React.FC<Record<string, any>> = ({
  activeTab,
  guideGeneralSummary,
  guideHiSummary,
  guideSheetRef,
  isGuideTab,
  representativePeriod,
  scale,
  useMobileFluid = false,
  sheetId = 'sheet-freed-guide',
}) => {
  const isSubGuide = activeTab === 'guide-sub';

  return (
    <>
      {isGuideTab && (
        <div
          id={sheetId}
          ref={guideSheetRef}
          style={
            useMobileFluid
              ? { width: '100%', minWidth: 0, height: 'auto', transform: 'none' }
              : {
                  width: '920px',
                  minWidth: '920px',
                  height: 'auto',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }
          }
          className={`print-sheet shrink-0 bg-white rounded-2xl shadow-xl border border-[#D1D6DB] border-t-[4px] border-t-[#E60012] overflow-hidden flex flex-col p-5 sm:p-6 space-y-3.5 text-[#191F28] ${
            useMobileFluid ? 'mobile-fluid-sheet' : ''
          }`}
        >
          {/* 1층: 공식 마스트헤드 + 4칸 핵심 수치 요약 */}
          <div className="space-y-3 shrink-0">
            <div className="border-b border-[#E5E8EB] pb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-[#E60012] text-white text-[11px] font-black tracking-wider">
                    LOTTE HIMART
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1B64DA]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    웅진프리드라이프 제휴 혜택 안내서
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#191F28]">
                  {isSubGuide
                    ? '웅진프리드라이프 Hi구독 플러스 안내서'
                    : '웅진프리드라이프 하이프리드 안내서'}
                </h1>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#191F28] text-white text-xs font-extrabold tracking-tight">
                  {isSubGuide
                    ? `${
                        guideHiSummary.activePlans
                          .map((p: any) => `${p.plan.name} (${p.count}구좌)`)
                          .join(' + ') || 'Hi구독 플러스 108 (1구좌 기준)'
                      } · 총 ${guideHiSummary.totalAccounts}구좌`
                    : `${
                        guideGeneralSummary.activePlans
                          .map((p: any) => `${p.name} (${p.count}건)`)
                          .join(' + ') || '하이프리드 150 (1건 기준)'
                      } · 총 ${guideGeneralSummary.totalAccounts}건`}
                </span>
              </div>
            </div>

            {isSubGuide ? (
              <div className={`grid mobile-keep-grid ${useMobileFluid ? 'grid-cols-2' : 'grid-cols-4'} gap-2.5 items-stretch`}>
                <div className="min-w-0 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#E60012] tracking-tight break-keep">
                    ① 가전 구독 총 지원금
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#E60012] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    {guideHiSummary.totalHiPlusSupport.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-semibold text-[#4E5968] mt-1 leading-snug tracking-tight break-keep tabular-nums">
                    월 -{guideHiSummary.monthlyHiPlusSupport.toLocaleString()}원 × {representativePeriod}개월
                  </div>
                </div>

                <div className="min-w-0 bg-[#F8FAFC] border border-[#E5E8EB] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#4E5968] tracking-tight break-keep">
                    ② 월 납입금 (1~90회)
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#191F28] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    월 {guideHiSummary.totalMonthlyDeposit.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-semibold text-[#8B95A1] mt-1 leading-snug tracking-tight break-keep">
                    1회차~90회차 정기 납입
                  </div>
                </div>

                <div className="min-w-0 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#1B64DA] tracking-tight break-keep">
                    ③ 무납입 거치 (30개월)
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#1B64DA] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    30개월 월 0원
                  </div>
                  <div className="text-[11px] font-semibold text-[#4E5968] mt-1 leading-snug tracking-tight break-keep">
                    90회 완납 후 91~120개월차 월 0원 거치
                  </div>
                </div>

                <div className="min-w-0 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-emerald-700 tracking-tight break-keep">
                    ④ 120개월 만기 100% 환급
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-emerald-700 mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    {guideHiSummary.totalMaturityRefund.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-1 leading-snug tracking-tight break-keep">
                    미이용 시 납입 원금 전액 환급
                  </div>
                </div>
              </div>
            ) : (
              <div className={`grid mobile-keep-grid ${useMobileFluid ? 'grid-cols-2' : 'grid-cols-4'} gap-2.5 items-stretch`}>
                <div className="min-w-0 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#E60012] tracking-tight break-keep">
                    ① 가전 구매 총 지원금
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#E60012] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    {guideGeneralSummary.totalSupport.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-semibold text-[#4E5968] mt-1 leading-snug tracking-tight break-keep">
                    제휴카드 35개월 할부 선결제분
                  </div>
                </div>

                <div className="min-w-0 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#1B64DA] tracking-tight break-keep">
                    ② 35개월 할부 매월 상쇄액
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#1B64DA] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    월 {guideGeneralSummary.monthlyInstallment35.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-semibold text-[#4E5968] mt-1 leading-snug tracking-tight break-keep">
                    할부 이자 포함 매월 100% 상쇄
                  </div>
                </div>

                <div className="min-w-0 bg-[#F8FAFC] border border-[#E5E8EB] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-[#4E5968] tracking-tight break-keep">
                    ③ 상조 월 납입금 (1~150회)
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-[#191F28] mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    월 {guideGeneralSummary.totalMonthlyDeposit.toLocaleString()}원
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#8B95A1] mt-1 leading-snug tracking-tight break-keep">
                    1~150회 정기 납입 (별도 거치기간 없음 · 150회 만기)
                  </div>
                </div>

                <div className="min-w-0 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                  <div className="text-[11px] font-extrabold text-emerald-700 tracking-tight break-keep">
                    ④ 150회 만기 100% 환급 원금
                  </div>
                  <div className="text-[clamp(0.875rem,3.6vw,1.2rem)] font-black text-emerald-700 mt-1 font-mono tabular-nums whitespace-nowrap tracking-tight">
                    {guideGeneralSummary.totalMaturityRefund.toLocaleString()}원
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 mt-1 leading-snug tracking-tight break-keep">
                    미이용 시 납입 원금 전액 환급
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2층: 3단계 핵심 진행 스토리 */}
          <div className="bg-[#F8FAFC] border border-[#E5E8EB] rounded-2xl p-3.5 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-2 gap-2">
              <span className="text-xs font-black text-[#191F28] flex items-center gap-1.5 tracking-tight">
                <Award className="w-4 h-4 text-[#E60012] shrink-0" />
                {isSubGuide
                  ? '지원 · 납입 · 거치 · 만기 100% 환급 3단계 진행 스토리'
                  : '지원 · 상쇄 · 납입 · 만기 100% 환급 3단계 진행 스토리'}
              </span>
              <span className="text-[11px] font-bold text-[#8B95A1] whitespace-nowrap">
                선택 구좌 기준 자동 산출
              </span>
            </div>

            {isSubGuide ? (
              <div className={`grid ${useMobileFluid ? 'grid-cols-1' : 'grid-cols-3'} gap-2.5 items-stretch`}>
                <div className="bg-white rounded-xl p-3 border border-[#E5E8EB] space-y-1">
                  <div className="text-xs font-black text-[#E60012] tracking-tight">
                    STEP 1 · 구독기간 매월 캐시백 지원
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    가전 구독 기간(<strong className="text-[#191F28]">{representativePeriod}개월</strong>) 동안 매월{' '}
                    <strong className="text-[#E60012] font-black font-mono">
                      -{guideHiSummary.monthlyHiPlusSupport.toLocaleString()}원
                    </strong>
                    씩(총 {guideHiSummary.totalHiPlusSupport.toLocaleString()}원) 구독료를 지원받습니다.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#E5E8EB] space-y-1">
                  <div className="text-xs font-black text-[#1B64DA] tracking-tight">
                    STEP 2 · 90회 납입 후 30개월 무납입 거치
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    1~90회차까지 월{' '}
                    <strong className="text-[#191F28] font-black font-mono">
                      {guideHiSummary.totalMonthlyDeposit.toLocaleString()}원
                    </strong>
                    씩 납입하며, 90회 완납 후 91~120개월차(30개월)는 <strong className="text-[#1B64DA]">월 0원</strong>으로 거치됩니다.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-1">
                  <div className="text-xs font-black text-emerald-700 tracking-tight">
                    STEP 3 · 120개월 만기 시 원금 100% 환급
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    120개월 만기 도래 시(서비스 미이용 시) 납입 원금{' '}
                    <strong className="text-emerald-700 font-black font-mono">
                      {guideHiSummary.totalMaturityRefund.toLocaleString()}원 전액(100%)
                    </strong>
                    을 돌려받습니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`grid ${useMobileFluid ? 'grid-cols-1' : 'grid-cols-3'} gap-2.5 items-stretch`}>
                <div className="bg-white rounded-xl p-3 border border-[#E5E8EB] space-y-1">
                  <div className="text-xs font-black text-[#E60012] tracking-tight">
                    STEP 1 · 지원금만큼 35개월 할부 선결제
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    가전 결제 금액 중 지원금{' '}
                    <strong className="text-[#E60012] font-black font-mono">
                      {guideGeneralSummary.totalSupport.toLocaleString()}원
                    </strong>
                    을 제휴카드 35개월 할부로 분리하여 매장 실결제 부담을 낮춥니다.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#E5E8EB] space-y-1">
                  <div className="text-xs font-black text-[#1B64DA] tracking-tight">
                    STEP 2 · 35개월 할부 원리금 100% 상쇄
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    할부 이자를 포함한 월 청구액{' '}
                    <strong className="text-[#1B64DA] font-black font-mono">
                      월 {guideGeneralSummary.monthlyInstallment35.toLocaleString()}원
                    </strong>
                    을 35개월간 매월 동일하게 지원해 실질 할부 부담이 0원입니다.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-1">
                  <div className="text-xs font-black text-emerald-700 tracking-tight">
                    STEP 3 · 150회 만기 시 납입 원금 100% 환급
                  </div>
                  <p className="text-[11.5px] font-medium text-[#4E5968] leading-snug tracking-tight break-keep">
                    거치기간 없이 1~150회(150개월) 월{' '}
                    <strong className="text-[#191F28] font-black font-mono">
                      {guideGeneralSummary.totalMonthlyDeposit.toLocaleString()}원
                    </strong>{' '}
                    정기 납입 완료 시(미이용 시) 납입 원금{' '}
                    <strong className="text-emerald-700 font-black font-mono">
                      {guideGeneralSummary.totalMaturityRefund.toLocaleString()}원 전액(100%)
                    </strong>
                    을 환급받습니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3층: 8대 라이프케어 전환 서비스 & 멤버십 우대 6종 */}
          <div className={`grid ${useMobileFluid ? 'grid-cols-1' : 'grid-cols-2'} gap-3.5 items-stretch shrink-0`}>
            <div className="bg-[#F8FAFC] border border-[#E5E8EB] rounded-2xl p-3.5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#E5E8EB] pb-2 mb-2.5">
                <span className="text-xs font-black text-[#191F28] flex items-center gap-1.5 tracking-tight">
                  <HeartHandshake className="w-4 h-4 text-[#1B64DA] shrink-0" />
                  8대 라이프케어 전환 서비스
                </span>
                <span className="text-[10.5px] font-semibold text-[#8B95A1] tracking-tight">
                  상조(장례의전) 대신 자유 전환 가능
                </span>
              </div>

              <div className={`grid ${useMobileFluid ? 'grid-cols-1 min-[380px]:grid-cols-2' : 'grid-cols-2'} gap-2 flex-1 content-between`}>
                {LIFE_CARE_SERVICES.map((svc) => (
                  <div
                    key={svc.title}
                    className="bg-white rounded-xl px-2.5 py-2 border border-[#E5E8EB] flex flex-col justify-center"
                  >
                    <div className="text-[11.5px] font-extrabold text-[#191F28] leading-tight tracking-tight break-keep">
                      {svc.title}
                    </div>
                    <div className="text-[10.5px] font-medium text-[#4E5968] mt-0.5 leading-snug tracking-tight break-keep">
                      {svc.desc}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-medium text-slate-500 leading-snug tracking-tight break-keep mt-2.5 pt-2 border-t border-[#E5E8EB]/80">
                ※ 기본 상조(국가공인 장례지도사·리무진·수의 의전) 미이용 시 전환 가능하며, 가입 상품 및 이용 시점에 따라 전환 품목이 일부 상이할 수 있습니다(잔여 부금 완납 조건).
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E5E8EB] rounded-2xl p-3.5 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#E5E8EB] pb-2 mb-2.5">
                <span className="text-xs font-black text-[#191F28] flex items-center gap-1.5 tracking-tight">
                  <Gift className="w-4 h-4 text-[#E60012] shrink-0" />
                  가입 즉시 누리는 멤버십 우대 6종
                </span>
                <span className="text-[10px] font-semibold text-[#8B95A1] tracking-tight text-right">
                  계약 유지 고객 우대 (항목별 기간·횟수 기준 적용)
                </span>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                {MEMBERSHIP_BENEFITS.map((bf) => (
                  <div
                    key={bf.title}
                    className="bg-white rounded-xl px-2.5 py-1.5 border border-[#E5E8EB]"
                  >
                    <div className="text-[11.5px] font-extrabold text-[#191F28] leading-tight tracking-tight break-keep">
                      {bf.title}
                    </div>
                    <p className="text-[10.5px] font-medium text-[#4E5968] mt-0.5 leading-snug tracking-tight break-keep">
                      {bf.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4층: 법적 필수 유의사항 */}
          <div className="bg-[#191F28] text-white rounded-2xl px-4 sm:px-5 py-3.5 text-[10.5px] space-y-1.5 shrink-0 tracking-tight break-keep">
            <div className="font-black text-[#FF6B78] flex items-center gap-1.5 text-xs mb-0.5">
              <Info className="w-4 h-4 shrink-0" />
              중도 해지 시 유의사항 및 만기 100% 환급 조건 필수 안내
            </div>
            <div className="text-slate-200 font-medium leading-snug">
              1. <strong className="text-white">만기 시 100% 환급 조건:</strong> 지정된 만기 시점(Hi구독 플러스: 1~90회 납입 + 30개월 무납입 거치 후 총 120개월 만기 / 일반 하이프리드: 거치기간 없이 1~150회[150개월] 납입 완료 시 만기) 도래 후 해약 신청 시 납입 원금 전액(100%)을 환급합니다. (단, 상조·전환 서비스 미이용 시 환급 대상이며, 서비스 이용 시 환급 대상 제외)
            </div>
            <div className="text-slate-300 font-medium leading-snug">
              2. <strong className="text-[#FF6B78]">중도 해지 시 불이익:</strong> 만기 전 중도 해지하거나 월 부금이 3회 이상 연체될 경우 가전 지원금 지급이 즉시 중단·환수되며 잔여 할부금 및 구독료는 고객 본인 부담으로 전환됩니다. 만기 전 해지 시 해약환급금은 공정거래위원회 &apos;선불식 할부계약의 해제에 따른 해약환급금 산정기준 고시&apos;에 따라 납입 원금보다 적거나 없을 수 있습니다.
              {!isSubGuide && (
                <span className="text-amber-300 font-semibold">
                  {' '}
                  (하이마트 제휴카드 결제 및 1~35회차 자동이체 유지 필수)
                </span>
              )}
            </div>
            <div className="text-slate-300 font-medium leading-snug">
              3. <strong className="text-emerald-300">상품 성격 및 소비자피해보상 지급보증:</strong> 본 상품은 예·적금이나 보험 등 금융상품이 아닌 웅진프리드라이프의 선불식 할부거래(상조·라이프케어) 상품이며, 할부거래에 관한 법률 제27조에 의거해 고객 납입금(선수금)의 50%에 대하여 제1금융권(우리·신한·하나·KB국민·IBK기업·수협·아이엠뱅크·BNK부산은행) 지급보증·예치 계약을 체결해 보전합니다.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
