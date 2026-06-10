/**
 * 인스타그램 자동 발행 CLI.
 *
 * 사전: .env.local 에
 *   IG_USER_ID=...        (인스타 비즈니스 계정 숫자 ID)
 *   IG_ACCESS_TOKEN=...   (장기 액세스 토큰)
 *
 * 사용:
 *   npm run ig:verify
 *   npm run ig:publish -- reel   "<영상 URL>"  "<캡션>"  ["<커버 URL>"]
 *   npm run ig:publish -- image  "<이미지 URL>" "<캡션>"
 *   npm run ig:publish -- carousel "<url1,url2,url3>" "<캡션>"
 *
 * (미디어 URL은 인스타가 가져갈 수 있는 공개 URL이어야 함 — Supabase Storage 등)
 */
import { publishReel, publishImage, publishCarousel, verifyIg, type IgCreds } from "../lib/instagram";

function creds(): IgCreds {
  const igUserId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !token) {
    console.error("❌ .env.local 에 IG_USER_ID, IG_ACCESS_TOKEN 을 먼저 넣어주세요.");
    process.exit(1);
  }
  return { igUserId, token };
}

async function main() {
  const [cmd, a1, a2, a3] = process.argv.slice(2);

  if (cmd === "verify" || !cmd) {
    const r = await verifyIg(creds());
    console.log(r.ok ? `✅ 연결됨: @${r.username}` : `❌ ${r.error}`);
    return;
  }

  if (cmd === "reel") {
    if (!a1 || !a2) return console.error("사용: reel <영상 URL> <캡션> [커버 URL]");
    console.log("⏳ 릴스 업로드 중… (영상 인코딩에 몇 분 걸릴 수 있어요)");
    const id = await publishReel(creds(), a1, a2, a3);
    console.log(`✅ 릴스 발행 완료! 미디어 ID: ${id}`);
    return;
  }

  if (cmd === "image") {
    if (!a1 || !a2) return console.error("사용: image <이미지 URL> <캡션>");
    const id = await publishImage(creds(), a1, a2);
    console.log(`✅ 이미지 발행 완료! 미디어 ID: ${id}`);
    return;
  }

  if (cmd === "carousel") {
    if (!a1 || !a2) return console.error("사용: carousel <url1,url2,...> <캡션>");
    const urls = a1.split(",").map((s) => s.trim()).filter(Boolean);
    const id = await publishCarousel(creds(), urls, a2);
    console.log(`✅ 캐러셀 발행 완료! 미디어 ID: ${id}`);
    return;
  }

  console.error("알 수 없는 명령. verify | reel | image | carousel");
  process.exit(1);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
