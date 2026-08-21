import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, publicUser } from "@/lib/app-auth";
import { corsOptions, json, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  let body: { name?: string; email?: string; phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim() || null;
  const password = body.password || "";

  if (!name) return jsonError("Name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return jsonError("A valid email is required.");
  if (password.length < 6)
    return jsonError("Password must be at least 6 characters.");

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists.", 409);

  const user = await prisma.appUser.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
  });

  return json({ token: signToken(user.id), user: publicUser(user) }, 201);
}
