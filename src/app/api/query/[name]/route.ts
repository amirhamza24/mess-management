import { NextResponse, type NextRequest } from "next/server"
import { run } from "@/server/errors"
import { queries } from "@/server/queries"

// Read endpoint for the client (Server Functions run one at a time, so reads
// go through a Route Handler to stay parallel). Each query authorises itself.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/query/[name]">) {
  const { name } = await ctx.params
  if (!Object.hasOwn(queries, name)) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
  }
  const args: unknown = await request.json().catch(() => [])
  const fn = queries[name as keyof typeof queries] as (...a: unknown[]) => Promise<unknown>
  const result = await run(() => fn(...(Array.isArray(args) ? args : [])))
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}
