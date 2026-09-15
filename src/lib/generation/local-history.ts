"use client";

import {
  createGuidedJob,
  cancelGuidedJob,
  guidedJobUpdate,
  readGuidedJob,
  type GuidedJob,
} from "./guided-job";
import type { StudioConfiguration } from "@/lib/studio/validation";

export type LocalRun = { job: GuidedJob; favorite: boolean };
const key = "lumaforge:guided-history:v1";
const event = "lumaforge:history-change";
const empty: LocalRun[] = [];
let cachedRaw: string | null | undefined;
let cached: LocalRun[] = empty;
export function parseLocalHistory(raw: string | null, now: number): LocalRun[] {
  if (!raw || raw.length > 300000) return [];
  try {
    const records = JSON.parse(raw);
    if (!Array.isArray(records)) return [];
    const seen = new Set<string>();
    return records.slice(0, 50).flatMap((record) => {
      const job = readGuidedJob(JSON.stringify(record?.job), now);
      if (!job || seen.has(job.id)) return [];
      seen.add(job.id);
      return [{ job, favorite: record.favorite === true }];
    });
  } catch {
    return [];
  }
}
export function localHistorySnapshot() {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseLocalHistory(raw, Date.now());
  }
  return cached;
}
export function localHistoryServerSnapshot() {
  return empty;
}
export function subscribeLocalHistory(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(event, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(event, listener);
  };
}
function write(records: LocalRun[]) {
  localStorage.setItem(key, JSON.stringify(records.slice(0, 50)));
  window.dispatchEvent(new Event(event));
}
export function migrateLatestGuidedRun() {
  if (localStorage.getItem(key)) return;
  const old = readGuidedJob(
    localStorage.getItem("lumaforge:guided-job:v1"),
    Date.now(),
  );
  if (old) write([{ job: old, favorite: false }]);
}
export function startLocalRun(configuration: StudioConfiguration) {
  migrateLatestGuidedRun();
  const history = localHistorySnapshot();
  const active = history.find((record) =>
    ["queued", "processing"].includes(
      guidedJobUpdate(record.job, Date.now()).status,
    ),
  );
  if (active) return active.job;
  const job = createGuidedJob(crypto.randomUUID(), configuration, Date.now());
  write([{ job, favorite: false }, ...history]);
  return job;
}
export function cancelLocalRun(id: string) {
  write(
    localHistorySnapshot().map((record) =>
      record.job.id === id
        ? { ...record, job: cancelGuidedJob(record.job, Date.now()) }
        : record,
    ),
  );
}
export function favoriteLocalRun(id: string, favorite: boolean) {
  write(
    localHistorySnapshot().map((record) =>
      record.job.id === id ? { ...record, favorite } : record,
    ),
  );
}
