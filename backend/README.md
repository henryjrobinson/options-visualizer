# Options Visualizer Backend

This is the backend server for the Options Trading Visualizer application. It provides API endpoints for fetching options data and executing trades via the Alpaca Trading API.

## Features

- **Stock Data API**: Fetch historical stock data from Alpaca
- **Options Chain API**: Get options chain data for a specific stock symbol
- **Trading API**: Place options trades through Alpaca
- **Account Information**: Retrieve account details and portfolio information

## Getting Started

### Prerequisites

- Python 3.8+
- Alpaca API credentials (API Key and Secret)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd backend
   pip install -r requirements.txt
   ```
3. Create a `.env` file based on `.env.example` and add your Alpaca API credentials:
   ```
   ALPACA_API_KEY=your_api_key_here
   ALPACA_API_SECRET=your_api_secret_here
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ALPACA_DATA_URL=https://data.alpaca.markets
   ```

### Running the Server

Start the backend server:

```
cd backend/api
python main.py
```

The server will be available at http://localhost:8000

## API Endpoints

### Stock Data

```
GET /api/stock/{symbol}?timeframe=1D&days=30
```

Parameters:
- `symbol`: Stock symbol (e.g., AAPL)
- `timeframe`: Time interval (1D, 1H, 15Min)
- `days`: Number of days of historical data

### Options Chain

```
GET /api/options/{symbol}
```

Parameters:
- `symbol`: Stock symbol (e.g., AAPL)

### Account Information

```
GET /api/account
```

### Place Order

```
POST /api/order
```

Request body:
```json
{
  "symbol": "AAPL230616C00170000",
  "side": "buy",
  "quantity": 1,
  "order_type": "market",
  "time_in_force": "day",
  "limit_price": 4.65
}
```

## Integration with Alpaca

This backend integrates with the Alpaca Trading API to provide real-time market data and trading capabilities. The integration is based on the `alpaca-py` library and leverages both the Trading API and Market Data API.

### Alpaca API Features Used

- **Trading API**: Account information, order placement
- **Market Data API**: Historical stock data

### Paper Trading

By default, the application uses Alpaca's paper trading environment. To switch to live trading, modify the `ALPACA_BASE_URL` in your `.env` file to use the live API endpoint.

## Notes on Options Trading

Currently, Alpaca's options trading API has limited functionality. This backend includes placeholder implementations that will be updated as Alpaca enhances their options trading capabilities.

## Security Considerations

- API keys are stored in environment variables and never exposed to the client
- CORS is configured to only allow requests from trusted origins
- All API endpoints use proper error handling and validation
