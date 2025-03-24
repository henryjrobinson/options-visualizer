import './App.css';
import { useState, useEffect } from 'react';
import OptionsVisualizer from './components/OptionsVisualizer';
import AlpacaTrading from './components/AlpacaTrading';
import { fetchOptionsChain, fetchStockData } from './services/alpacaService';
import { Search, RefreshCw } from 'lucide-react';

function App() {
  // Main application state
  const [selectedOption, setSelectedOption] = useState(null);
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [symbolInput, setSymbolInput] = useState('AAPL');
  const [optionsData, setOptionsData] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handler for when an option is selected in the OptionsVisualizer
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
  
  // Fetch options data when the stock symbol changes
  useEffect(() => {
    if (stockSymbol) {
      fetchOptionsData(stockSymbol);
    }
  }, [stockSymbol]);
  
  // Function to fetch options data from the backend
  const fetchOptionsData = async (symbol) => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First, fetch stock data to get current price
      const stockResponse = await fetchStockData(symbol);
      
      // Then fetch options chain
      const optionsResponse = await fetchOptionsChain(symbol);
      
      if (optionsResponse) {
        setOptionsData(optionsResponse);
        setStockData(stockResponse);
        
        // Update the symbol input to match the fetched data
        setSymbolInput(symbol);
      } else {
        throw new Error('No options data returned');
      }
    } catch (err) {
      console.error('Error fetching options data:', err);
      setError(`Failed to fetch options data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (symbolInput.trim()) {
      setStockSymbol(symbolInput.trim().toUpperCase());
    }
  };

  return (
    <div className="App">
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-6">Options Trading Visualizer</h1>
          
          {/* Global Search Bar */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 w-full">
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter stock symbol (e.g., AAPL, MSFT, TSLA)"
                  className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </form>
            
            {error && (
              <div className="mt-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
          
          {/* Options Visualizer Component */}
          <OptionsVisualizer 
            onOptionSelect={handleOptionSelect} 
            stockSymbol={stockSymbol}
            optionsData={optionsData}
            stockData={stockData}
            isLoading={isLoading}
          />
          
          {/* Alpaca Trading Component */}
          <AlpacaTrading 
            selectedOption={selectedOption} 
            stockSymbol={stockSymbol}
            onOptionsLoaded={setOptionsData}
            onStockSymbolChange={setStockSymbol}
            isSearchDisabled={true} /* Disable search in AlpacaTrading */
          />
        </div>
      </div>
    </div>
  );
}

export default App;
