import type { NextConfig } from "next";

const legacyHosts = ["comparavy.com", "www.comparavy.com", "www.ateflo.com"];

const nextConfig: NextConfig = {
  // ★네이티브 모듈은 번들하지 않고 런타임에 node_modules에서 로드(Turbopack이 .node 바이너리를 못 싸는 문제).
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // ★satori 한글 폰트(assets/fonts)를 이미지 라우트 서버리스 번들에 포함(fs.readFileSync가 Vercel에서 파일을 찾게).
  outputFileTracingIncludes: {
    "/api/admin/thumb-test": ["./assets/fonts/**"],
    "/api/images/generate": ["./assets/fonts/**"],
  },
  async redirects() {
    return legacyHosts.map((host) => ({
      source: "/:path*",
      has: [
        {
          type: "host",
          value: host,
        },
      ],
      destination: "https://ateflo.com/:path*",
      permanent: true,
    }));
  },
};

export default nextConfig;
