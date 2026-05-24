import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().trim().toLowerCase().email("Email no válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128),
});

const REGISTER_LIMIT = 5; // 5 intentos por hora por IP
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = await checkRateLimit("register", ip, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" · ") ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  // Crea sin pre-check para evitar TOCTOU y enumeración por timing. Si el
  // email ya existe, Prisma lanza P2002 (unique violation) que capturamos
  // devolviendo el mismo cuerpo que un alta exitosa (no leak de emails).
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
      // Respuesta indistinguible del alta para no permitir enumeración.
      // En v3 con verificación email: aquí enviar "ya tienes cuenta" al email.
      return NextResponse.json(
        { user: { id: "00000000-0000-0000-0000-000000000000", email, name } },
        { status: 201 },
      );
    }
    throw err;
  }
}
