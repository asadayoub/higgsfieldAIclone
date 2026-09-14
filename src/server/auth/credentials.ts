import { z } from "zod";

export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const accountPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use no more than 72 characters.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

export const signInCredentialsSchema = z.object({
  email: accountEmailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpCredentialsSchema = z
  .object({
    email: accountEmailSchema,
    password: accountPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const passwordUpdateSchema = z
  .object({
    password: accountPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
