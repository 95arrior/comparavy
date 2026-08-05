// ★커뮤니티 수확(2026-08-05, 설계 4단계 — 유저: "크론 기준 한 시간 이내면 될 것 같은데").
//
//  왜 커뮤니티인가(6/27·8/4 전수 조사):
//   - 케이뱅크 황금캡슐 → 초대 링크 바이럴. 1차 확산지가 뽐뿌·클리앙·카톡이었다(뉴스는 그 뒤).
//   - 삼성 온누리상품권 → 지급 개시 소식이 커뮤니티에서 먼저 돌았다.
//   ★유저는 X(트위터)를 제안했는데, 한국 생활·경제 이슈의 1차 확산지는 커뮤니티다.
//    게다가 X는 API 유료(월 $200~)·스크래핑 차단인데, 뽐뿌 RSS는 공개·무료·차단 없음.
//    같은 목적을 더 싸고 확실하게 달성한다. X는 해외발(연준·금값) 한정으로 나중에.
//
//  ★실호출로 확인한 피드(2026-08-05):
//   - http://www.ppomppu.co.kr/rss.php?id=coupon  → "[카카오뱅크] AI 퀴즈", "[페이북] 1등뽑기", "[OK캐시백] 르노 15p"
//   - http://www.ppomppu.co.kr/rss.php?id=ppomppu → 핫딜(상품권·페이백이 여기 섞여 온다)
//  ★pubDate가 있어 '최근 N분' 창이 실제로 가능하다 — 이게 이 원천의 핵심 가치다.

import { fetchNaverAutocomplete } from "./naverAutocomplete";

export interface CommunitySeed {
  keyword: string;   // ★원어 — 자동완성으로 확정되면 그 표기를 그대로 쓴다
  title: string;
  brand: string;
  hint: string;      // 제목에서 뽑은 이벤트 힌트(자동완성 대조용)
  postedAt: string;  // ISO
  minutesAgo: number;
  board: string;
  verified: boolean; // 자동완성에 실제로 있는 말인가
}

const FEEDS: { id: string; board: string }[] = [
  { id: "coupon", board: "쿠폰·이벤트" },
  { id: "ppomppu", board: "핫딜" },
];

// 돈이 걸린 신호 — 이게 있어야 우리 채널 소재다
const MONEY_RE = /(포인트|캐시백|적립|상품권|페이백|환급|지원금|바우처|무료|적금|예금|금리|카드|페이|증정|지급|할인쿠폰|이벤트)/;
// ★소비형 제외(2026-08-05 유저 지적에서 배운 것): 정답만 보고 3초에 나가는 검색은 체류가 0이다.
//  그건 퀵백 감점이고 애드포스트 단가도 최하위다 — 관심도가 높아도 우리가 먹을 게 없다.
const CONSUME_RE = /(퀴즈|정답|룰렛|출석|뽑기|응모|추첨|1등|룰렛|덧글|댓글이벤트)/;
// 제품 특가(핫딜) 제외 — 가격/무배 패턴. 우리 채널은 쇼핑 블로그가 아니다.
const DEAL_RE = /(\d{1,3},\d{3}\s*원|\d+만\s?원대|무배|무료배송|최저가|특가|\(\s*\d[\d,]*\s*\/)/;

/**
 * 제목에서 브랜드와 '검색어 후보'를 뽑는다.
 * ★실호출로 배운 것(2026-08-05): 커뮤니티 제목은 검색어가 아니라 말투다.
 *   "[네이버페이] 적립챌린지, 해외결제, 스파오 등 19원 받으세요" ← 이걸 통째로 키워드로 쓰면 아무도 안 친다.
 *   그래서 브랜드 + '첫 명사 덩어리'까지만 남긴다. 나머지 확정은 자동완성이 한다(아래 harvestCommunity).
 */
export function parseCommunityTitle(raw: string): { brand: string; keyword: string; hint: string } | null {
  const t = String(raw || "").trim();
  const m = /^\[([^\]]{2,20})\]\s*(.+)$/.exec(t);
  if (!m) return null;
  const brand = m[1].trim();
  let rest = m[2].trim();
  if (!brand || rest.length < 2) return null;
  // 날짜 코드·순번 제거 → 첫 구분자(쉼표·중점·괄호)까지만 → 서술어 꼬리 제거
  rest = rest.replace(/\b\d{6,8}\b/g, " ").replace(/\s{2,}/g, " ").trim();
  rest = rest.split(/[,·(){}\[\]/|]/)[0]!.trim();
  rest = rest.replace(/\s*(받으세요|받기|하세요|하기|드려요|줍니다|주세요|가능|안내|이벤트\s*중)\s*$/g, "").trim();
  // ★명사형만 남긴다(2026-08-05 실호출에서 배운 것): "생일가까우신 분은" 같은 서술형은 검색어가 아니다.
  //  조사·어미로 끝나는 어절은 버린다 — 사람은 그렇게 검색창에 치지 않는다.
  const JOSA_END = /(은|는|이|가|을|를|의|도|만|에|에서|으로|로|과|와|께|부터|까지|라|다|요|죠|네|음|함)$/;
  const VERB_END = /(하는|되는|주는|받는|있는|없는|같은|드린|우신|하신|이신|보신|신|운|던)$/;
  const words = rest.split(/\s+/).filter(Boolean)
    .filter((w) => [...w].length >= 2 && !VERB_END.test(w) && !JOSA_END.test(w));
  // 숫자+단위 꼬리(15p·19원)는 검색어가 아니다 — 수량은 매번 바뀐다
  const nouns = words.filter((w) => !/^\d+[a-zA-Z가-힣]?$/.test(w));
  const hint = nouns.slice(0, 2).join(" ").slice(0, 20);
  if (hint.length < 2) return null;
  return { brand, keyword: `${brand} ${hint}`.slice(0, 40), hint };
}

function parseRss(xml: string): { title: string; pubDate: string }[] {
  const out: { title: string; pubDate: string }[] = [];
  for (const block of xml.split("<item").slice(1)) {
    const t = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(block)?.[1] ?? "";
    const p = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ?? "";
    const title = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
    if (title) out.push({ title, pubDate: p.trim() });
  }
  return out;
}

/**
 * 커뮤니티에서 지금 막 올라온 돈 이슈를 거둔다.
 * @param windowMin 최근 몇 분까지 볼 것인가. ★유저 지시는 60분 — 다만 수확 크론이 4시간 주기라
 *   기본은 수확 간격(240분)에 맞춘다. 커뮤니티 전용 크론을 1시간으로 돌리면 그때 60으로 좁힌다.
 *   (창을 크론보다 좁게 잡으면 그 사이에 올라온 것을 구조적으로 못 본다.)
 */
export async function harvestCommunity(windowMin = 240, limit = 6): Promise<CommunitySeed[]> {
  const now = Date.now();
  const out: CommunitySeed[] = [];
  const seen = new Set<string>();
  for (const f of FEEDS) {
    if (out.length >= limit) break;
    let xml = "";
    try {
      const res = await fetch(`http://www.ppomppu.co.kr/rss.php?id=${f.id}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      xml = await res.text();
    } catch { continue; }

    for (const it of parseRss(xml)) {
      if (out.length >= limit) break;
      const ts = Date.parse(it.pubDate);
      if (!Number.isFinite(ts)) continue;
      const minutesAgo = Math.round((now - ts) / 60_000);
      if (minutesAgo < 0 || minutesAgo > windowMin) continue;   // ★창 밖은 안 본다(뒷북 차단)
      if (!MONEY_RE.test(it.title)) continue;                    // 돈이 안 걸린 글
      if (CONSUME_RE.test(it.title)) continue;                   // 정답 소비형 — 체류 0
      if (DEAL_RE.test(it.title)) continue;                      // 제품 특가 — 우리 채널 아님
      const p = parseCommunityTitle(it.title);
      if (!p) continue;
      const nk = p.keyword.replace(/\s+/g, "");
      if (seen.has(nk)) continue;
      seen.add(nk);
      out.push({
        keyword: p.keyword, brand: p.brand, hint: p.hint, board: f.board,
        title: `${p.keyword}, 지금 확인하면 되는 것`,
        postedAt: new Date(ts).toISOString(), minutesAgo, verified: false,
      });
    }
  }
  // ★자동완성으로 '진짜 검색어'를 확정한다(2026-08-05 실호출에서 배운 것).
  //  커뮤니티는 '무엇이 지금 도는지'를 알려주고, 자동완성은 '사람들이 어떻게 치는지'를 알려준다.
  //  둘을 합쳐야 검색어가 된다 — 커뮤니티 제목만 쓰면 아무도 안 치는 문장이 키워드가 된다.
  const picked = out.sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, limit * 2);
  const done: CommunitySeed[] = [];
  const unverified: CommunitySeed[] = [];
  for (const s of picked) {
    if (done.length >= limit) break;
    try {
      const sug = await fetchNaverAutocomplete(s.brand);
      // 브랜드 뒤에 붙어 실제로 검색되는 말 중, 이 글의 힌트와 겹치는 것
      const hit = sug.find((x) => x.includes(s.brand) && x.includes(s.hint.slice(0, 3)));
      if (hit) { done.push({ ...s, keyword: hit.slice(0, 40), verified: true }); continue; }
    } catch { /* 자동완성 실패 — 아래 미확정으로 */ }
    unverified.push(s);
    await new Promise((r) => setTimeout(r, 120));
  }
  // ★자동완성에 없는 건 최대 1개만 태운다(2026-08-05 실측: 뽐뿌 쿠폰판은 잔챙이 포인트가 대부분이다).
  //  다만 0으로 만들지는 않는다 — 방금 터진 대형일수록 자동완성이 아직 안 따라온다.
  //  가장 최근 것 하나만 남기고, 나머지는 버린다.
  if (done.length < limit && unverified.length) done.push(unverified[0]!);
  return done.slice(0, limit);
}

/** 씨앗 브리프 — 커뮤니티 글은 '방금 올라온 사실'이지 검증된 정보가 아니다. */
export function communityBrief(s: CommunitySeed): string {
  return [
    `[커뮤니티 수확 · ${s.board}] ${s.minutesAgo}분 전에 올라온 소식이다(${s.brand}).`,
    `★이 글의 임무는 '지금 뭘 하면 되는지'를 순서로 주는 것 — 남들보다 먼저 색인되는 게 목적이다.`,
    `★확인되지 않은 금액·기간·조건을 지어내지 마라. 커뮤니티 글은 시작 신호일 뿐 근거가 아니다.`,
    `  공식 앱·홈페이지에서 확인되는 사실만 쓰고, 확인 못 하면 "공식 채널에서 확인" 프레임으로 안내한다.`,
    `★이벤트가 이미 끝났을 수 있다 — 종료 여부를 먼저 확인하고, 끝났으면 '다음 회차·유사 혜택' 관점으로 쓴다.`,
  ].join("\n");
}
