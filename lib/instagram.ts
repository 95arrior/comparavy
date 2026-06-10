// 인스타그램 콘텐츠 게시 API (Graph API) — 릴스·이미지·캐러셀 자동 발행.
// 흐름: ① 미디어 컨테이너 생성 → ② 처리 완료 대기(폴링) → ③ 발행(media_publish)
// 미디어(영상·이미지)는 인스타가 가져갈 수 있는 '공개 URL'이어야 한다(Supabase Storage 등).

// 토큰 종류에 따라 베이스가 다름:
//  - 페이스북 로그인(페이지 토큰) → https://graph.facebook.com/v21.0
//  - 인스타 로그인(앱 대시보드 토큰) → https://graph.instagram.com/v21.0
// .env.local 의 IG_API_BASE 로 바꿀 수 있게(기본은 facebook).
const GRAPH = process.env.IG_API_BASE || "https://graph.facebook.com/v21.0";

export interface IgCreds {
  igUserId: string; // 인스타 비즈니스 계정 ID (숫자)
  token: string; // 장기 액세스 토큰
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function createContainer(creds: IgCreds, params: Record<string, string>): Promise<string> {
  const body = new URLSearchParams({ ...params, access_token: creds.token });
  const res = await fetch(`${GRAPH}/${creds.igUserId}/media`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`컨테이너 생성 실패: ${data.error?.message ?? JSON.stringify(data)}`);
  return data.id as string;
}

/** 컨테이너 처리(인코딩) 완료까지 폴링. 영상은 시간이 걸린다. */
async function waitReady(creds: IgCreds, containerId: string, tries = 60, interval = 5000): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${creds.token}`);
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error(`미디어 처리 실패: ${data.status ?? ""}`);
    await sleep(interval);
  }
  throw new Error("미디어 처리 대기 시간 초과");
}

async function publishContainer(creds: IgCreds, containerId: string): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: creds.token });
  const res = await fetch(`${GRAPH}/${creds.igUserId}/media_publish`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(`발행 실패: ${data.error?.message ?? JSON.stringify(data)}`);
  return data.id as string;
}

/** 이미지 1장 게시. 반환: 게시된 미디어 ID */
export async function publishImage(creds: IgCreds, imageUrl: string, caption: string): Promise<string> {
  const id = await createContainer(creds, { image_url: imageUrl, caption });
  await waitReady(creds, id, 20, 3000);
  return publishContainer(creds, id);
}

/** 릴스(세로 영상) 게시. coverUrl(썸네일) 선택. */
export async function publishReel(creds: IgCreds, videoUrl: string, caption: string, coverUrl?: string): Promise<string> {
  const id = await createContainer(creds, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    ...(coverUrl ? { cover_url: coverUrl } : {}),
  });
  await waitReady(creds, id, 60, 5000); // 영상 인코딩은 오래 걸림
  return publishContainer(creds, id);
}

/** 캐러셀(이미지 여러 장 = 카드뉴스). */
export async function publishCarousel(creds: IgCreds, imageUrls: string[], caption: string): Promise<string> {
  const children: string[] = [];
  for (const url of imageUrls) {
    children.push(await createContainer(creds, { image_url: url, is_carousel_item: "true" }));
  }
  const parent = await createContainer(creds, { media_type: "CAROUSEL", children: children.join(","), caption });
  await waitReady(creds, parent, 30, 3000);
  return publishContainer(creds, parent);
}

/** 토큰·계정 점검 — 계정 이름을 돌려준다(설정 검증용). */
export async function verifyIg(creds: IgCreds): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${creds.igUserId}?fields=username&access_token=${creds.token}`);
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error?.message ?? "확인 실패" };
    return { ok: true, username: data.username };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "확인 실패" };
  }
}
