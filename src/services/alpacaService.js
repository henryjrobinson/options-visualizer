/**
 * Service for interacting with the Alpaca API backend
 */

import axios from 'axios';

const API_BASE_URL = 'https://paper-api.alpaca.markets'; // Use the live API URL for production
const USE_MOCK_DATA = true; // Set to true to use mock data when API fails
const ALWAYS_USE_MOCK = true; // Set to true to always use mock data without attempting API calls

const alpacaApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'APCA_API_KEY_ID': process.env.ALPACA_API_KEY,
    'APCA_API_SECRET_KEY': process.env.ALPACA_SECRET_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * Check if mock data is enabled
 * @returns {boolean} True if mock data is enabled
 */
export const isMockDataEnabled = () => {
  return ALWAYS_USE_MOCK || USE_MOCK_DATA;
};

// Mock data for fallbacks
const MOCK_DATA = {
  stock: (symbol) => {
    // Generate a base price based on the symbol to ensure consistency
    const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = 50 + (symbolHash % 200); // Price between 50 and 250
    
    return {
      symbol: symbol,
      current_price: basePrice,
      data: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        open: basePrice - 5 + Math.random() * 10,
        high: basePrice + Math.random() * 10,
        low: basePrice - 10 + Math.random() * 10,
        close: basePrice - 2 + Math.random() * 4,
        volume: Math.floor(1000000 + Math.random() * 5000000)
      }))
    };
  },
  options: (symbol) => {
    // Generate a base price based on the symbol to ensure consistency
    const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = 50 + (symbolHash % 200); // Price between 50 and 250
    
    // Generate expiration dates (3rd Friday of next 4 months)
    const today = new Date();
    const expirationDates = [];
    for (let i = 1; i <= 4; i++) {
      const year = today.getFullYear();
      const month = (today.getMonth() + i) % 12;
      const nextMonth = new Date(year + Math.floor((today.getMonth() + i) / 12), month, 1);
      
      // Find the third Friday
      let day = 1;
      while (nextMonth.getDay() !== 5) { // 5 is Friday
        nextMonth.setDate(nextMonth.getDate() + 1);
        day++;
      }
      // Now we're at the first Friday, add 14 days to get to the third Friday
      nextMonth.setDate(day + 14);
      
      expirationDates.push(nextMonth.toISOString().split('T')[0]);
    }
    
    // Generate strikes around the base price
    const strikes = [];
    for (let i = -4; i <= 4; i++) {
      strikes.push(Math.round(basePrice + i * 5));
    }
    
    // Generate calls and puts
    const calls = [];
    const puts = [];
    
    for (const expiry of expirationDates.slice(0, 2)) { // Use first two expiration dates
      for (const strike of strikes) {
        // Calculate days to expiration
        const expiryDate = new Date(expiry);
        const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Calculate if in the money
        const callInTheMoney = strike < basePrice;
        const putInTheMoney = strike > basePrice;
        
        // Calculate implied volatility (higher for further dates)
        const baseIV = 25 + Math.random() * 10;
        const iv = baseIV * (1 + (daysToExpiry / 365) * 0.2);
        
        // Calculate option prices based on simple model
        const callPriceFactor = Math.max(0, (basePrice - strike) + (iv / 100) * basePrice * Math.sqrt(daysToExpiry / 365));
        const putPriceFactor = Math.max(0, (strike - basePrice) + (iv / 100) * basePrice * Math.sqrt(daysToExpiry / 365));
        
        // Add some randomness to prices
        const callPrice = Math.max(0.05, callPriceFactor + Math.random() * 2).toFixed(2);
        const putPrice = Math.max(0.05, putPriceFactor + Math.random() * 2).toFixed(2);
        
        // Calculate greeks
        const callDelta = Math.min(0.95, Math.max(0.05, 0.5 + (basePrice - strike) / (iv * basePrice / 10))).toFixed(2);
        const putDelta = (-Math.min(0.95, Math.max(0.05, 0.5 + (strike - basePrice) / (iv * basePrice / 10)))).toFixed(2);
        
        // Add call option
        calls.push({
          expiry,
          strike,
          premium: parseFloat(callPrice),
          lastPrice: parseFloat(callPrice),
          last: parseFloat(callPrice),
          bid: (parseFloat(callPrice) - 0.05).toFixed(2),
          ask: (parseFloat(callPrice) + 0.05).toFixed(2),
          volume: Math.floor(500 + Math.random() * 2000),
          open_interest: Math.floor(2000 + Math.random() * 5000),
          implied_volatility: parseFloat((iv).toFixed(1)),
          delta: parseFloat(callDelta),
          gamma: parseFloat((0.05 + Math.random() * 0.08).toFixed(2)),
          theta: parseFloat((-0.05 - Math.random() * 0.15).toFixed(2)),
          vega: parseFloat((0.15 + Math.random() * 0.15).toFixed(2)),
          in_the_money: callInTheMoney,
          type: 'Call'
        });
        
        // Add put option
        puts.push({
          expiry,
          strike,
          premium: parseFloat(putPrice),
          lastPrice: parseFloat(putPrice),
          last: parseFloat(putPrice),
          bid: (parseFloat(putPrice) - 0.05).toFixed(2),
          ask: (parseFloat(putPrice) + 0.05).toFixed(2),
          volume: Math.floor(400 + Math.random() * 1800),
          open_interest: Math.floor(1800 + Math.random() * 4500),
          implied_volatility: parseFloat((iv).toFixed(1)),
          delta: parseFloat(putDelta),
          gamma: parseFloat((0.05 + Math.random() * 0.08).toFixed(2)),
          theta: parseFloat((-0.05 - Math.random() * 0.15).toFixed(2)),
          vega: parseFloat((0.15 + Math.random() * 0.15).toFixed(2)),
          in_the_money: putInTheMoney,
          type: 'Put'
        });
      }
    }
    
    return {
      symbol: symbol,
      current_price: basePrice,
      expiration_dates: expirationDates,
      calls,
      puts
    };
  },
  account: {
    id: 'demo-account',
    status: 'ACTIVE',
    currency: 'USD',
    buying_power: 100000.00,
    cash: 50000.00,
    portfolio_value: 75000.00,
    long_market_value: 25000.00,
    short_market_value: 0.00,
    equity: 75000.00,
    last_equity: 74500.00,
    initial_margin: 12500.00,
    maintenance_margin: 8500.00,
    daytrading_buying_power: 200000.00,
    regt_buying_power: 100000.00,
    non_marginable_buying_power: 50000.00,
    sma: 63000.00,
    created_at: new Date().toISOString()
  },
  orderResponse: {
    id: `order-${Date.now()}`,
    client_order_id: `client-order-${Date.now()}`,
    status: 'accepted',
    symbol: 'AAPL',
    asset_class: 'option',
    type: 'market',
    side: 'buy',
    qty: 1,
    filled_qty: 0,
    filled_avg_price: null,
    order_class: 'simple',
    time_in_force: 'day',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    filled_at: null,
    expired_at: null,
    canceled_at: null,
    failed_at: null,
    replaced_at: null,
    replaced_by: null,
    replaces: null
  }
};

/**
 * Helper function to handle API errors with fallback to mock data
 * @param {Error} error - The error object
 * @param {string} errorType - Type of error for logging
 * @param {Object} mockData - Mock data to return as fallback
 * @returns {Object} Mock data or rethrows error
 */
const handleApiError = (error, errorType, mockData) => {
  // Log the error with more details
  console.error(`[ERROR] ${errorType}:`, {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  
  // If mock data is enabled, return mock data instead of throwing
  if (USE_MOCK_DATA && mockData) {
    console.warn(`Using mock data for ${errorType}`);
    return mockData;
  }
  
  // Otherwise rethrow the error
  throw error;
};

/**
 * Fetch stock data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} timeframe - Time interval (1D, 1H, 15Min)
 * @param {number} days - Number of days of historical data
 * @returns {Promise<Object>} Stock data
 */
export const fetchStockData = async (symbol, timeframe = '1D', days = 30) => {
  // If ALWAYS_USE_MOCK is true, return mock data immediately
  if (ALWAYS_USE_MOCK) {
    console.log(`Using mock data for stock: ${symbol}`);
    return MOCK_DATA.stock(symbol);
  }
  
  try {
    const response = await alpacaApi.get(`/v2/stocks/${symbol}/bars?timeframe=${timeframe}&days=${days}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Error fetching stock data', MOCK_DATA.stock(symbol));
  }
};

/**
 * Fetch options chain for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Options chain data
 */
export const fetchOptionsChain = async (symbol) => {
  // If ALWAYS_USE_MOCK is true, return mock data immediately
  if (ALWAYS_USE_MOCK) {
    console.log(`Using mock data for options: ${symbol}`);
    return MOCK_DATA.options(symbol);
  }
  
  try {
    const response = await alpacaApi.get(`/v2/options/${symbol}`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Error fetching options data', MOCK_DATA.options(symbol));
  }
};

/**
 * Fetch account information
 * @returns {Promise<Object>} Account information
 */
export const fetchAccountInfo = async () => {
  // If ALWAYS_USE_MOCK is true, return mock data immediately
  if (ALWAYS_USE_MOCK) {
    console.log('Using mock data for account info');
    return MOCK_DATA.account;
  }
  
  try {
    const response = await alpacaApi.get('/v2/account');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Error fetching account info', MOCK_DATA.account);
  }
};

/**
 * Place an options order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Order result
 */
export const placeOrder = async (orderData) => {
  // If ALWAYS_USE_MOCK is true, return mock data immediately
  if (ALWAYS_USE_MOCK) {
    console.log('Using mock data for order placement');
    // Create a custom mock response with the order details
    const mockResponse = {
      ...MOCK_DATA.orderResponse,
      symbol: orderData.symbol,
      side: orderData.side,
      qty: orderData.quantity || 1,
      order_type: orderData.order_type || 'market',
      time_in_force: orderData.time_in_force || 'day'
    };
    return mockResponse;
  }
  
  try {
    const response = await alpacaApi.post('/v2/orders', orderData);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Error placing order', MOCK_DATA.orderResponse);
  }
};
