import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Check, Search, Calculator } from 'lucide-react';
import { fetchAccountInfo, placeOrder as placeOrderService, fetchStockData, fetchOptionsChain } from '../services/alpacaService';

const AlpacaTrading = ({ selectedOption, stockSymbol, onOptionsLoaded, onStockSymbolChange, isSearchDisabled = false }) => {
  const [accountInfo, setAccountInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [totalCost, setTotalCost] = useState(0);

  // Define getAccountInfo with useCallback to prevent it from changing on every render
  const getAccountInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchAccountInfo();
      if (data) {
        setAccountInfo(data);
        // Clear any previous error since we got valid data
        setError(null);
      } else {
        // If we're in development mode, use mock data without showing an error
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock account data for development');
          setAccountInfo({
            cash: 25000.00,
            portfolio_value: 27350.75,
            buying_power: 50000.00,
            status: 'ACTIVE'
          });
        } else {
          throw new Error('No account data returned');
        }
      }
    } catch (err) {
      console.error('Error fetching account info:', err);
      
      // Only set error if we don't have account info already
      if (!accountInfo) {
        setError('Failed to connect to Alpaca. Please check your API credentials.');
        
        // Set mock account data for development/demo purposes
        if (process.env.NODE_ENV !== 'production') {
          console.log('Using mock account data after error');
          setAccountInfo({
            cash: 25000.00,
            portfolio_value: 27350.75,
            buying_power: 50000.00,
            status: 'ACTIVE'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch account information when component mounts
  useEffect(() => {
    getAccountInfo();
  }, [getAccountInfo]);
  
  // Update search symbol when stockSymbol changes
  useEffect(() => {
    if (stockSymbol) {
      setSearchSymbol(stockSymbol);
    }
  }, [stockSymbol]);

  // Calculate total cost whenever quantity or selected option changes
  useEffect(() => {
    if (selectedOption && quantity) {
      const price = selectedOption.lastPrice || selectedOption.last || 0;
      // Options contracts represent 100 shares
      const contractMultiplier = 100;
      const total = price * quantity * contractMultiplier;
      setTotalCost(total);
    } else {
      setTotalCost(0);
    }
  }, [selectedOption, quantity]);

  const placeOrder = async (side) => {
    if (!selectedOption) {
      setError('No option selected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Construct option symbol in OCC format
      // Format: Symbol + Expiration Date (YYMMDD) + Call/Put + Strike Price * 1000 (padded to 8 digits)
      const expiryFormatted = selectedOption.expirationDate ? 
        selectedOption.expirationDate.replace(/-/g, '').substring(2) : // Convert YYYY-MM-DD to YYMMDD
        selectedOption.expiry.replace(/-/g, '').substring(2); // Fallback to expiry field
      
      const strike = selectedOption.strike * 1000;
      const optionType = selectedOption.type ? 
        (selectedOption.type === 'Call' ? 'C' : 'P') : // Use type if available
        (selectedOption.in_the_money === undefined ? 'C' : (selectedOption.delta > 0 ? 'C' : 'P')); // Fallback logic
      
      const optionSymbol = `${stockSymbol}${expiryFormatted}${optionType}${String(strike).padStart(8, '0')}`;
      
      const orderData = {
        symbol: optionSymbol,
        side: side.toLowerCase(),
        quantity: parseInt(quantity),
        order_type: orderType,
        time_in_force: 'day',
        limit_price: orderType === 'limit' ? parseFloat(limitPrice) : undefined
      };
      
      console.log('Placing order:', orderData);
      
      const data = await placeOrderService(orderData);
      
      if (data) {
        setOrderStatus(data);
        setShowOrderForm(false);
      } else {
        throw new Error('No order confirmation received');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order');
      
      // Mock successful order for development/demo purposes
      if (process.env.NODE_ENV !== 'production') {
        const mockOrderStatus = {
          id: 'demo-' + Math.random().toString(36).substring(2, 10),
          status: 'filled',
          symbol: `${stockSymbol}${selectedOption.type === 'Call' ? 'C' : 'P'}${selectedOption.strike}`,
          side: side.toLowerCase(),
          quantity: parseInt(quantity),
          filled_qty: parseInt(quantity),
          filled_avg_price: orderType === 'limit' ? parseFloat(limitPrice) : selectedOption.premium
        };
        
        setOrderStatus(mockOrderStatus);
        setShowOrderForm(false);
        console.log('Using mock order status for demo purposes');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetOrderStatus = () => {
    setOrderStatus(null);
    setError(null);
  };
  
  // Fetch options data for a given symbol
  const fetchOptionsData = async (symbol) => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First fetch stock data to get current price
      const stockData = await fetchStockData(symbol);
      if (!stockData || stockData.error) {
        throw new Error(stockData?.error || `Failed to fetch stock data for ${symbol}`);
      }
      
      // Then fetch options chain
      const optionsData = await fetchOptionsChain(symbol);
      if (!optionsData || optionsData.error) {
        throw new Error(optionsData?.error || `Failed to fetch options data for ${symbol}`);
      }
      
      // Update the parent component with the new data
      if (onStockSymbolChange) {
        onStockSymbolChange(symbol);
      }
      
      if (onOptionsLoaded) {
        onOptionsLoaded(optionsData);
      }
      
      console.log(`Successfully loaded options data for ${symbol}`);
    } catch (err) {
      console.error(`Error fetching options data for ${symbol}:`, err);
      setError(`Failed to fetch options data for ${symbol}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-4 bg-white rounded-lg shadow-lg mt-6">
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-lg mt-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <DollarSign className="mr-2" size={20} />
        Alpaca Trading Integration
      </h2>
      
      {/* Options Search - Only shown if search is not disabled */}
      {!isSearchDisabled ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-3">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Search Options</h3>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter stock symbol (e.g., AAPL)"
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchSymbol.trim() && fetchOptionsData(searchSymbol.trim().toUpperCase())}
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => {
                if (searchSymbol.trim()) {
                  fetchOptionsData(searchSymbol.trim().toUpperCase());
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </span>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-3">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Trading {stockSymbol} Options</h3>
          </div>
          <p className="text-sm text-gray-600">Use the search bar at the top of the page to change the stock symbol.</p>
        </div>
      )}
        
      {/* Cost Calculator */}
        {selectedOption && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="flex items-center mb-2">
              <Calculator className="h-5 w-5 mr-2 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Options Cost Calculator</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contracts</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                <div className="w-full border border-gray-300 bg-gray-50 rounded px-3 py-2 font-mono">
                  ${totalCost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
          <AlertCircle className="mr-2 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {orderStatus && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center mb-2">
            <Check className="mr-2" size={16} />
            <span className="font-bold">Order Submitted</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Order ID:</div>
            <div>{orderStatus.id}</div>
            <div>Status:</div>
            <div>{orderStatus.status}</div>
            <div>Symbol:</div>
            <div>{orderStatus.symbol}</div>
            <div>Side:</div>
            <div className={orderStatus.side === 'buy' ? 'text-green-600' : 'text-red-600'}>
              {orderStatus.side.toUpperCase()}
            </div>
            <div>Quantity:</div>
            <div>{orderStatus.quantity} contract(s)</div>
          </div>
          <button 
            onClick={resetOrderStatus}
            className="mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      )}
      
      {accountInfo && !orderStatus && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Account Information</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-sm text-gray-600">Cash Balance:</div>
              <div className="font-medium">${accountInfo.cash.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Portfolio Value:</div>
              <div className="font-medium">${accountInfo.portfolio_value.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Buying Power:</div>
              <div className="font-medium">${accountInfo.buying_power.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Account Status:</div>
              <div className="font-medium">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  accountInfo.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {accountInfo.status}
                </span>
              </div>
            </div>
          </div>
          
          {selectedOption ? (
            <>
              {showOrderForm ? (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Place Order for {stockSymbol} {selectedOption.type} ${selectedOption.strike}</h3>
                  
                  {/* Cost Calculator */}
                  <div className="bg-gray-100 p-3 rounded-md mb-4">
                    <div className="flex items-center mb-2">
                      <Calculator className="h-5 w-5 mr-2 text-blue-600" />
                      <h3 className="font-semibold">Order Cost Calculator</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Contract Price:</div>
                      <div>${selectedOption ? (selectedOption.lastPrice || selectedOption.last || 0).toFixed(2) : '0.00'}</div>
                      <div>Quantity:</div>
                      <div>{quantity} contract{quantity !== 1 ? 's' : ''}</div>
                      <div>Multiplier:</div>
                      <div>x 100 shares</div>
                      <div className="font-bold">Total Cost:</div>
                      <div className="font-bold">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Contracts)</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                      </select>
                    </div>
                    
                    {orderType === 'limit' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Limit Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={limitPrice}
                          onChange={(e) => setLimitPrice(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => placeOrder('buy')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Buy to Open
                    </button>
                    <button
                      onClick={() => placeOrder('sell')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Sell to Open
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setShowOrderForm(false)}
                    className="mt-3 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowOrderForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center"
                >
                  <TrendingUp className="mr-2" size={18} />
                  Trade This Option
                </button>
              )}
            </>
          ) : (
            <div className="text-center p-4 border rounded-lg bg-gray-50">
              <p className="text-gray-500">Select an option to trade</p>
            </div>
          )}
        </div>
      )}
      
      {!accountInfo && !isLoading && !orderStatus && (
        <div className="text-center p-6 border rounded-lg bg-gray-50">
          <AlertCircle className="mx-auto mb-2" size={24} />
          <p className="text-gray-700 mb-4">Unable to connect to Alpaca API</p>
          <button
            onClick={getAccountInfo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
};

export default AlpacaTrading;
