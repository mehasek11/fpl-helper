'use client';

import { useState, useEffect } from 'react';

export default function SquadRoom() {
  const [activeTab, setActiveTab] = useState('squad'); // 'squad', 'leagues', 'fixtures'

  // FPL Data States
  const [gameweeks, setGameweeks] = useState([]);
  const [selectedGw, setSelectedGw] = useState(1);
  const [fixtures, setFixtures] = useState([]);
  const [teamMap, setTeamMap] = useState({});
  const [playerMap, setPlayerMap] = useState({});
  const [teamShirtMap, setTeamShirtMap] = useState({});
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // Manager & Viewed Team States
  const [managerId, setManagerId] = useState('1507193');
  const [inputManagerId, setInputManagerId] = useState('1507193');
  const [managerData, setManagerData] = useState(null);
  const [managerPicks, setManagerPicks] = useState([]);
  const [viewedTeamName, setViewedTeamName] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);

  // Selected Player for Modal Insights & AI Context
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerDetailsLoading, setPlayerDetailsLoading] = useState(false);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [playerUpcoming, setPlayerUpcoming] = useState([]);

  // Selected Fixture for Sofascore Style Summary Modal
  const [selectedFixture, setSelectedFixture] = useState(null);

  // Selected League for Standings & Ranks View
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leagueStandingsData, setLeagueStandingsData] = useState(null);
  const [leagueLoading, setLeagueLoading] = useState(false);

  // AI Assistant Drawer State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: "Hello manager! I'm your tactical AI. Ask me about your squad, player valuations, or who to transfer in/out!" }
  ]);
  const [aiThinking, setAiThinking] = useState(false);

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
          const sMap = {};
          data.teams.forEach(team => {
            tMap[team.id] = { name: team.name, short_name: team.short_name };
            sMap[team.id] = team.code;
          });
          setTeamMap(tMap);
          setTeamShirtMap(sMap);
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
              total_points: player.total_points,
              photoCode: player.photo ? player.photo.replace('.jpg', '') : '223'
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
  async function handleFetchManager(targetId = managerId, customTeamTitle = '') {
    if (!targetId) return;
    setManagerLoading(true);
    try {
      const manRes = await fetch(`/api/fpl-proxy?endpoint=manager&managerId=${targetId}`);
      const manData = await manRes.json();
      if (manData.id) {
        setManagerData(manData);
        if (!customTeamTitle) {
          setViewedTeamName(`${manData.player_first_name} ${manData.player_last_name} (${manData.name})`);
        } else {
          setViewedTeamName(customTeamTitle);
        }
      }

      const picksRes = await fetch(`/api/fpl-proxy?endpoint=picks&managerId=${targetId}&event=${selectedGw}`);
      const picksData = await picksRes.json();
      if (picksData.picks) {
        setManagerPicks(picksData.picks);
        if (!customTeamTitle) setManagerId(targetId);
      }
    } catch (err) {
      console.error('Error fetching manager info', err);
    } finally {
      setManagerLoading(false);
      setActiveTab('squad');
    }
  }

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

  // Fetch League Standings
  async function handleOpenLeague(league) {
    setSelectedLeague(league);
    setLeagueLoading(true);
    try {
      const res = await fetch(`/api/fpl-proxy?endpoint=league&leagueId=${league.id}`);
      const data = await res.json();
      setLeagueStandingsData(data);
    } catch (err) {
      console.error('Error loading league standings', err);
    } finally {
      setLeagueLoading(false);
    }
  }

  // Open Player Drawer & Fetch Detailed Stats
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

  // Handle AI Chat Submission with Screen Context
  async function handleAiSubmit(e) {
    e.preventDefault();
    if (!aiChatInput.trim()) return;

    const userMsg = aiChatInput;
    setAiChatInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiThinking(true);

    // Simulate intelligent tactical evaluation based on current screen context (e.g., selected player)
    setTimeout(() => {
      let aiResponse = "";
      if (selectedPlayer) {
        aiResponse = `Analyzing ${selectedPlayer.name} (£${selectedPlayer.now_cost}m, Total Pts: ${selectedPlayer.total_points}):\n\n`;
        if (selectedPlayer.total_points > 30 || selectedPlayer.ep_next > 4) {
          aiResponse += `**Verdict: KEEP.** This asset is delivering consistent returns with strong expected points (${selectedPlayer.ep_next || 'High'}). Selling now would hurt your rank.\n\n**Top Alternatives:** Consider sideways transfers only if targeting double gameweeks.`;
        } else {
          aiResponse += `**Verdict: SELL / REPLACE.** Output has stalled relative to price. \n\n**Recommended Replacements:** Look at in-form midfielders/forwards with easier fixtures in the next 3 gameweeks.`;
        }
      } else {
        aiResponse = `Looking at your current squad overview for GW${selectedGw}: Your formation is balanced, but keep an eye on upcoming fixture swings and bench coverage before the next deadline!`;
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setAiThinking(false);
    }, 800);
  }

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

  const getShirtImageUrl = (playerElement, isGoalkeeper = false) => {
    const player = playerMap[playerElement];
    if (!player) return '';
    const teamCode = teamShirtMap[player.team] || 1;
    const kitType = isGoalkeeper ? '_1' : '';
    return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}${kitType}-66.png`;
  };

  const getPlayerPhotoUrl = (photoCode) => {
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${photoCode}.png`;
  };

  return (
    <div className="min-h-screen w-full bg-[#37003c] text-white flex flex-col font-sans overflow-x-hidden m-0 p-0">
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-[#19001a] border-b border-purple-900 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 py-3 rounded-t-lg shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-[#00ff87] text-[#37003c] font-black text-xs px-2.5 py-1 rounded tracking-tighter">
              FPL
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">SQUAD ROOM</h1>
              <p className="text-[10px] text-[#00ff87] uppercase tracking-widest font-bold">
                Viewing: {viewedTeamName || 'Loading...'}
              </p>
            </div>
          </div>

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

        {/* Navigation Tabs */}
        <div className="flex space-x-6 border-b border-purple-900 pb-2 mb-6 px-2">
          <button 
            onClick={() => setActiveTab('squad')} 
            className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'squad' ? 'border-b-2 border-[#00ff87] text-[#00ff87]' : 'text-purple-300 hover:text-white'}`}
          >
            Pitch View
          </button>
          <button 
            onClick={() => { setActiveTab('leagues'); setSelectedLeague(null); }} 
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
        </div>

        {/* Gameweek Selector */}
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

        {/* TAB 1: PITCH VIEW */}
        {activeTab === 'squad' && (
          <div className="space-y-6">
            {managerPicks.length === 0 ? (
              <div className="bg-[#26002b] border border-purple-800 rounded-xl p-12 text-center text-purple-300 text-xs uppercase tracking-widest">
                Loading squad lineup and formation...
              </div>
            ) : (
              <div className="rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-emerald-500/40" style={{
                backgroundImage: 'linear-gradient(rgba(1, 95, 38, 0.75), rgba(1, 60, 24, 0.85)), url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}>
                
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-center">{startingGK.map(pick => renderPlayerCard(pick))}</div>
                  <div className="flex justify-around">{startingDEF.map(pick => renderPlayerCard(pick))}</div>
                  <div className="flex justify-around">{startingMID.map(pick => renderPlayerCard(pick))}</div>
                  <div className="flex justify-around">{startingFWD.map(pick => renderPlayerCard(pick))}</div>
                </div>

                <div className="mt-10 pt-4 border-t border-white/20 relative z-10">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 mb-3 text-center">Substitutes Bench</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {substitutes.map(pick => renderPlayerCard(pick, true))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEAGUES */}
        {activeTab === 'leagues' && (
          <div className="space-y-6">
            {!selectedLeague ? (
              <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87]">Mini-Leagues Standings</h3>
                {!managerData?.leagues?.classic ? (
                  <p className="text-xs text-purple-300">Load your manager ID in the header to view league standings.</p>
                ) : (
                  <div className="space-y-3">
                    {managerData.leagues.classic.map((league) => (
                      <div 
                        key={league.id} 
                        onClick={() => handleOpenLeague(league)}
                        className="bg-[#19001a] hover:bg-purple-950 border border-purple-900 hover:border-[#00ff87] cursor-pointer rounded-lg p-4 flex justify-between items-center transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-sm text-white">{league.name}</h4>
                          <p className="text-[10px] text-purple-400">Your Rank: <span className="text-[#00ff87] font-bold">#{league.entry_rank}</span></p>
                        </div>
                        <span className="text-xs font-mono bg-purple-900 px-3 py-1 rounded text-purple-200 uppercase font-bold">
                          View Table ➔
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow space-y-6">
                <div className="flex justify-between items-center border-b border-purple-900 pb-3">
                  <div>
                    <button onClick={() => setSelectedLeague(null)} className="text-xs text-[#00ff87] hover:underline font-bold mb-1 block">
                      ← Back to Leagues
                    </button>
                    <h3 className="text-base font-black text-white">{selectedLeague.name}</h3>
                  </div>
                  <span className="text-xs bg-purple-900 px-3 py-1 rounded font-mono text-emerald-300 font-bold">
                    Standings Table
                  </span>
                </div>

                {leagueLoading ? (
                  <p className="text-xs text-purple-300 text-center py-8">Loading league table and teams...</p>
                ) : (
                  <div className="space-y-2 overflow-x-auto">
                    <div className="min-w-[500px]">
                      <div className="grid grid-cols-12 text-[10px] font-bold uppercase text-purple-400 pb-2 border-b border-purple-900 px-3">
                        <span className="col-span-1">Rank</span>
                        <span className="col-span-5">Manager & Team</span>
                        <span className="col-span-3 text-center">GW Points</span>
                        <span className="col-span-3 text-right">Total Pts</span>
                      </div>
                      {leagueStandingsData?.standings?.results?.map((row) => (
                        <div 
                          key={row.id}
                          onClick={() => handleFetchManager(row.entry, `${row.player_name} (${row.entry_name})`)}
                          className={`grid grid-cols-12 items-center p-3 rounded-lg cursor-pointer transition-colors text-xs border ${
                            row.entry === Number(managerId) 
                              ? 'bg-[#00ff87]/10 border-[#00ff87]' 
                              : 'bg-[#19001a] border-purple-900 hover:bg-purple-900/50'
                          }`}
                        >
                          <span className="col-span-1 font-mono font-bold text-[#00ff87]">#{row.rank}</span>
                          <div className="col-span-5 truncate">
                            <p className="font-bold text-white truncate">{row.player_name}</p>
                            <p className="text-[10px] text-purple-400 truncate">{row.entry_name}</p>
                          </div>
                          <span className="col-span-3 text-center font-mono">{row.event_total}</span>
                          <span className="col-span-3 text-right font-black font-mono text-emerald-400">{row.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FIXTURES HUB */}
        {activeTab === 'fixtures' && (
          <div className="bg-[#26002b] border border-purple-800 rounded-xl p-6 shadow space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff87] border-b border-purple-900 pb-2">
              Gameweek {selectedGw} Fixtures & Match Centers
            </h3>
            {loadingFixtures ? (
              <p className="text-xs text-purple-300 text-center py-8">Loading fixtures...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fixtures.map(f => {
                  const home = teamMap[f.team_h]?.name || `Team ${f.team_h}`;
                  const away = teamMap[f.team_a]?.name || `Team ${f.team_a}`;
                  return (
                    <div 
                      key={f.id} 
                      onClick={() => setSelectedFixture(f)}
                      className="bg-[#19001a] hover:bg-purple-950 border border-purple-900 hover:border-[#00ff87] cursor-pointer rounded-lg p-3.5 flex justify-between items-center transition-all shadow"
                    >
                      <span className="text-xs font-bold w-4/12 text-right truncate">{home}</span>
                      <div className="text-center w-4/12">
                        <span className="text-xs font-mono bg-purple-900 px-3 py-1 rounded text-[#00ff87] font-bold">
                          {f.finished ? `${f.team_h_score} - ${f.team_a_score}` : f.started ? `${f.team_h_score}-${f.team_a_score}` : '15:00'}
                        </span>
                        <p className="text-[9px] text-purple-400 mt-1 uppercase">Match Center ➔</p>
                      </div>
                      <span className="text-xs font-bold w-4/12 text-left truncate">{away}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PLAYER SLIDING DRAWER WITH OFFICIAL ACTION PHOTO */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex justify-end z-50 transition-opacity">
            <div className="bg-[#26002b] border-l border-purple-600 h-full max-w-md w-full p-6 shadow-2xl relative text-white space-y-6 overflow-y-auto animate-in slide-in-from-right duration-300">
              
              <div className="flex justify-between items-center border-b border-purple-900 pb-4">
                <span className="bg-[#00ff87] text-[#37003c] text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                  {getPositionCategory(selectedPlayer.element_type)}
                </span>
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="text-purple-400 hover:text-white font-bold text-sm bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Player Header with Official Action Photo */}
              <div className="flex items-center gap-4 bg-[#19001a] border border-purple-900 rounded-2xl p-4 shadow-inner">
                <div className="w-20 h-24 bg-purple-950 rounded-xl overflow-hidden flex-shrink-0 border border-purple-700 flex items-center justify-center">
                  <img 
                    src={getPlayerPhotoUrl(selectedPlayer.photoCode)} 
                    alt={selectedPlayer.name}
                    className="h-28 object-cover mt-2"
                    onError={(e) => { e.target.src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/photo-missing.png'; }}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black">{selectedPlayer.name}</h2>
                  <p className="text-xs text-purple-300 mt-1">£{selectedPlayer.now_cost}m • Total: <span className="text-[#00ff87] font-bold">{selectedPlayer.total_points} Pts</span></p>
                  <p className="text-[10px] text-purple-400 mt-1 uppercase font-bold">Official PL Registered Player</p>
                </div>
              </div>

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

              {/* Next 3 Fixtures */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-purple-300 tracking-wider">Next 3 Fixtures & Expected Points</h4>
                {playerDetailsLoading ? (
                  <p className="text-xs text-purple-400">Loading fixtures...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {playerUpcoming.slice(0, 3).map((fix, idx) => (
                      <div key={idx} className="bg-[#19001a] border border-purple-900 p-2.5 rounded text-center space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-purple-200">
                          {fix.is_home ? 'H' : 'A'} vs {teamMap[fix.team_h === selectedPlayer.team ? fix.team_a : fix.team_h]?.short_name || 'OPP'}
                        </p>
                        <div className="flex justify-center items-center gap-1.5">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            fix.difficulty <= 2 ? 'bg-emerald-600 text-white' : fix.difficulty === 3 ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            Diff: {fix.difficulty}
                          </span>
                          <span className="text-[10px] font-mono bg-purple-900 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                            xPts: {selectedPlayer.ep_next || '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Last Match Performance */}
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

              {/* Quick Prompt AI Suggestion in Drawer */}
              <div className="bg-purple-950/60 border border-purple-700/60 p-3.5 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-[#00ff87]">💡 Ask SquadAI about {selectedPlayer.webName}:</p>
                <button 
                  onClick={() => { setIsAiOpen(true); setAiChatInput(`Is ${selectedPlayer.name} worth keeping in my team right now?`); }}
                  className="w-full bg-[#00ff87] text-[#37003c] font-bold text-xs py-2 rounded hover:bg-emerald-400 transition-colors uppercase tracking-wider"
                >
                  Analyze with SquadAI ➔
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SOFASCORE STYLE MATCH SUMMARY MODAL */}
        {selectedFixture && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-[#26002b] border border-purple-600 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-6">
              <button 
                onClick={() => setSelectedFixture(null)}
                className="absolute top-4 right-4 text-purple-400 hover:text-white font-bold text-sm bg-purple-900/50 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>

              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#00ff87] text-[#37003c] px-2 py-0.5 rounded">
                  Match Center • Sofascore Style
                </span>
                <div className="flex justify-between items-center mt-4 px-4">
                  <div className="w-5/12 text-right">
                    <p className="font-black text-sm">{teamMap[selectedFixture.team_h]?.name}</p>
                  </div>
                  <div className="w-2/12 text-center font-mono text-xl font-black text-[#00ff87]">
                    {selectedFixture.finished ? `${selectedFixture.team_h_score}-${selectedFixture.team_a_score}` : selectedFixture.started ? `${selectedFixture.team_h_score}-${selectedFixture.team_a_score}` : 'VS'}
                  </div>
                  <div className="w-5/12 text-left">
                    <p className="font-black text-sm">{teamMap[selectedFixture.team_a]?.name}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-[#19001a] border border-purple-900 p-4 rounded-xl text-xs">
                <div className="flex justify-between border-b border-purple-900 pb-2">
                  <span className="text-purple-400">Match Status</span>
                  <span className="font-bold text-[#00ff87]">{selectedFixture.finished ? 'Full Time' : selectedFixture.started ? 'Live in Progress' : 'Upcoming Kickoff'}</span>
                </div>
                <div className="flex justify-between border-b border-purple-900 pb-2">
                  <span className="text-purple-400">Gameweek</span>
                  <span className="font-bold">GW {selectedFixture.event}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Difficulty Rating (Home / Away)</span>
                  <span className="font-bold font-mono">{selectedFixture.team_h_difficulty} / {selectedFixture.team_a_difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING AI ASSISTANT BUTTON & DRAWER */}
        <div className="fixed bottom-6 right-6 z-50">
          {!isAiOpen ? (
            <button
              onClick={() => setIsAiOpen(true)}
              className="bg-[#00ff87] hover:bg-emerald-400 text-[#37003c] p-3.5 rounded-full shadow-2xl flex items-center justify-center font-black transition-transform hover:scale-110 border-2 border-white"
              title="Open SquadAI Assistant"
            >
              🤖
            </button>
          ) : (
            <div className="bg-[#26002b] border border-purple-600 rounded-2xl w-80 sm:w-96 h-[480px] shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-300">
              
              {/* AI Header */}
              <div className="bg-[#19001a] border-b border-purple-900 p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="bg-[#00ff87] text-[#37003c] text-xs font-black px-2 py-0.5 rounded">AI</span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider">SquadAI Assistant</h3>
                    <p className="text-[9px] text-[#00ff87]">Screen-Aware Active</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiOpen(false)}
                  className="text-purple-400 hover:text-white font-bold text-xs bg-purple-900/50 w-6 h-6 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                {aiMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl p-2.5 ${
                      msg.role === 'user' 
                        ? 'bg-[#00ff87] text-[#37003c] font-bold' 
                        : 'bg-[#19001a] border border-purple-900 text-purple-100'
                    }`}>
                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {aiThinking && (
                  <div className="flex justify-start">
                    <div className="bg-[#19001a] border border-purple-900 text-purple-400 rounded-xl p-2.5 text-xs animate-pulse">
                      Analyzing screen state & stats...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleAiSubmit} className="p-3 bg-[#19001a] border-t border-purple-900 flex gap-2">
                <input 
                  type="text"
                  placeholder={selectedPlayer ? `Ask about ${selectedPlayer.webName}...` : "Ask AI anything about your squad..."}
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  className="flex-1 bg-[#26002b] border border-purple-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#00ff87]"
                />
                <button 
                  type="submit"
                  className="bg-[#00ff87] text-[#37003c] font-bold text-xs px-3 py-1.5 rounded hover:bg-emerald-400"
                >
                  Send
                </button>
              </form>

            </div>
          )}
        </div>

      </div>
    </div>
  );

  function renderPlayerCard(pick, isBench = false) {
    const player = playerMap[pick.element];
    if (!player) return null;

    const isGk = player.element_type === 1;
    const shirtUrl = getShirtImageUrl(pick.element, isGk);

    return (
      <div 
        key={pick.element}
        onClick={() => handleOpenPlayerModal(pick.element)}
        className="bg-[#19001a]/95 hover:bg-[#19001a] border border-purple-500/40 hover:border-[#00ff87] cursor-pointer rounded-xl p-2 w-28 sm:w-32 text-center shadow-2xl transition-transform hover:scale-105 relative flex flex-col items-center"
      >
        {pick.is_captain && (
          <span className="absolute top-1 right-1 bg-[#00ff87] text-[#37003c] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-20">
            C
          </span>
        )}
        {pick.is_vice_captain && (
          <span className="absolute top-1 right-1 bg-purple-400 text-[#37003c] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow z-20">
            V
          </span>
        )}

        <div className="h-10 flex items-center justify-center my-0.5">
          {shirtUrl ? (
            <img src={shirtUrl} alt="kit" className="h-9 object-contain drop-shadow-md" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-purple-900"></div>
          )}
        </div>

        <div className="bg-[#26002b] w-full rounded-lg p-1 mt-1 border border-purple-900">
          <div className="text-xs font-extrabold text-white truncate px-1">
            {player.webName || player.name}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex justify-center gap-1">
            <span>£{player.now_cost}m</span>
            <span>•</span>
            <span className="font-bold">{pick.multiplier * (player.total_points || 0)} pts</span>
          </div>
        </div>
      </div>
    );
  }
}
