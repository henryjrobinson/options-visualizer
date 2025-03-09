/**
 * Service for interacting with the Alpaca API backend
 */

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Fetch stock data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} timeframe - Time interval (1D, 1H, 15Min)
 * @param {number} days - Number of days of historical data
 * @returns {Promise<Object>} Stock data
 */
export const fetchStockData = async (symbol, timeframe = '1D', days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/stock/${symbol}?timeframe=${timeframe}&days=${days}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stock data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }
};

/**
 * Fetch options chain for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Options chain data
 */
export const fetchOptionsChain = async (symbol) => {
  try {
    const response = await fetch(`${API_BASE_URL}/options/${symbol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch options chain: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching options chain:', error);
    throw error;
  }
};

/**
 * Fetch account information
 * @returns {Promise<Object>} Account information
 */
export const fetchAccountInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/account`);
    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching account info:', error);
    throw error;
  }
};

/**
 * Place an options order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Order result
 */
export const placeOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to place order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
};
