import './App.css';
import { useState } from 'react';
import OptionsVisualizer from './components/OptionsVisualizer';
import AlpacaTrading from './components/AlpacaTrading';

function App() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [stockSymbol, setStockSymbol] = useState('AAPL');

  // Handler for when an option is selected in the OptionsVisualizer
  const handleOptionSelect = (option, symbol) => {
    setSelectedOption(option);
    if (symbol) setStockSymbol(symbol);
  };

  return (
    <div className="App">
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">Options Trading Visualizer</h1>
          
          {/* Options Visualizer Component */}
          <OptionsVisualizer onOptionSelect={handleOptionSelect} />
          
          {/* Alpaca Trading Component */}
          <AlpacaTrading selectedOption={selectedOption} stockSymbol={stockSymbol} />
        </div>
      </div>
    </div>
  );
}

export default App;
