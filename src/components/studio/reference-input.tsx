"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudUpload,
  Plus,
  X,
} from "lucide-react";
import { uploadStudioReference } from "@/app/studio/actions";
import {
  referenceDimensions,
  validateReferenceMetadata,
} from "@/lib/studio/validation";

export type StudioReference = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  path?: string;
};

export function ReferenceInput({
  references,
  onChange,
  maxCount,
  signedIn,
}: {
  references: StudioReference[];
  onChange: Dispatch<SetStateAction<StudioReference[]>>;
  maxCount: number;
  signedIn: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const reading = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  async function addFiles(files: File[]) {
    if (reading.current || uploading !== null) return;
    setError("");
    if (files.length + references.length > maxCount) {
      setError(
        `This model accepts ${maxCount} reference${maxCount === 1 ? "" : "s"}.`,
      );
      return;
    }
    const added: StudioReference[] = [];
    reading.current = true;
    setProcessing(true);
    try {
      for (const file of files) {
        const metadataError = validateReferenceMetadata(file.type, file.size);
        if (metadataError) {
          setError(metadataError);
          continue;
        }
        const dimensions = referenceDimensions(
          new Uint8Array(await file.arrayBuffer()),
          file.type,
        );
        if (!dimensions) {
          setError("The file contents do not match a supported image.");
          continue;
        }
        const dimensionError = validateReferenceMetadata(
          file.type,
          file.size,
          dimensions.width,
          dimensions.height,
        );
        if (dimensionError) {
          setError(dimensionError);
          continue;
        }
        try {
          const decoded = await createImageBitmap(file);
          decoded.close();
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          added.push({ id: crypto.randomUUID(), file, url, ...dimensions });
        } catch {
          setError("This image could not be decoded. Try another file.");
        }
      }
      onChange((current) => [...current, ...added]);
    } catch {
      setError("This file could not be read. Please retry.");
      for (const reference of added) {
        URL.revokeObjectURL(reference.url);
        urls.current.delete(reference.url);
      }
    } finally {
      reading.current = false;
      setProcessing(false);
    }
  }

  function remove(id: string) {
    const removed = references.find((reference) => reference.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
      urls.current.delete(removed.url);
    }
    onChange((current) => current.filter((reference) => reference.id !== id));
  }

  function move(index: number, direction: number) {
    const next = [...references];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  async function upload(reference: StudioReference) {
    setUploading(reference.id);
    setError("");
    try {
      const form = new FormData();
      form.set("reference", reference.file);
      const result = await uploadStudioReference(form);
      if (result.error) setError(result.error);
      else if (result.path) {
        const path = result.path;
        onChange((current) =>
          current.map((item) =>
            item.id === reference.id ? { ...item, path } : item,
          ),
        );
      }
    } catch {
      setError("Private upload failed. Please retry.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <section aria-label="Reference images" className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--text-muted)]">
          References
        </span>
        <span className="text-[var(--text-faint)]">
          {references.length} / {maxCount}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose reference images"
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      {maxCount > 0 ? (
        <button
          type="button"
          disabled={
            references.length >= maxCount || uploading !== null || processing
          }
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!uploading) void addFiles(Array.from(event.dataTransfer.files));
          }}
          className="flex min-h-20 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-xs text-[var(--text-muted)] hover:border-[var(--action)] disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
          Drop images or choose files · up to 4 MB
        </button>
      ) : (
        <p className="text-xs text-[var(--text-faint)]">
          This model uses text-only input.
        </p>
      )}
      {references.map((reference, index) => (
        <div
          key={reference.id}
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 p-2"
        >
          <Image
            src={reference.url}
            alt={`Reference ${index + 1}`}
            width={56}
            height={56}
            unoptimized
            className="size-14 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {reference.file.name}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">
              {reference.width} × {reference.height} ·{" "}
              {reference.path ? "Private upload ready" : "Local preview only"}
            </p>
            {signedIn && !reference.path ? (
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => void upload(reference)}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--action)] disabled:opacity-40"
              >
                <CloudUpload className="size-3" aria-hidden="true" />
                {uploading === reference.id ? "Uploading…" : "Upload privately"}
              </button>
            ) : reference.path ? (
              <Check
                className="mt-1 size-3 text-[var(--success)]"
                aria-label="Uploaded privately"
              />
            ) : null}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={`Move reference ${index + 1} earlier`}
              disabled={index === 0 || uploading !== null}
              onClick={() => move(index, -1)}
              className="p-1 disabled:opacity-20"
            >
              <ArrowLeft className="size-3" />
            </button>
            <button
              type="button"
              aria-label={`Move reference ${index + 1} later`}
              disabled={index === references.length - 1 || uploading !== null}
              onClick={() => move(index, 1)}
              className="p-1 disabled:opacity-20"
            >
              <ArrowRight className="size-3" />
            </button>
            <button
              type="button"
              aria-label={`Remove reference ${index + 1}`}
              disabled={uploading !== null}
              onClick={() => remove(reference.id)}
              className="p-1 text-[var(--text-muted)] hover:text-white disabled:opacity-20"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <p className="text-[10px] leading-4 text-[var(--text-faint)]">
        {signedIn
          ? "Uploads are private to your account. Removing a preview does not delete an uploaded object."
          : "References stay on this device until you sign in and explicitly upload."}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
