import { prisma } from "@/lib/prisma";
import { getUserFromRequest, publicUser } from "@/lib/app-auth";
import { corsOptions, json, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsOptions();
}

// GET /api/me — current shopper's profile.
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return jsonError("Not authenticated.", 401);
  return json({ user: publicUser(user) });
}

// PATCH /api/me — update name / phone / delivery address.
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return jsonError("Not authenticated.", 401);

  let body: { name?: string; phone?: string; address?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const updated = await prisma.appUser.update({
    where: { id: user.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
      ...(body.address !== undefined ? { address: body.address.trim() || null } : {}),
    },
  });

  return json({ user: publicUser(updated) });
}
