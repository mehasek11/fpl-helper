'use client';

import { useState, useEffect } from 'react';

export default function SquadRoom() {
  const [activeTab, setActiveTab] = useState('squad'); // 'squad', 'leagues', 'fixtures', 'advice'

  // FPL Data States
  const [gameweeks, setGameweeks] = useState([]);
  const [selectedGw, setSelectedGw] = useState(1);
  const [fixtures, setFixtures] = useState([]);
  const [teamMap, setTeamMap] = useState({});
  const [playerMap, setPlayerMap] = useState({});
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // Manager States
  const [managerId, setManagerId] = useState('1507193');
  const [inputManagerId, setInputManagerId] = useState('1507193');
  const [managerData, setManagerData] = useState(null);
  const [managerPicks, setManagerPicks] = useState([]);
  const [managerLoading, setManagerLoading] = useState(false);

  // Selected Player for Modal Insights
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetailsLoading, setPlayerDetailsLoading] = useState(false);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [playerUpcoming, setPlayerUpcoming] = useState([]);

  // Fetch Bootstrap Data on Mount
  useEffect(() => {
    async function fetchBootstrap() {
      try {
        const res = await fetch('/api/fpl-proxy');
        const data = await res.json();
        
        if (data.events) {
          setGameweeks(data.events);
          const current = data.events.find(e => e.is_current || e.is_next);
          if (current) setSelectedGw(current.id);
        }

        if (data.teams) {
          const tMap = {};
          data.teams.forEach(team => {
            tMap[team.id] = { name: team.name, short_name: team.short_name };
          });
          setTeamMap(tMap);
        }

        if (data.elements) {
          const pMap = {};
          data.elements.forEach(player => {
            pMap[player.id] = {
              id: player.id,
              name: `${player.first_name} ${player.second_name}`,
              webName: player.web_name,
              team: player.team,
              element_type: player.element_type, // 1: GKP, 2: DEF, 3: MID, 4: FWD
              now_cost: (player.now_cost / 10).toFixed(1),
              chance_of_playing_next_round: player.chance_of_playing_next_round,
              ep_next: player.ep_next,
              total_points: player.total_points
            };
          });
          setPlayerMap(pMap);
        }
      } catch (err) {
        console.error('Error loading bootstrap data', err);
      }
    }
    fetchBootstrap();
  }, []);

  // Fetch Manager Picks and Standings
  async function handleFetchManager(targetId = managerId) {
    if (!targetId) return;
    setManagerLoading(true);
    try {
      // Fetch manager details & leagues
      const manRes = await fetch(`/api/fpl-proxy?endpoint=manager&managerId=${targetId}`);
      const manData = await manRes.json();
      if (manData.id) setManagerData(manData);

      // Fetch squad picks for selected gw
      const picksRes = await fetch(`/api/fpl-proxy?endpoint=picks&managerId=${targetId}&event=${selectedGw}`);
      const picksData = await picksRes.json();
      if (picksData.picks) {
        setManagerPicks(picksData.picks);
        setManagerId(targetId);
      }
    } catch (err) {
      console.error('Error fetching manager info', err);
    } finally {
      setManagerLoading(false);
    }
  }

  // Auto-fetch default manager on boot once gameweeks load
  useEffect(() => {
    if (selectedGw && managerId) {
      handleFetchManager(managerId);
    }
  }, [selectedGw]);

  // Fetch fixtures
  useEffect(() => {
    async function fetchFixturesForGw() {
      if (!selectedGw) return;
      setLoadingFixtures(true);
      try {
        const res = await fetch(`/api/fpl-proxy?endpoint=fixtures&event=${selectedGw}`);
        const data = await res.json();
        setFixtures(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading fixtures', err);
      } finally {
        setLoadingFixtures(false);
      }
    }
    fetchFixturesForGw();
  }, [selectedGw]);

  // Open Player Modal & Fetch Detailed Stats
  async function handleOpenPlayerModal(elementId) {
    const player = playerMap[elementId];
    if (!player) return;
    setSelectedPlayer(player);
    setPlayerDetailsLoading(true);

    try {
      const res = await fetch(`/api/fpl-proxy?endpoint=player&playerId=${elementId}`);
      const data = await res.json();
      setPlayerHistory(data.history || []);
      setPlayerUpcoming(data.fixtures || []);
    } catch (err) {
      console.error('Error loading player deep dive', err);
    } finally {
      setPlayerDetailsLoading(false);
    }
  }

  // Group squad by positions for official pitch layout
  const startingXI = managerPicks.filter(p => p.position <= 11);
  const substitutes = managerPicks.filter(p => p.position > 11);

  const getPositionCategory = (type) => {
    if (type === 1) return 'GKP';
    if (type === 2) return 'DEF';
    if (type === 3) return 'MID';
    if (type === 4) return 'FWD';
    return 'GKP';
  };

  const startingGK = startingXI.filter(p => playerMap[p.element]?.element_type === 1);
  const startingDEF = startingXI.filter(p => playerMap[p.element]?.element_type === 2);
  const startingMID = startingXI.filter(p => playerMap[p.element]?.element_type === 3);
  const startingFWD = startingXI.filter(p => playerMap[p.element]?.element_type === 4);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 font-sans bg-[#37003c] min-h-screen text-white">
      
      {/* Premier League Fantasy Header Bar */}
      <div className="bg-[#19001a] border-b border-purple-900 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 py-3 rounded-t-lg shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-[#00ff87] text-[#37003c] font-black text-xs px-2.5 py-1 rounded tracking-tighter">
            FPL
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">SQUAD ROOM</h1>
            <p className="text-[10px] text-[#e0e0e0] uppercase tracking-widest">
              {managerData ? `${managerData.player_first_name} ${managerData.player_last_name} • ${managerData.name}` : 'Official Dashboard'}
            </p>
          </div>
        </div>

        {/* Manager ID Switcher Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleFetchManager(inputManagerId); }} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Team ID..." 
            value={inputManagerId}
            onChange={(e) => setInputManagerId(e.target.value)}
            className="bg-[#26002b] border border-purple-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#00ff87] w-28"
          />
          <button 
            type="submit"
            className="bg-[#00ff87] text-[#37003c] font-bold text-xs px-4 py-1.5 rounded hover:bg-emerald-400 transition-colors uppercase tracking-wider"
          >
            {managerLoading ? 'Loading...' : 'Load'}
          </button>
        </form>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex space-x-6 border-b border-purple-900 pb-2 mb-6 px-2">
        <button 
          onClick={() => setActiveTab('squad')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'squad' ? 'border-b-2 border-[#00ff87] text-[#00ff87]' : 'text-purple-300 hover:text-white'}`}
        >
          Pitch View
        </button>
        <button 
          onClick={() => setActiveTab('leagues')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'leagues' ? 'border-b-2 border-[#00ff87] text-[#00ff87]' : 'text-purple-300 hover:text-white'}`}
        >
          Leagues & Ranks
        </button>
        <button 
          onClick={() => setActiveTab('fixtures')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'fixtures' ? 'border-b-2 border-[#00ff87] text-[#00ff87]' : 'text-purple-300 hover:text-white'}`}
        >
          Fixtures Hub
        </button>
        <button 
          onClick={() => setActiveTab('advice')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'advice' ? 'border-b-2 border-[#00ff87] text-[#00ff87]' : 'text-purple-300 hover:text-white'}`}
        >
          AI Transfer Desk
        </button>
      </div>

      {/* Gameweek Selector Pills Bar */}
      <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-thin mb-4">
        {gameweeks.map((gw) => (
          <button
            key={gw.id}
            onClick={() => setSelectedGw(gw.id)}
            className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-all whitespace-nowrap ${
              selectedGw === gw.id
                ? 'bg-[#00ff87] text-[#37003c] border-[#00ff87] shadow'
                : 'bg-[#26002b] text-purple-200 border-purple-800 hover:bg-purple-900'
            }`}
          >
            GW {gw.id} {gw.is_current ? '• LIVE' : ''}
          </button>
        ))}
      </div>

      {/* TAB 1: PITCH VIEW (Official FPL Style) */}
      {activeTab === 'squad' && (
        <div className="space-y-6">
          {managerPicks.length === 0 ? (
            <div className="bg-[#26002b] border border-purple-800 rounded-xl p-12 text-center text-purple-300 text-xs uppercase tracking-widest">
              Loading squad lineup and formation...
            </div>
          ) : (
            /* Grass Pitch Container */
            <div className="bg-gradient-to-b from-[#018a38] to-[#01682b] border-2 border-[#00ff87]/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              
              {/* Pitch markings background lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-96 h-96 border-2 border-white rounded-full"></div>
                <div className="absolute w-full h-0.5 bg-white"></div>
              </div>

              <div className="relative z-10 space-y-8">
                
                {/* Goalkeeper */}
                <div className="flex justify-center">
                  {startingGK.map(pick => renderPlayerCard(pick))}
                </div>

                {/* Defenders */}
                <div className="flex justify-around">
                  {startingDEF.map(pick => renderPlayerCard(pick))}
                </div>

                {/* Midfielders */}
                <div className="flex justify-around">
                  {startingMID.map(pick => renderPlayerCard(pick))}
                </div>

                {/* Forwards */}
                <div className="flex justify-around">
                  {startingFWD.map(pick => renderPlayerCard(pick))}
                </div>

              </div>

              {/* Substitutes Bench Drawer */}
              <div className="mt-10 pt-4 border-t border-white/20">
                <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 mb-3 text-center">Substitutes Bench</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {substitutes.map(pick => renderPlayerCard(pick, true))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEAGUES & RANKINGS */}
      {activeTab === 'leagues' && (
        <div className="space-y-6">
          {/* Overall Rank Card */}
          <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87] mb-4">Overall Performance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-[#19001a] p-3 rounded-lg border border-purple-900">
                <p className="text-[10px] text-purple-300 uppercase">Overall Points</p>
                <p className="text-xl font-black text-white mt-1">{managerData?.summary_overall_points || '—'}</p>
              </div>
              <div className="bg-[#19001a] p-3 rounded-lg border border-purple-900">
                <p className="text-[10px] text-purple-300 uppercase">Overall Rank</p>
                <p className="text-xl font-black text-[#00ff87] mt-1">{managerData?.summary_overall_rank?.toLocaleString() || '—'}</p>
              </div>
              <div className="bg-[#19001a] p-3 rounded-lg border border-purple-900">
                <p className="text-[10px] text-purple-300 uppercase">Gameweek Points</p>
                <p className="text-xl font-black text-white mt-1">{managerData?.summary_event_points || '—'}</p>
              </div>
              <div className="bg-[#19001a] p-3 rounded-lg border border-purple-900">
                <p className="text-[10px] text-purple-300 uppercase">Team Value</p>
                <p className="text-xl font-black text-white mt-1">£{managerData?.last_deadline_value ? (managerData.last_deadline_value / 10).toFixed(1) : '—'}m</p>
              </div>
            </div>
          </div>

          {/* Mini Leagues Standings */}
          <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87] mb-4">Mini-Leagues Standings</h3>
            {!managerData?.leagues?.classic ? (
              <p className="text-xs text-purple-300">Load your manager ID in the header to view league standings.</p>
            ) : (
              <div className="space-y-4">
                {managerData.leagues.classic.map((league) => (
                  <div key={league.id} className="bg-[#19001a] border border-purple-900 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-white">{league.name}</h4>
                      <p className="text-[10px] text-purple-400">Rank: <span className="text-[#00ff87] font-bold">#{league.entry_rank}</span> (movement: {league.entry_movement})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono bg-purple-900 px-2.5 py-1 rounded text-purple-200">
                        {league.league_type === 'x' ? 'Overall' : 'Classic'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FIXTURES HUB */}
      {activeTab === 'fixtures' && (
        <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87] border-b border-purple-900 pb-2">
            Gameweek {selectedGw} Fixtures & Difficulty
          </h3>
          {loadingFixtures ? (
            <p className="text-xs text-purple-300 text-center py-8">Loading fixtures...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fixtures.map(f => {
                const home = teamMap[f.team_h]?.name || `Team ${f.team_h}`;
                const away = teamMap[f.team_a]?.name || `Team ${f.team_a}`;
                return (
                  <div key={f.id} className="bg-[#19001a] border border-purple-900 rounded-lg p-3 flex justify-between items-center">
                    <span className="text-xs font-bold w-5/12 text-right truncate">{home}</span>
                    <span className="text-xs font-mono bg-purple-900 px-2 py-1 rounded">
                      {f.finished ? `${f.team_h_score}-${f.team_a_score}` : f.started ? 'LIVE' : '15:00'}
                    </span>
                    <span className="text-xs font-bold w-5/12 text-left truncate">{away}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI ADVICE */}
      {activeTab === 'advice' && (
        <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow space-y-4 text-purple-200 text-xs">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87] border-b border-purple-900 pb-2">
            AI Tactical Transfer Desk
          </h3>
          <p>Your squad is loaded and ready for tactical evaluation. Tap any player card on the pitch view to inspect their expected points and upcoming difficulty ratings.</p>
        </div>
      )}

      {/* PLAYER DETAIL MODAL / DRAWER */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#26002b] border border-purple-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-white space-y-6">
            
            <button 
              onClick={() => setSelectedPlayer(null)}
              className="absolute top-4 right-4 text-purple-400 hover:text-white font-bold text-sm bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div>
              <span className="bg-[#00ff87] text-[#37003c] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                {getPositionCategory(selectedPlayer.element_type)}
              </span>
              <h2 className="text-xl font-black mt-2">{selectedPlayer.name}</h2>
              <p className="text-xs text-purple-300">£{selectedPlayer.now_cost}m • Total Points: {selectedPlayer.total_points}</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#19001a] border border-purple-900 p-3 rounded-lg">
                <p className="text-[10px] text-purple-400 uppercase">Chance of Playing</p>
                <p className="text-lg font-black text-[#00ff87] mt-1">
                  {selectedPlayer.chance_of_playing_next_round !== null ? `${selectedPlayer.chance_of_playing_next_round}%` : '100%'}
                </p>
              </div>
              <div className="bg-[#19001a] border border-purple-900 p-3 rounded-lg">
                <p className="text-[10px] text-purple-400 uppercase">Expected Points (Next)</p>
                <p className="text-lg font-black text-white mt-1">{selectedPlayer.ep_next || '—'}</p>
              </div>
            </div>

            {/* Upcoming Fixtures */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-purple-300 tracking-wider">Next Fixtures (Difficulty)</h4>
              {playerDetailsLoading ? (
                <p className="text-xs text-purple-400">Loading fixtures...</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {playerUpcoming.slice(0, 3).map((fix, idx) => (
                    <div key={idx} className="bg-[#19001a] border border-purple-900 p-2.5 rounded text-center">
                      <p className="text-[10px] font-bold uppercase text-purple-200">
                        {fix.is_home ? 'H' : 'A'} vs {teamMap[fix.team_h === selectedPlayer.team ? fix.team_a : fix.team_h]?.short_name || 'OPP'}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        fix.difficulty <= 2 ? 'bg-emerald-600 text-white' : fix.difficulty === 3 ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        Difficulty: {fix.difficulty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Last Fixture Points */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-purple-300 tracking-wider">Last Fixture Performance</h4>
              {playerHistory.length > 0 ? (
                <div className="bg-[#19001a] border border-purple-900 p-3 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold">GW {playerHistory[playerHistory.length - 1].round}</p>
                    <p className="text-[10px] text-purple-400">Minutes Played: {playerHistory[playerHistory.length - 1].minutes}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-[#00ff87]">
                      {playerHistory[playerHistory.length - 1].total_points} Pts
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-purple-400">No match history available.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );

  // Helper card renderer for pitch view
  function renderPlayerCard(pick, isBench = false) {
    const player = playerMap[pick.element];
    if (!player) return null;

    return (
      <div 
        key={pick.element}
        onClick={() => handleOpenPlayerModal(pick.element)}
        className="bg-[#19001a]/90 hover:bg-[#19001a] border border-purple-500/40 hover:border-[#00ff87] cursor-pointer rounded-xl p-2.5 w-28 sm:w-32 text-center shadow-lg transition-transform hover:scale-105 relative"
      >
        {/* Captain / Vice Badge */}
        {pick.is_captain && (
          <span className="absolute -top-2 -right-2 bg-[#00ff87] text-[#37003c] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
            C
          </span>
        )}
        {pick.is_vice_captain && (
          <span className="absolute -top-2 -right-2 bg-purple-400 text-[#37003c] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
            V
          </span>
        )}

        <div className="text-[10px] uppercase font-bold text-purple-300 tracking-tighter">
          {getPositionCategory(player.element_type)}
        </div>
        <div className="text-xs font-extrabold text-white truncate mt-0.5">
          {player.webName || player.name}
        </div>
        <div className="text-[10px] text-emerald-400 font-mono mt-1">
          £{player.now_cost}m • {pick.multiplier * (player.total_points || 0)} pts
        </div>
      </div>
    );
  }
}
