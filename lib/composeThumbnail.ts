import { visualIdentityFor, PALETTES } from "./visualIdentity";
import { renderThumbnail, type ThumbInput } from "./thumbnailRenderer";
import { generateThumbBackground, imageReady } from "./geminiImage";
import { verifyImage } from "./imageVerify";
import type { ThumbCopy } from "./amplifyTopics";

// ★대표이미지 합성 통합 진입점 — 이미지 생성 라우트가 이 함수를 부른다.
//  순서: AI 배경 생성(→텍스트 비전 검증) → 실패/텍스트검출 시 코드 폴백 배경 → satori로 한글 합성.
//  어떤 단계가 실패해도 항상 PNG를 반환한다(발행이 막히지 않는다).
export async function composeThumbnail(opts: {
  userId: string;
  thumb: ThumbCopy;
  articleId?: string | null; // 글마다 오브젝트 포즈 변주(팔레트·템플릿·폰트는 불변)
  useAiBackground?: boolean; // 기본 true(가능하면 AI 배경). 폴백은 팔레트 코드 배경.
  /** 썸네일 메이커 — 유저 선택 팔레트(name)·워시(0~1) 오버라이드 */
  paletteName?: string;
  bgWash?: number;
  /** 타이틀 폰트(썸네일 메이커 기본 GmarketSansBold) */
  fontTitle?: string;
  /** 배경 스타일 강제(메이커=photo 기본) + 정중앙 텍스트 */
  bgStyle?: "photo" | "toss";
  centerCopy?: boolean;
  /** 주제 힌트(글 제목) — 배경 오브젝트가 주제를 그리게(추상 blob 금지 판정) */
  topicHint?: string;
}): Promise<{ png: Buffer; usedAiBackground: boolean }> {
  const base = visualIdentityFor(opts.userId); // ★프로덕션 경로: 실제 user.id → 유저 고정 정체성
  const pal = opts.paletteName ? PALETTES.find((x) => x.name === opts.paletteName) : null;
  const identity = pal ? { ...base, palette: pal } : base;
  let bgDataUrl: string | null = null;
  let usedAiBackground = false;

  if (opts.useAiBackground !== false && imageReady()) {
    try {
      const paletteHint = `${identity.palette.name.replace(/-/g, " ")}`;
      const bg = await generateThumbBackground(identity.bgStyle, paletteHint, opts.userId, opts.topicHint, { forceStyle: opts.bgStyle, centerText: opts.centerCopy });
      // 배경 텍스트 검증 — 글자 검출되면 폴백(합성 카피와 충돌 방지)
      const v = await verifyImage(bg.base64, bg.mime, "abstract background", { bgOnly: true, userId: opts.userId });
      if (!v.hasText) { bgDataUrl = `data:${bg.mime};base64,${bg.base64}`; usedAiBackground = true; }
    } catch { /* 폴백으로 */ }
  }

  const input: ThumbInput = {
    mainCopy: opts.thumb.mainCopy ?? "", // 빈 값=반려 → 렌더러가 배경+배지만(깨진 문구 렌더 불가)
    subCopy: opts.thumb.subCopy || undefined,
    badge: opts.thumb.badge || undefined,
    identity,
    articleId: opts.articleId ?? null,
    bgDataUrl, // null이면 렌더러가 팔레트 코드 폴백 배경 사용
    bgWash: opts.bgWash,
    fontTitle: opts.fontTitle,
    centerCopy: opts.centerCopy,
  };
  const png = await renderThumbnail(input);
  return { png, usedAiBackground };
}
