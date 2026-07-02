"use client";

// 네이버 블로그 '앱 우선' 열기 — 공용 헬퍼(발행 위저드·온보딩 검색허용).
//  안드로이드: intent 링크 → 앱 있으면 앱, 없으면 Play 스토어 자동 폴백(크롬 보장 동작)
//  iOS: 앱 스킴(naverblog://) 시도 → 2초 내 앱 전환이 없으면 App Store
//  데스크톱: 웹 새 탭
// 한계(정직): 앱 딥링크 경로가 비공개라 iOS는 '앱 홈'까지 — 글쓰기(연필)는 한 탭.

const APPSTORE = "https://apps.apple.com/kr/app/id328813873";
const PLAYSTORE = "https://play.google.com/store/apps/details?id=com.nhn.android.blog";

export function openNaverBlogApp(opts: { webPath?: string; desktopUrl?: string } = {}): "android" | "ios" | "desktop" {
  const ua = navigator.userAgent;
  const webPath = opts.webPath ?? "";
  if (/Android/i.test(ua)) {
    window.location.href = `intent://blog.naver.com/${webPath}#Intent;scheme=https;package=com.nhn.android.blog;S.browser_fallback_url=${encodeURIComponent(PLAYSTORE)};end`;
    return "android";
  }
  if (/iPhone|iPad|iPod/.test(ua)) {
    const timer = setTimeout(() => {
      if (!document.hidden) window.location.href = APPSTORE;
    }, 2000);
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(timer); }, { once: true });
    window.location.href = "naverblog://";
    return "ios";
  }
  window.open(opts.desktopUrl ?? `https://blog.naver.com/${webPath}`, "_blank", "noopener");
  return "desktop";
}
