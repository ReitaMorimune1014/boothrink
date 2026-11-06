import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Next.js は public/ の中の index.html を自動で開かないため、
        // /garapon や /garapon/ で開くと 404 になる。そこで index.html へ移動させる。
        // Why: 書き換え（rewrite）ではなく移動（redirect）にしたのは、URL が /garapon のままだと
        //      HTML 内の相対パス（style.css や images/...）が /style.css として読まれ、壊れるため。
        source: "/garapon",
        destination: "/garapon/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
