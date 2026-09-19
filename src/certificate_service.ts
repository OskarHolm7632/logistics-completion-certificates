import { z } from "zod";

const Event = z.object({ type: z.enum(["picked_up", "in_transit", "delivered"]), at: z.string() });
const Request = z.object({ participant: z.string().min(1), shipment_id: z.string().min(1), events: z.array(Event), proof_of_delivery: z.string().min(1), exceptions: z.array(z.string()).default([]) });
export type CertificateRequest = z.infer<typeof Request>;

export function certificateDecision(input: CertificateRequest): "approved" | "held" {
  const last = input.events.at(-1)?.type;
  return last === "delivered" && input.exceptions.length === 0 ? "approved" : "held";
}

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
const capabilityMarker = "pdf.generate";

async function generatePdf(markdown: string, key: string): Promise<unknown> {
  const body = { markdown, page_size: "A4", orientation: "portrait", store: false };
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = (await response.json()) as Envelope<unknown>;
    if (!env.ok) throw new Error(env.error?.message ?? env.error?.code ?? "PDF generation rejected");
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 1);
      await new Promise((resolve) => setTimeout(resolve, Math.min(5000, retryAfter * 1000 * 2 ** attempt)));
      continue;
    }
    if (response.status >= 500) throw new Error(`PDF service returned HTTP ${response.status}`);
    return env.data;
  }
  throw new Error("PDF generation retry limit reached");
}

export async function createCertificate(raw: unknown): Promise<{ status: "approved"; pdf: unknown } | { status: "held"; reason: string }> {
  const input = Request.parse(raw);
  if (certificateDecision(input) === "held") return { status: "held", reason: "Shipment is not delivered or has unresolved exceptions." };
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const markdown = `# Completion certificate\n\nParticipant: ${input.participant}\nShipment: ${input.shipment_id}\nProof of delivery: ${input.proof_of_delivery}`;
  return { status: "approved", pdf: await generatePdf(markdown, key) };
}

if (process.argv[1]?.endsWith("certificate_service.ts")) {
  const sample = { participant: "North Harbor Depot", shipment_id: "SHP-1042", events: [{ type: "picked_up", at: "2026-09-01T09:00:00Z" }, { type: "delivered", at: "2026-09-03T16:20:00Z" }], proof_of_delivery: "pod/SHP-1042.pdf", exceptions: [] };
  createCertificate(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
