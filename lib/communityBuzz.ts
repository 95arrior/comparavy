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

export interface CommunitySeed {
  keyword: string;   // ★원어 — "[카카오뱅크] AI 퀴즈" → "카카오뱅크 AI 퀴즈"
  title: string;
  brand: string;
  postedAt: string;  // ISO
  minutesAgo: number;
  board: string;
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

/** 제목에서 원어 키워드를 뽑는다. "[카카오뱅크] AI 퀴즈" → { brand: "카카오뱅크", keyword: "카카오뱅크 AI 퀴즈" } */
export function parseCommunityTitle(raw: string): { brand: string; keyword: string } | null {
  const t = String(raw || "").trim();
  const m = /^\[([^\]]{2,20})\]\s*(.+)$/.exec(t);
  if (!m) return null;
  const brand = m[1].trim();
  const rest = m[2].trim().replace(/\s{2,}/g, " ").slice(0, 30);
  if (!brand || rest.length < 2) return null;
  // ★날짜 코드(260805)·순번 같은 잡음 제거 — 검색어에 안 들어가는 말이다
  const clean = rest.replace(/\b\d{6,8}\b/g, "").replace(/\s{2,}/g, " ").trim();
  if (clean.length < 2) return null;
  return { brand, keyword: `${brand} ${clean}`.slice(0, 40) };
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
        keyword: p.keyword, brand: p.brand, board: f.board,
        title: `${p.keyword}, 지금 확인하면 되는 것`,
        postedAt: new Date(ts).toISOString(), minutesAgo,
      });
    }
  }
  return out.sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, limit); // 최신 우선
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
