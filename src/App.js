import './App.css';
import { useState, useEffect } from 'react';
import OptionsVisualizer from './components/OptionsVisualizer';
import AlpacaTrading from './components/AlpacaTrading';
import { fetchOptionsChain, fetchStockData } from './services/alpacaService';
import { Search, RefreshCw } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

function App() {
  // Main application state
  const [selectedOption, setSelectedOption] = useState(null);
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('');
  const [optionsData, setOptionsData] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch options data when stock symbol changes
  useEffect(() => {
    if (stockSymbol) {
      fetchData(stockSymbol);
    }
  }, [stockSymbol]);

  // Handle option selection
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  // Fetch options and stock data
  const fetchData = async (symbol) => {
    setIsLoading(true);
    setError(null);
    try {
      const [optionsResponse, stockResponse] = await Promise.all([
        fetchOptionsChain(symbol),
        fetchStockData(symbol)
      ]);
      setOptionsData(optionsResponse);
      setStockData(stockResponse);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data for ${symbol}. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setStockSymbol(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchData(stockSymbol);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white transition-colors duration-200">
        <header className="bg-white dark:bg-dark-surface shadow-sm transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-200">Options Visualizer</h1>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <form onSubmit={handleSearch} className="flex items-center">
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={handleInputChange}
                    placeholder="Enter stock symbol"
                    className="focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-dark-accent dark:focus:border-dark-accent block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-dark-surface dark:text-white transition-colors duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  </div>
                </div>
                <button
                  type="submit"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-dark-accent dark:hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-dark-accent transition-colors duration-200"
                >
                  Search
                </button>
              </form>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-dark-accent transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <OptionsVisualizer
            onOptionSelect={handleOptionSelect}
            stockSymbol={stockSymbol}
            optionsData={optionsData}
            stockData={stockData}
            isLoading={isLoading}
          />

          {/* Alpaca Trading Component */}
          <div className="mt-8">
            <AlpacaTrading selectedOption={selectedOption} />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
