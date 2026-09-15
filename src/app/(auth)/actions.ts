"use server";

import { redirect } from "next/navigation";
import { LoginSchema, RegisterSchema } from "@/core/schemas/auth";
import { createPalServerClient } from "@/lib/db/server";

export type AuthFormState = {
  error?: string;
  requiresConfirmation?: boolean;
};

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = RegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createPalServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Consumed by the handle_new_user trigger to name the profile and
      // the personal workspace.
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // No session means the project requires email confirmation before login.
  if (!data.session) {
    return { requiresConfirmation: true };
  }

  redirect("/");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createPalServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password" };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createPalServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
