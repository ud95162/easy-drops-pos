import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, publicUser } from "@/lib/app-auth";
import { corsOptions, json, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!email || !password) return jsonError("Email and password are required.");

  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonError("Incorrect email or password.", 401);
  }

  return json({ token: signToken(user.id), user: publicUser(user) });
}
