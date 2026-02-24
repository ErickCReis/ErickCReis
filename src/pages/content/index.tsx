import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBlogPosts, type BlogPost } from "@/lib/eden";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "../site.css";

const fallbackItems = [
  "Realtime cursor experiments",
  "Fast backend with Elysia",
  "Minimal interface systems",
  "Small workflow automation tips",
  "Infrastructure and VPS setup logs",
];

function ContentPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    let mounted = true;

    getBlogPosts()
      .then((items) => {
        if (!mounted) {
          return;
        }

        setPosts(items);
      })
      .catch(() => {
        if (mounted) {
          setPosts([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const items = posts.length > 0 ? posts.map((post) => post.title) : fallbackItems;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12 md:px-8">
      <Card className="w-full border-border/70 bg-card/60 backdrop-blur">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit rounded-full border-border/70 bg-card/60 px-3 py-1 font-mono tracking-[0.22em] uppercase">
            Content
          </Badge>
          <CardTitle className="font-serif text-4xl tracking-wide md:text-5xl">Simple List</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground md:text-base">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

const app = document.getElementById("app");
if (app) {
  createRoot(app).render(<ContentPage />);
}
