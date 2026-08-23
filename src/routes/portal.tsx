import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/portal")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
  head: () => ({
    meta: [
      { title: "Modül Portalı — Bilirim ERP" },
      {
        name: "description",
        content:
          "Bilirim ERP modül portalı: muhasebe, POS, adisyon, teknik servis ve PDKS modüllerine tek noktadan geçiş.",
      },
      { property: "og:title", content: "Modül Portalı — Bilirim ERP" },
      {
        property: "og:description",
        content: "Aktif ve kilitli modüllerinizi tek ekrandan yönetin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
