export type HistoryEntry = {
  id: string;
  execution: "guided" | "live";
  media: "image" | "video";
  status: string;
  prompt: string;
  modelId: string;
  createdAt: number;
  favorite: boolean;
  preview: string;
  fundingSource?: "system_free" | "personal_key" | "legacy";
  resolvedModel?: string;
  actualCostUsd?: number | null;
  provider?: string;
};
export type HistoryFilter = {
  query: string;
  media: string;
  status: string;
  favorites: boolean;
  completedOnly: boolean;
  page: number;
};
export function filterHistory(entries: HistoryEntry[], filter: HistoryFilter) {
  const query = filter.query.trim().toLowerCase();
  const matching = entries
    .filter(
      (entry) =>
        (!query ||
          `${entry.prompt} ${entry.modelId} ${entry.execution}`
            .toLowerCase()
            .includes(query)) &&
        (filter.media === "all" || entry.media === filter.media) &&
        (filter.status === "all" || entry.status === filter.status) &&
        (!filter.favorites || entry.favorite) &&
        (!filter.completedOnly || entry.status === "complete"),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const pages = Math.max(1, Math.ceil(matching.length / 12));
  const page = Math.min(
    pages,
    Math.max(1, Number.isFinite(filter.page) ? Math.floor(filter.page) : 1),
  );
  return {
    entries: matching.slice((page - 1) * 12, page * 12),
    total: matching.length,
    page,
    pages,
  };
}
