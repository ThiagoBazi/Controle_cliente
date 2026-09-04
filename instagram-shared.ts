/** Tipos compartilhados da integração com o Instagram (client-safe). */

export type IgError = { code: number | null; type: string | null; message: string };

export type IgProfile = {
  username: string | null;
  name: string | null;
  profilePictureUrl: string | null;
  biography: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
};

export type IgMedia = {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaProductType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likes: number | null;
  comments: number | null;
  reach: number | null;
  shares: number | null;
  saved: number | null;
  views: number | null;
};

export type IgAccountInsights = {
  reach: number | null;
  accountsEngaged: number | null;
  totalInteractions: number | null;
  profileViews: number | null;
};

export type InstagramMediaKit = {
  configured: boolean;
  fetchedAt: string;
  profile: IgProfile | null;
  profileError: IgError | null;
  media: IgMedia[];
  mediaError: IgError | null;
  historicalViews: number | null;
  historicalMediaCount: number;
  insights: IgAccountInsights | null;
  insightsError: IgError | null;
};

export type SeriesPoint = { date: string; value: number };
export type Breakdown = { label: string; value: number };

export type InstagramAnalytics = {
  configured: boolean;
  fetchedAt: string;
  viewsSeries: SeriesPoint[];
  followersSeries: SeriesPoint[];
  seriesError: IgError | null;
  gender: Breakdown[];
  age: Breakdown[];
  country: Breakdown[];
  demographicsError: IgError | null;
};

/** Reels de teste (trial reels) não vão para o feed público. */
export function isTrialReel(m: IgMedia): boolean {
  const product = (m.mediaProductType ?? "").toUpperCase();
  return product === "TRIAL_REELS" || product === "TRIAL";
}

export function isVideo(m: IgMedia): boolean {
  const type = (m.mediaType ?? "").toUpperCase();
  const product = (m.mediaProductType ?? "").toUpperCase();
  return type === "VIDEO" || type === "REELS" || product === "REELS";
}
