import { useState, useEffect } from 'react';
import SurgeLeaderboard from './SurgeLeaderboard';
import PriceChart from './PriceChart';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { API_BASE_URL } from '../config';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetching from our local FastAPI backend
      const response = await fetch(`${API_BASE_URL}/get-market-status`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();

      setData(result.data);
      // Select the first game by default for the chart
      if (result.data && result.data.length > 0 && !selectedGame) {
        setSelectedGame(result.data[0]);
      } else if (selectedGame && result.data) {
        // Update selected game with new data if it exists
        const updatedSelection = result.data.find(g => g.game_id === selectedGame.game_id);
        if (updatedSelection) setSelectedGame(updatedSelection);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the backend server. Is it running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                GameSurge
              </h1>
              <p className="text-slate-400 text-sm font-medium tracking-wide">Real-time Game Price Intelligence</p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : 'text-slate-300'}`} />
            {loading ? 'Analyzing Markets...' : 'Refresh Data'}
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-center justify-center">
            {error}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Leaderboard */}
          <div className="lg:col-span-1">
            {loading && data.length === 0 ? (
              <div className="h-96 bg-slate-800/50 rounded-xl border border-slate-700 animate-pulse flex items-center justify-center">
                <p className="text-slate-500 font-medium">Loading metrics...</p>
              </div>
            ) : (
              <SurgeLeaderboard data={data} />
            )}
          </div>

          {/* Right Column: Chart & Details */}
          <div className="lg:col-span-2 space-y-8">
            {loading && data.length === 0 ? (
              <div className="h-[400px] bg-slate-800/50 rounded-xl border border-slate-700 animate-pulse flex items-center justify-center">
                <p className="text-slate-500 font-medium">Aggregating platform data...</p>
              </div>
            ) : (
              <>
                <PriceChart game={selectedGame} />

                {/* Game Selector for Chart */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Select Game to Analyze</h3>
                  <div className="flex flex-wrap gap-3">
                    {data.map(game => (
                      <button
                        key={game.game_id}
                        onClick={() => setSelectedGame(game)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedGame?.game_id === game.game_id
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/50'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-700 border border-slate-700 hover:border-slate-500'
                          }`}
                      >
                        {game.title}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
