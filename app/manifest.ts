import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "issnuta",
    short_name: "issnuta",
    description: "오프라인 대응 텍스트 번역(PWA)",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111827",
    lang: "ko-KR",
    dir: "ltr",
    icons: [
      {
        src: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["productivity", "utilities"],
    shortcuts: [
      {
        name: "번역 열기",
        url: "/",
        description: "텍스트 번역 화면으로 이동",
      },
    ],
  };
}

