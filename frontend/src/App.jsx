import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Storefront from './components/Storefront';
import GameDetails from './components/GameDetails';
import CommandPalette from './components/CommandPalette';
import Watchlist from './components/Watchlist';
import AuthCallback from './components/AuthCallback';
import { WatchlistProvider } from './contexts/WatchlistContext';
import { API_BASE_URL } from './config';
import { CurrencyProvider } from './contexts/CurrencyContext';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchData = async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/get-market-status?page=${page}&limit=30`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      const newData = json.data || [];
      if (append) {
        setData(prev => [...prev, ...newData]);
      } else {
        setData(newData);
      }
      setPagination(json.pagination || null);
    } catch (err) {
      console.error('API Error:', err);
      setError('Unable to load market data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (pagination && pagination.page < pagination.total_pages) {
      fetchData(pagination.page + 1, true);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CurrencyProvider>
      <WatchlistProvider>
        <Router>
          <CommandPalette data={data} isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
          <Routes>
            <Route
              path="/"
              element={
                <Storefront
                  data={data}
                  loading={loading}
                  error={error}
                  onRetry={() => fetchData()}
                  onOpenSearch={() => setPaletteOpen(true)}
                  onLoadMore={loadMore}
                  pagination={pagination}
                />
              }
            />
            <Route path="/game/:id" element={<GameDetails />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </Router>
      </WatchlistProvider>
    </CurrencyProvider>
  );
}

export default App;
