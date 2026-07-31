// ★SERP 개방도 실측(2026-08-01) — "우리가 이길 수 있나"를 200% 믿을 수 있게 만드는 축.
//
//  왜 만들었나(전부 실측에서 나왔다):
//   ① 밴드의 '문서 1,000건 미만' 기준은 근거 없는 숫자였다 — 풀 표본 40개 중 통과 0개.
//   ② 문서수로는 승패가 안 갈린다 — 우리는 문서 10,531(KB스타기업뱅킹)에서 1위,
//      6,889(NH저축은행 정기예금)에서 노출 0이었다. 기존 기준이었다면 그 1위를 걸러냈을 것이다.
//   ③ 어제 SERP 스캔에서 진짜 차이가 보였다:
//      이긴 판 → 상위가 전부 일반 블로거(rider95-, ghks5, ekdud0706 …)
//      진 판  → 상위가 공공·공식 계정(hellopolicy, mltmkr, osan_si, gwanak_gu, we_are_youth …)
//               또는 브랜드 콘텐츠·광고 영역이 점령
//  → 결론: 난이도의 실체는 '문서가 몇 개냐'가 아니라 **'그 판에 일반 블로그 자리가 있느냐'**다.
//
//  이 파일은 그걸 추정하지 않고 **직접 센다**. 검색 결과를 받아 상위에 뜬 블로그가
//  일반 블로거인지 공식 계정인지 세어 개방도(0~1)를 낸다.
//  ★실패는 null이다(추정치를 만들어 내지 않는다) — 근거가 없으면 '쉽다'고 말하지 않는 게 이 기능의 목적이다.

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * 공식·기관 계정으로 보이는 블로그 id 패턴.
 * ★실측(2026-07-31 SERP 스캔)에서 관찰된 것만 넣는다 — 상상으로 늘리지 않는다.
 *  지자체(osan_si·gwanak_gu·gimhae2005), 부처·공공기관(mltmkr·hellopolicy·happykdic·kospo_together),
 *  대학·공공사업단(cufspr·we_are_youth·we-korea), 공식 브랜드(*_official).
 */
const OFFICIAL_RE = /(_si$|_gu$|_do$|si_|gu_|city|gov|korea|_kr$|official|공식|kdic|mltm|hellopolicy|together|youth|univ|ac_|pr$|center|공단|공사)/i;

/** 검색 결과 HTML에서 등장 순서대로 블로그 id를 뽑는다(중복 제거). */
export function blogIdsFromSerp(html: string): string[] {
  const ids: string[] = [];
  const re = /blog\.naver\.com\/([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1]!;
    if (id.endsWith(".naver") || /^(PostView|PostList|GoBlogWrite)$/i.test(id)) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export interface SerpOpenness {
  /** 상위 표본에서 일반 블로거가 차지한 비율(0~1). */
  share: number;
  /** 판정에 쓴 블로그 수(표본). */
  sample: number;
  /** 공식·기관으로 분류된 수. */
  official: number;
  /** 상위 표본(디버그·근거 표시용). */
  top: string[];
}

/** 상위 몇 개까지를 '판'으로 볼 것인가 — 모바일에서 실제로 눈에 들어오는 범위. */
const TOP_N = 10;

/**
 * 키워드의 SERP 개방도를 실측한다. 실패 시 null(추정 금지).
 * ★네트워크·파싱 실패, 표본 부족(3 미만)은 전부 null — '모른다'와 '쉽다'를 절대 섞지 않는다.
 */
export async function fetchSerpOpenness(keyword: string, timeoutMs = 8000): Promise<SerpOpenness | null> {
  const q = keyword.trim();
  if (!q) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(q)}`, {
      headers: { "user-agent": UA, "accept-language": "ko-KR,ko;q=0.9" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    if (!res.ok) return null;
    const html = await res.text();
    const ids = blogIdsFromSerp(html).slice(0, TOP_N);
    if (ids.length < 3) return null; // 표본 부족 = 판정 불가(블로그 영역 자체가 없는 판일 수도 있다)
    const official = ids.filter((id) => OFFICIAL_RE.test(id)).length;
    return { share: (ids.length - official) / ids.length, sample: ids.length, official, top: ids };
  } catch {
    return null;
  }
}

/**
 * 개방도 → 사장님 화면에 쓸 판정.
 * ★문턱은 실측 보정값이다(2026-08-01): 우리가 1위 한 판은 일반 블로거가 상위를 채우고 있었고,
 *  노출 0이던 판은 공공·공식 계정이 절반 이상이었다. 그 사이를 0.7로 잡는다.
 *  이 숫자는 표본이 쌓이면 다시 보정한다 — 지금은 '관측된 승패로 그은 선'이라는 뜻이지 진리가 아니다.
 */
export const SERP_OPEN_MIN = 0.7;

export function isOpenBoard(o: SerpOpenness | null): boolean {
  return o != null && o.share >= SERP_OPEN_MIN;
}

/** 근거 문장 — 화면에 '왜 쉽다고 하는지'를 숫자로 보여주기 위한 것(주장만 하지 않는다). */
export function opennessNote(o: SerpOpenness | null): string | null {
  if (!o) return null;
  const 일반 = o.sample - o.official;
  return `상위 ${o.sample}곳 중 일반 블로그 ${일반}곳`;
}
