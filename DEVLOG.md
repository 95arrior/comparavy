# ateflo 개발 현황 (상세)

> ★★ 2026-07-02 **네이버 수익형 단일 피벗** — 아래 '두 세그먼트' 설계는 폐기(역사 기록용).
> 새 방향: **네이버 블로그 하나로, 초보 n잡러가 개설→글쓰기→애드포스트 승인→체험단→지원금까지 뇌빼고 수익화.**
> 원칙 3개: ① 법적 안전(연예 가십·어그로·허위 금지, 허위조작정보법) ② 노출·방문자 극대화(홈피드+검색) ③ 계정 안 죽는 지속(우상향, 계정 소모 전략 배제).
> '뇌빼고' = 판단 자동화(뭘·어떻게·언제 쓸지 0), 발행은 복붙 3초(자동발행은 ToS 위반이라 안 함).
>
> **Phase 1 완료(이 커밋)**: 3유형(local/online/hobby)→수익형 단일 온보딩(주제 1스텝), 글 엔진 채널 분기 제거(네이버 규격 단일·1,400~2,100자), WP 탭·패널·연결·예약발행·TipTap 편집기·애드센스 신뢰페이지 UI 제거(발행=복사→네이버 붙여넣기), 성과=애드포스트→체험단→쿠팡→창작자지원 여정, 플랜 카피 네이버화. tiptap 의존성 제거.
> **비활성 보관(코드만, UI 진입 없음)**: `lib/wordpress.ts`·`app/api/wordpress/*`·`searchconsole`·`SearchConsoleConnect`·`AddressSearch`·`HoursEditor` — WP는 '유저가 커지면 여는 나중 카드'.
> **레거시**: DB의 옛 vertical(local·hobby)은 서버 코드가 계속 읽음(bloggerTypes 주석 참조). ProfileSettings 저장 시 online으로 통일됨.
> **Phase 2 예정**: 개설 가이드(80대도)·애드포스트 20일 승인 코스·발행 streak·방문자 수동입력 트래킹·랜딩 리뉴얼. **Phase 3**: 홈피드 후킹(제목·썸네일)·숫자밀도 강화·허위조작정보법 가드 강화·수익화 허브.
>
> 브랜치: `ateflo-korean-wordpress-saas` · 스택: Next.js 16 · Supabase · Stripe/Toss · Vercel 자동배포

---

## 1. 세그먼트 분기 (핵심 설계)

| | 자영업자(local) | 수익형/취미(online·hobby) |
|---|---|---|
| 채널(channel) | `naver` | `wp` |
| 글 규격 | 네이버 블로거st(형광펜·인용박스·짧은문단·해시태그) | 구글/애드센스 클린 E-E-A-T(H2/H3·리스트·strong) |
| 발행 | 복붙(제목/본문 따로) | 워드프레스 API 자동 발행 |
| 편집기 | **읽기전용**(네이버에서 편집) | 편집 가능(TipTap) |
| 대표 이미지 | 숨김(복붙은 이미지 안 넘어감) | 사용 |
| 예약발행·캘린더 | 없음 | 있음 |
| 워드프레스 연결 | 불필요(탭에 안내만) | 필수 |
| 홍보/정보 토글 | 있음(가게 연결) | 없음 |
| 글감 게이트 | 검색자=손님 매칭 강함 | 트래픽 중심 |
| 수익화 | 네이버 플레이스·동네 검색 | 애드센스·쿠팡·제휴·체험단 |

`channel = body.channel ?? (bloggerType(vertical)==="local" ? "naver" : "wp")`

---

## 2. 글 생성 엔진 (`lib/articlePrompt.ts`, `lib/generateArticle.ts`)

### 시스템 프롬프트 구성 — `buildSystemPrompt(vertical, channel)`
`base + COMMON_SEO_PRINCIPLES + AEO_RESOLUTION(해결·완결) + YMYL_GUARDRAIL + VERTICAL_SYSTEM[vertical] + (naver ? NAVER_GUIDE : WP_GUIDE)`

- **AEO_RESOLUTION**: 검색자가 이 글 하나로 끝나게(완결), 소제목 아래 핵심 답 먼저.
- **NAVER_GUIDE**: 네이버 규격. ★문단 1~2문장(벽돌 금지)·첫 문장 훅·핵심만 `<mark>` 형광펜(소제목당 1~2)·나열은 `<ul>`·도입 인용박스 다양화·관련 질문 점령·사진 자리·해시태그 10~20·친근한 정보조언체(가짜 경험 금지).
- **WP_GUIDE**(신규, wp 전용): 네이버식 형광펜(`<mark>`)·요약 인용박스(`<blockquote>`) **금지**. 강조는 `<strong>` 절제. H2/H3·리스트 '구조'로 가독성. **E-E-A-T**(직접 해본 경험·구체 정보)로 끝까지 읽히게.

### SAVE_TOOL `body_html` (채널 중립)
각 소제목 답 먼저 / 짧은 문단(1~3) / 나열은 `<ul>` / 마지막 핵심요약 `<ul>` / `[사진:]` 자리. **형광펜·인용박스는 '채널 규격' 따름**(네이버만 적극).

### 채널별 분량
- 네이버: 1,400~2,100자(잘 읽힘 우선)
- 워드프레스: ~3,500자(깊이 보상)
- 소제목: 네이버 3~5개 / WP 5~7개

### '내 이야기'(userStory) — storyBlock (차별화 핵심)
- **① 개떡→찰떡**: 두서없이·맞춤법 틀리게·토막내 적어도 의도를 완벽히 알아듣고 명품 글로(거부·빈약 금지). 일반 AI('글 써줘')와 결정적 차이.
- **먼저 '분석' 그다음 '작성'**: 뉘앙스·속뜻·포지셔닝(강조점·자부심·대상·가격/방식 입장) 세밀 분석. '우리가 직접 한다/수제/맞춤'은 그 입장 그대로 유지(외주·일반론으로 안 뒤집음).
- **② 가짜 경험 금지**: 안 적힌 경험·수치·후기 날조 금지.
- **⑥ 브랜드·타업체 허용**: 본인이 적은 브랜드·제품·기관·타업체는 심각한 법적 리스크(허위·비방)만 아니면 삭제·일반화 없이 자연스럽게 녹임(규칙 19보다 우선, 내 이야기 모드 한정). 글감 추천 글에선 새로 안 끌어들임.
- **⑦ bizName**: 홍보용이면 '우리 가게 소개·차별점'이 본문 곳곳에 자연스럽게(과장·호객·최고/1위/보장 금지).

### 생성 전/후 검증 (크레딧 보호)
- **생성 전**(클로드 비용 전): `looksLikeNonsenseStory`(가나다라·반복·의미문자비율), `looksLikeGarbageKeyword`, `validateStoryMeaning`(haiku) → 쓰레기면 400.
- **생성 후 분량 게이트**(채널별): 네이버 바닥 500자(명백한 실패만 막음·좁은 주제도 살림), WP `min(maxWords,3500)*0.4`. 거부 메시지도 네이버는 '구글' 언급 제거.

### 광고법(`lib/complianceFilter.ts` + 프롬프트)
- 프롬프트에 금지 표현 명시: 최고·유일·1위·완치·100%·보장·**치료 후기/체험담(의료법 적발1위)** → 처음부터 안 쓰게. 대신 '체계적인·개선에 도움·경우에 따라'로 순화.
- complianceFilter가 발행 전 검토(net).

---

## 3. 글감 추천 (`app/api/topics/route.ts`, `lib/topicTitles.ts`, `lib/aiSeeds.ts`)

- **풀**: `keyword_pool`(네이버 검색광고 볼륨) → vertical/sub/audience 필터.
- **AI 게이트** `keywordsToTitles(keywords, ctx, {localBiz})`: 제목·카테고리칩·ok(노이즈)·fit(적합도).
  - **★검색자=손님 매칭(localBiz=자영업자)**: '이 키워드를 검색하는 사람이 우리 손님인가'를 1순위로. 분야 같아도 손님 아니면 제외(유아초등 영어 → 여행영어·스페인어·성인토익 제거). '애매하면 통과'의 예외.
- **손님 글감 생성 폴백** `generateAudienceTopics(field, audience)`: 풀이 오염/얕을 때 손님이 실제 검색하는 비지역 글감 생성(검색량 0=고의도·무경쟁).
- **중복 방지** `sanitizeTopics`: keyword·title·cluster(앞 4글자)로 dedup, 3개 캡. 캐시 모든 경로 적용(읽기·스왑·렌더), 캐시 키 `ateflo_topics_v15_날짜_프로필_모드`.
- **우리동네(지역) 모드**: `resolveLocalPlan`(scope dong/si/nation·areas·traits AI 판정), `addressRegionTiers`(도로명 법정동까지), `generateLocalKeywords`(지역×업종×대상 생성), `mentionsForeignRegion`(타지역 제거), 진행적 확장(오송→흥덕→청주), 지역명 포함만.
- **데이터 칩**: 검색량(demandLabel)·경쟁(blog_total→compFromBlogTotal, 폴백 광고경쟁)·선점(낮은 경쟁=싹).

---

## 4. 네이버(자영업자) 발행 플로우 (`components/dashboard/ArticleModal.tsx`, `lib/photoMarkers.ts`)

- **네이버에 올리기 시트**:
  - `openNaverWrite()`: 블로그 아이디(localStorage `ateflo_naver_blogid`, 1회 입력·내정보에서 수정) → `blog.naver.com/{id}/postwrite` 직행 + **제목 자동 복사**(제목칸 바로 붙여넣기, 왕복 1번) + 자동 발행표시.
  - `copyTitle()` / `copyBody()`: 제목·본문 **따로 복사**(네이버 제목/본문 칸 분리). 본문에 제목 안 섞임.
  - `copyBody` 변환: `addNaverSpacing(photoMarkerToGuide(markToNaverBold(bodyHtml)))`.
- **복붙 변환(`lib/photoMarkers.ts`)**:
  - `markToNaverBold`: `<mark>`→`<b style=bg>`(네이버가 형광펜 버려서 굵게+배경색으로, 최소 굵게는 전달).
  - `addNaverSpacing`: 문단·인용구 뒤 빈 줄(편집기처럼 시원). **리스트엔 안 붙임**(네이버가 리스트 옆 빈 줄을 빈 불릿으로 만들어서 — 목차 점 생김 방지).
  - `photoMarkerToGuide`: `[사진:]`→"📷 여기에 ~사진 올려주세요"(네이버는 붙여넣기 이미지 안 됨).
- **시트 단계**: ①글쓰기 열기(제목 자동복사) ②제목칸 붙여넣기 ③본문 복사→본문칸 ④사진 자리 ⑤해시태그 후 발행. + 형광펜 칠하기 꿀팁.
- **편집기 읽기전용**(네이버): `ArticleEditor editable=false`(툴바·본문·제목 읽기전용), 대표이미지·섹션추천 숨김.
- **글 내리기**(네이버): WP unpublish 아니라 우리 상태만 '초안' PATCH + "네이버에서 직접 내려주세요" 안내.

---

## 5. 워드프레스(수익형/취미) 발행 + 애드센스 (`lib/wordpress.ts`, `lib/adsensePages.ts`)

- **글 발행** `publishPost`: 이미지 업로드·H1→H2·TOC·FAQ·구조화데이터·내부링크·`stripPhotoMarkers`.
- **신뢰 페이지(애드센스 승인)** — 신규:
  - `lib/adsensePages.ts buildAdsensePages`: **소개·운영자·문의(AI) + 개인정보처리방침(애드센스/쿠키/애널리틱스 검증 템플릿)** 4종 생성(온보딩 데이터+계정 이메일).
  - `lib/wordpress.ts publishPage`: WP **'페이지'** 발행/업데이트(slug 중복 시 갱신).
  - `app/api/wordpress/adsense-pages` (POST): 4종 생성→발행.
  - `WordPressPanel` 카드: **"신뢰 페이지 4개 만들기"** 원클릭 → 발행 링크 + **푸터 연결 4단계 가이드**(외모→메뉴→푸터, 테마차이 안내) + **신청 전 체크리스트**(글 수·페이지·도메인·이메일).
- **수익화 가이드 상세화**(`PerformanceView` buildPaths + PathDetail):
  - **애드센스**: 글·신뢰페이지 준비→사이트 연결→Site Kit 코드→검토→자동광고 **5단계** + ⚠️클릭유도/자가클릭 금지·재신청(신뢰 페이지 기능 크로스링크).
  - **쿠팡파트너스**: 가입→링크생성→배치→24h수익 + ⚠️수수료 문구 필수·3개월 실적.
  - **제휴마케팅/체험단**: 단계 구체화 + ⚠️광고·협찬 표기(공정위).
  - UI: 단계 번호 원형 + 노란 '꼭 알아두기' 박스.
- **성과 페이지 분기**: 자영업자=동네검색·지역키워드·단골·네이버플레이스 / 수익형=쿠팡·애드센스·제휴·체험단.

---

## 6. UI/UX

### 홈 (`components/dashboard/Home.tsx`)
- **글감이 메인**(입력창만 보면 막막). 상단에 **검색창식 입력창**(접힘) — 클릭하면 **부드럽게 쭉 펼쳐짐**(기존 박스 그대로, collapsible). 아래에 글감 추천.
- 우리동네 강화·주제 시리즈 버튼 유지.

### 입력창 (`components/dashboard/StoryComposer.tsx`)
- 평평한 neutral-50(드롭쉐도우 없음, 하단 박스와 통일), **포커스 시 오로라 테두리+글로우**.
- `collapsible`: 접힘(1줄)↔포커스 시 펼침(6줄 + 글자수 + 홍보/정보 토글). 부드러운 transition.
- **홍보/정보 슬라이딩 토글**(흰 알약 좌우 미끄러짐), 얇은 스크롤바(`ateflo-thin-scroll`).
- 제출 시 '제목 정하기' 시트(비우면 AI가 정함).

### 글 생성 화면 (`components/dashboard/WritingView.tsx`) — 개편
- 대기: **분석 라이브 체크리스트**(이야기 분석→뉘앙스→네이버/검색 구조→동네·업종 데이터→광고규정→다듬기, ✓진행) + **스켈레톤**(제목+문단 shimmer).
- 본문: **문단씩 부드럽게 페이드업**(140ms, 따다다 덤프 아님). 완성된 블록만 등장.
- `.ateflo-block-in`(페이드업), `.ateflo-skel`(shimmer) CSS.

### 편집기 (`components/dashboard/ArticleEditor.tsx`)
- TipTap. 형광펜(Highlight)·인용구·H2/H3·목록·링크·이미지 툴바.
- `editable` prop(네이버=false 읽기전용, 툴바·제목 비활성).
- **버그 수정**: 툴바 버튼 `onMouseDown preventDefault` — 선택 없이 볼드 누르면 전체 볼드되던 문제(포커스 뺏김) 해결. 볼드·형광펜·인용구·목록 전부.

---

## 7. 전략·포지셔닝 (메모 반영)

- **정직 노선**: 방문자·상위노출 보장 금지. "꾸준함·방향 병목 제거".
- **해자 = 딥데이터**(업종/세부/주소/대상) 끝까지 활용 + 뉘앙스 분석. AI '글 써줘'와 차별.
- **검색자 = 손님 매칭**: 글감 1순위 원칙(유입돼도 전환 0이면 죽은 자산).
- **두 콘텐츠 일**: 유입 글(글감) + 어필·소개 글(아직 약함 — 빠른시작 칩은 롤백, 재설계 여지).
- **크레딧 모델**: 글 생성이 비용 95%. 프로 마진 ~77%.
- 출시: 토스 심사로 1~2개월 확보, 랜딩+메일수집으로 **수요 검증** 우선.

---

## 8. 남은 일 / 점검 필요 (TODO)

- [ ] **수요 검증**(최우선): 한 세그먼트·한 데모로 좁혀 실제 타겟 반응 테스트.
- [ ] 워드프레스 새 글이 형광펜/인용구 안 섞여 나오는지 실검증(WP_GUIDE 반영 확인).
- [ ] 신뢰 페이지 자동 발행 실연동 테스트(페이지 4종 실제 발행·링크).
- [ ] 결제(토스) 실연동·cron — 코드는 준비됨, 법적과 함께.
- [ ] '어필·소개 글' 도구 재설계(빠른시작 칩 롤백 후 대안).
- [ ] 글 종류별(소개/후기/인사말) 출력 구조 분기 여부 결정.
- [ ] 잔여 버그 전수 점검(사용자 보고 기준).

---

## 9. 빌드·배포 규칙

- 푸시 게이트(엄격): `tsc --noEmit`에 `error TS` 없을 때만 → `next build` "Compiled successfully" + `.next` 존재 시 commit/push. tsc 에러 있으면 중단(웹팩만 통과해도 푸시 X).
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8`.
