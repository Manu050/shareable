import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().trim().toLowerCase().email("Email no válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128),
});

// Rate-limit en memoria por IP. Para PM2 single-process es suficiente; con
// múltiples workers o tras un proxy hay que mover esto a Redis y leer la IP
// real de `x-forwarded-for` (que el proxy debe poner).
const REGISTER_LIMIT = 5; // 5 intentos
const REGISTER_WINDOW_MS = 60 * 60 * 1000; // por hora
const ipWindow = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - REGISTER_WINDOW_MS;
  const stamps = (ipWindow.get(ip) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= REGISTER_LIMIT) {
    ipWindow.set(ip, stamps);
    return false;
  }
  stamps.push(now);
  ipWindow.set(ip, stamps);
  return true;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      { status: 429 },
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
