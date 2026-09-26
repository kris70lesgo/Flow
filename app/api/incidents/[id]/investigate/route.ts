import { NextResponse, type NextRequest } from "next/server";
import { runInvestigation } from "@/lib/orchestration/investigation";
import {
  beginInvestigation,
  clientRateLimitKey,
  consumeRateLimit,
  finishInvestigation,
  isSameOriginRequest,
  parseIncidentId,
} from "@/lib/security/request-guards";

export const dynamic = "force-dynamic";
// The investigation runs five concurrent SerpApi queries, six extractions and a
// paced flush to Xano. The platform default (10s) cuts that off mid-run.
export const maxDuration = 60;

export async function POST(request: NextRequest, context: RouteContext<"/api/incidents/[id]/investigate">) {
  const { id: rawId } = await context.params;
  const parsedId = parseIncidentId(rawId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid incident id" }, { status: 400 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const rateLimit = consumeRateLimit(clientRateLimitKey(request), { limit: 2, windowMs: 60_000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many investigation requests. Please wait before retrying." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const id = parsedId.data;
  if (!beginInvestigation(id)) {
    return NextResponse.json({ error: "An investigation for this incident is already running." }, { status: 409 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const step of runInvestigation(id)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`));
      } finally {
        finishInvestigation(id);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
