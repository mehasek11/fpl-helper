export async function GET() {
  return Response.json({ error: 'Removed', message: 'Use Vercel serverless at /api/fpl-proxy' }, { status: 410 });
}
