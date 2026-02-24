import { HomePageFallback } from "@/features/home/components/home-page-fallback";
import { HomePageLoader } from "@/features/home/home-page";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";

export function mountHomePage() {
  const app = document.getElementById("app");
  if (!app) {
    return;
  }

  createRoot(app).render(
    <Suspense fallback={<HomePageFallback />}>
      <HomePageLoader />
    </Suspense>,
  );
}
