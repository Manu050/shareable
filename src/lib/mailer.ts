import nodemailer from "nodemailer";

// Lazily created transporter. Skips sending if SMTP_HOST is not set (dev without mail).
let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  _transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

const FROM = process.env.SMTP_FROM ?? "Shareable <noreply@shareable.local>";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ─── HTML/header escaping ────────────────────────────────────────────────────
// El template y los subjects interpolan datos de la BD (titles, nombres). Si
// algún campo contiene `<script>` o `\r\n` se inyecta XSS en el cliente de
// email o se añaden headers SMTP. Sanitizamos en el punto de entrada.

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeSubject(s: string): string {
  // CRLF en subject permite inyectar Bcc/From. Aplastar a un espacio.
  return s.replace(/[\r\n]+/g, " ").slice(0, 200);
}

type MailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function send(payload: MailPayload) {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — silently skip in dev.
  try {
    await t.sendMail({
      from: FROM,
      to: payload.to,
      subject: safeSubject(payload.subject),
      html: payload.html,
    });
  } catch (err) {
    console.error("[mailer] send error:", err);
  }
}

function link(path: string, label: string) {
  // path es siempre literal en este archivo (no input de usuario), pero
  // pasamos el label por escape por seguridad de cara al futuro.
  return `<a href="${APP_URL}${path}" style="color:#E36A6A">${escapeHtml(label)}</a>`;
}

function template(title: string, body: string) {
  // `title` se inyecta también, escapamos por consistencia.
  const safeTitle = escapeHtml(title);
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>${safeTitle}</title></head>
<body style="font-family:sans-serif;background:#FFFBF1;margin:0;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #eddfc4">
    <h2 style="color:#2C2525;margin-top:0">${safeTitle}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #eddfc4;margin:24px 0">
    <p style="font-size:12px;color:#8B7F7F;margin:0">
      Shareable · Sanchinarro, Madrid<br>
      ${link("/dashboard", "Ir a mi panel")}
    </p>
  </div>
</body></html>`;
}

// Helper para los saludos: "Hola Juan," o "Hola," — siempre escapado.
function hello(name: string | null) {
  return `Hola${name ? ` ${escapeHtml(name)}` : ""},`;
}

// ─── Public mail helpers ────────────────────────────────────────────────────

export async function mailNewRequest(
  ownerEmail: string,
  ownerName: string | null,
  itemTitle: string,
  // requestId is part of the public signature (used by callers) — link sólo
  // al dashboard porque el chat por request no existe hasta que se acepta.
  _requestId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  await send({
    to: ownerEmail,
    subject: `Nueva solicitud para "${itemTitle}" — Shareable`,
    html: template(
      "Tienes una nueva solicitud",
      `<p>${hello(ownerName)}</p>
       <p>Un vecino quiere reservar tu objeto <strong>${escapeHtml(itemTitle)}</strong>.</p>
       <p>${link(`/dashboard`, "Ver la solicitud en tu panel →")}</p>`,
    ),
  });
}

export async function mailRequestAccepted(
  borrowerEmail: string,
  borrowerName: string | null,
  itemTitle: string,
  requestId: string,
) {
  await send({
    to: borrowerEmail,
    subject: `¡Tu solicitud para "${itemTitle}" ha sido aceptada! — Shareable`,
    html: template(
      "Solicitud aceptada",
      `<p>${hello(borrowerName)}</p>
       <p>El dueño ha aceptado tu solicitud para <strong>${escapeHtml(itemTitle)}</strong>. Ahora podéis coordinar la entrega por el chat.</p>
       <p>${link(`/requests/${requestId}/chat`, "Abrir el chat →")}</p>`,
    ),
  });
}

export async function mailRequestRejected(
  borrowerEmail: string,
  borrowerName: string | null,
  itemTitle: string,
) {
  await send({
    to: borrowerEmail,
    subject: `Tu solicitud para "${itemTitle}" no ha sido aceptada — Shareable`,
    html: template(
      "Solicitud no aceptada",
      `<p>${hello(borrowerName)}</p>
       <p>El dueño no puede prestarte <strong>${escapeHtml(itemTitle)}</strong> en este momento. Puedes buscar otras opciones en ${link("/explorar", "Explorar")}.</p>`,
    ),
  });
}

export async function mailNewMessage(
  recipientEmail: string,
  recipientName: string | null,
  senderName: string | null,
  requestId: string,
) {
  await send({
    to: recipientEmail,
    subject: `Nuevo mensaje de ${senderName ?? "un vecino"} — Shareable`,
    html: template(
      "Tienes un mensaje nuevo",
      `<p>${hello(recipientName)}</p>
       <p><strong>${escapeHtml(senderName ?? "Un vecino")}</strong> te ha enviado un mensaje sobre tu reserva.</p>
       <p>${link(`/requests/${requestId}/chat`, "Ver el chat →")}</p>`,
    ),
  });
}

export async function mailNewMatch(
  requesterEmail: string,
  requesterName: string | null,
  wantedTitle: string,
  itemTitle: string,
  wantedId: string,
) {
  await send({
    to: requesterEmail,
    subject: `¡Coincidencia encontrada para "${wantedTitle}"! — Shareable`,
    html: template(
      "Encontramos algo que buscas",
      `<p>${hello(requesterName)}</p>
       <p>Un vecino acaba de publicar <strong>${escapeHtml(itemTitle)}</strong>, que coincide con tu petición <strong>${escapeHtml(wantedTitle)}</strong>.</p>
       <p>${link(`/se-busca/${wantedId}`, "Ver las coincidencias →")}</p>`,
    ),
  });
}

export async function mailDoubleCheckComplete(
  email: string,
  name: string | null,
  itemTitle: string,
  phase: "delivered" | "returned",
) {
  const isDelivered = phase === "delivered";
  const safeItem = escapeHtml(itemTitle);
  await send({
    to: email,
    subject: `${isDelivered ? "Entrega confirmada" : "Devolución confirmada"}: "${itemTitle}" — Shareable`,
    html: template(
      isDelivered ? "Entrega confirmada" : "Devolución confirmada",
      `<p>${hello(name)}</p>
       <p>${
         isDelivered
           ? `La entrega de <strong>${safeItem}</strong> ha sido confirmada por ambas partes. El préstamo está en curso.`
           : `La devolución de <strong>${safeItem}</strong> ha sido confirmada. El préstamo está completado. ¡Gracias por usar Shareable!`
       }</p>
       <p>${link("/dashboard", "Ver mi panel →")}</p>`,
    ),
  });
}
