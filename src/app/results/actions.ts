"use server";

import { z } from "zod";
import { getSessionUser } from "@/server/auth/session";
import {
  cancelRun,
  getRun,
  refreshRun,
  submitRun,
  favoriteAsset,
  publishAsset,
  revokePublication,
} from "@/server/generation/service";
import type { RunResponse } from "@/lib/generation/contracts";
import { publicGenerationError } from "@/lib/security/public-error";

async function owner() {
  const session = await getSessionUser();
  if (!session) throw new Error("Sign in to access private generations.");
  return session.user.id;
}
async function respond(
  operation: (id: string) => Promise<RunResponse["run"]>,
): Promise<RunResponse> {
  try {
    return { run: (await operation(await owner()))! };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? "Review a valid generation request."
          : publicGenerationError(error),
    };
  }
}
export async function submitGeneration(input: unknown) {
  return respond((id) => submitRun(id, input));
}
export async function readGeneration(id: string) {
  return respond((owner) => getRun(owner, id));
}
export async function pollGeneration(id: string) {
  return respond((owner) => refreshRun(owner, id));
}
export async function cancelGeneration(id: string) {
  return respond((owner) => cancelRun(owner, id));
}
export async function setAssetFavorite(id: string, favorite: boolean) {
  try {
    z.boolean().parse(favorite);
    await favoriteAsset(await owner(), id, favorite);
    return { success: true };
  } catch {
    return { error: "Could not update favorite." };
  }
}
export async function shareAsset(id: string, confirmed: boolean) {
  try {
    z.literal(true).parse(confirmed);
    const slug = await publishAsset(await owner(), id);
    return { slug };
  } catch {
    return { error: "Could not publish this asset." };
  }
}
export async function unshareAsset(id: string) {
  try {
    await revokePublication(await owner(), id);
    return { success: true };
  } catch {
    return { error: "Could not revoke sharing. Please retry." };
  }
}
