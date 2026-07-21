import type { TranslationOverrides } from "./en-US";

const translations = {
  // 30d total
  "1o0l958": "Total 30d",
  // A multiplayer game built around realtime interactions.
  "0rou759": "Um jogo multiplayer construído em torno de interações em tempo real.",
  // All posts
  "0xp6dcf": "Todos os posts",
  // Artist
  "156yubi": "Artista",
  // Awaiting sync
  "0iotvie": "Aguardando sync",
  // Back
  "1hzmxtu": "Voltar",
  // Battery
  "10mxooe": "Bateria",
  // Blog posts
  "19dpkpu": "Posts do blog",
  // Token Usage
  "17ay5xd": "Uso de Tokens",
  // commits today
  "13e5i5c": "commits hoje",
  // Connected
  "0ye8ewg": "Conectado",
  // connected now
  "0imz3wo": "conectados agora",
  // Content
  "1hnv6ua": "Conteúdo",
  // Content | Erick Reis
  "10g91fz": "Conteúdo | Erick Reis",
  // Contributions
  "1nr0s8k": "Contribuições",
  // d ago
  "074rpeu": "d atrás",
  // day
  "1rciku5": "dia",
  // days
  "1wewy2y": "dias",
  // Erick Reis | Portfolio
  "130gzgw": "Erick Reis | Portfólio",
  // Featured projects
  "13tf5nf": "Projetos em destaque",
  // Game / Multiplayer
  "15joedm": "Jogo / Multiplayer",
  // Locales
  "0oma6j0": "Idiomas",
  // Month
  "1aqporp": "Mês",
  // No artist
  "0mpe37l": "Sem artista",
  // No commits
  "1khorbs": "Sem commits",
  // No data
  "0y1y3f2": "Sem dados",
  // No posts published yet.
  "11cv0id": "Nenhum post publicado ainda.",
  // no uptime data
  "0qeh3am": "sem dados de uptime",
  // Notes on frontend engineering, systems work, and the decisions behind the build.
  "0a3w29t":
    "Notas sobre engenharia frontend, sistemas e as decisões por trás da construção do site.",
  // Nothing playing
  "0vgq4zc": "Nada tocando",
  // Now Playing
  "16bpipx": "Tocando agora",
  // Off
  "03tlu3u": "Desligado",
  // On
  "0qvtz3k": "Ligado",
  // Open
  "0n6hn1l": "Abrir",
  // Open source issues and improvements across frontend, backend and tooling.
  "1x8iqx0": "Issues e melhorias open source em frontend, backend e tooling.",
  // Peak
  "08bmotu": "Pico",
  // Previously
  "1o8gs3z": "Anterior",
  // Product / Infra
  "1m9pnb7": "Produto / Infra",
  // Recent
  "0mg65fi": "Recente",
  // Release
  "0u9yqe6": "Soltar",
  // Self-hosted file sharing and sync experiments.
  "19rik5b": "Experimentos de compartilhamento e sincronização self-hosted.",
  // Stats
  "04f26x8": "Stats",
  // System
  "13qbhrw": "Sistema",
  // Today
  "1sawk0u": "Hoje",
  // Toggle path debug
  "0owbv33": "Alternar debug dos caminhos",
  // tokens today
  "0c2pi76": "tokens hoje",
  // Toolkit / Backend
  "1ul8gto": "Ferramentas / Backend",
  // Track
  "095ckws": "Faixa",
  // Type-safe tooling for Node.js services.
  "0iia6gv": "Ferramentas type-safe para serviços Node.js.",
  // TypeScript engineer building React and Next.js products, microfrontends, and realtime applications.
  "0rynbnf":
    "Engenheiro TypeScript construindo produtos em React e Next.js, microfrontends e aplicações em tempo real.",
  // Unknown artist
  "0lmfm5w": "Artista desconhecido",
  // Updated
  "0miz9ao": "Atualizado",
  // uptime
  "1y4vs9l": "uptime",
  // Uptime
  "0ijqnzt": "Uptime",
  // user
  "0qrm3n6": "usuário",
  // users
  "0q7t3bn": "usuários",
  // Version
  "0q0zd4n": "Versão",
  // view
  "1oxysc8": "visualização",
  // views
  "0m3uvo1": "visualizações",
  // WebSocket
  "1c3f0mo": "Presença ao vivo",
  // Window
  "1s8mpdp": "Janela",
  // Year
  "05xgri4": "Ano",
  // Yesterday
  "14z5arr": "Ontem",
  // you
  "0meb4bg": "você",
  // Available tags
  "0tregpd": "Tags disponíveis",
  // No posts found for this tag.
  "1y72wx0": "Nenhum post encontrado para esta tag.",
  // Tags
  "0wy2g8w": "Tags",
  // {count} changes waiting
  "0gx3p76": "{count} mudanças aguardando",
  // {count} events emitted
  "1qdbs0p": "{count} eventos emitidos",
  // {count} intermediate versions skipped
  "1id03dy": "{count} versões intermediárias ignoradas",
  // {count} stale sources are hidden by the fresh aggregate flag.
  "0w8uc9o": "{count} origens antigas ficam ocultas pelo estado atual do conjunto.",
  // {key} was {action}.
  "0vir2ht": "{key}: {action}.",
  // /app/data
  "0h3gui6": "/app/data",
  // + asset
  "0xkidx6": "+ asset",
  // + HTML page
  "0otjna2": "+ página HTML",
  // +1
  "06wbfgh": "+1",
  // +25h
  "0yo83ul": "+25h",
  // 1 change waiting
  "1b90c43": "1 mudança aguardando",
  // 1 event emitted
  "1g7gmyo": "1 evento emitido",
  // 1 intermediate version skipped
  "0zo6h79": "1 versão intermediária ignorada",
  // 1 stale source is hidden by the fresh aggregate flag.
  "1br4rqf": "1 origem antiga fica oculta pelo estado atual do conjunto.",
  // 24h token
  "0sj0ks0": "token de 24h",
  // 429
  "19tu4lq": "429",
  // active
  "1oc52r3": "ativo",
  // add source
  "09uy9ih": "somar origem",
  // after sync
  "17hyj30": "após o sync",
  // age
  "0ca1uak": "idade",
  // allowance
  "1ojr0ut": "capacidade",
  // apply sync
  "0b4w0ke": "aplicar sync",
  // article HTML
  "0r6d3di": "HTML do artigo",
  // Astro + island
  "1jp3vbq": "Astro + ilha",
  // available
  "0skramw": "disponível",
  // both publish one normalized snapshot to the shared stream
  "1lxhxv3": "os dois publicam um retrato normalizado no fluxo compartilhado",
  // browser
  "0215wnj": "navegador",
  // build
  "1i9vvkz": "build",
  // Build-time static route compiler
  "18fcj7n": "Compilador de rotas estáticas em tempo de build",
  // Bun process: up 7d
  "1fzlizj": "Processo Bun: ativo há 7d",
  // bundle
  "051esxx": "bundle",
  // cache
  "0an863p": "cache",
  // cache age
  "1ikh5c6": "idade do cache",
  // cache expired · fetch a new 30-day window
  "0pkmbto": "cache expirado · buscar outra janela de 30 dias",
  // Can a visitor reach the public route?
  "06dusc9": "Um visitante alcança a rota pública?",
  // Can the container read the laptop battery?
  "1m23kn6": "O container consegue ler a bateria do notebook?",
  // catalog
  "0wqatco": "catálogo",
  // cgroup
  "1ke9h7p": "cgroup",
  // Change a source, then check its version.
  "1dxma0o": "Mude uma fonte e depois verifique sua versão.",
  // check versions
  "19b8mdo": "verificar versões",
  // Choose a browser and read the article.
  "0zq8qy7": "Escolha um navegador e leia o artigo.",
  // Choose a route.
  "08gqu64": "Escolha uma rota.",
  // client-owned
  "1tz30hu": "controlado pelo cliente",
  // cloudflared
  "0e5ohni": "cloudflared",
  // collect
  "13obqcx": "coleta",
  // collectors
  "08cadm9": "coletores",
  // container
  "13b9w1k": "container",
  // CPU
  "0gorp9l": "CPU",
  // CPU time
  "0zo0daa": "tempo de CPU",
  // Cursor protocol workbench
  "19p5dqw": "Bancada do protocolo de cursores",
  // deploy next
  "0ltqplj": "novo deploy",
  // document waiting for JavaScript
  "1xp33vr": "documento aguardando JavaScript",
  // Dokploy
  "0ann3jt": "Dokploy",
  // down
  "0h4k3yt": "fora do ar",
  // drag or use arrow keys
  "0naaqvu": "arraste ou use as setas",
  // duplicate /about owner
  "1u9l9q3": "proprietário duplicado em /about",
  // expired
  "0eazr5e": "vencido",
  // fresh
  "1c1n0vj": "atual",
  // Fresh connection replayed every current snapshot.
  "1eaecy1": "A nova conexão repetiu todos os retratos atuais.",
  // GitHub
  "1dfs3xu": "GitHub",
  // healthy
  "0ocgeo2": "funcionando",
  // hidden
  "1wa75fd": "oculta",
  // honor Retry-After · try again in 42s
  "1akkeia": "respeitar Retry-After · tentar em 42s",
  // host
  "1ctymwf": "host",
  // How close is the container to its memory limit?
  "0wsco0n": "Quão perto o container está do limite de memória?",
  // How much of Bun's allotted CPU is busy?
  "0cxfd5b": "Quanto da CPU atribuída ao Bun está ocupada?",
  // ID match
  "03ulev5": "IDs iguais",
  // idle
  "1i3vd77": "parado",
  // Interactive 24-hour view deduplication transaction
  "0lsdk5o": "Transação interativa de deduplicação de visualizações por 24 horas",
  // Interactive translation catalog workbench
  "1mtzj9i": "Bancada interativa do catálogo de traduções",
  // Interactive version-gated SSE pipeline
  "0q8866s": "Pipeline SSE interativo com controle por versão",
  // island absent
  "194imw1": "ilha ausente",
  // Island boundary failure lab
  "1npktkj": "Laboratório de falhas na fronteira da ilha",
  // JavaScript renders the document and live layer.
  "0a4xm5v": "O JavaScript renderiza o documento e a camada ao vivo.",
  // join
  "1jt36gp": "entrada",
  // laptop
  "0pf4pbh": "notebook",
  // limit
  "0e3z3uc": "limite",
  // literal
  "1tol884": "literal",
  // memory charged
  "0899wfe": "memória contabilizada",
  // Move the local cursor
  "0inxtc2": "Mova o cursor local",
  // new connection
  "16qncvn": "nova conexão",
  // new token
  "0bbwd7k": "novo token",
  // next
  "0pq32lk": "próximo passo",
  // next track
  "1lcqj3z": "próxima faixa",
  // No binary is emitted until every route has one owner.
  "19ii4h6": "Nenhum binário é emitido enquanto uma rota tiver mais de um proprietário.",
  // no JavaScript
  "0yr7h91": "sem JavaScript",
  // No newer versions to emit.
  "1vc1f9y": "Nenhuma versão nova para emitir.",
  // No override was bundled, so Portuguese falls back to English.
  "070b8x2": "Nenhum override foi incluído, então o português usa o inglês como fallback.",
  // no stream
  "1oe5fqm": "sem fluxo",
  // not Bun heap or free host RAM
  "1xt9dk0": "não é o heap do Bun nem a RAM livre do host",
  // not checked
  "1xq10kv": "não consultado",
  // not total laptop CPU
  "0r9k5l2": "não é a CPU total do notebook",
  // Nothing can render without JavaScript.
  "0i0pa7r": "Nada pode ser renderizado sem JavaScript.",
  // One laptop, two paths
  "085ipoh": "Um notebook, dois caminhos",
  // only the hardware deliberately mounted
  "1ucl52g": "somente o hardware montado de propósito",
  // outside
  "1i9dl1g": "externo",
  // passed
  "0mjgec9": "liberado",
  // passes
  "0r99n4s": "aprovado",
  // peer
  "1f2qvd5": "par",
  // playing
  "0vm2bed": "tocando",
  // poll in 15s · publish an empty playback state
  "0kvunyo": "consultar em 15s · publicar reprodução vazia",
  // poll in 2.5s · keep 84 snapshots in memory
  "1jgy01w": "consultar em 2,5s · manter 84 retratos na memória",
  // power_supply mount
  "1d5wkdp": "montagem power_supply",
  // preview
  "0ksxopj": "prévia",
  // private sources
  "1342s1i": "origens privadas",
  // process
  "17jcdbu": "processo",
  // provider
  "1ezgf5o": "provedor",
  // pt-BR override
  "0ait2eo": "override pt-BR",
  // Public output keeps provider totals; source IDs and sessions stay private.
  "0vmshtb": "A saída pública mantém totais por provedor; IDs e sessões ficam privados.",
  // public route
  "1ae88vh": "rota pública",
  // rate limited · retry after reset (15 min fallback)
  "0lscwjw": "limite atingido · tentar após a renovação (padrão de 15 min)",
  // reachability, not the failing internal layer
  "10n8v6s": "acessibilidade, não qual camada interna falhou",
  // reachable
  "0v7bgvk": "acessível",
  // read article
  "1nefbfz": "ler artigo",
  // read queued
  "0tw4gk6": "leitura na fila",
  // remote cursor expired after 7 seconds
  "0gh0lzo": "cursor remoto expirou após 7 segundos",
  // replace source
  "0f1ri04": "substituir origem",
  // Replaceable token-source merge simulator
  "02msf2e": "Simulador de combinação de origens substituíveis de tokens",
  // repository
  "15882ol": "repositório",
  // request
  "0hdxo6q": "requisição",
  // reset
  "0s1dj9c": "reiniciar",
  // run build
  "10385c6": "rodar build",
  // Runtime observer boundary lab
  "1j64cts": "Laboratório dos limites de observação do runtime",
  // runtime value
  "12l59zy": "valor de runtime",
  // Runtime values are skipped because the collector cannot know their key.
  "0cwk112": "Valores de runtime são ignorados porque o coletor não conhece a chave.",
  // sample
  "15v6o4n": "coletar",
  // sample delivered to the remote document
  "084qna8": "amostra entregue ao documento remoto",
  // sample dropped: identity mismatch
  "0knknvj": "amostra descartada: identidades diferentes",
  // sample dropped: socket closed
  "0d21ul2": "amostra descartada: socket fechado",
  // scroll
  "1pekw8c": "rolagem",
  // Selected work · notes · contact
  "04imigo": "Trabalhos · notas · contato",
  // serve the disk cache · no API call
  "1a0ljg2": "servir o cache em disco · sem chamada à API",
  // served from
  "03cpwu8": "servida por",
  // skip 7s
  "0tkik34": "avançar 7s",
  // socket
  "13z3gq4": "socket",
  // Solid island
  "1mdwzvl": "ilha do Solid",
  // source
  "07ps15k": "origem",
  // Spotify
  "0fsveqd": "Spotify",
  // Spotify and GitHub source policy simulator
  "1yd7bgg": "Simulador das políticas de origem do Spotify e do GitHub",
  // SQLite stored a token and incremented the permanent total.
  "0dtdvwq": "O SQLite guardou um token e incrementou o total permanente.",
  // SSE
  "0gobdxu": "SSE",
  // stale
  "0sxi6bi": "desatualizada",
  // static +
  "02is9zy": "soma estática",
  // static MDX
  "065ob1k": "MDX estático",
  // stopped
  "0urm4i6": "interrompido",
  // stored total
  "0001eb8": "total armazenado",
  // stores
  "043v0br": "stores",
  // survived {count} replacements
  "0gtmfp1": "sobreviveu a {count} substituições",
  // survived 1 replacement
  "13lgsx0": "sobreviveu a 1 substituição",
  // telemetry · 2 visitors
  "0549v5i": "telemetria · 2 visitantes",
  // telemetry · offline
  "1anek5a": "telemetria · desconectada",
  // The catalog has not seen this call yet.
  "10cn7yb": "O catálogo ainda não encontrou esta chamada.",
  // The container changes; the mounted data does not.
  "0mlh9t6": "O container muda; os dados montados não.",
  // The document and live layer are available.
  "0bb95bg": "O documento e a camada ao vivo estão disponíveis.",
  // The document survives; the island does not start.
  "0eem58l": "O documento sobrevive; a ilha não inicia.",
  // The document survives; the island reports offline.
  "0oanbfv": "O documento sobrevive; a ilha informa a desconexão.",
  // The first build created a null entry. Edit it, then build again.
  "02lhld0": "O primeiro build criou uma entrada null. Edite-a e rode o build novamente.",
  // The hidden tab holds the request until it becomes visible.
  "1wi33p6": "A aba oculta retém a requisição até voltar a ficar visível.",
  // The rendered document stays; live data stops.
  "1ts4fu0": "O documento renderizado fica; os dados ao vivo param.",
  // The request reaches Bun without crossing Dokploy.
  "0uax3hr": "A requisição chega ao Bun sem atravessar o Dokploy.",
  // The second build bundled the Portuguese override.
  "19w9kha": "O segundo build incluiu o override em português.",
  // This browser already has an active token; the total stays put.
  "1a1plvc": "Este navegador já tem um token ativo; o total permanece igual.",
  // toggle collision
  "007zrht": "alternar conflito",
  // token
  "15735ma": "token",
  // token found
  "1eq65tu": "token encontrado",
  // tokens
  "1y6cuoj": "tokens",
  // total
  "01c3cot": "total",
  // Type Nada tocando
  "0i1uikx": "Digite Nada tocando",
  // unchanged
  "1ufp29q": "sem alteração",
  // version gate
  "1ac6ole": "controle",
  // visibility
  "0zar1et": "visibilidade",
  // visible
  "0nktwgx": "visível",
  // visitor
  "1sqi80x": "visitante",
  // visitors
  "174qtxy": "visitantes",
  // waiting
  "1u9tm7c": "aguardando",
  // aggregate freshness
  "11ajpaf": "atualidade do agregado",
  // existing window
  "0820wx4": "janela existente",
  // incoming window
  "1ygncs3": "janela recebida",
  // merge key
  "1eumyzw": "chave de mesclagem",
  // no match
  "16l7jzb": "sem correspondência",
  // public aggregate
  "1fpmc77": "agregado público",
  // {action} {module}
  "1bdaxax": "{action} {module}",
  // current
  "1obisii": "atual",
  // emitted
  "0i5frqj": "emitida",
  // SSE stream
  "069u38m": "fluxo SSE",
  // cannot tell
  "1c1wwpt": "não é possível determinar",
  // observer position
  "1ed5jju": "posição do observador",
  // reading
  "0ctww6z": "leitura",
  // Next post
  "122dutu": "Próximo post",
  // Post navigation
  "0l7c143": "Navegação entre posts",
  // Previous post
  "1kyzcia": "Post anterior",
} satisfies TranslationOverrides;

export default translations;
