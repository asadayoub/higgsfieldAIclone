import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterHistory, type HistoryEntry } from "@/lib/generation/history";
import {
  parseLocalHistory,
  startLocalRun,
  localHistorySnapshot,
  favoriteLocalRun,
  cancelLocalRun,
} from "@/lib/generation/local-history";
import { createGuidedJob } from "@/lib/generation/guided-job";
import type { StudioConfiguration } from "@/lib/studio/validation";
const recipe: StudioConfiguration = {
  media: "image",
  execution: "guided",
  modelId: "luma-image",
  prompt: "A cobalt vessel",
  preset: "None",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1K",
  quantity: 1,
  duration: 0,
  referenceCount: 0,
};
describe("history", () => {
  it("filters, sorts, paginates and bounds page numbers", () => {
    const entries: HistoryEntry[] = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      execution: "guided",
      media: index % 2 ? "video" : "image",
      status: index === 0 ? "cancelled" : "complete",
      prompt: "Cobalt vessel",
      modelId: "luma-image",
      createdAt: index,
      favorite: index < 5,
      preview: "",
    }));
    const filter = {
      query: "",
      media: "all",
      status: "all",
      favorites: false,
      completedOnly: false,
      page: 99,
    };
    const result = filterHistory(entries, filter);
    expect(result.pages).toBe(3);
    expect(result.page).toBe(3);
    expect(result.entries[0]?.id).toBe("0");
    expect(filterHistory(entries, { ...filter, query: "absent" }).total).toBe(
      0,
    );
    expect(
      filterHistory(entries, {
        ...filter,
        media: "image",
        completedOnly: true,
        favorites: true,
      }).total,
    ).toBe(2);
    expect(filterHistory(entries, { ...filter, page: NaN }).page).toBe(1);
  });
  it("rejects corrupt history, caps it and removes duplicate identities", () => {
    const job = createGuidedJob("job-1", recipe, 1000);
    const record = { job, favorite: true };
    expect(
      parseLocalHistory(JSON.stringify([record, record, { job: null }]), 2000),
    ).toEqual([record]);
    expect(parseLocalHistory("{", 2000)).toEqual([]);
    expect(parseLocalHistory("x".repeat(300001), 2000)).toEqual([]);
    expect(
      parseLocalHistory(
        JSON.stringify(
          Array.from({ length: 70 }, (_, i) => ({
            job: { ...job, id: `job-${i}` },
            favorite: false,
          })),
        ),
        2000,
      ),
    ).toHaveLength(50);
  });
});
describe("local persistence with fake browser storage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.stubGlobal("window", new EventTarget());
  });
  it("deduplicates an active run, saves favorites and cancellation, and allows a new run", () => {
    const first = startLocalRun(recipe);
    expect(startLocalRun({ ...recipe, prompt: "Changed prompt" }).id).toBe(
      first.id,
    );
    favoriteLocalRun(first.id, true);
    expect(localHistorySnapshot()[0]?.favorite).toBe(true);
    cancelLocalRun(first.id);
    expect(localHistorySnapshot()[0]?.job.cancelledAt).toBeDefined();
    const second = startLocalRun(recipe);
    expect(second.id).not.toBe(first.id);
    expect(localHistorySnapshot()).toHaveLength(2);
  });
  it("does not claim success when storage rejects the write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(() => startLocalRun(recipe)).toThrow("quota");
  });
});
