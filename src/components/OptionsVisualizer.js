import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, DollarSign, Percent, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { fetchOptionsChain, fetchStockData } from '../services/alpacaService';

const OptionsVisualizer = ({ onOptionSelect }) => {
  // Stock and options state
  const [stock, setStock] = useState({
    symbol: 'AAPL',
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
  const [symbolInput, setSymbolInput] = useState(stock.symbol);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optionsChain, setOptionsChain] = useState(null);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [selectedType, setSelectedType] = useState('Call');
  
  // Notify parent component when option is selected
  useEffect(() => {
    if (onOptionSelect && selectedOption) {
      onOptionSelect(selectedOption, stock.symbol);
    }
  }, [selectedOption, stock.symbol, onOptionSelect]);

  // Calculate important metrics
  const daysToExpiration = (() => {
    const expDate = new Date(selectedOption.expirationDate);
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
  
  const breakEvenPrice = selectedOption.type === 'Call'
    ? selectedOption.strike + selectedOption.premium
    : selectedOption.strike - selectedOption.premium;
  
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

  // Function to fetch options data from our backend
  const fetchOptionsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, fetch stock data to get current price
      const stockData = await fetchStockData(symbolInput.toUpperCase());
      
      // Then fetch options chain
      const optionsData = await fetchOptionsChain(symbolInput.toUpperCase());
      
      if (optionsData) {
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
            currentPrice: latestData.close,
            previousClose: previousData ? previousData.close : latestData.close * 0.99
          });
        } else {
          // Fallback to options data if stock data doesn't have what we need
          setStock({
            symbol: optionsData.symbol,
            currentPrice: optionsData.current_price,
            previousClose: optionsData.current_price * 0.99 // Estimate previous close
          });
        }
      } else {
        throw new Error('No options data returned');
      }
    } catch (err) {
      console.error('Error fetching options data:', err);
      setError(`Failed to fetch options data: ${err.message}`);
      
      // Use mock data as fallback when backend is not available
      const mockOptionsChain = {
        symbol: symbolInput.toUpperCase(),
        current_price: 178.72,
        expiration_dates: [
          '2025-03-21',
          '2025-04-18',
          '2025-05-16',
          '2025-06-20'
        ],
        calls: [
          // Sample options data
          {
            expiry: '2025-03-21',
            strike: 180,
            premium: 4.65,
            bid: 4.60,
            ask: 4.70,
            volume: 1823,
            open_interest: 4250,
            implied_volatility: 27.5,
            delta: 0.48,
            gamma: 0.09,
            theta: -0.12,
            vega: 0.25,
            in_the_money: false
          },
          // More sample data...
        ],
        puts: [
          {
            expiry: '2025-03-21',
            strike: 180,
            premium: 5.15,
            bid: 5.10,
            ask: 5.20,
            volume: 1623,
            open_interest: 3950,
            implied_volatility: 28.5,
            delta: -0.52,
            gamma: 0.09,
            theta: -0.13,
            vega: 0.25,
            in_the_money: true
          },
          // More sample data...
        ]
      };
      
      setOptionsChain(mockOptionsChain);
      setSelectedExpiry(mockOptionsChain.expiration_dates[0]);
      
      // Update stock info with mock data
      setStock({
        symbol: mockOptionsChain.symbol,
        currentPrice: mockOptionsChain.current_price,
        previousClose: mockOptionsChain.current_price * 0.99
      });
      
      setError('Using mock data - backend connection failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle option selection
  const handleOptionSelect = (option) => {
    setSelectedOption({
      ...option,
      type: selectedType
    });
  };
  
  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      fetchOptionsData();
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-4 flex">
        <input
          type="text"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
          placeholder="Enter stock symbol"
          className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md flex items-center"
          disabled={isLoading}
        >
          {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
          <span className="ml-2">Search</span>
        </button>
      </form>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{stock.symbol}</h1>
          <div className="flex items-center mt-1">
            <span className="text-xl">${stock.currentPrice.toFixed(2)}</span>
            <span className={`ml-2 flex items-center ${getStatusColor(stockPriceChange)}`}>
              {stockPriceChange > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {Math.abs(stockPriceChange).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${selectedOption.type === 'Call' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            {selectedOption.type}
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
            ${selectedOption.strike} Strike
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium flex items-center">
            <Clock size={14} className="mr-1" />
            {daysToExpiration} Days
          </div>
        </div>
      </div>
      
      {/* Expiration Date Selector */}
      {optionsChain && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Expiration Dates</h3>
          <div className="flex flex-wrap gap-2">
            {optionsChain.expiration_dates.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedExpiry(date)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${selectedExpiry === date
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                {date}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Option Type Selector */}
      {optionsChain && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Option Type</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedType('Call')}
              className={`px-4 py-2 rounded-md font-medium ${selectedType === 'Call'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Calls
            </button>
            <button
              onClick={() => setSelectedType('Put')}
              className={`px-4 py-2 rounded-md font-medium ${selectedType === 'Put'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
            >
              Puts
            </button>
          </div>
        </div>
      )}
      
      {/* Options Chain Table */}
      {optionsChain && selectedExpiry && (
        <div className="mb-6 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-2">{selectedType}s Expiring {selectedExpiry}</h3>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid/Ask</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delta</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {optionsChain[selectedType === 'Call' ? 'calls' : 'puts']
                .filter(option => option.expiry === selectedExpiry)
                .map((option, index) => (
                  <tr 
                    key={`${option.strike}-${index}`}
                    className={`hover:bg-gray-50 ${option.strike === selectedOption.strike ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={option.in_the_money ? 'font-bold text-green-600' : ''}>
                        ${option.strike}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">${option.premium.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">${option.bid.toFixed(2)} / ${option.ask.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{option.implied_volatility.toFixed(1)}%</td>
                    <td className="px-4 py-2 whitespace-nowrap">{option.delta.toFixed(2)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{option.volume.toLocaleString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOptionSelect(option)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Main Option Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left column - Price visualization */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Price Analysis</h2>
          
          {/* Price bar */}
          <div className="relative pt-6 pb-12">
            <div className="h-2 bg-gray-300 rounded-full w-full mb-8"></div>
            
            {/* Current stock price marker */}
            <div className="absolute top-5" style={{ left: `${(stock.currentPrice / (selectedOption.strike * 1.5)) * 100}%` }}>
              <div className="w-2 h-8 bg-black rounded-full mx-auto"></div>
              <p className="text-xs font-medium text-center mt-1">Current<br />${stock.currentPrice}</p>
            </div>
            
            {/* Strike price marker */}
            <div className="absolute top-5" style={{ left: `${(selectedOption.strike / (selectedOption.strike * 1.5)) * 100}%` }}>
              <div className="w-2 h-8 bg-blue-600 rounded-full mx-auto"></div>
              <p className="text-xs font-medium text-center mt-1">Strike<br />${selectedOption.strike}</p>
            </div>
            
            {/* Break-even marker */}
            <div className="absolute top-5" style={{ left: `${(breakEvenPrice / (selectedOption.strike * 1.5)) * 100}%` }}>
              <div className="w-2 h-8 bg-yellow-500 rounded-full mx-auto"></div>
              <p className="text-xs font-medium text-center mt-1">Break-even<br />${breakEvenPrice.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Moneyness status */}
          <div className={`p-3 rounded-lg border mb-4 ${getMoneynessColor()}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Status</span>
              <span className="font-bold">
                {inTheMoney ? 'In The Money' : 'Out of The Money'} ({moneyness.toFixed(2)}%)
              </span>
            </div>
          </div>
          
          {/* Break-even info */}
          <div className="p-3 rounded-lg border mb-4 bg-yellow-50 border-yellow-200 text-yellow-800">
            <div className="flex justify-between items-center">
              <span className="font-medium">Break-even at</span>
              <span className="font-bold">${breakEvenPrice.toFixed(2)} ({priceToBreakEven > 0 ? '+' : ''}{priceToBreakEven.toFixed(2)}%)</span>
            </div>
          </div>
          
          {/* Premium paid */}
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
            <div className="flex justify-between items-center">
              <span className="font-medium">Premium</span>
              <span className="font-bold">${selectedOption.premium} per share (${(selectedOption.premium * 100).toFixed(2)} per contract)</span>
            </div>
          </div>
        </div>
        
        {/* Right column - Greeks and vitals */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Option Greeks</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Delta */}
            <div className="p-3 rounded-lg border bg-gradient-to-r from-white to-blue-50">
              <p className="text-xs text-gray-500 mb-1">Delta</p>
              <p className="text-xl font-bold">{selectedOption.delta.toFixed(2)}</p>
              <p className="text-xs mt-1">
                ${(selectedOption.delta * 1).toFixed(2)} change per $1 stock move
              </p>
            </div>
            
            {/* Gamma */}
            <div className="p-3 rounded-lg border bg-gradient-to-r from-white to-purple-50">
              <p className="text-xs text-gray-500 mb-1">Gamma</p>
              <p className="text-xl font-bold">{selectedOption.gamma.toFixed(2)}</p>
              <p className="text-xs mt-1">
                Delta change per $1 stock move
              </p>
            </div>
            
            {/* Theta */}
            <div className="p-3 rounded-lg border bg-gradient-to-r from-white to-red-50">
              <p className="text-xs text-gray-500 mb-1">Theta</p>
              <p className="text-xl font-bold">{selectedOption.theta.toFixed(2)}</p>
              <p className="text-xs mt-1">
                ${Math.abs(selectedOption.theta).toFixed(2)} decay per day
              </p>
            </div>
            
            {/* Vega */}
            <div className="p-3 rounded-lg border bg-gradient-to-r from-white to-green-50">
              <p className="text-xs text-gray-500 mb-1">Vega</p>
              <p className="text-xl font-bold">{selectedOption.vega.toFixed(2)}</p>
              <p className="text-xs mt-1">
                ${selectedOption.vega.toFixed(2)} change per 1% IV change
              </p>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold my-4">Option Vitals</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* IV */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center">
                <Percent size={16} className="mr-2 text-gray-500" />
                <p className="text-sm font-medium">Implied Volatility</p>
              </div>
              <p className="text-lg font-bold mt-1">{selectedOption.iv.toFixed(1)}%</p>
            </div>
            
            {/* Expiration */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center">
                <Clock size={16} className="mr-2 text-gray-500" />
                <p className="text-sm font-medium">Expires In</p>
              </div>
              <p className="text-lg font-bold mt-1">{daysToExpiration} days</p>
            </div>
            
            {/* Volume */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center">
                <TrendingUp size={16} className="mr-2 text-gray-500" />
                <p className="text-sm font-medium">Volume</p>
              </div>
              <p className="text-lg font-bold mt-1">{selectedOption.volume.toLocaleString()}</p>
            </div>
            
            {/* Open Interest */}
            <div className="p-3 rounded-lg border">
              <div className="flex items-center">
                <DollarSign size={16} className="mr-2 text-gray-500" />
                <p className="text-sm font-medium">Open Interest</p>
              </div>
              <p className="text-lg font-bold mt-1">{selectedOption.openInterest.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Risk Assessment */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Risk Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Price × 100 − ${(selectedOption.premium * 100).toFixed(2)} per contract
            </p>
            <p className="text-xs text-green-600 mt-1">
              If price &gt; ${breakEvenPrice.toFixed(2)} at expiration
            </p>
          </div>
          
          <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
            <p className="text-sm font-medium text-blue-800">Time Value</p>
            <p className="text-xl font-bold text-blue-800">
              ${(selectedOption.premium - Math.max(0, stock.currentPrice - selectedOption.strike)).toFixed(2)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Portion of premium beyond intrinsic value
            </p>
          </div>
        </div>
      </div>
      
      {/* Option Chain Preview */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Related Options</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strike</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Break-even</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="bg-green-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">Call</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${selectedOption.strike}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${selectedOption.premium}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${breakEvenPrice.toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{selectedOption.iv}%</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">{selectedOption.delta}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">Call</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${selectedOption.strike + 5}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">$2.85</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${(selectedOption.strike + 5 + 2.85).toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">26.2%</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">0.32</td>
              </tr>
              <tr>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">Call</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${selectedOption.strike - 5}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">$7.25</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">${(selectedOption.strike - 5 + 7.25).toFixed(2)}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">28.4%</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm">0.65</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OptionsVisualizer;
