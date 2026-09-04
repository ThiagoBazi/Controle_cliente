import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Instagram,
  Youtube,
  Mail,
  ArrowUpRight,
  ArrowUp,
  Play,
  UserRound,
  ChartColumn,
  Clapperboard,
  Handshake,
  RefreshCw,
  TriangleAlert,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { instagramAnalytics, instagramMediaKit } from "@/lib/instagram.functions";
import type { Breakdown, InstagramAnalytics, InstagramMediaKit } from "@/lib/instagram.functions";

import booth1 from "@/assets/booth-1.jpg";
import booth2 from "@/assets/booth-2.jpg";
import booth3 from "@/assets/booth-3.jpg";
import aboutFlatlay from "@/assets/about-flatlay.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mídia Kit — Isabele Lopes | Criadora de Conteúdo" },
      {
        name: "description",
        content:
          "Mídia kit e portfólio de Isabele Lopes: audiência, engajamento, vídeos em destaque, marcas parceiras e contato para campanhas.",
      },
      { property: "og:title", content: "Mídia Kit — Isabele Lopes" },
      {
        property: "og:description",
        content:
          "Números, audiência, vídeos em destaque e parcerias. Vamos criar juntas a próxima campanha.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MediaKit,
});

const nav = [
  { label: "Sobre mim", href: "#sobre" },
  { label: "Meus números", href: "#numeros" },
  { label: "Vídeos destaque", href: "#videos" },
  { label: "Parceiros", href: "#parceiros" },
  { label: "Contato", href: "#contato" },
];

const brands = [
  "Marca Parceira",
  "Sua Marca Aqui",
  "Nome da Marca",
  "Marca Parceira",
  "Sua Marca Aqui",
  "Nome da Marca",
];

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-foreground/80">{label}</span>
        <span className="font-semibold tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mb-10 flex flex-col gap-2">
      <span className="label-eyebrow inline-flex items-center gap-2 text-primary/70">
        <Icon className="size-4" />
        {eyebrow}
      </span>
      <h2 className="text-4xl md:text-5xl">{title}</h2>
    </div>
  );
}

/** Mostra o número real, ou "—" quando a API não devolveu a métrica. */
function StatValue({
  value,
  loading,
  className = "",
  format,
}: {
  value: number | null;
  loading: boolean;
  className?: string;
  format?: ((n: number) => string) | undefined;
}) {
  if (loading) {
    return <span className={`inline-block h-9 w-24 animate-pulse rounded bg-primary/15 ${className}`} />;
  }
  if (value === null || value === undefined) {
    return <span className={className} title="Métrica não disponível pela API do Instagram">—</span>;
  }
  return (
    <AnimatedNumber className={className} value={value} format={format ?? ((n) => compact.format(n))} />
  );
}

function sum(values: Array<number | null>) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0);
}

function average(values: Array<number | null>) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function toPercentRows(data: Breakdown[], limit?: number): Array<{ label: string; value: number }> {
  const total = data.reduce((acc, row) => acc + row.value, 0);
  if (total <= 0) return [];
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (!limit || sorted.length <= limit) {
    return sorted.map((row) => ({ label: row.label, value: Math.round((row.value / total) * 100) }));
  }
  const top = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1).reduce((acc, row) => acc + row.value, 0);
  return [
    ...top.map((row) => ({ label: row.label, value: Math.round((row.value / total) * 100) })),
    { label: "Outros", value: Math.round((rest / total) * 100) },
  ];
}

const countryNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["pt-BR"], { type: "region" })
    : null;

function localizeCountries(data: Breakdown[]): Breakdown[] {
  return data.map((row) => ({
    ...row,
    label: countryNames?.of(row.label.toUpperCase()) ?? row.label,
  }));
}

function MediaKit() {
  const {
    data: ig,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<InstagramMediaKit>({
    queryKey: ["instagram-media-kit"],
    queryFn: () => instagramMediaKit(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsFetching,
    refetch: refetchAnalytics,
  } = useQuery<InstagramAnalytics>({
    queryKey: ["instagram-analytics"],
    queryFn: () => instagramAnalytics(),
    staleTime: 30 * 60 * 1000,
  });

  const loading = isLoading;
  const profile = ig?.profile ?? null;
  const media = ig?.media ?? [];

  // Views por conteúdo: views quando a API entrega, senão alcance.
  const viewsPerPost = media.map((m) => m.views ?? m.reach ?? null);
  const avgViews = average(viewsPerPost);

  // Engajamento ponderado: (Σ likes + Σ comentários) / Σ views dos conteúdos filtrados.
  const engagedItems = media.filter(
    (m) => typeof (m.views ?? m.reach) === "number" && (m.views ?? m.reach ?? 0) > 0,
  );
  const totalLikes = sum(engagedItems.map((m) => m.likes ?? 0));
  const totalComments = sum(engagedItems.map((m) => m.comments ?? 0));
  const engagementBase = sum(engagedItems.map((m) => m.views ?? m.reach ?? null));
  const weightedEngagement =
    engagementBase && engagementBase > 0
      ? ((totalLikes ?? 0) + (totalComments ?? 0)) / engagementBase
      : null;

  const gender = toPercentRows(analytics?.gender ?? []);
  const ages = toPercentRows(analytics?.age ?? []);
  const places = toPercentRows(localizeCountries(analytics?.country ?? []), 5);
  const demographicsLoading = isAnalyticsLoading;

  const notConfigured = ig && !ig.configured;
  const metaError = ig?.profileError ?? ig?.mediaError ?? ig?.insightsError ?? null;
  const showError = isError || notConfigured || (ig?.profileError ?? null) !== null;

  const stats: Array<{
    value: number | null;
    label: string;
    note: string;
    tooltip: string;
    format?: ((n: number) => string) | undefined;
  }> = [
    {
      value: profile?.followersCount ?? null,
      label: "Audiência total",
      note: "Instagram",
      tooltip: "Soma dos seguidores das plataformas selecionadas.",
    },
    {
      value: ig?.historicalViews ?? null,
      label: "Views históricas",
      note: "todo o histórico disponível",
      tooltip:
        "Total acumulado de visualizações de todo o histórico disponível das plataformas selecionadas.",
    },
    {
      value: avgViews,
      label: "Média de views / post",
      note: "conteúdos filtrados",
      tooltip: "Média aritmética das views entre os conteúdos que passam pelos filtros atuais.",
    },
    {
      value: weightedEngagement,
      label: "Engajamento médio ponderado",
      note: "likes + comentários ÷ views",
      tooltip:
        "Soma de (like + comentários) dividida pela soma de views entre todos os conteúdos filtrados. Vídeos maiores pesam mais, evitando distorção por posts pequenos.",
      format: (n) => `${(n * 100).toFixed(1).replace(".", ",")}%`,
    },
  ];


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5">
          <a href="#topo" className="label-eyebrow inline-flex items-center gap-2 text-primary">
            <span className="live-dot" aria-hidden="true" />
            live mídia kit
          </a>
          <nav className="hidden items-center gap-7 text-sm text-foreground/70 md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#contato"
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            Contato
          </a>
        </div>
      </header>

      <main id="topo">
        {/* HERO */}
        <section className="border-b border-border/60 bg-butter">
          <div className="mx-auto grid max-w-6xl items-end gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
            <div>
              <span className="label-eyebrow text-primary/70">olá! eu sou</span>
              <h1 className="mt-4 text-6xl leading-[0.9] text-primary md:text-8xl">
                Isabele
                <br />
                <span className="italic">Lopes</span>
              </h1>
              <div className="mt-6 flex flex-wrap gap-2">
                {["lifestyle", "viagem", "beleza"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/75">
                {profile?.biography ??
                  "Criadora de conteúdo. Aqui vai a sua apresentação: sobre o que você fala, com quem você fala e por que a sua comunidade confia em você."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#contato"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Enviar email <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
            <div className="relative mx-auto w-fit">
              <div
                className="rotate-3 rounded-[1.75rem] bg-card p-3"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="relative h-96 w-64 overflow-hidden rounded-[1.25rem] bg-foreground/90 p-3 md:h-[28rem] md:w-72">
                  <div className="marquee-track-y">
                    {[0, 1].map((k) => (
                      <div key={k} className="flex shrink-0 flex-col gap-3">
                        {[booth1, booth2, booth3].map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`Foto ${i + 1} da cabine fotográfica de Isabele Lopes`}
                            width={512}
                            height={512}
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <span className="absolute -left-4 top-5 rounded-full bg-primary px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
                ao vivo
              </span>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="overflow-hidden border-b border-border/60 bg-primary py-3">
          <div className="marquee-track">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-8 pr-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="label-eyebrow text-primary-foreground/80 whitespace-nowrap"
                  >
                    mídia kit · portfólio · parcerias ·
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* SOBRE */}
        <section id="sobre" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <SectionTitle eyebrow="sobre mim" title="Um pouco da minha história" icon={UserRound} />
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-5 text-base leading-relaxed text-foreground/75">
              <p>
                Escreva aqui sua trajetória: como começou, o que te move e qual é o tom do seu
                conteúdo. Este espaço é para a marca entender rapidamente quem é você.
              </p>
              <p>
                Descreva também os formatos que você mais entrega — reels, vídeos longos, unboxing,
                review, eventos e presença em campanhas.
              </p>
              <ul className="grid gap-3 pt-2 sm:grid-cols-2">
                {["Reels e vídeos curtos", "Reviews e unboxing", "Presença em eventos", "Campanhas integradas"].map(
                  (item) => (
                    <li
                      key={item}
                      className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div className="relative h-80 overflow-hidden rounded-[2rem] border border-border md:h-auto md:min-h-96">
              <div className="marquee-track-y">
                {[0, 1].map((k) => (
                  <img
                    key={k}
                    src={aboutFlatlay}
                    alt={k === 0 ? "Composição de tecido bordô e papel amarelo manteiga" : ""}
                    aria-hidden={k !== 0}
                    width={1000}
                    height={800}
                    loading="lazy"
                    className="w-full object-cover"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NÚMEROS */}
        <section id="numeros" className="scroll-mt-20 border-y border-border/60 bg-butter">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="label-eyebrow inline-flex items-center gap-2 text-primary/70">
                  <ChartColumn className="size-4" />
                  dados
                </span>
                <h2 className="text-4xl md:text-5xl">Meus números</h2>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <button
                  type="button"
                  onClick={() => { void refetch(); void refetchAnalytics(); }}
                  disabled={isFetching || isAnalyticsFetching}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                >
                  <RefreshCw className={`size-3.5 ${isFetching || isAnalyticsFetching ? "animate-spin" : ""}`} />
                  Atualizar dados do Instagram
                </button>
                {ig?.fetchedAt && !isFetching && !isAnalyticsFetching ? (
                  <span className="text-[0.7rem] text-muted-foreground">
                    atualizado às{" "}
                    {new Date(ig.fetchedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : null}
              </div>
            </div>

            {showError ? (
              <div className="mb-8 flex items-start gap-3 rounded-2xl border border-primary/25 bg-card p-4 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-primary">
                    {notConfigured
                      ? "Instagram ainda não conectado"
                      : "Não consegui atualizar os dados do Instagram agora"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {notConfigured
                      ? "Falta cadastrar o token de acesso da Meta para os números aparecerem automaticamente."
                      : (metaError?.message ??
                        "A Meta não respondeu. Tente novamente em alguns instantes.")}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-px overflow-hidden rounded-2xl bg-primary/15 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-background p-6">
                  <p className="font-display text-4xl text-primary">
                    <StatValue value={s.value} loading={loading} format={s.format} />
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold">
                    <span>{s.label}</span>
                    <span className="group relative mt-0.5 inline-flex shrink-0">
                      <Info
                        className="size-3.5 cursor-help text-primary/60 transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{s.tooltip}</span>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-card p-2.5 text-xs font-normal leading-snug text-muted-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                      >
                        {s.tooltip}
                      </span>
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                </div>
              ))}
            </div>


            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { title: "Gênero", data: gender },
                { title: "Faixa de idade", data: ages },
                { title: "Localização", data: places },
              ].map((block) => (
                <div key={block.title} className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="mb-5 text-xl">{block.title}</h3>
                  {demographicsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-8 animate-pulse rounded bg-primary/10" />
                      ))}
                    </div>
                  ) : block.data.length ? (
                    <div className="space-y-4">
                      {block.data.map((row) => (
                        <Bar key={row.label} label={row.label} value={row.value} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Dados não disponibilizados pela Meta para esta conta/período.
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Números do Instagram vindos direto da API da Meta. Métricas marcadas com “—” não são
              disponibilizadas pela API para esta conta.
            </p>
          </div>
        </section>

        {/* VÍDEOS */}
        <section id="videos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
          <SectionTitle eyebrow="conteúdo" title="Vídeos em destaque" icon={Clapperboard} />
          {loading ? (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] animate-pulse rounded-2xl bg-primary/10" />
              ))}
            </div>
          ) : media.length ? (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {media.slice(0, 8).map((m) => (
                <a
                  key={m.id}
                  href={m.permalink ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group block"
                >
                  <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary/5">
                    {m.thumbnailUrl ?? m.mediaUrl ? (
                      <img
                        src={(m.thumbnailUrl ?? m.mediaUrl)!}
                        alt={m.caption?.slice(0, 80) ?? "Publicação do Instagram"}
                        loading="lazy"
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play className="size-5" />
                      </span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug">
                    {m.caption?.trim() || "Publicação sem legenda"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.views !== null
                      ? `${compact.format(m.views)} views`
                      : m.likes !== null
                        ? `${compact.format(m.likes)} curtidas`
                        : "métricas não disponíveis"}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ig?.mediaError?.message ??
                "Nenhuma publicação disponível pela API do Instagram no momento."}
            </p>
          )}
        </section>

        {/* PARCEIROS */}
        <section id="parceiros" className="scroll-mt-20 border-y border-border/60 bg-card">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <SectionTitle eyebrow="parceiros" title="Marcas que já confiaram" icon={Handshake} />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-3">
              {brands.map((b, i) => (
                <div
                  key={i}
                  className="flex h-24 items-center justify-center bg-card text-sm font-semibold uppercase tracking-[0.16em] text-primary/70"
                >
                  {b}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTATO */}
        <section id="contato" className="scroll-mt-20 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <span className="label-eyebrow inline-flex items-center gap-2 text-primary-foreground/70">
              <Mail className="size-4" />
              contato
            </span>
            <h2 className="mt-4 max-w-2xl text-5xl leading-[0.95] md:text-7xl">
              Vamos trabalhar <span className="italic">juntas?</span>
            </h2>
            <p className="mt-5 max-w-md text-primary-foreground/80">
              Para propostas, campanhas e parcerias, me chame por e-mail.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:seuemail@exemplo.com"
                className="inline-flex items-center gap-2 rounded-full bg-butter px-6 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
              >
                <Mail className="size-4" /> seuemail@exemplo.com
              </a>
              <a
                href="https://wa.me/5500000000000"
                className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
              >
                Enviar WhatsApp <ArrowUpRight className="size-4" />
              </a>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-primary-foreground/20 sm:grid-cols-3">
              <div className="bg-primary p-6">
                <Instagram className="size-5 text-butter" />
                <p className="mt-3 text-sm text-primary-foreground/70">
                  {profile?.username ? `@${profile.username}` : "@seuusuario"}
                </p>
                <p className="font-display text-3xl">
                  <StatValue value={profile?.followersCount ?? null} loading={loading} />
                </p>
                <p className="text-xs text-primary-foreground/60">seguidores</p>
              </div>
              <div className="bg-primary p-6">
                <Play className="size-5 text-butter" />
                <p className="mt-3 text-sm text-primary-foreground/70">@seuusuario</p>
                <p className="font-display text-3xl">—</p>
                <p className="text-xs text-primary-foreground/60">TikTok · não conectado</p>
              </div>
              <div className="bg-primary p-6">
                <Youtube className="size-5 text-butter" />
                <p className="mt-3 text-sm text-primary-foreground/70">@seuusuario</p>
                <p className="font-display text-3xl">—</p>
                <p className="text-xs text-primary-foreground/60">YouTube · não conectado</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Isabele Lopes · Todos os direitos reservados.</p>
          <a href="#topo" className="inline-flex items-center gap-1.5 hover:text-primary">
            Voltar ao topo <ArrowUp className="size-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
