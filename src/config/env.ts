import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_APP_URL: optionalUrl.default("http://localhost:3000"),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  DATABASE_URL: optionalString,
  PROVIDER_KEY_ENCRYPTION_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .optional(),
  ),
  ADMIN_EMAIL_ALLOWLIST: optionalString,
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
type EnvironmentSource = Record<string, string | undefined>;

export function readPublicEnv(
  source: EnvironmentSource = process.env,
): PublicEnv {
  return publicSchema.parse(source);
}

export function readServerEnv(
  source: EnvironmentSource = process.env,
): ServerEnv {
  return serverSchema.parse(source);
}

export function hasSupabaseConfig(env: ServerEnv): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
