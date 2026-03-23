import type { CollectionEntry } from "astro:content";

export const locales = ["en", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function assertLocale(value: string): Locale {
  if (!isLocale(value)) {
    throw new Error(`Unsupported locale: ${value}`);
  }

  return value;
}

export function getLocalizedPath(locale: Locale, path = "") {
  const normalizedPath = path.replace(/^\/+|\/+$/g, "");
  return normalizedPath ? `/${locale}/${normalizedPath}` : `/${locale}`;
}

export function getDateLocale(locale: Locale) {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

type Messages = {
  localeLabel: string;
  home: {
    title: string;
    intro: string;
    contentCta: string;
    featuredProjects: string;
    projects: {
      index: string;
      name: string;
      label: string;
      summary: string;
      technologies: string[];
      href: string;
    }[];
  };
  content: {
    title: string;
    pageTitle: string;
    pageDescription: string;
    back: string;
    allPosts: string;
    empty: string;
    blogPostsAriaLabel: string;
  };
  telemetry: {
    debug: string;
    togglePathDebug: string;
    stats: string;
    on: string;
    off: string;
    release: string;
    open: string;
    profile: string;
    you: string;
    codexUsage: string;
    tokensToday: (value: string) => string;
    awaitingSync: string;
    total30d: string;
    updated: string;
    commits: string;
    commitsToday: (value: string) => string;
    month: string;
    year: string;
    system: string;
    cpu: (value: string) => string;
    mem: (value: string) => string;
    battery: string;
    uptime: string;
    uptimeSince: (percent: string, startDate: string) => string;
    uptimeOnly: (percent: string) => string;
    noData: string;
    day: string;
    days: string;
    window: string;
    version: string;
    websocket: string;
    connectedNow: (value: string) => string;
    connected: string;
    peak: string;
    users: (value: string) => string;
    userCount: (value: string, count: number) => string;
    nowPlaying: string;
    nothingPlaying: string;
    noArtist: string;
    previously: (track: string, artist: string) => string;
    track: string;
    artist: string;
  };
};

const messages: Record<Locale, Messages> = {
  en: {
    localeLabel: "English",
    home: {
      title: "Erick Reis | Portfolio",
      intro:
        "TypeScript engineer building React and Next.js products, microfrontends, and realtime applications.",
      contentCta: "Content",
      featuredProjects: "Featured projects",
      projects: [
        {
          index: "01",
          name: "glim-node",
          label: "Toolkit / Backend",
          summary: "Type-safe tooling for Node.js services.",
          technologies: ["TypeScript", "Hono", "Node.js", "CLI"],
          href: "https://github.com/ErickCReis/glim-node",
        },
        {
          index: "02",
          name: "local-box",
          label: "Product / Infra",
          summary: "Self-hosted file sharing and sync experiments.",
          technologies: ["TypeScript", "React", "TanStack Start", "Convex"],
          href: "https://github.com/ErickCReis/local-box",
        },
        {
          index: "03",
          name: "car-league",
          label: "Game / Multiplayer",
          summary: "A multiplayer game built around realtime interactions.",
          technologies: ["TypeScript", "React", "Three.js", "Cloudflare"],
          href: "https://github.com/ErickCReis/car-league",
        },
        {
          index: "04",
          name: "tabnews",
          label: "Contributions",
          summary: "Open source issues and improvements across frontend, backend and tooling.",
          technologies: ["Next.js", "React", "Node.js"],
          href: "https://github.com/filipedeschamps/tabnews.com.br/issues?q=author%3AErickCReis",
        },
      ],
    },
    content: {
      title: "Content",
      pageTitle: "Content | Erick Reis",
      pageDescription:
        "Notes on frontend engineering, systems work, and the decisions behind the build.",
      back: "Back",
      allPosts: "All posts",
      empty: "No posts published yet.",
      blogPostsAriaLabel: "Blog posts",
    },
    telemetry: {
      debug: "Debug",
      togglePathDebug: "Toggle path debug",
      stats: "Stats",
      on: "On",
      off: "Off",
      release: "Release",
      open: "Open",
      profile: "Profile",
      you: "you",
      codexUsage: "Codex Usage",
      tokensToday: (value) => `${value} tokens today`,
      awaitingSync: "Awaiting sync",
      total30d: "30d total",
      updated: "Updated",
      commits: "Commits",
      commitsToday: (value) => `${value} commits today`,
      month: "Month",
      year: "Year",
      system: "System",
      cpu: (value) => `CPU ${value}`,
      mem: (value) => `Mem ${value}`,
      battery: "Battery",
      uptime: "Uptime",
      uptimeSince: (percent, startDate) => `${percent} uptime since ${startDate}`,
      uptimeOnly: (percent) => `${percent} uptime`,
      noData: "No data",
      day: "day",
      days: "days",
      window: "Window",
      version: "Version",
      websocket: "WebSocket",
      connectedNow: (value) => `${value} connected now`,
      connected: "Connected",
      peak: "Peak",
      users: (value) => `${value} users`,
      userCount: (value, count) => `${value} user${count === 1 ? "" : "s"}`,
      nowPlaying: "Now Playing",
      nothingPlaying: "Nothing playing",
      noArtist: "No artist",
      previously: (track, artist) => `Previously: ${track} - ${artist}`,
      track: "Track",
      artist: "Artist",
    },
  },
  "pt-BR": {
    localeLabel: "Português (Brasil)",
    home: {
      title: "Erick Reis | Portfólio",
      intro:
        "Engenheiro TypeScript construindo produtos em React e Next.js, microfrontends e aplicações em tempo real.",
      contentCta: "Conteúdo",
      featuredProjects: "Projetos em destaque",
      projects: [
        {
          index: "01",
          name: "glim-node",
          label: "Toolkit / Backend",
          summary: "Ferramentas type-safe para serviços Node.js.",
          technologies: ["TypeScript", "Hono", "Node.js", "CLI"],
          href: "https://github.com/ErickCReis/glim-node",
        },
        {
          index: "02",
          name: "local-box",
          label: "Produto / Infra",
          summary: "Experimentos de compartilhamento e sincronização self-hosted.",
          technologies: ["TypeScript", "React", "TanStack Start", "Convex"],
          href: "https://github.com/ErickCReis/local-box",
        },
        {
          index: "03",
          name: "car-league",
          label: "Jogo / Multiplayer",
          summary: "Um jogo multiplayer construído em torno de interações em tempo real.",
          technologies: ["TypeScript", "React", "Three.js", "Cloudflare"],
          href: "https://github.com/ErickCReis/car-league",
        },
        {
          index: "04",
          name: "tabnews",
          label: "Contribuições",
          summary: "Issues e melhorias open source em frontend, backend e tooling.",
          technologies: ["Next.js", "React", "Node.js"],
          href: "https://github.com/filipedeschamps/tabnews.com.br/issues?q=author%3AErickCReis",
        },
      ],
    },
    content: {
      title: "Conteúdo",
      pageTitle: "Conteúdo | Erick Reis",
      pageDescription:
        "Notas sobre engenharia frontend, sistemas e as decisões por trás da construção do site.",
      back: "Voltar",
      allPosts: "Todos os posts",
      empty: "Nenhum post publicado ainda.",
      blogPostsAriaLabel: "Posts do blog",
    },
    telemetry: {
      debug: "Debug",
      togglePathDebug: "Alternar debug dos caminhos",
      stats: "Stats",
      on: "Ligado",
      off: "Desligado",
      release: "Soltar",
      open: "Abrir",
      profile: "Perfil",
      you: "você",
      codexUsage: "Uso do Codex",
      tokensToday: (value) => `${value} tokens hoje`,
      awaitingSync: "Aguardando sync",
      total30d: "Total 30d",
      updated: "Atualizado",
      commits: "Commits",
      commitsToday: (value) => `${value} commits hoje`,
      month: "Mês",
      year: "Ano",
      system: "Sistema",
      cpu: (value) => `CPU ${value}`,
      mem: (value) => `Mem ${value}`,
      battery: "Bateria",
      uptime: "Uptime",
      uptimeSince: (percent, startDate) => `${percent} de uptime desde ${startDate}`,
      uptimeOnly: (percent) => `${percent} de uptime`,
      noData: "Sem dados",
      day: "dia",
      days: "dias",
      window: "Janela",
      version: "Versão",
      websocket: "WebSocket",
      connectedNow: (value) => `${value} conectados agora`,
      connected: "Conectado",
      peak: "Pico",
      users: (value) => `${value} usuários`,
      userCount: (value, count) => `${value} ${count === 1 ? "usuário" : "usuários"}`,
      nowPlaying: "Tocando agora",
      nothingPlaying: "Nada tocando",
      noArtist: "Sem artista",
      previously: (track, artist) => `Anterior: ${track} - ${artist}`,
      track: "Faixa",
      artist: "Artista",
    },
  },
};

export function getMessages(locale: Locale) {
  return messages[locale];
}

export type BlogEntry = CollectionEntry<"blog">;

export function getEntryLocale(entry: BlogEntry): Locale {
  const [segment] = entry.id.split("/");
  return segment && isLocale(segment) ? segment : defaultLocale;
}

export function getEntrySlug(entry: BlogEntry) {
  const segments = entry.id.split("/");
  return segments[0] && isLocale(segments[0]) ? segments.slice(1).join("/") : entry.id;
}
