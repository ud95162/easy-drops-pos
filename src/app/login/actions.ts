"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession } from "@/lib/auth";

export async function login(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { error: "Please enter the password." };
  }

  if (!checkPassword(password)) {
    return { error: "Incorrect password." };
  }

  await createSession();
  redirect("/pos");
}
