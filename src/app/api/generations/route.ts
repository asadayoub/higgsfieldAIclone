import { submitGeneration } from "@/app/results/actions";
import { boundedText } from "@/lib/security/bounded-body";
export const maxDuration = 300;
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Request origin rejected." },
      { status: 403 },
    );
  if (Number(request.headers.get("content-length")) > 12000)
    return Response.json({ error: "Request too large." }, { status: 413 });
  try {
    const raw = await boundedText(request, 12000);
    if (raw.length > 12000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const result = await submitGeneration(JSON.parse(raw));
    return Response.json(result, {
      status: result.error ? 400 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Invalid generation request." },
      { status: 400 },
    );
  }
}
