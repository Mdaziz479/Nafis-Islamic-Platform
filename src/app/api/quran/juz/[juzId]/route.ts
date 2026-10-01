import { getJuzService } from "@/services/quran/juz-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ juzId: string }> }) {
  const juzId = Number((await context.params).juzId);
  const result = await getJuzService().getJuz(juzId);
  return Response.json(result, { status: result.status === "success" ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}