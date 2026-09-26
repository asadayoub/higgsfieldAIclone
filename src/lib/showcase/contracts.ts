import { z } from "zod";
import { creationCategories } from "@/content/creations";

export const showcaseCategorySchema = z.enum(creationCategories);
export type ShowcaseCategory = z.infer<typeof showcaseCategorySchema>;

export const showcaseFiltersSchema = z.object({
  q: z.string().trim().max(80).default(""),
  type: z.enum(["all", "image", "video"]).default("all"),
  category: z.union([z.literal("all"), showcaseCategorySchema]).default("all"),
});
export type ShowcaseFilters = z.infer<typeof showcaseFiltersSchema>;

export const defaultShowcaseFilters: ShowcaseFilters = {
  q: "",
  type: "all",
  category: "all",
};

export function normalizeShowcaseFilters(values: {
  q?: string | string[] | null;
  type?: string | string[] | null;
  category?: string | string[] | null;
}): ShowcaseFilters {
  const parsed = showcaseFiltersSchema.safeParse({
    q: typeof values.q === "string" ? values.q : "",
    type: typeof values.type === "string" ? values.type : "all",
    category: typeof values.category === "string" ? values.category : "all",
  });
  return parsed.success ? parsed.data : defaultShowcaseFilters;
}

export function showcaseFiltersToSearchParams(filters: ShowcaseFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.category !== "all") params.set("category", filters.category);
  return params;
}

export const showcaseItemSchema = z.object({
  id: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(100),
  category: showcaseCategorySchema,
  media: z.enum(["image", "video"]),
  publicUrl: z.string().min(1),
  alt: z.string().min(1).max(240),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  ratio: z.string().min(1).max(20),
  modelLabel: z.string().min(1).max(100).nullable(),
  publishedAt: z.iso.datetime(),
  source: z.enum(["editorial", "community"]),
  detailHref: z.string().startsWith("/"),
  recreateHref: z.string().startsWith("/").nullable(),
});
export type ShowcaseItem = z.infer<typeof showcaseItemSchema>;

export const showcasePageSchema = z.object({
  items: z.array(showcaseItemSchema),
  nextCursor: z.string().max(1000).nullable(),
  hasMore: z.boolean(),
});
export type ShowcasePage = z.infer<typeof showcasePageSchema>;

export const showcasePublicationSchema = z
  .object({
    confirmed: z.literal(true),
    listInShowcase: z.boolean(),
    title: z.string().trim().max(100).default(""),
    category: z.union([showcaseCategorySchema, z.literal("")]).default(""),
    alt: z.string().trim().max(240).default(""),
  })
  .superRefine((value, context) => {
    if (!value.listInShowcase) return;
    if (!value.title)
      context.addIssue({
        code: "custom",
        path: ["title"],
        message: "Add a public title.",
      });
    if (!value.category)
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "Choose a public category.",
      });
    if (value.alt.length < 3)
      context.addIssue({
        code: "custom",
        path: ["alt"],
        message: "Add a short public image description.",
      });
  });
export type ShowcasePublicationInput = z.infer<
  typeof showcasePublicationSchema
>;
