import { getStudioModel, studioPresets } from "@/content/studio-models";

export const referenceMaxBytes = 4 * 1024 * 1024;
export const referenceMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type StudioConfiguration = {
  media: "image" | "video";
  execution: "live" | "guided";
  modelId: string;
  prompt: string;
  preset: string;
  ratio: string;
  quality: string;
  resolution: string;
  quantity: number;
  duration: number;
  referenceCount: number;
};

export function validateStudioConfiguration(input: StudioConfiguration) {
  const errors: string[] = [];
  const model = getStudioModel(input.modelId);
  if (!model || model.media !== input.media)
    return ["Choose a compatible model."];
  if (!input.prompt.trim() || input.prompt.length > 1200)
    errors.push("Write a prompt between 1 and 1,200 characters.");
  if (!model.ratios.includes(input.ratio))
    errors.push("Choose a supported aspect ratio.");
  if (!model.qualities.includes(input.quality))
    errors.push("Choose a supported quality.");
  if (!model.resolutions.includes(input.resolution))
    errors.push("Choose a supported resolution.");
  if (!studioPresets.some((preset) => preset === input.preset))
    errors.push("Choose a supported preset.");
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > model.maxQuantity
  )
    errors.push("Choose a supported output quantity.");
  if (input.media === "video" && !model.durations.includes(input.duration))
    errors.push("Choose a supported duration.");
  if (input.media === "image" && input.duration !== 0)
    errors.push("Image workflows do not accept a video duration.");
  if (
    !Number.isInteger(input.referenceCount) ||
    input.referenceCount < 0 ||
    input.referenceCount > model.maxReferences
  )
    errors.push("Too many references for this model.");
  return errors;
}

export function validateReferenceMetadata(
  type: string,
  size: number,
  width?: number,
  height?: number,
) {
  if (!referenceMimeTypes.some((mime) => mime === type))
    return "Use a JPEG, PNG, or WebP image.";
  if (!Number.isFinite(size) || size < 1 || size > referenceMaxBytes)
    return "Each reference must be smaller than 4 MB.";
  if (
    width !== undefined &&
    height !== undefined &&
    (width < 256 || height < 256 || width > 8192 || height > 8192)
  )
    return "Reference dimensions must be between 256 and 8,192 pixels.";
  return null;
}

export function referenceDimensions(
  bytes: Uint8Array,
  type: string,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    type === "image/png" &&
    bytes.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 255) return null;
      const marker = bytes[offset + 1]!;
      if (marker === 217 || marker === 218) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) return null;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      )
        return {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
        };
      offset += length + 2;
    }
  }
  if (
    type === "image/webp" &&
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const format = String.fromCharCode(...bytes.slice(12, 16));
    if (format === "VP8X")
      return {
        width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16),
        height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16),
      };
    if (
      format === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    )
      return {
        width: view.getUint16(26, true) & 16383,
        height: view.getUint16(28, true) & 16383,
      };
    if (format === "VP8L" && bytes[20] === 47)
      return {
        width: 1 + bytes[21]! + ((bytes[22]! & 63) << 8),
        height:
          1 + (bytes[22]! >> 6) + (bytes[23]! << 2) + ((bytes[24]! & 15) << 10),
      };
  }
  return null;
}
