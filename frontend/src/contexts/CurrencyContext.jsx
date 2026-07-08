import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', label: 'US Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'British Pound' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
  AUD: { symbol: 'A$', label: 'Australian Dollar' },
  INR: { symbol: '₹', label: 'Indian Rupee' },
  JPY: { symbol: '¥', label: 'Japanese Yen' }
};

// Simple heuristic to guess currency from browser timezone
const guessCurrencyFromTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.startsWith('Europe/London')) return 'GBP';
    if (tz.startsWith('Europe/')) return 'EUR';
    if (tz.startsWith('Australia/')) return 'AUD';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver') || tz.startsWith('America/Edmonton') || tz.startsWith('America/Winnipeg') || tz.startsWith('America/Montreal') || tz.startsWith('America/Halifax')) return 'CAD';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'INR';
    if (tz.startsWith('Asia/Tokyo')) return 'JPY';
  } catch (e) {
    console.error("Could not guess timezone", e);
  }
  return 'USD';
};

export const CurrencyProvider = ({ children }) => {
  // Load saved preference or guess
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('gamesurge_currency');
    return saved && SUPPORTED_CURRENCIES[saved] ? saved : guessCurrencyFromTimezone();
  });

  const [rates, setRates] = useState(null);

  useEffect(() => {
    localStorage.setItem('gamesurge_currency', currency);
  }, [currency]);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Check local storage for cached rates (valid for 24h)
        const cached = localStorage.getItem('gamesurge_exchange_rates');
        if (cached) {
          const { timestamp, data } = JSON.parse(cached);
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            setRates(data);
            return;
          }
        }

        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        
        if (data && data.rates) {
          setRates(data.rates);
          localStorage.setItem('gamesurge_exchange_rates', JSON.stringify({
            timestamp: Date.now(),
            data: data.rates
          }));
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
      }
    };

    fetchRates();
  }, []);

  const formatPrice = (usdAmount) => {
    if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount)) return 'Unavailable';
    
    // If rates haven't loaded yet or currency is USD, just return USD
    if (!rates || currency === 'USD' || !rates[currency]) {
      return `${SUPPORTED_CURRENCIES['USD'].symbol}${Number(usdAmount).toFixed(2)}`;
    }

    const converted = usdAmount * rates[currency];
    
    // JPY doesn't usually use decimals
    if (currency === 'JPY') {
      return `${SUPPORTED_CURRENCIES[currency].symbol}${Math.round(converted)}`;
    }
    
    return `${SUPPORTED_CURRENCIES[currency].symbol}${converted.toFixed(2)}`;
  };

  const formatPriceInCurrency = (usdAmount, targetCurrency) => {
    if (usdAmount === null || usdAmount === undefined || isNaN(usdAmount)) return 'Unavailable';
    if (!rates || !rates[targetCurrency] || !SUPPORTED_CURRENCIES[targetCurrency]) {
      return `$${Number(usdAmount).toFixed(2)}`;
    }
    const converted = usdAmount * rates[targetCurrency];
    const symbol = SUPPORTED_CURRENCIES[targetCurrency].symbol;
    if (targetCurrency === 'JPY') {
      return `${symbol}${Math.round(converted)}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  };

  const convertToUsd = (amount, fromCurrency) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 0;
    const currencyKey = fromCurrency || currency;
    if (!rates || currencyKey === 'USD' || !rates[currencyKey]) {
      return parseFloat(amount);
    }
    return parseFloat(amount) / rates[currencyKey];
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatPriceInCurrency, convertToUsd, rates, supportedCurrencies: Object.keys(SUPPORTED_CURRENCIES) }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
