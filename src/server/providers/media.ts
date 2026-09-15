import { ProviderFailure, type Fetcher, type LiveOutput } from "./live";

export const maxOutputBytes = 40 * 1024 * 1024;
export function isProviderDeliveryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      (url.hostname === "replicate.delivery" ||
        url.hostname.endsWith(".replicate.delivery"))
    );
  } catch {
    return false;
  }
}
export function mediaExtension(bytes: Uint8Array, mime: string): string | null {
  if (
    mime === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "png";
  if (
    mime === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  if (
    mime === "image/webp" &&
    Buffer.from(bytes.slice(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.slice(8, 12)).toString() === "WEBP"
  )
    return "webp";
  if (
    mime === "video/mp4" &&
    Buffer.from(bytes.slice(4, 8)).toString() === "ftyp"
  )
    return "mp4";
  return null;
}
export async function retrieveOutput(
  output: LiveOutput,
  secret: string,
  media: "image" | "video",
  fetcher: Fetcher = fetch,
) {
  let bytes: Uint8Array;
  let mime: string;
  if ("bytes" in output) {
    bytes = output.bytes;
    mime = output.mime;
  } else {
    if (!isProviderDeliveryUrl(output.url))
      throw new ProviderFailure("output_unavailable");
    const response = await fetcher(output.url, {
      headers: { Authorization: `Bearer ${secret}` },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get("content-length")) > maxOutputBytes
    )
      throw new ProviderFailure("output_unavailable");
    mime = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > maxOutputBytes)
          throw new ProviderFailure("output_unavailable");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
  }
  const extension = mediaExtension(bytes, mime);
  if (
    !extension ||
    !bytes.length ||
    bytes.length > maxOutputBytes ||
    (media === "video" ? mime !== "video/mp4" : !mime.startsWith("image/"))
  )
    throw new ProviderFailure("output_unavailable");
  return { bytes, mime, extension };
}
