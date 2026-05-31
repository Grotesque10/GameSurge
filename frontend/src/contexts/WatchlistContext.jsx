import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const WatchlistContext = createContext();

export const useWatchlist = () => useContext(WatchlistContext);

export const WatchlistProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('gamesurge_token'));
  const [user, setUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authConfig, setAuthConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/config`);
        if (res.ok) {
          const json = await res.json();
          setAuthConfig(json);
        }
      } catch (err) {
        console.error("Failed to load auth config:", err);
      }
    };
    fetchConfig();
  }, []);

  // Authenticate user on startup if a token exists
  useEffect(() => {
    const fetchUserAndWatchlist = async () => {
      if (!token) {
        // Anonymous mode: Load from localStorage
        const saved = localStorage.getItem('antigravity_watchlist');
        setWatchlist(saved ? JSON.parse(saved) : []);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const userJson = await userRes.json();
          setUser(userJson.user);

          // Fetch user's persistent server-side watchlist
          const wlRes = await fetch(`${API_BASE_URL}/watchlist`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (wlRes.ok) {
            const wlJson = await wlRes.json();
            setWatchlist(wlJson.watchlist);
          }
        } else {
          // Token expired or invalid: Log out
          handleLogout();
        }
      } catch (err) {
        console.error("Failed to authenticate or fetch watchlist:", err);
        // Offline fallback to localStorage
        const saved = localStorage.getItem('antigravity_watchlist');
        setWatchlist(saved ? JSON.parse(saved) : []);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndWatchlist();
  }, [token]);

  // Sync / Login Function
  const handleLogin = async (provider) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      
      if (!res.ok) throw new Error("Authentication failed");
      const json = await res.json();
      
      // Save token & user
      localStorage.setItem('gamesurge_token', json.token);
      setToken(json.token);
      setUser(json.user);

      // Perform local to cloud watchlist merge!
      const localSaved = localStorage.getItem('antigravity_watchlist');
      const localItems = localSaved ? JSON.parse(localSaved) : [];
      
      if (localItems.length > 0) {
        const syncRes = await fetch(`${API_BASE_URL}/watchlist/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${json.token}`
          },
          body: JSON.stringify({
            watchlist: localItems.map(item => ({
              game_id: item.game_id,
              target_price: item.target_price
            }))
          })
        });
        
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          setWatchlist(syncJson.watchlist);
          // Clear localStorage after successful merge to prevent duplicates
          localStorage.removeItem('antigravity_watchlist');
        }
      } else {
        // No local items, just fetch user's cloud watchlist
        const wlRes = await fetch(`${API_BASE_URL}/watchlist`, {
          headers: { 'Authorization': `Bearer ${json.token}` }
        });
        if (wlRes.ok) {
          const wlJson = await wlRes.json();
          setWatchlist(wlJson.watchlist);
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Live OAuth Exchange Function (Implicit Flow)
  const handleOAuthExchange = async (provider, accessToken) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, access_token: accessToken })
      });
      
      if (!res.ok) throw new Error("OAuth exchange failed");
      const json = await res.json();
      
      // Save token & user
      localStorage.setItem('gamesurge_token', json.token);
      setToken(json.token);
      setUser(json.user);

      // Perform local to cloud watchlist merge!
      const localSaved = localStorage.getItem('antigravity_watchlist');
      const localItems = localSaved ? JSON.parse(localSaved) : [];
      
      if (localItems.length > 0) {
        const syncRes = await fetch(`${API_BASE_URL}/watchlist/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${json.token}`
          },
          body: JSON.stringify({
            watchlist: localItems.map(item => ({
              game_id: item.game_id,
              target_price: item.target_price
            }))
          })
        });
        
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          setWatchlist(syncJson.watchlist);
          // Clear localStorage after successful merge to prevent duplicates
          localStorage.removeItem('antigravity_watchlist');
        }
      } else {
        // Fetch user's cloud watchlist
        const wlRes = await fetch(`${API_BASE_URL}/watchlist`, {
          headers: { 'Authorization': `Bearer ${json.token}` }
        });
        if (wlRes.ok) {
          const wlJson = await wlRes.json();
          setWatchlist(wlJson.watchlist);
        }
      }
    } catch (err) {
      console.error("OAuth Exchange failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout Function
  const handleLogout = () => {
    localStorage.removeItem('gamesurge_token');
    setToken(null);
    setUser(null);
    // Re-initialize watchlist from localStorage
    const saved = localStorage.getItem('antigravity_watchlist');
    setWatchlist(saved ? JSON.parse(saved) : []);
  };

  // Add Item to Watchlist
  const addToWatchlist = async (game, targetPrice) => {
    const newItem = {
      game_id: game.game_id,
      title: game.title,
      image_url: game.image_url,
      target_price: parseFloat(targetPrice),
      added_at: new Date().toISOString()
    };

    if (!token) {
      // Anonymous mode: Save to local storage
      setWatchlist(prev => {
        const filtered = prev.filter(item => item.game_id !== game.game_id);
        const updated = [...filtered, newItem];
        localStorage.setItem('antigravity_watchlist', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    // Logged-in mode: Save to server
    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_id: game.game_id,
          target_price: parseFloat(targetPrice)
        })
      });
      
      if (res.ok) {
        setWatchlist(prev => {
          const filtered = prev.filter(item => item.game_id !== game.game_id);
          return [...filtered, newItem];
        });
      }
    } catch (err) {
      console.error("Failed to add to database watchlist:", err);
    }
  };

  // Remove Item from Watchlist
  const removeFromWatchlist = async (gameId) => {
    if (!token) {
      // Anonymous mode: Remove from local storage
      setWatchlist(prev => {
        const updated = prev.filter(item => item.game_id !== gameId);
        localStorage.setItem('antigravity_watchlist', JSON.stringify(updated));
        return updated;
      });
      return;
    }

    // Logged-in mode: Delete from server
    try {
      const res = await fetch(`${API_BASE_URL}/watchlist/${gameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setWatchlist(prev => prev.filter(item => item.game_id !== gameId));
      }
    } catch (err) {
      console.error("Failed to delete from server watchlist:", err);
    }
  };

  const isWatched = (gameId) => {
    return watchlist.some(item => item.game_id === gameId);
  };

  const getWatchedItem = (gameId) => {
    return watchlist.find(item => item.game_id === gameId);
  };

  return (
    <WatchlistContext.Provider value={{
      watchlist,
      loading,
      user,
      token,
      authConfig,
      handleLogin,
      handleOAuthExchange,
      handleLogout,
      addToWatchlist,
      removeFromWatchlist,
      isWatched,
      getWatchedItem
    }}>
      {children}
    </WatchlistContext.Provider>
  );
};
