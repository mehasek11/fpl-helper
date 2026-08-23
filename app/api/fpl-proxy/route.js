export async function GET() {
  try {
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    return Response.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      }
    });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch FPL data' }, { status: 500 });
  }
}
