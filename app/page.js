'use client';

import { useState, useEffect } from 'react';

export default function SquadRoom() {
  const [activeTab, setActiveTab] = useState('squad'); // 'squad', 'advice', 'fixtures'

  // FPL Data States
  const [gameweeks, setGameweeks] = useState([]);
  const [selectedGw, setSelectedGw] = useState(1);
  const [fixtures, setFixtures] = useState([]);
  const [teamMap, setTeamMap] = useState({});
  const [playerMap, setPlayerMap] = useState({});
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // Manager Squad States
  const [managerId, setManagerId] = useState('');
  const [inputManagerId, setInputManagerId] = useState('');
  const [managerPicks, setManagerPicks] = useState([]);
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerName, setManagerName] = useState('hamza');

  // Fetch Bootstrap Data, Players, and Teams on Mount
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
            tMap[team.id] = team.name;
          });
          setTeamMap(tMap);
        }

        if (data.elements) {
          const pMap = {};
          data.elements.forEach(player => {
            pMap[player.id] = {
              name: `${player.first_name} ${player.second_name}`,
              webName: player.web_name,
              element_type: player.element_type, // 1: GKP, 2: DEF, 3: MID, 4: FWD
              now_cost: (player.now_cost / 10).toFixed(1)
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

  // Fetch Fixtures whenever selectedGw changes
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

  // Fetch Manager Squad Picks by Team ID
  async function handleFetchManager(e) {
    e.preventDefault();
    if (!inputManagerId) return;
    setManagerLoading(true);
    try {
      const res = await fetch(`/api/fpl-proxy?endpoint=picks&managerId=${inputManagerId}&event=${selectedGw}`);
      const data = await res.json();
      if (data.picks) {
        setManagerPicks(data.picks);
        setManagerId(inputManagerId);
      } else {
        alert('Could not find squad for this Team ID. Check the ID and try again.');
      }
    } catch (err) {
      console.error('Error fetching manager squad', err);
    } finally {
      setManagerLoading(false);
    }
  }

  // Helper position mapper
  const getPositionLabel = (type) => {
    switch (type) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'PL';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 font-sans bg-[#fbf9f5] min-h-screen text-stone-900">
      
      {/* Header Banner */}
      <div className="border-b-2 border-stone-800 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-800 text-white font-bold text-xs px-2 py-0.5 rounded">FPL</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">SQUAD ROOM</h1>
          </div>
          <p className="text-[10px] sm:text-xs text-stone-600 uppercase tracking-widest mt-0.5">
            AI Transfer Desk • Mini-League Edition
          </p>
        </div>
        <div className="bg-stone-900 text-stone-100 font-mono text-xs px-3 py-1 rounded shadow-sm">
          GW{selectedGw} • 2026/27
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex space-x-6 border-b border-stone-300 pb-2 mb-6">
        <button 
          onClick={() => setActiveTab('squad')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'squad' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          My Squad
        </button>
        <button 
          onClick={() => setActiveTab('advice')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'advice' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          AI Advice
        </button>
        <button 
          onClick={() => setActiveTab('fixtures')} 
          className={`font-bold uppercase text-xs pb-1 transition-colors ${activeTab === 'fixtures' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
        >
          Fixtures
        </button>
      </div>

      {/* MY SQUAD TAB VIEW */}
      {activeTab === 'squad' && (
        <div className="space-y-6">
          {/* Manager Details & Team ID Input */}
          <div className="bg-[#f4f1ea] border border-stone-300 rounded p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Manager</p>
              <h2 className="text-lg font-extrabold text-stone-900">{managerName} {managerId ? `(ID: ${managerId})` : ''}</h2>
            </div>

            <form onSubmit={handleFetchManager} className="flex gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Enter FPL Team ID..." 
                value={inputManagerId}
                onChange={(e) => setInputManagerId(e.target.value)}
                className="bg-white border border-stone-300 rounded px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-800 w-full sm:w-48"
              />
              <button 
                type="submit"
                className="bg-stone-900 text-white font-bold text-xs px-4 py-1.5 rounded hover:bg-stone-800 transition-colors uppercase tracking-wider whitespace-nowrap"
              >
                {managerLoading ? 'Loading...' : 'Load Squad'}
              </button>
            </form>
          </div>

          {/* Squad Pitch / Grid Container */}
          <div className="bg-[#f4f1ea] border border-stone-300 rounded p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 border-b border-stone-300 pb-2 mb-4">
              Gameweek {selectedGw} Squad Lineup
            </h3>

            {managerPicks.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs uppercase tracking-wider">
                Enter your official FPL Team ID above to load your roster onto the pitch!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {managerPicks.map((pick, index) => {
                  const player = playerMap[pick.element] || {};
                  const posName = getPositionLabel(player.element_type);

                  return (
                    <div 
                      key={index} 
                      className="bg-white border border-stone-200 rounded p-3 flex justify-between items-center shadow-xs hover:border-stone-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200 font-mono">
                          {posName}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-stone-900">
                            {player.webName || player.name || `Player #${pick.element}`}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            £{player.now_cost || '—'}m {pick.is_captain ? '• (C)' : pick.is_vice_captain ? '• (V)' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono text-xs font-bold text-stone-800">
                        {pick.position <= 11 ? 'Starting' : 'Bench'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI ADVICE TAB VIEW */}
      {activeTab === 'advice' && (
        <div className="bg-[#f4f1ea] border border-stone-300 rounded p-6 text-stone-800 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider border-b border-stone-300 pb-2">
            This Gameweek's AI Tactical Advice
          </h3>
          <p className="text-xs text-stone-600">
            Connect your team ID in the squad tab to let the AI analyze your roster against upcoming fixtures, form, and difficulty ratings.
          </p>
        </div>
      )}

      {/* FIXTURES TAB VIEW */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          {/* Horizontal Gameweek Selector Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
            {gameweeks.map((gw) => (
              <button
                key={gw.id}
                onClick={() => setSelectedGw(gw.id)}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase rounded border transition-all whitespace-nowrap ${
                  selectedGw === gw.id
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                GW {gw.id} {gw.is_current ? '• LIVE' : ''}
              </button>
            ))}
          </div>

          {/* Fixtures Matchday Hub Card */}
          <div className="bg-[#f4f1ea] border border-stone-300 rounded p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 border-b border-stone-300 pb-2 mb-4">
              Gameweek {selectedGw} Matchday Hub
            </h3>

            {loadingFixtures ? (
              <div className="text-center py-12 text-stone-500 text-xs uppercase tracking-widest animate-pulse">
                Fetching tactical fixture data...
              </div>
            ) : fixtures.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs">
                No fixtures scheduled for this gameweek.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fixtures.map((fixture) => {
                  const homeName = teamMap[fixture.team_h] || `Team ${fixture.team_h}`;
                  const awayName = teamMap[fixture.team_a] || `Team ${fixture.team_a}`;

                  return (
                    <div 
                      key={fixture.id} 
                      className="bg-white border border-stone-200 rounded p-3 flex items-center justify-between shadow-xs hover:border-stone-400 transition-colors"
                    >
                      {/* Home Team */}
                      <div className="w-5/12 text-right font-semibold text-stone-800 text-xs truncate">
                        {homeName}
                      </div>

                      {/* Score / Status Center Badge */}
                      <div className="w-2/12 flex flex-col items-center justify-center">
                        {fixture.finished ? (
                          <div className="bg-stone-900 text-white font-mono text-xs px-2 py-0.5 rounded">
                            {fixture.team_h_score} - {fixture.team_a_score}
                          </div>
                        ) : fixture.started ? (
                          <div className="bg-red-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded animate-pulse">
                            LIVE {fixture.team_h_score}-{fixture.team_a_score}
                          </div>
                        ) : (
                          <div className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            {new Date(fixture.kickoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="w-5/12 text-left font-semibold text-stone-800 text-xs truncate">
                        {awayName}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
