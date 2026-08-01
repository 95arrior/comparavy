import { visualIdentityFor, PALETTES } from "./visualIdentity";
import { renderThumbnail, type ThumbInput } from "./thumbnailRenderer";
import { generateThumbBackground, generateTextlessThumb, imageReady } from "./geminiImage";
import { verifyImage, verifyThumbLegible } from "./imageVerify";
import { manualShotBrief, subjectFromTitle } from "./thumbSubject";
import type { ThumbCopy } from "./amplifyTopics";

// ★대표이미지 합성 통합 진입점 — 이미지 생성 라우트가 이 함수를 부른다.
//  순서: AI 배경 생성(→텍스트 비전 검증) → 실패/텍스트검출 시 코드 폴백 배경 → satori로 한글 합성.
//  어떤 단계가 실패해도 항상 PNG를 반환한다(발행이 막히지 않는다).
/** 팔레트 배경이 어두운가 — 렌더러 isDark와 같은 기준(상대 휘도). */
function isDarkPalette(hex: string): boolean {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

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
  press?: { brandName: string }; // 보도형(뉴스룸 문법) — photo 배경 디폴트
  /** ★유저 업로드 배경(2026-07-10) — 있으면 AI 생성 없이 이 이미지 위에 텍스트만 조판(무료) */
  customBgDataUrl?: string | null;
  variant?: number; // 재생성 회차 — 장면 각도 로테이션(같은 소재 반복 금지)
  /** 주제 힌트(글 제목) — 배경 오브젝트가 주제를 그리게(추상 blob 금지 판정) */
  topicHint?: string;
  /** ★무문구 모드(2026-08-02 유저 확정) — 조판 없이 이미지 한 장이 곧 썸네일. 홈판 유형 키를 함께 준다. */
  textless?: { betType: string };
}): Promise<{ png: Buffer; usedAiBackground: boolean; aiFailReason?: string; textlessImage?: { base64: string; mime: string }; manualBrief?: string }> {
  const base = visualIdentityFor(opts.userId); // ★프로덕션 경로: 실제 user.id → 유저 고정 정체성
  const pal = opts.paletteName ? PALETTES.find((x) => x.name === opts.paletteName) : null;
  let identity = pal ? { ...base, palette: pal } : base;
  let aiFailReason: string | undefined;
  // ★무문구 경로(2026-08-02) — 조판을 얹지 않고 이미지 한 장을 그대로 돌려준다.
  //  유저 확정 운영 방식: "AI로 먼저 뽑고 안 되면 직접 찍을게요" → AI 2회 시도, 실패하면 촬영 주문서를 준다.
  //  ★두 관문을 다 통과해야 한다: ①글자 없음(fail-closed — 예외 조항 금지) ②작게 줄여도 판독됨(fail-open).
  if (opts.textless && imageReady()) {
    // ★제목에서 소재를 뽑는다(2026-08-02) — 유형 고정 소재는 제목과 무관한 그림을 만든다. 실패하면 유형 폴백.
    const subject = await subjectFromTitle(opts.topicHint ?? "", opts.textless.betType);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const img = await generateTextlessThumb(opts.textless.betType, opts.userId, (opts.variant ?? 0) + attempt * 7, subject, opts.topicHint);
        const v = await verifyImage(img.base64, img.mime, "textless still life", { bgOnly: true, userId: opts.userId, strict: true });
        if (v.hasText) { aiFailReason = "이미지에 글자가 섞였어요"; continue; }
        const leg = await verifyThumbLegible(img.base64, img.mime, { userId: opts.userId });
        if (!leg.ok) {
          aiFailReason = !leg.single ? "피사체가 여러 개예요(작게 줄이면 뭉개져요)"
            : !leg.nameable ? "무엇인지 한 단어로 안 나와요(실루엣이 뭉뚱그려져요)"
            : "작게 줄이면 뭘 찍었는지 안 보여요";
          continue;
        }
        return { png: Buffer.from(img.base64, "base64"), usedAiBackground: true, textlessImage: { base64: img.base64, mime: img.mime } };
      } catch (e) { aiFailReason = `이미지 생성 실패: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`; }
    }
    // ★AI 2회 실패 — 직접 찍기로 넘긴다. 억지로 조판 카드를 내보내지 않는다(무문구를 고른 이유가 사라진다).
    console.log(`[textless] ${opts.textless.betType} — AI 2회 실패(${aiFailReason}), 촬영 주문서로 전환`);
    return { png: Buffer.alloc(0), usedAiBackground: false, aiFailReason, manualBrief: manualShotBrief(opts.textless.betType, opts.userId, opts.topicHint) };
  }

  let bgDataUrl: string | null = opts.customBgDataUrl ?? null; // 유저 배경 우선 — AI 호출 없음
  let usedAiBackground = false;
  if (!bgDataUrl && opts.useAiBackground !== false && imageReady()) {
    // ★속도 우선(실측: 제작 시간 급증 — 재시도 루프가 AI 왕복 4회까지) — 1회 생성, 보도형(press)은 검증 스킵
    //  (press는 하단 다크 그라데이션+대형 카피가 배경을 덮어 배경 소글자 리스크가 낮다. Gemini는 텍스트 금지 준수율도 높음)
    try {
      const paletteHint = `${identity.palette.name.replace(/-/g, " ")}`;
      const bg = await generateThumbBackground(identity.bgStyle, paletteHint, opts.userId, opts.topicHint, { forceStyle: opts.bgStyle, centerText: opts.centerCopy, copyText: opts.thumb.mainCopy, variant: opts.variant });
      // ★press 예외 삭제(2026-07-31 4회차 사고) — "하단 그라데이션이 덮으니 리스크가 낮다"는 이유로
      //  보도형만 검증을 건너뛰고 있었다. 글자 금지에는 예외 조항을 두지 않는다(유저 확정 규칙).
      //  strict — 판정 불가(오류·파싱 실패·키 없음)면 떨어뜨린다. 배경은 코드 폴백이 있어 잃는 게 없다.
      const v = await verifyImage(bg.base64, bg.mime, "abstract background", { bgOnly: true, userId: opts.userId, strict: true });
      if (!v.hasText) { bgDataUrl = `data:${bg.mime};base64,${bg.base64}`; usedAiBackground = true; }
      else {
        // ★1회 재시도(2026-08-01 유저 실측: "썸네일 제작이 잘 안 되네요" — 1회 생성 후 바로 폴백이었다).
        //  같은 프롬프트로 또 부르면 같은 이유로 또 실패한다. 글자가 존재할 수 없는 소재로만 다시 그린다
        //  (증서·장부·청구서처럼 글자가 본질인 물건을 범주째 빼는 모드). WP 경로엔 이미 재시도가 있었다.
        //  총 왕복 2회 — 종전 4회 루프를 되살리지 않으면서 성공률만 올린다.
        const bg2 = await generateThumbBackground(identity.bgStyle, paletteHint, opts.userId, opts.topicHint, { forceStyle: opts.bgStyle, centerText: opts.centerCopy, copyText: opts.thumb.mainCopy, variant: (opts.variant ?? 0) + 13, textSafe: true });
        const v2 = await verifyImage(bg2.base64, bg2.mime, "abstract background", { bgOnly: true, userId: opts.userId, strict: true });
        if (!v2.hasText) { bgDataUrl = `data:${bg2.mime};base64,${bg2.base64}`; usedAiBackground = true; }
        else aiFailReason = "배경에 글자가 섞였어요(2회 시도)";
      }
    } catch (e) { aiFailReason = `배경 생성 실패: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`; }
  }

  // ★AI 배경을 쓸 땐 팔레트를 어두운 것으로 맞춘다(2026-08-01 실측).
  //  렌더러는 글자색·스크림을 '실제 이미지'가 아니라 '팔레트 bg 밝기'로 정한다(isDark(p.bg)).
  //  AI 배경은 딥톤(THUMB_PALETTES)으로 만드는데 팔레트가 밝으면 어두운 글씨를 골라, 어두운 그림 위에
  //  어두운 글씨가 얹혀 안 읽힌다(실물: 딥틸 배경 + 검은 글씨가 밝은 전구에 겹침).
  //  ★텍스트 규격(폰트·크기·위치)은 건드리지 않는다 — 팔레트는 배경 속성이고, 글자색은 기존 로직이 알아서 따라온다.
  if (usedAiBackground) {
    const DARK_FOR_AI = ["navy-sky", "charcoal-gold", "slate-mint", "graphite-coral", "wine-blush"];
    if (!isDarkPalette(identity.palette.bg)) {
      // 유저 고정 정체성은 유지하되(시드로 고르므로 같은 유저는 늘 같은 어두운 팔레트) 밝기만 뒤집는다.
      let h = 0; for (const c of opts.userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const darkName = DARK_FOR_AI[h % DARK_FOR_AI.length]!;
      const darkPal = PALETTES.find((x) => x.name === darkName);
      if (darkPal) identity = { ...identity, palette: darkPal };
    }
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
    press: opts.press,
  };
  const png = await renderThumbnail(input);
  return { png, usedAiBackground, aiFailReason };
}
