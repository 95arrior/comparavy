# species-c — 박카 파이프라인 (쇼핑커넥트 커머스 글 완전 자동 생성기)

기존 ateflo 앱(네이버/워드프레스 글생성기)과 **완전히 독립된 모듈**.
기존 코드를 import하지 않고, 기존 코드도 이 모듈을 모른다. 필요한 로직은 `copied/`에 복사(원본과 동기화하지 않음).

## 실행

```bash
npx tsx species-c/run.ts species-c/inputs/상품명.json
```

## 입력 JSON (예시)

```json
{
  "url": "https://smartstore.naver.com/스토어/products/12345",
  "commissionPct": 12,
  "name": "OO 차량용 탈취제 200ml",
  "price": 15900,
  "rating": 4.6,
  "reviewCount": 2847,
  "category": "차량용품",
  "discountPct": 10,
  "reviewsText": "상품 페이지에서 복사한 리뷰 20~50개 텍스트 뭉치...",
  "myExperience": "(선택) 실사용 경험 한 줄 — 있으면 그 범위 안에서 직접 경험 서술 허용"
}
```

- `url`·`commissionPct`(쇼핑커넥트 화면의 수수료율)는 필수.
- `name`~`category`는 자동 수집(공개 메타태그) 실패 시 수동 입력이 정상 경로.
- `reviewsText` 없으면 리뷰 마이닝 단계에서 중단(리뷰 붙여넣기 요구).

## 출력 — 복붙 패키지 (`species-c/out/날짜-상품명/`)

`01_제목.txt` `02_본문.txt`(마커 포함) `03_이미지/`(카드 PNG) `04_태그.txt` `05_조립가이드.md` `06_심리브리프.md`

## 파이프라인

인테이크 → 상품 게이트(리뷰 300+·평점 4.3+·수수료 1,000원+·가격 1~5만·시즌) → 키워드 3층 발굴+검색량·경쟁 전량 실측 → 리뷰 마이닝 → 구매 심리 브리프 → 본문(뼈대 9단 고정·판매왕 문체) → 카드 렌더링(satori, LLM 이미지 금지) → 품질 게이트(대가성·과장·가짜 사용감·인용·마커 등 9규칙) → 패키지 + SQLite 로그

## 필요 env (.env.local)

`ANTHROPIC_API_KEY`, `NAVER_AD_*` 3종(검색량), `NAVER_DATALAB_CLIENT_ID/SECRET`(검색 API 권한 필요 — blog_total)

## 회귀 테스트

```bash
npx tsx species-c/tests/check-species-c.mjs
```

실패 사례가 나올 때마다 여기 케이스로 박제한다.

## 격리 계약

- 기존 영역(`app/` `lib/` `components/` `config/` `supabase/` `scripts/`) 수정 금지, 양방향 import 금지
- DB는 `species-c/data.db`(node:sqlite) — 기존 Supabase 불가침
- 매 단계 후 기존 회귀(`scripts/check-*.mjs`) 재실행: 베이스라인 = 20 PASS / 5 FAIL(2026-07-13 이전부터 실패하던 낡은 테스트 — species-c와 무관, 실패 내용 변화도 위반으로 간주)
