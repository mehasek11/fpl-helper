export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const event = searchParams.get('event');
    const managerId = searchParams.get('managerId');
    const playerId = searchParams.get('playerId');
    const leagueId = searchParams.get('leagueId');
    const fixtureId = searchParams.get('fixtureId');

    let fplUrl = 'https://fantasy.premierleague.com/api/bootstrap-static/';

    if (endpoint === 'fixtures') {
      fplUrl = event 
        ? `https://fantasy.premierleague.com/api/fixtures/?event=${event}`
        : 'https://fantasy.premierleague.com/api/fixtures/';
    } else if (endpoint === 'picks' && managerId && event) {
      fplUrl = `https://fantasy.premierleague.com/api/entry/${managerId}/event/${event}/picks/`;
    } else if (endpoint === 'manager' && managerId) {
      fplUrl = `https://fantasy.premierleague.com/api/entry/${managerId}/`;
    } else if (endpoint === 'player' && playerId) {
      fplUrl = `https://fantasy.premierleague.com/api/element-summary/${playerId}/`;
    } else if (endpoint === 'league' && leagueId) {
      fplUrl = `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`;
    }

    const response = await fetch(fplUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    const data = await response.json();

    return Response.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      }
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch FPL data', details: error.message },
      { status: 500 }
    );
  }
}
