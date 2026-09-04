import { createServerFn } from "@tanstack/react-start";
import type {
  Breakdown,
  IgAccountInsights,
  IgError,
  IgMedia,
  IgProfile,
  InstagramAnalytics,
  InstagramMediaKit,
  SeriesPoint,
} from "./instagram-shared";

export type {
  Breakdown,
  IgAccountInsights,
  IgError,
  IgMedia,
  IgProfile,
  InstagramAnalytics,
  InstagramMediaKit,
  SeriesPoint,
};

// Instagram User ID da conta profissional (configuração, não é segredo).
const IG_USER_ID = process.env["INSTAGRAM_USER_ID"]?.trim() || "17841403141975462";
const configuredGraphVersion = process.env["META_GRAPH_VERSION"]?.trim() || "v26.0";
const GRAPH_VERSION = /^v\d+\.\d+$/.test(configuredGraphVersion) ? configuredGraphVersion : "v26.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Token de acesso. Prioriza o token novo de longa duração (60 dias).
 * Para renovar no futuro, basta atualizar o secret — nenhum código muda.
 */
function getToken(): string | undefined {
  const longLived = process.env["INSTAGRAM_LONG_LIVED_TOKEN"]?.trim();
  const access = process.env["INSTAGRAM_ACCESS_TOKEN"]?.trim();
  return longLived || access || undefined;
}

function toError(payload: unknown, fallback: string): IgError {
  const err = (payload as { error?: { code?: number; type?: string; message?: string } } | null)?.error;
  return {
    code: err?.code ?? null,
    type: err?.type ?? null,
    message: err?.message ?? fallback,
  };
}

async function graph<T>(path: string, token: string): Promise<{ data: T | null; error: IgError | null }> {
  try {
    const res = await fetch(`${GRAPH}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const error = toError(json, `A Meta respondeu ${res.status}.`);
      // Nunca logar o token — só o motivo do erro.
      console.warn("[instagram] erro Graph API", { path, ...error });
      return { data: null, error };
    }
    return { data: json as T, error: null };
  } catch (e) {
    return {
      data: null,
      error: { code: null, type: "network", message: e instanceof Error ? e.message : "Falha de rede" },
    };
  }
}

const empty = (): InstagramMediaKit => ({
  configured: false,
  fetchedAt: new Date().toISOString(),
  profile: null,
  profileError: null,
  media: [],
  mediaError: null,
  historicalViews: null,
  historicalMediaCount: 0,
  insights: null,
  insightsError: null,
});

type RawMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type InsightPayload = {
  data?: Array<{
    name: string;
    total_value?: {
      value?: number;
      breakdowns?: Array<{
        dimension_keys?: string[];
        results?: Array<{ dimension_values?: string[]; value?: number }>;
      }>;
    };
    values?: Array<{ value?: number; end_time?: string }>;
  }>;
};

function insightValue(payload: InsightPayload | null, name: string): number | null {
  const metric = payload?.data?.find((m) => m.name === name);
  if (!metric) return null;
  if (typeof metric.total_value?.value === "number") return metric.total_value.value;
  if (metric.values?.length) {
    return metric.values.reduce((acc, v) => acc + (v.value ?? 0), 0);
  }
  return null;
}

/**
 * Busca perfil, mídias e insights da conta profissional do Instagram.
 * O token só existe no servidor e nunca é retornado ao navegador.
 */
export const instagramMediaKit = createServerFn({ method: "GET" }).handler(
  async (): Promise<InstagramMediaKit> => {
    const token = getToken();
    if (!token) return empty();

    const result: InstagramMediaKit = { ...empty(), configured: true };

    // 1) Perfil
    const profileRes = await graph<{
      username?: string;
      name?: string;
      profile_picture_url?: string;
      biography?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
    }>(
      `/${IG_USER_ID}?fields=username,name,profile_picture_url,biography,followers_count,follows_count,media_count`,
      token,
    );
    if (profileRes.data) {
      const p = profileRes.data;
      result.profile = {
        username: p.username ?? null,
        name: p.name ?? null,
        profilePictureUrl: p.profile_picture_url ?? null,
        biography: p.biography ?? null,
        followersCount: p.followers_count ?? null,
        followsCount: p.follows_count ?? null,
        mediaCount: p.media_count ?? null,
      };
    } else {
      result.profileError = profileRes.error;
    }

    // 2) Mídias — paginação para cobrir todo o histórico disponível (limite de segurança)
    type MediaPage = { data?: RawMedia[]; paging?: { cursors?: { after?: string } } };
    const rawMedia: RawMedia[] = [];
    const MAX_MEDIA = 300; // proteção contra estourar tempo/rate limit da Meta
    let afterCursor: string | null = null;
    while (rawMedia.length < MAX_MEDIA) {
      const limit = Math.min(100, MAX_MEDIA - rawMedia.length);
      const pageRes: Awaited<ReturnType<typeof graph<MediaPage>>> = await graph<MediaPage>(
        `/${IG_USER_ID}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}${afterCursor ? `&after=${afterCursor}` : ""}`,
        token,
      );
      if (pageRes.error) {
        if (rawMedia.length === 0) result.mediaError = pageRes.error;
        break;
      }
      const page = pageRes.data?.data ?? [];
      rawMedia.push(...page);
      afterCursor = pageRes.data?.paging?.cursors?.after ?? null;
      if (!afterCursor || page.length === 0) break;
    }

    if (rawMedia.length > 0) {
      // 3) Insights por mídia (as métricas variam por tipo; falha isolada não derruba as demais)
      const insightsFor = async (m: RawMedia): Promise<IgMedia> => {
        const metrics =
          m.media_type === "VIDEO" || m.media_type === "REELS"
            ? "reach,shares,saved,views"
            : "reach,shares,saved";
        const ins = await graph<InsightPayload>(`/${m.id}/insights?metric=${metrics}`, token);
        return {
          id: m.id,
          caption: m.caption ?? null,
          mediaType: m.media_type ?? null,
          mediaProductType: m.media_product_type ?? null,
          mediaUrl: m.media_url ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          permalink: m.permalink ?? null,
          timestamp: m.timestamp ?? null,
          likes: m.like_count ?? null,
          comments: m.comments_count ?? null,
          reach: insightValue(ins.data, "reach"),
          shares: insightValue(ins.data, "shares"),
          saved: insightValue(ins.data, "saved"),
          views: insightValue(ins.data, "views"),
        };
      };

      // Busca insights em lotes para não estourar limite de requisições simultâneas
      const withInsights: IgMedia[] = [];
      const BATCH = 15;
      for (let i = 0; i < rawMedia.length; i += BATCH) {
        const batch = rawMedia.slice(i, i + BATCH);
        withInsights.push(...(await Promise.all(batch.map(insightsFor))));
      }
      result.media = withInsights;

      // Views históricas: soma de todo o histórico recuperado (views; senão alcance).
      let total = 0;
      let counted = 0;
      for (const m of withInsights) {
        const v = m.views ?? m.reach;
        if (typeof v === "number") {
          total += v;
          counted += 1;
        }
      }
      result.historicalMediaCount = counted;
      result.historicalViews = counted > 0 ? total : null;
    } else {
      result.mediaError =
        result.mediaError ?? { code: null, type: "empty", message: "Nenhuma mídia retornada pela API." };
    }

    // 4) Insights da conta — janela de 30 dias.
    // A Meta exige formatos diferentes para reach e para as métricas agregadas,
    // então as chamadas ficam separadas (foi exatamente o formato validado no Graph API Explorer).
    const until = Math.floor(Date.now() / 1000);
    const since = until - 30 * 24 * 60 * 60;
    const [reachRes, totalsRes] = await Promise.all([
      graph<InsightPayload>(
        `/${IG_USER_ID}/insights?metric=reach&period=day&since=${since}&until=${until}`,
        token,
      ),
      graph<InsightPayload>(
        `/${IG_USER_ID}/insights?metric=profile_views,accounts_engaged,total_interactions&period=day&metric_type=total_value&since=${since}&until=${until}`,
        token,
      ),
    ]);

    const reachMetric = reachRes.data?.data?.find((m) => m.name === "reach");
    const reachValues = reachMetric?.values ?? [];
    const latestReach = reachValues.length ? (reachValues[reachValues.length - 1]?.value ?? null) : null;

    if (reachRes.data || totalsRes.data) {
      result.insights = {
        reach: latestReach,
        accountsEngaged: insightValue(totalsRes.data, "accounts_engaged"),
        totalInteractions: insightValue(totalsRes.data, "total_interactions"),
        profileViews: insightValue(totalsRes.data, "profile_views"),
      };
    }
    result.insightsError = reachRes.error ?? totalsRes.error;

    result.fetchedAt = new Date().toISOString();
    return result;
  },
);

const emptyAnalytics = (): InstagramAnalytics => ({
  configured: false,
  fetchedAt: new Date().toISOString(),
  viewsSeries: [],
  followersSeries: [],
  seriesError: null,
  gender: [],
  age: [],
  country: [],
  demographicsError: null,
});

function breakdownFrom(payload: InsightPayload | null, metric: string, labeler?: (v: string) => string): Breakdown[] {
  const m = payload?.data?.find((d) => d.name === metric);
  const results = m?.total_value?.breakdowns?.[0]?.results ?? [];
  return results
    .map((r) => ({
      label: labeler ? labeler(r.dimension_values?.[0] ?? "—") : (r.dimension_values?.[0] ?? "—"),
      value: r.value ?? 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

const GENDER_LABEL: Record<string, string> = { F: "Feminino", M: "Masculino", U: "Outros" };

/**
 * Série histórica (views e seguidores por dia) + demografia da audiência.
 * Só dados reais da Meta: o que a API não devolver fica vazio.
 */
export const instagramAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<InstagramAnalytics> => {
    const token = getToken();
    if (!token) return emptyAnalytics();

    const result: InstagramAnalytics = { ...emptyAnalytics(), configured: true };

    // 1) Séries diárias — a Meta limita cada chamada a 30 dias, então buscamos em blocos.
    const views = new Map<string, number>();
    const followers = new Map<string, number>();
    const nowSec = Math.floor(Date.now() / 1000);
    const DAY = 24 * 60 * 60;
    const BLOCKS = 3; // ~90 dias
    for (let b = BLOCKS - 1; b >= 0; b--) {
      const until = nowSec - b * 30 * DAY;
      const since = until - 30 * DAY;
      const res = await graph<InsightPayload>(
        `/${IG_USER_ID}/insights?metric=views,follower_count&period=day&since=${since}&until=${until}`,
        token,
      );
      if (res.error) {
        result.seriesError = result.seriesError ?? res.error;
        continue;
      }
      for (const metric of res.data?.data ?? []) {
        for (const v of metric.values ?? []) {
          const day = (v.end_time ?? "").slice(0, 10);
          if (!day) continue;
          if (metric.name === "views") views.set(day, v.value ?? 0);
          if (metric.name === "follower_count") followers.set(day, v.value ?? 0);
        }
      }
    }

    const toSeries = (map: Map<string, number>): SeriesPoint[] =>
      [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));

    result.viewsSeries = toSeries(views);

    // follower_count é o ganho diário; transformamos em total acumulado usando o total atual.
    const dailyGains = toSeries(followers);
    if (dailyGains.length) {
      const profileRes = await graph<{ followers_count?: number }>(
        `/${IG_USER_ID}?fields=followers_count`,
        token,
      );
      const current = profileRes.data?.followers_count ?? null;
      if (typeof current === "number") {
        const totals: SeriesPoint[] = [];
        let running = current;
        for (let i = dailyGains.length - 1; i >= 0; i--) {
          totals.unshift({ date: dailyGains[i]!.date, value: running });
          running -= dailyGains[i]!.value;
        }
        result.followersSeries = totals;
      } else {
        result.followersSeries = dailyGains;
      }
    }

    // 2) Demografia dos seguidores
    const demo = async (breakdown: string) =>
      graph<InsightPayload>(
        `/${IG_USER_ID}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&timeframe=this_month&breakdown=${breakdown}`,
        token,
      );

    const [g, a, c] = await Promise.all([demo("gender"), demo("age"), demo("country")]);
    result.gender = breakdownFrom(g.data, "follower_demographics", (v) => GENDER_LABEL[v] ?? v);
    result.age = breakdownFrom(a.data, "follower_demographics");
    result.country = breakdownFrom(c.data, "follower_demographics");
    result.demographicsError = g.error ?? a.error ?? c.error;

    result.fetchedAt = new Date().toISOString();
    return result;
  },
);
