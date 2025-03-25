import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const [isIVSectionExpanded, setIsIVSectionExpanded] = useState(false);
  
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

  // For debugging - log options chain data
  useEffect(() => {
    if (optionsChain) {
      console.log('Options Chain Data:', optionsChain);
      console.log('IV Term Structure Data:', getIVTermStructureData());
      
      // Check if we have valid expirations
      if (optionsChain.expirations && optionsChain.expirations.length > 0) {
        console.log('Expirations available:', optionsChain.expirations);
        
        // Check a sample option to see its structure
        const sampleOptions = [...(optionsChain.calls || []), ...(optionsChain.puts || [])];
        if (sampleOptions.length > 0) {
          console.log('Sample option structure:', sampleOptions[0]);
        }
      } else {
        console.log('No expirations found in options chain');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsChain]); // Disabling the lint rule as getIVTermStructureData would cause a circular dependency

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

  // Calculate IV for a specific expiration date
  const calculateIVForExpiry = (daysToExpiry, expiryDate) => {
    if (!optionsChain) return 0;
    
    // Get both calls and puts for this expiry
    const options = [
      ...(optionsChain.calls?.filter(opt => opt.expiry === expiryDate) || []),
      ...(optionsChain.puts?.filter(opt => opt.expiry === expiryDate) || [])
    ];
    
    if (options.length === 0) {
      console.log(`No options found for expiry date: ${expiryDate}`);
      return 0;
    }
    
    // Filter out any options with zero or undefined implied_volatility
    const validOptions = options.filter(option => 
      option.implied_volatility !== undefined && 
      option.implied_volatility !== null && 
      parseFloat(option.implied_volatility) > 0
    );
    
    if (validOptions.length === 0) {
      console.log(`No valid IV data for expiry date: ${expiryDate}`);
      
      // Use mock data for demonstration purposes
      // In a real app, you would want to handle this differently
      return 20 + Math.random() * 15; // Random IV between 20% and 35%
    }
    
    const totalIV = validOptions.reduce((sum, option) => {
      const iv = parseFloat(option.implied_volatility);
      return sum + (isNaN(iv) ? 0 : iv);
    }, 0);
    
    // Convert from decimal to percentage if needed
    const avgIV = totalIV / validOptions.length;
    
    // Check if the IV is already in percentage form (> 1) or decimal form (< 1)
    return avgIV > 1 ? avgIV : avgIV * 100;
  };

  // Get IV term structure data for the chart
  const getIVTermStructureData = () => {
    if (!optionsChain) {
      console.log('No options chain data available');
      return [];
    }
    
    if (!optionsChain.expirations || optionsChain.expirations.length === 0) {
      console.log('No expirations in options chain');
      
      // Use mock data for demonstration purposes
      return getMockIVTermStructureData();
    }
    
    // Sort expirations by date
    const sortedExpirations = [...optionsChain.expirations].sort((a, b) => new Date(a) - new Date(b));
    console.log('Sorted expirations:', sortedExpirations);
    
    // Take up to 4 expiration dates for the chart
    const chartExpirations = sortedExpirations.slice(0, 4);
    
    // Calculate historical average IV if available, otherwise use a default
    const historicalAvgIV = 25; // Default historical average IV (%)
    const highIVThreshold = historicalAvgIV * 1.2; // 20% above historical average
    const lowIVThreshold = historicalAvgIV * 0.8; // 20% below historical average
    
    const result = chartExpirations.map((expiryDate, index) => {
      const expiry = new Date(expiryDate);
      const daysToExpiry = Math.round((expiry - new Date()) / (1000 * 60 * 60 * 24));
      const formattedDate = expiry.toISOString().split('T')[0];
      
      // Calculate IV for this expiration
      const iv = calculateIVForExpiry(daysToExpiry, expiryDate);
      console.log(`IV for ${expiryDate}: ${iv}%`);
      
      // Calculate IV60 and IV90 based on the main IV
      const iv60 = iv * (0.95 + Math.random() * 0.1);
      const iv90 = iv * (0.9 + Math.random() * 0.15);
      
      // Determine strategy recommendation
      let strategy = "NEUTRAL";
      let strategyDetail = "";
      
      if (iv > highIVThreshold) {
        strategy = "SELL PREMIUM";
        strategyDetail = "IV is high - favorable for selling options to collect premium";
      } else if (iv < lowIVThreshold) {
        strategy = "BUY OPTIONS";
        strategyDetail = "IV is low - favorable for buying options at discount";
      } else {
        strategyDetail = "IV is near historical average - consider neutral strategies";
      }
      
      // Determine strategy color
      let strategyColor = "bg-gray-100 text-gray-800";
      if (strategy === "SELL PREMIUM") {
        strategyColor = "bg-green-100 text-green-800";
      } else if (strategy === "BUY OPTIONS") {
        strategyColor = "bg-blue-100 text-blue-800";
      }
      
      return {
        date: formattedDate,
        displayDate: expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iv: iv,
        iv60: iv60,
        iv90: iv90,
        daysToExpiry,
        strategy,
        strategyDetail,
        strategyColor,
        isHighIV: iv > highIVThreshold,
        isLowIV: iv < lowIVThreshold
      };
    });
    
    console.log('Generated IV term structure data:', result);
    return result;
  };

  // Generate mock IV term structure data for demonstration
  const getMockIVTermStructureData = () => {
    const today = new Date();
    const mockExpirations = [
      new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000) // 120 days from now
    ];
    
    // Calculate historical average IV if available, otherwise use a default
    const historicalAvgIV = 25; // Default historical average IV (%)
    const highIVThreshold = historicalAvgIV * 1.2; // 20% above historical average
    const lowIVThreshold = historicalAvgIV * 0.8; // 20% below historical average
    
    return mockExpirations.map((expiryDate, index) => {
      const daysToExpiry = Math.round((expiryDate - today) / (1000 * 60 * 60 * 24)); 
      const formattedDate = expiryDate.toISOString().split('T')[0];
      
      // Generate different IV patterns for demonstration
      let iv;
      if (index === 0) {
        iv = 32; // High IV for first expiry (good for selling)
      } else if (index === 3) {
        iv = 18; // Low IV for last expiry (good for buying)
      } else {
        iv = 25 + (Math.random() * 6 - 3); // Around historical average for middle expiries
      }
      
      // Calculate IV60 and IV90 based on the main IV
      const iv60 = iv * (0.95 + Math.random() * 0.1);
      const iv90 = iv * (0.9 + Math.random() * 0.15);
      
      // Determine strategy recommendation
      let strategy = "NEUTRAL";
      let strategyDetail = "";
      
      if (iv > highIVThreshold) {
        strategy = "SELL PREMIUM";
        strategyDetail = "IV is high - favorable for selling options to collect premium";
      } else if (iv < lowIVThreshold) {
        strategy = "BUY OPTIONS";
        strategyDetail = "IV is low - favorable for buying options at discount";
      } else {
        strategyDetail = "IV is near historical average - consider neutral strategies";
      }
      
      // Determine strategy color
      let strategyColor = "bg-gray-100 text-gray-800";
      if (strategy === "SELL PREMIUM") {
        strategyColor = "bg-green-100 text-green-800";
      } else if (strategy === "BUY OPTIONS") {
        strategyColor = "bg-blue-100 text-blue-800";
      }
      
      return {
        date: formattedDate,
        displayDate: expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        iv: iv,
        iv60: iv60,
        iv90: iv90,
        daysToExpiry,
        strategy,
        strategyDetail,
        strategyColor,
        isHighIV: iv > highIVThreshold,
        isLowIV: iv < lowIVThreshold
      };
    });
  };

  // Render the IV term structure chart
  const renderIVTermStructureChart = () => {
    const data = getIVTermStructureData();
    
    if (!data || data.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          <p>No IV term structure data available. Try selecting a different stock with more active options.</p>
        </div>
      );
    }
    
    // Historical average and thresholds
    const historicalAvgIV = 25; // Default historical average IV (%)
    const highIVThreshold = historicalAvgIV * 1.2; // 20% above historical average
    const lowIVThreshold = historicalAvgIV * 0.8; // 20% below historical average
    
    return (
      <div className="mt-4">
        {/* Title and explanation */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <h4 className="text-lg font-semibold text-blue-800 mb-2 text-left">IV Term Structure</h4>
          <p className="text-sm text-blue-700 text-left">
            The IV Term Structure shows implied volatility across different expiration dates. 
            High IV periods (above {highIVThreshold.toFixed(1)}%) are favorable for <span className="font-bold">selling premium</span>, 
            while low IV periods (below {lowIVThreshold.toFixed(1)}%) are good for <span className="font-bold">buying options</span>.
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center mb-4 text-xs gap-4 bg-gray-50 p-2 rounded-md">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 mr-1 rounded-sm"></div>
            <span>High IV - Good for SELLING premium</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 mr-1 rounded-sm"></div>
            <span>Low IV - Good for BUYING options</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 mr-1 rounded-sm"></div>
            <span>IV60 (60-day)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-pink-500 mr-1 rounded-sm"></div>
            <span>IV90 (90-day)</span>
          </div>
        </div>
        
        {/* Threshold lines */}
        <div className="relative mb-2">
          <div className="border-t-2 border-dashed border-red-300 w-full pt-1">
            <span className="absolute right-0 text-xs font-medium text-red-500">High IV ({highIVThreshold.toFixed(1)}%)</span>
          </div>
        </div>
        
        <div className="relative mb-2 mt-6">
          <div className="border-t-2 border-gray-400 w-full pt-1">
            <span className="absolute right-0 text-xs font-medium text-gray-600">Historical Avg IV ({historicalAvgIV}%)</span>
          </div>
        </div>
        
        <div className="relative mb-4 mt-6">
          <div className="border-t-2 border-dashed border-blue-300 w-full pt-1">
            <span className="absolute right-0 text-xs font-medium text-blue-500">Low IV ({lowIVThreshold.toFixed(1)}%)</span>
          </div>
        </div>
        
        {/* Strategy labels */}
        <div className="grid grid-cols-4 gap-6 mb-2">
          {data.map((item, index) => {
            let labelColor = "bg-gray-100 text-gray-800";
            let labelText = "NEUTRAL";
            let labelBorder = "border-gray-200";
            
            if (item.isHighIV) {
              labelColor = "bg-green-100 text-green-800";
              labelText = "SELL";
              labelBorder = "border-green-200";
            } else if (item.isLowIV) {
              labelColor = "bg-blue-100 text-blue-800";
              labelText = "BUY";
              labelBorder = "border-blue-200";
            }
            
            return (
              <div key={`label-${index}`} className="flex justify-center">
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${labelColor} border ${labelBorder} shadow-sm`}>
                  {labelText}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Bar chart using CSS grid for better alignment */}
        <div className="grid grid-cols-4 gap-6">
          {data.map((item, index) => {
            // Determine bar color based on IV level
            let barColor = "bg-gray-400"; // Default neutral color
            
            if (item.isHighIV) {
              barColor = "bg-green-500"; // High IV - good for selling
            } else if (item.isLowIV) {
              barColor = "bg-blue-500"; // Low IV - good for buying
            }
            
            // Calculate bar heights - make sure they're visible
            const mainBarHeight = Math.max(20, Math.min(item.iv * 2, 100));
            const iv60BarHeight = Math.max(20, Math.min(item.iv60 * 2, 100));
            const iv90BarHeight = Math.max(20, Math.min(item.iv90 * 2, 100));
            
            return (
              <div key={`bar-${index}`} className="flex flex-col items-center">
                {/* IV values at the top */}
                <div className="flex justify-center gap-2 mb-2 text-xs font-semibold">
                  <span>{item.iv.toFixed(1)}%</span>
                  <span className="text-purple-600">{item.iv60.toFixed(1)}%</span>
                  <span className="text-pink-600">{item.iv90.toFixed(1)}%</span>
                </div>
                
                {/* Bar group */}
                <div className="flex justify-center gap-2 h-32 mb-4">
                  {/* Main IV bar */}
                  <div className="flex flex-col items-center justify-end">
                    <div className={`w-8 ${barColor} rounded-t-md shadow-md`} 
                         style={{ height: `${mainBarHeight}%` }}>
                    </div>
                  </div>
                  
                  {/* IV60 bar */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-4 bg-purple-500 rounded-t-md shadow-md" 
                         style={{ height: `${iv60BarHeight}%` }}>
                    </div>
                  </div>
                  
                  {/* IV90 bar */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="w-4 bg-pink-500 rounded-t-md shadow-md" 
                         style={{ height: `${iv90BarHeight}%` }}>
                    </div>
                  </div>
                </div>
                
                {/* Date and strategy info */}
                <div className="text-center p-2 bg-white rounded-md border border-gray-200 shadow-sm w-full">
                  <div className="text-sm font-medium text-gray-800">{item.displayDate}</div>
                  <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-md ${item.strategyColor}`}>
                    {item.strategy}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {item.strategyDetail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Additional trading insights based on IV term structure */}
        <div className="mt-6 p-3 bg-indigo-50 border border-indigo-100 rounded-md">
          <h4 className="text-sm font-semibold text-indigo-800 mb-1 text-left">Trading Insights</h4>
          <ul className="text-xs text-indigo-700 list-disc pl-4 space-y-1 text-left">
            <li>
              <span className="font-medium">Declining IV:</span> Consider selling shorter-dated options to capture premium decay.
            </li>
            <li>
              <span className="font-medium">Rising IV:</span> Look for buying opportunities in longer-dated options.
            </li>
            <li>
              <span className="font-medium">Flat IV curve:</span> Calendar spreads may be less profitable - consider vertical spreads instead.
            </li>
          </ul>
        </div>
      </div>
    );
  };

  // Calculate IV
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
    <div className="container mx-auto px-2 py-2">
      {/* Custom styles for selected rows */}
      <style jsx>{`
        .selected-call-row {
          box-shadow: inset 4px 0 0 0 #2563eb !important;
        }
        .selected-put-row {
          box-shadow: inset 4px 0 0 0 #9333ea !important;
        }
        .dark .selected-call-row {
          box-shadow: inset 4px 0 0 0 #FF2ECC !important;
        }
        .dark .selected-put-row {
          box-shadow: inset 4px 0 0 0 #FF2ECC !important;
        }
      `}</style>
      
      {/* Stock Info Header */}
      <div className="bg-white dark:bg-dark-surface shadow overflow-hidden rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="mb-2 sm:mb-0">
            <div className="flex items-baseline">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{stock.symbol}</h1>
              <p className="ml-2 text-gray-600 dark:text-gray-300">
                ${stock.currentPrice ? stock.currentPrice.toFixed(2) : '0.00'} 
                <span className={`ml-2 ${stockPriceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stockPriceChange >= 0 ? '+' : ''}{stockPriceChange.toFixed(2)}%
                </span>
              </p>
            </div>
            {/* Mock Data Warning - Integrated into stock component */}
            <div className="mt-1 bg-blue-50 dark:bg-dark-surface border border-blue-100 dark:border-gray-700 rounded-md py-1 px-2 text-xs text-blue-700 dark:text-blue-300 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Using mock data for demonstration
            </div>
          </div>
          
          {selectedOption && (
            <div className="bg-gray-50 dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">
                {selectedOption.type} ${selectedOption.strike} {selectedOption.expirationDate ? new Date(selectedOption.expirationDate).toLocaleDateString() : 'N/A'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Premium: ${typeof selectedOption.premium === 'number' ? selectedOption.premium.toFixed(2) : '0.00'} | IV: {typeof selectedOption.iv === 'number' ? selectedOption.iv.toFixed(1) : '0.00'}%
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Options Chain - Side by Side View */}
      {optionsChain && (
        <div className="bg-gray-50 dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex flex-wrap items-center justify-between mb-3">
            <h2 className="text-xl font-semibold mb-4 text-left text-gray-900 dark:text-white">Options Chain</h2>
            
            {/* Expiration Date Selector - Moved to the left and made more prominent */}
            <div className="flex-grow max-w-lg">
              <div className="flex items-center">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2 whitespace-nowrap">Expiration:</label>
                <div className="flex flex-wrap gap-1">
                  {optionsChain && optionsChain.expiration_dates && optionsChain.expiration_dates.map((date, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedExpiry(date)}
                      className={`px-2 py-0.5 rounded-md text-xs ${
                        selectedExpiry === date 
                          ? 'bg-blue-600 dark:bg-blue-800 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {new Date(date).toLocaleDateString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Side-by-side Call and Put Tables - Responsive for mobile */}
          {selectedExpiry && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Calls Table */}
              <div>
                <h3 className="text-md font-semibold mb-1 text-blue-700 dark:text-blue-300">Calls</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-dark-surface">
                      <tr>
                        <th className="w-1"></th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Strike</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bid</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ask</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IV</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
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
                              className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-800 ${
                                selectedOption && selectedOption.type === 'Call' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <td className={`w-1 ${
                                selectedOption && selectedOption.type === 'Call' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-blue-600 dark:bg-blue-800' 
                                  : ''
                              }`}></td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-medium">
                                ${option.strike.toFixed(2)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.last === 'number' ? option.last.toFixed(2) : option.last || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.bid === 'number' ? option.bid.toFixed(2) : option.bid || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.ask === 'number' ? option.ask.toFixed(2) : option.ask || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                {(option.implied_volatility || 0).toFixed(1)}%
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                {(option.volume || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                      }
                      {(!optionsChain || !optionsChain.calls || !selectedExpiry || 
                        !optionsChain.calls.filter(option => option.expiry === selectedExpiry).length) && (
                        <tr>
                          <td colSpan="7" className="px-2 py-2 text-center text-sm text-gray-500 dark:text-gray-300">
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
                <h3 className="text-md font-semibold mb-1 text-purple-700 dark:text-purple-300">Puts</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-700">
                    <thead className="bg-gray-100 dark:bg-dark-surface">
                      <tr>
                        <th className="w-1"></th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Strike</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bid</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ask</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IV</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
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
                              className={`cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-800 ${
                                selectedOption && selectedOption.type === 'Put' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <td className={`w-1 ${
                                selectedOption && selectedOption.type === 'Put' && selectedOption.strike === option.strike && selectedOption.expirationDate === option.expiry
                                  ? 'bg-purple-600 dark:bg-purple-800' 
                                  : ''
                              }`}></td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm font-medium">
                                ${option.strike.toFixed(2)}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.last === 'number' ? option.last.toFixed(2) : option.last || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.bid === 'number' ? option.bid.toFixed(2) : option.bid || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                ${typeof option.ask === 'number' ? option.ask.toFixed(2) : option.ask || '0.00'}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                {(option.implied_volatility || 0).toFixed(1)}%
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap text-sm">
                                {(option.volume || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                      }
                      {(!optionsChain || !optionsChain.puts || !selectedExpiry || 
                        !optionsChain.puts.filter(option => option.expiry === selectedExpiry).length) && (
                        <tr>
                          <td colSpan="7" className="px-2 py-2 text-center text-sm text-gray-500 dark:text-gray-300">
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
        <div className="bg-gray-50 dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold mb-4 text-left text-gray-900 dark:text-white">IV Surface Analysis</h2>
            
            {/* Expiration Date Selector - Moved to the left and made more prominent */}
            <button 
              onClick={() => setIsIVSectionExpanded(!isIVSectionExpanded)}
              className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 text-sm flex items-center"
            >
              {isIVSectionExpanded ? 'Show Less' : 'Show More'} 
              {isIVSectionExpanded ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
            </button>
          </div>
          
          {/* Condensed IV metrics - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">IV30</h3>
              <div className="text-xl font-bold">{calculateIV(30).toFixed(1)}%</div>
              <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-1">
                <div 
                  className="h-1 bg-blue-600 dark:bg-blue-800 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(30) * 2, 100)}%` }}
                ></div>
              </div>
              {isIVSectionExpanded && (
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {getIVStrategyInsight()}
                </p>
              )}
              {!isIVSectionExpanded && (
                <button 
                  onClick={() => setIsIVSectionExpanded(true)}
                  className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-400 text-xs mt-1"
                >
                  View strategy insights
                </button>
              )}
            </div>
            
            <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">IV60</h3>
              <div className="text-xl font-bold">{calculateIV(60).toFixed(1)}%</div>
              <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-1">
                <div 
                  className="h-1 bg-purple-600 dark:bg-purple-800 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(60) * 2, 100)}%` }}
                ></div>
              </div>
              {isIVSectionExpanded && (
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  {getIV60StrategyInsight()}
                </p>
              )}
              {!isIVSectionExpanded && (
                <button 
                  onClick={() => setIsIVSectionExpanded(true)}
                  className="text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-400 text-xs mt-1"
                >
                  View strategy insights
                </button>
              )}
            </div>
            
            <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">IV90</h3>
              <div className="text-xl font-bold">{calculateIV(90).toFixed(1)}%</div>
              <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full mb-1">
                <div 
                  className="h-1 bg-green-600 dark:bg-green-800 rounded-full" 
                  style={{ width: `${Math.min(calculateIV(90) * 2, 100)}%` }}
                ></div>
              </div>
              {isIVSectionExpanded && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {getIV90StrategyInsight()}
                </p>
              )}
              {!isIVSectionExpanded && (
                <button 
                  onClick={() => setIsIVSectionExpanded(true)}
                  className="text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-400 text-xs mt-1"
                >
                  View strategy insights
                </button>
              )}
            </div>
          </div>
          
          {/* IV Term Structure Chart - only visible when expanded */}
          {isIVSectionExpanded && (
            <div className="mt-6 bg-white dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-md font-semibold mb-3 text-left text-gray-900 dark:text-white">IV Term Structure</h3>
              {renderIVTermStructureChart()}
            </div>
          )}
        </div>
      )}
      
      {/* Main Option Visual - Only show when an option is selected */}
      {selectedOption && selectedOption.strike ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Left column - Price visualization */}
          <div className="bg-gray-50 dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Price Analysis</h2>
            
            {/* Price analysis - table-based layout to prevent overlapping */}
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full relative">
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
                        <div className="absolute top-0 h-4 w-1 bg-black dark:bg-white rounded-full" 
                             style={{ left: `${currentPricePos}%`, transform: 'translateX(-50%)' }}></div>
                        <div className="absolute top-0 h-4 w-1 bg-blue-600 dark:bg-blue-800 rounded-full" 
                             style={{ left: `${strikePricePos}%`, transform: 'translateX(-50%)' }}></div>
                        <div className="absolute top-0 h-4 w-1 bg-yellow-500 dark:bg-yellow-800 rounded-full" 
                             style={{ left: `${breakEvenPos}%`, transform: 'translateX(-50%)' }}></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Price points table */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-gray-100 dark:bg-gray-700 py-2 px-1 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-black dark:bg-white rounded-full"></div>
                  </div>
                  <div className="font-medium text-gray-600 dark:text-gray-300">Current Price</div>
                  <div className="text-lg font-bold">${stock.currentPrice.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 py-2 px-1 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-blue-600 dark:bg-blue-800 rounded-full"></div>
                  </div>
                  <div className="font-medium text-gray-600 dark:text-gray-300">Strike Price</div>
                  <div className="text-lg font-bold">${selectedOption.strike.toFixed(2)}</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 py-2 px-1 rounded">
                  <div className="flex justify-center mb-1">
                    <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-800 rounded-full"></div>
                  </div>
                  <div className="font-medium text-gray-600 dark:text-gray-300">Break Even</div>
                  <div className="text-lg font-bold">${breakEvenPrice.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-100 dark:bg-gray-700 py-2 px-2 rounded text-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">Moneyness</div>
                <div className={`text-lg font-medium ${getStatusColor(moneyness)}`}>
                  {moneyness > 0 ? '+' : ''}{moneyness.toFixed(2)}%
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getMoneynessColor()}`}>
                  {inTheMoney ? 'In the Money' : 'Out of the Money'}
                </div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 py-2 px-2 rounded text-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">To Break Even</div>
                <div className={`text-lg font-medium ${getStatusColor(priceToBreakEven)}`}>
                  {priceToBreakEven > 0 ? '+' : ''}{priceToBreakEven.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">From current price</div>
              </div>
            </div>
            
            {/* Premium info */}
            <div className="bg-gray-100 dark:bg-gray-700 py-2 px-3 rounded flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Premium</div>
                <div className="text-xl font-bold">${premium.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-300">Per Contract</div>
                <div className="text-lg font-medium">${(premium * 100).toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          {/* Right column - Greeks and other metrics */}
          <div className="bg-gray-50 dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Option Greeks</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Delta</h3>
                <div className="text-xl font-bold">{selectedOption.delta}</div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Price change per $1 move</p>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Gamma</h3>
                <div className="text-xl font-bold">{selectedOption.gamma}</div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Delta change per $1 move</p>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Theta</h3>
                <div className="text-xl font-bold">{selectedOption.theta}</div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Time decay per day</p>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Vega</h3>
                <div className="text-xl font-bold">{selectedOption.vega}</div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Price change per 1% IV</p>
              </div>
            </div>
            
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Option Vitals</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Implied Volatility</h3>
                <div className="text-xl font-bold">{selectedOption.iv}%</div>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Expiration</h3>
                <div className="text-xl font-bold">{daysToExpiration} days</div>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">{selectedOption.expirationDate}</p>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Volume</h3>
                <div className="text-xl font-bold">{selectedOption.volume.toLocaleString()}</div>
              </div>
              <div className="bg-white dark:bg-dark-surface py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Open Interest</h3>
                <div className="text-xl font-bold">{selectedOption.openInterest.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Show a prompt when no option is selected */
        optionsChain && selectedExpiry && (
          <div className="bg-blue-50 dark:bg-dark-surface py-4 px-3 rounded-lg border border-blue-100 dark:border-gray-700 mb-4 text-center">
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-2">Select an Option to Analyze</h3>
            <p className="text-blue-600 dark:text-blue-300 mb-4">
              Choose an option from the tables below to view detailed analysis, Greeks, and price visualization.
            </p>
            <div className="flex justify-center">
              <svg className="w-10 h-10 text-blue-500 dark:text-blue-300 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </div>
        )
      )}
      
      {/* Risk Assessment and Options Cost Calculator */}
      <div className="bg-gray-50 dark:bg-dark-surface py-3 px-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Risk Analysis & Cost Calculator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="py-2 px-3 rounded-lg border bg-red-50 dark:bg-red-800 border-red-200 dark:border-red-700">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Maximum Loss</p>
            <p className="text-lg font-bold text-red-800 dark:text-red-300">
              ${(selectedOption.premium * 100).toFixed(2)} per contract
            </p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">
              If the option expires worthless
            </p>
          </div>
          
          <div className="py-2 px-3 rounded-lg border bg-green-50 dark:bg-green-800 border-green-200 dark:border-green-700">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Profit at Expiration</p>
            <p className="text-lg font-medium text-green-800 dark:text-green-300">
              {selectedOption.type === 'Call' 
                ? `(Price - $${selectedOption.strike}) × 100 - $${(selectedOption.premium * 100).toFixed(2)}` 
                : `($${selectedOption.strike} - Price) × 100 - $${(selectedOption.premium * 100).toFixed(2)}`}
            </p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-1">
              If {selectedOption.type === 'Call' ? 'price > ' : 'price < '} 
              ${selectedOption.type === 'Call' ? breakEvenPrice.toFixed(2) : (selectedOption.strike - selectedOption.premium).toFixed(2)} at expiration
            </p>
          </div>
          
          <div className="py-2 px-3 rounded-lg border bg-blue-50 dark:bg-blue-800 border-blue-200 dark:border-blue-700">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Time Value</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
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
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Portion of premium beyond intrinsic value
            </p>
          </div>
        </div>
        
        {/* Options Cost Calculator */}
        <div className="border rounded-lg py-3 px-3 bg-white dark:bg-dark-surface">
          <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">Options Cost Calculator</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Contract Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Type:</span> {selectedOption.type}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Strike:</span> ${selectedOption.strike}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Premium:</span> ${selectedOption.premium.toFixed(2)}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Expires:</span> {daysToExpiration} days
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Potential Outcomes</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="py-1 px-2 bg-red-50 dark:bg-red-800 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Max Loss:</span> ${(selectedOption.premium * 100).toFixed(2)} per contract
                  </div>
                  <div className="py-1 px-2 bg-green-50 dark:bg-green-800 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Break-even:</span> ${breakEvenPrice.toFixed(2)} 
                    ({selectedOption.type === 'Call' ? '+' : '-'}{Math.abs(priceToBreakEven).toFixed(2)}% from current)
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Total Investment</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Per Share:</span> ${selectedOption.premium.toFixed(2)}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">Per Contract:</span> ${(selectedOption.premium * 100).toFixed(2)}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">5 Contracts:</span> ${(selectedOption.premium * 500).toFixed(2)}
                  </div>
                  <div className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-gray-600 dark:text-gray-300">10 Contracts:</span> ${(selectedOption.premium * 1000).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">Profit Scenarios at Expiration</p>
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
                        <div key={price} className={`py-1 px-2 ${profit > 0 ? 'bg-green-50 dark:bg-green-800' : 'bg-red-50 dark:bg-red-800'} rounded`}>
                          <span className="text-gray-600 dark:text-gray-300">If price is ${price.toFixed(2)} ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%):</span> 
                          <span className={profit > 0 ? 'text-green-600 dark:text-green-300 font-medium' : 'text-red-600 dark:text-red-300 font-medium'}>
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
