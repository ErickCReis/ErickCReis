import { HomePage } from "@/features/home/home-page";
import { createRoot } from "react-dom/client";

import "./site.css";

const app = document.getElementById("app");
if (app) {
  createRoot(app).render(<HomePage />);
}
