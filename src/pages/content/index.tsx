import { ContentPage } from "@/features/content/content-page";
import { createRoot } from "react-dom/client";

import "../site.css";

const app = document.getElementById("app");
if (app) {
  createRoot(app).render(<ContentPage />);
}
