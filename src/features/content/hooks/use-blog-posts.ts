import { getBlogPosts, type BlogPost } from "@/lib/eden";
import { useEffect, useState } from "react";

export function useBlogPosts() {
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

  return posts;
}
