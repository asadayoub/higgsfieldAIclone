"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth/session";
import {
  cancelRun,
  getRun,
  refreshRun,
  submitRun,
  favoriteAsset,
  publishAsset,
  updatePublicationShowcase,
  revokePublication,
} from "@/server/generation/service";
import type { RunResponse } from "@/lib/generation/contracts";
import { publicGenerationError } from "@/lib/security/public-error";
import { showcasePublicationSchema } from "@/lib/showcase/contracts";

async function owner() {
  const session = await getSessionUser();
  if (!session) throw new Error("Sign in to access private generations.");
  return session.user.id;
}
function revalidateShowcase() {
  revalidatePath("/");
  revalidatePath("/api/showcase");
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
  try {
    const session = await getSessionUser();
    if (!session) throw new Error("Sign in to access private generations.");
    return {
      run: await submitRun(
        session.user.id,
        Boolean(session.user.email_confirmed_at),
        input,
      ),
    };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? "Review a valid generation request."
          : publicGenerationError(error),
    };
  }
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
export async function shareAsset(id: string, input: unknown) {
  try {
    const publication = showcasePublicationSchema.parse(input);
    const slug = await publishAsset(await owner(), id, publication);
    revalidateShowcase();
    return { slug };
  } catch {
    return { error: "Could not publish this asset." };
  }
}
export async function updateAssetShowcase(id: string, input: unknown) {
  try {
    const publication = showcasePublicationSchema.parse(input);
    const slug = await updatePublicationShowcase(
      await owner(),
      id,
      publication,
    );
    revalidateShowcase();
    return { slug };
  } catch {
    return { error: "Could not update public showcase settings." };
  }
}
export async function unshareAsset(id: string) {
  try {
    await revokePublication(await owner(), id);
    revalidateShowcase();
    return { success: true };
  } catch {
    return { error: "Could not revoke sharing. Please retry." };
  }
}
