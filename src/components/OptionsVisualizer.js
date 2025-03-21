import React, { useState, useEffect } from 'react';

const OptionsVisualizer = ({ onOptionSelect, stockSymbol, optionsData, stockData, isLoading }) => {
  // Stock and options state
  const [stock, setStock] = useState({
    symbol: stockSymbol || 'AAPL',
    currentPrice: 178.72,
    previousClose: 176.38
  });
  
  const [selectedOption, setSelectedOption] = useState({
    type: 'Call',
    strike: 180,
    premium: 4.65,
    expirationDate: '2025-03-21',
    iv: 27.5,
    delta: 0.48,
    gamma: 0.09,
    theta: -0.12,
    vega: 0.25,
    openInterest: 4250,
    volume: 1823
  });
  
  // UI state
  const [optionsChain, setOptionsChain] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [selectedType] = useState('Call');
  
  // Update local state when props change
  useEffect(() => {
    if (stockData && optionsData) {
      updateStockAndOptionsData(stockData, optionsData);
    }
  }, [stockData, optionsData]);

  // Update stock symbol when it changes
  useEffect(() => {
    if (stockSymbol) {
      setStock(prevStock => ({
        ...prevStock,
        symbol: stockSymbol
      }));
    }
  }, [stockSymbol]);

  // Notify parent component when option is selected
  useEffect(() => {
    if (onOptionSelect && selectedOption) {
      onOptionSelect(selectedOption);
    }
  }, [selectedOption, onOptionSelect]);

  // Calculate important metrics
  const daysToExpiration = (() => {
    if (!selectedOption || !selectedOption.expirationDate) return 30; // Default value
    const expDate = new Date(selectedOption.expirationDate || selectedOption.expiry);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();
  
  const inTheMoney = selectedOption.type === 'Call' 
    ? stock.currentPrice > selectedOption.strike 
    : stock.currentPrice < selectedOption.strike;

  const moneyness = selectedOption.type === 'Call'
    ? ((stock.currentPrice / selectedOption.strike) - 1) * 100
    : ((selectedOption.strike / stock.currentPrice) - 1) * 100;
  
  // Ensure premium is a number
  const premium = typeof selectedOption.premium === 'number' ? selectedOption.premium : 
                  (typeof selectedOption.last === 'number' ? selectedOption.last : 
                  (typeof selectedOption.lastPrice === 'number' ? selectedOption.lastPrice : 0));
  
  const breakEvenPrice = selectedOption.type === 'Call'
    ? selectedOption.strike + premium
    : selectedOption.strike - premium;
  
  const priceToBreakEven = ((breakEvenPrice / stock.currentPrice) - 1) * 100;
  
  const stockPriceChange = ((stock.currentPrice / stock.previousClose) - 1) * 100;
  
  // Visual elements - colors based on status
  const getStatusColor = (value) => {
    if (value > 2) return 'text-green-600';
    if (value < -2) return 'text-red-600';
    return 'text-yellow-600';
  };
  
  const getMoneynessColor = () => {
    if (inTheMoney) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  // Function to update stock and options data from props
  const updateStockAndOptionsData = (stockData, optionsData) => {
    if (!stockData || !optionsData) return;
    
    try {
      setOptionsChain(optionsData);
      
      if (optionsData.expiration_dates && optionsData.expiration_dates.length > 0) {
        setSelectedExpiry(optionsData.expiration_dates[0]);
      }
      
      // Update stock info
      if (stockData && stockData.data && stockData.data.length > 0) {
        const latestData = stockData.data[stockData.data.length - 1];
        const previousData = stockData.data.length > 1 ? stockData.data[stockData.data.length - 2] : null;
        
        setStock({
          symbol: stockData.symbol,
          currentPrice: stockData.current_price || latestData.close,
          previousClose: previousData ? previousData.close : (stockData.current_price || latestData.close) * 0.99
        });
      } else {
        // Fallback to options data if stock data doesn't have what we need
        setStock({
          symbol: optionsData.symbol,
          currentPrice: optionsData.current_price,
          previousClose: optionsData.current_price * 0.99 // Estimate previous close
        });
      }
      
      // Don't automatically select an option - let the user choose from the options chain
      // setError(null);
    } catch (err) {
      console.error('Error processing options data:', err);
      // setError(`Failed to process options data: ${err.message}`);
    }
  };
  
  // Handle option selection
  const handleOptionSelect = (option) => {
    if (!option) return;
    
    // Normalize option data to ensure all required fields are present
    const normalizedOption = {
      ...option,
      type: option.type || selectedType,
      expirationDate: option.expirationDate || option.expiry,
      premium: parseFloat(option.premium || option.last || option.lastPrice || 0),
      iv: parseFloat(option.iv || option.implied_volatility || 0),
      delta: parseFloat(option.delta || 0),
      gamma: parseFloat(option.gamma || 0),
      theta: parseFloat(option.theta || 0),
      vega: parseFloat(option.vega || 0),
      openInterest: parseInt(option.openInterest || option.open_interest || 0, 10),
      volume: parseInt(option.volume || 0, 10),
      bid: parseFloat(option.bid || 0),
      ask: parseFloat(option.ask || 0)
    };
    
    setSelectedOption(normalizedOption);
  };

  const calculateIV = (days) => {
    if (!optionsChain) return 0;
    
    // Find options with expiration dates closest to the target days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    
    // Sort expiration dates by closeness to target date
    const sortedExpirations = [...optionsChain.expiration_dates].sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
    });
    
    if (sortedExpirations.length === 0) return 0;
    
    // Get the closest expiration date
    const closestExpiry = sortedExpirations[0];
    
    // Calculate average IV for ATM options for this expiration
    const calls = optionsChain.calls.filter(opt => opt.expiry === closestExpiry);
    const puts = optionsChain.puts.filter(opt => opt.expiry === closestExpiry);
    
    // Find ATM options (closest to current stock price)
    const atmCalls = calls.sort((a, b) => 
      Math.abs(a.strike - stock.currentPrice) - Math.abs(b.strike - stock.currentPrice)
    ).slice(0, 3);
    
    const atmPuts = puts.sort((a, b) => 
      Math.abs(a.strike - stock.currentPrice) - Math.abs(b.strike - stock.currentPrice)
    ).slice(0, 3);
    
    // Calculate average IV
    const allIVs = [...atmCalls, ...atmPuts].map(opt => opt.implied_volatility || 0);
    if (allIVs.length === 0) return 0;
    
    const avgIV = allIVs.reduce((sum, iv) => sum + iv, 0) / allIVs.length;
    return avgIV;
  };

  const getIVStrategyInsight = () => {
    if (!optionsChain) return '';
    
    const iv30 = calculateIV(30);
    const iv60 = calculateIV(60);
    const iv90 = calculateIV(90);
    
    // No valid IV data
    if (iv30 === 0 && iv60 === 0 && iv90 === 0) {
      return 'Insufficient data to provide IV-based strategy insights.';
    }
    
    // IV curve analysis
    try {
      if (iv30 > iv60 && iv60 > iv90) {
        return `IV is declining over time (${iv30.toFixed(1)}% → ${iv60.toFixed(1)}% → ${iv90.toFixed(1)}%). This downward term structure suggests selling premium on shorter-dated options may be favorable. Consider selling puts if bullish or covered calls if holding the stock.`;
      } else if (iv30 < iv60 && iv60 < iv90) {
        return `IV is increasing over time (${iv30.toFixed(1)}% → ${iv60.toFixed(1)}% → ${iv90.toFixed(1)}%). This upward term structure suggests buying longer-dated options may capture additional volatility premium. Consider calendar spreads or longer-dated positions.`;
      } else if (Math.max(iv30, iv60, iv90) > 40) {
        return `IV levels are elevated (${Math.max(iv30, iv60, iv90).toFixed(1)}%). Consider selling premium through credit spreads or iron condors to capitalize on potential IV contraction.`;
      } else if (Math.max(iv30, iv60, iv90) < 20) {
        return `IV levels are low (${Math.max(iv30, iv60, iv90).toFixed(1)}%). Consider buying options or debit spreads as premiums are relatively inexpensive.`;
      } else {
        return `IV levels are moderate across timeframes (${iv30.toFixed(1)}% → ${iv60.toFixed(1)}% → ${iv90.toFixed(1)}%). Consider balanced strategies like vertical spreads or iron condors based on your directional bias.`;
      }
    } catch (err) {
      console.error('Error generating IV strategy insight:', err);
      return 'Unable to generate IV strategy insights due to data issues.';
    }
  };

  const getIV60StrategyInsight = () => {
    try {
      const iv60 = calculateIV(60);
      if (iv60 > 35) {
        return "Favorable window for selling puts for premium time decay";
      } else if (iv60 > 20) {
        return "Consider calendar spreads to capitalize on term structure";
      } else {
        return "Low medium-term IV - directional strategies may be preferred";
      }
    } catch (err) {
      console.error('Error generating IV60 strategy insight:', err);
      return "Unable to calculate medium-term IV strategy";
    }
  };

  const getIV90StrategyInsight = () => {
    try {
      const iv90 = calculateIV(90);
      if (iv90 > 30) {
        return "High long-term IV - LEAPS premium selling strategies worth considering";
      } else if (iv90 > 20) {
        return "Neutral long-term IV - balanced long-term strategies recommended";
      } else {
        return "Low long-term IV - good environment for buying LEAPS options";
      }
    } catch (err) {
      console.error('Error generating IV90 strategy insight:', err);
      return "Unable to calculate long-term IV strategy";
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Stock Info Header */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{stock.symbol}</h1>
            <p className="text-gray-600">
              ${stock.currentPrice ? stock.currentPrice.toFixed(2) : '0.00'} 
              <span className={`ml-2 ${stockPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stockPriceChange >= 0 ? '+' : ''}{stockPriceChange.toFixed(2)}%
              </span>
            </p>
          </div>
          
          {selectedOption && (
            <div className="text-right">
              <h2 className="text-lg font-semibold">
                {selectedOption.type} ${selectedOption.strike} {selectedOption.expirationDate ? new Date(selectedOption.expirationDate).toLocaleDateString() : 'N/A'}
              </h2>
              <p className="text-gray-600">
                Premium: ${typeof selectedOption.premium === 'number' ? selectedOption.premium.toFixed(2) : '0.00'} | IV: {typeof selectedOption.iv === 'number' ? selectedOption.iv.toFixed(1) : '0.00'}%
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Options Chain - Side by Side View */}
      {optionsChain && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Options Chain</h2>
          
          {/* Expiration Date Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
            <div className="flex flex-wrap gap-2">
              {optionsChain && optionsChain.expiration_dates && optionsChain.expiration_dates.map((date, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedExpiry(date)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    selectedExpiry === date 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {new Date(date).toLocaleDateString()}
                </button>
              ))}
            </div>
          </div>
          
          {/* Side-by-side Call and Put Tables */}
          {selectedExpiry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calls Table */}
              <div>
                <h3 className="text-md font-semibold mb-2 text-blue-700">Calls</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ask</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IV</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {optionsChain && selectedExpiry && optionsChain.calls && 
                        optionsChain.calls
                          .filter(option => option.expiry === selectedExpiry)
                          .sort((a, b) => a.strike - b.strike)
                          .map((option, index) => (
                            <tr 
                              key={index} 
                              onClick={() => handleOptionSelect({
                                ...option,
                                type: 'Call',
                                expirationDate: option.expiry,
                                openInterest: option.open_interest,
                                iv: option.implied_volatility,
                                premium: option.last || option.ask || 0
                              })}
                              className={`cursor-pointer hover:bg-blue-50 ${
                                selectedOption && selectedOption.type === 'Call' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-blue-100 border-l-4 border-blue-600' 
                                  : ''
                              }`}
                            >
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                ${option.strike.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.last === 'number' ? option.last.toFixed(2) : option.last || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.bid === 'number' ? option.bid.toFixed(2) : option.bid || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.ask === 'number' ? option.ask.toFixed(2) : option.ask || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {(option.implied_volatility || 0).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {(option.volume || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                      }
                      {(!optionsChain || !optionsChain.calls || !selectedExpiry || 
                        !optionsChain.calls.filter(option => option.expiry === selectedExpiry).length) && (
                        <tr>
                          <td colSpan="6" className="px-3 py-4 text-center text-sm text-gray-500">
                            No call options available for this expiration date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Puts Table */}
              <div>
                <h3 className="text-md font-semibold mb-2 text-purple-700">Puts</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ask</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IV</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {optionsChain && selectedExpiry && optionsChain.puts && 
                        optionsChain.puts
                          .filter(option => option.expiry === selectedExpiry)
                          .sort((a, b) => a.strike - b.strike)
                          .map((option, index) => (
                            <tr 
                              key={index} 
                              onClick={() => handleOptionSelect({
                                ...option,
                                type: 'Put',
                                expirationDate: option.expiry,
                                openInterest: option.open_interest,
                                iv: option.implied_volatility,
                                premium: option.last || option.ask || 0
                              })}
                              className={`cursor-pointer hover:bg-purple-50 ${
                                selectedOption && selectedOption.type === 'Put' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-purple-100 border-l-4 border-purple-600' 
                                  : ''
                              }`}
                            >
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                ${option.strike.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.last === 'number' ? option.last.toFixed(2) : option.last || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.bid === 'number' ? option.bid.toFixed(2) : option.bid || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                ${typeof option.ask === 'number' ? option.ask.toFixed(2) : option.ask || '0.00'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {(option.implied_volatility || 0).toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {(option.volume || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                      }
                      {(!optionsChain || !optionsChain.puts || !selectedExpiry || 
                        !optionsChain.puts.filter(option => option.expiry === selectedExpiry).length) && (
                        <tr>
                          <td colSpan="6" className="px-3 py-4 text-center text-sm text-gray-500">
                            No put options available for this expiration date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* IV Surface Analysis */}
      {optionsChain && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">IV Surface Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">IV30</h3>
                <span className="text-lg font-bold">{calculateIV(30).toFixed(1)}%</span>
              </div>
              <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
                <div 
                  className="h-1 bg-blue-600 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(30) * 2, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-blue-700">
                {getIVStrategyInsight()}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">IV60</h3>
                <span className="text-lg font-bold">{calculateIV(60).toFixed(1)}%</span>
              </div>
              <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
                <div 
                  className="h-1 bg-purple-600 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(60) * 2, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-purple-700">
                {getIV60StrategyInsight()}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-semibold">IV90</h3>
                <span className="text-lg font-bold">{calculateIV(90).toFixed(1)}%</span>
              </div>
              <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
                <div 
                  className="h-1 bg-green-600 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(90) * 2, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-green-700">
                {getIV90StrategyInsight()}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Option Visual - Only show when an option is selected */}
      {selectedOption && selectedOption.strike ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left column - Price visualization */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Price Analysis</h2>
            
            {/* Price analysis - table-based layout to prevent overlapping */}
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-full h-2 bg-gray-300 rounded-full relative">
                  {(() => {
                    // Calculate min and max prices with buffer
                    const minPrice = Math.min(stock.currentPrice, selectedOption.strike, breakEvenPrice) * 0.9;
                    const maxPrice = Math.max(stock.currentPrice, selectedOption.strike, breakEvenPrice) * 1.1;
                    const priceRange = maxPrice - minPrice;
                    
                    // Calculate positions as percentages
                    const currentPricePos = ((stock.currentPrice - minPrice) / priceRange) * 100;
                    const strikePricePos = ((selectedOption.strike - minPrice) / priceRange) * 100;
                    const breakEvenPos = ((breakEvenPrice - minPrice) / priceRange) * 100;
                    
                    return (
                      <>
                        <div className="absolute top-0 h-4 w-1 bg-black rounded-full" 
                             style={{ left: `${currentPricePos}%`, transform: 'translateX(-50%)' }}></div>
                        <div className="absolute top-0 h-4 w-1 bg-blue-600 rounded-full" 
                             style={{ left: `${strikePricePos}%`, transform: 'translateX(-50%)' }}></div>
                        <div className="absolute top-0 h-4 w-1 bg-yellow-500 rounded-full" 
                             style={{ left: `${breakEvenPos}%`, transform: 'translateX(-50%)' }}></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Price points table */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-gray-100 p-2 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-black rounded-full"></div>
                  </div>
                  <div className="font-medium">Current Price</div>
                  <div className="text-lg">${stock.currentPrice.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-100 p-2 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="font-medium">Strike Price</div>
                  <div className="text-lg">${selectedOption.strike.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-100 p-2 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div className="font-medium">Break Even</div>
                  <div className="text-lg">${breakEvenPrice.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-100 p-2 rounded text-center">
                <div className="text-sm text-gray-600">Moneyness</div>
                <div className={`text-lg font-medium ${getStatusColor(moneyness)}`}>
                  {moneyness > 0 ? '+' : ''}{moneyness.toFixed(2)}%
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getMoneynessColor()}`}>
                  {inTheMoney ? 'In the Money' : 'Out of the Money'}
                </div>
              </div>
              <div className="bg-gray-100 p-2 rounded text-center">
                <div className="text-sm text-gray-600">To Break Even</div>
                <div className={`text-lg font-medium ${getStatusColor(priceToBreakEven)}`}>
                  {priceToBreakEven > 0 ? '+' : ''}{priceToBreakEven.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">From current price</div>
              </div>
            </div>
            
            {/* Premium info */}
            <div className="bg-gray-100 p-3 rounded flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Premium</div>
                <div className="text-xl font-bold">${premium.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Per Contract</div>
                <div className="text-lg font-medium">${(premium * 100).toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          {/* Right column - Greeks and other metrics */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Option Greeks</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Delta</h3>
                <div className="text-xl font-bold">{selectedOption.delta}</div>
                <p className="text-xs text-gray-500 mt-1">Price change per $1 move</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Gamma</h3>
                <div className="text-xl font-bold">{selectedOption.gamma}</div>
                <p className="text-xs text-gray-500 mt-1">Delta change per $1 move</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Theta</h3>
                <div className="text-xl font-bold">{selectedOption.theta}</div>
                <p className="text-xs text-gray-500 mt-1">Time decay per day</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Vega</h3>
                <div className="text-xl font-bold">{selectedOption.vega}</div>
                <p className="text-xs text-gray-500 mt-1">Price change per 1% IV</p>
              </div>
            </div>
            
            <h2 className="text-lg font-semibold mb-4">Option Vitals</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Implied Volatility</h3>
                <div className="text-xl font-bold">{selectedOption.iv}%</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Expiration</h3>
                <div className="text-xl font-bold">{daysToExpiration} days</div>
                <p className="text-xs text-gray-500 mt-1">{selectedOption.expirationDate}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Volume</h3>
                <div className="text-xl font-bold">{selectedOption.volume.toLocaleString()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600">Open Interest</h3>
                <div className="text-xl font-bold">{selectedOption.openInterest.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Show a prompt when no option is selected */
        optionsChain && selectedExpiry && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mb-6 text-center">
            <h3 className="text-xl font-semibold text-blue-800 mb-2">Select an Option to Analyze</h3>
            <p className="text-blue-600 mb-4">
              Choose an option from the tables below to view detailed analysis, Greeks, and price visualization.
            </p>
            <div className="flex justify-center">
              <svg className="w-10 h-10 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </div>
        )
      )}
      
      {/* Risk Assessment and Options Cost Calculator */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Risk Analysis & Cost Calculator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 rounded-lg border bg-red-50 border-red-200">
            <p className="text-sm font-medium text-red-800">Maximum Loss</p>
            <p className="text-xl font-bold text-red-800">
              ${(selectedOption.premium * 100).toFixed(2)} per contract
            </p>
            <p className="text-xs text-red-600 mt-1">
              If the option expires worthless
            </p>
          </div>
          
          <div className="p-3 rounded-lg border bg-green-50 border-green-200">
            <p className="text-sm font-medium text-green-800">Profit at Expiration</p>
            <p className="text-lg font-medium text-green-800">
              {selectedOption.type === 'Call' 
                ? `(Price - $${selectedOption.strike}) × 100 - $${(selectedOption.premium * 100).toFixed(2)}` 
                : `($${selectedOption.strike} - Price) × 100 - $${(selectedOption.premium * 100).toFixed(2)}`}
            </p>
            <p className="text-xs text-green-600 mt-1">
              If {selectedOption.type === 'Call' ? 'price > ' : 'price < '} 
              ${selectedOption.type === 'Call' ? breakEvenPrice.toFixed(2) : (selectedOption.strike - selectedOption.premium).toFixed(2)} at expiration
            </p>
          </div>
          
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
            <p className="text-sm font-medium text-blue-800">Time Value</p>
            <p className="text-xl font-bold text-blue-800">
              ${(() => {
                let intrinsicValue = 0;
                if (selectedOption.type === 'Call') {
                  intrinsicValue = Math.max(0, stock.currentPrice - selectedOption.strike);
                } else {
                  intrinsicValue = Math.max(0, selectedOption.strike - stock.currentPrice);
                }
                return (selectedOption.premium - intrinsicValue).toFixed(2);
              })()}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Portion of premium beyond intrinsic value
            </p>
          </div>
        </div>
        
        {/* Options Cost Calculator */}
        <div className="border rounded-lg p-4 bg-white">
          <h3 className="text-md font-semibold mb-3">Options Cost Calculator</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Contract Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Type:</span> {selectedOption.type}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Strike:</span> ${selectedOption.strike}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Premium:</span> ${selectedOption.premium.toFixed(2)}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Expires:</span> {daysToExpiration} days
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Potential Outcomes</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="p-2 bg-red-50 rounded">
                    <span className="text-gray-600">Max Loss:</span> ${(selectedOption.premium * 100).toFixed(2)} per contract
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <span className="text-gray-600">Break-even:</span> ${breakEvenPrice.toFixed(2)} 
                    ({selectedOption.type === 'Call' ? '+' : '-'}{Math.abs(priceToBreakEven).toFixed(2)}% from current)
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Total Investment</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Per Share:</span> ${selectedOption.premium.toFixed(2)}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">Per Contract:</span> ${(selectedOption.premium * 100).toFixed(2)}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">5 Contracts:</span> ${(selectedOption.premium * 500).toFixed(2)}
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">10 Contracts:</span> ${(selectedOption.premium * 1000).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Profit Scenarios at Expiration</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {(() => {
                    const scenarios = [];
                    const priceScenarios = [
                      stock.currentPrice * 0.9,
                      stock.currentPrice,
                      stock.currentPrice * 1.1
                    ];
                    
                    for (const price of priceScenarios) {
                      let profit = 0;
                      if (selectedOption.type === 'Call') {
                        profit = Math.max(0, price - selectedOption.strike) * 100 - (selectedOption.premium * 100);
                      } else {
                        profit = Math.max(0, selectedOption.strike - price) * 100 - (selectedOption.premium * 100);
                      }
                      
                      const percentChange = ((price / stock.currentPrice) - 1) * 100;
                      
                      scenarios.push(
                        <div key={price} className={`p-2 ${profit > 0 ? 'bg-green-50' : 'bg-red-50'} rounded`}>
                          <span className="text-gray-600">If price is ${price.toFixed(2)} ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%):</span> 
                          <span className={profit > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {profit > 0 ? '+' : ''}{profit.toFixed(2)} per contract
                          </span>
                        </div>
                      );
                    }
                    
                    return scenarios;
                  })()} 
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsVisualizer;
