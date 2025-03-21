# API Documentation

## Overview

The Options Visualizer backend provides a RESTful API that serves as a proxy to the Alpaca Trading API. This documentation outlines the available endpoints, request parameters, and response formats.

## Base URL

```
http://localhost:8000
```

## Authentication

The backend handles authentication with the Alpaca API using API keys stored in environment variables. No authentication is required for client requests to the backend in the development environment.

## Endpoints

### Stock Data

#### GET /api/stock/{symbol}

Fetches stock data for a given symbol.

**Parameters:**

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| symbol    | string | Yes      | Stock symbol (e.g., AAPL, MSFT)            |
| timeframe | string | No       | Time interval (1D, 1H, 15Min). Default: 1D |
| days      | int    | No       | Number of days of data. Default: 30        |

**Response:**

```json
{
  "symbol": "AAPL",
  "current_price": 178.72,
  "data": [
    {
      "date": "2025-02-19",
      "open": 176.15,
      "high": 179.43,
      "low": 175.82,
      "close": 178.72,
      "volume": 58234521
    },
    // Additional data points...
  ]
}
```

### Options Chain

#### GET /api/options/{symbol}

Fetches options chain data for a given symbol.

**Parameters:**

| Parameter | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| symbol    | string | Yes      | Stock symbol (e.g., AAPL, MSFT) |

**Response:**

```json
{
  "symbol": "AAPL",
  "current_price": 178.72,
  "expiration_dates": [
    "2025-03-21",
    "2025-04-18",
    "2025-05-16",
    "2025-06-20"
  ],
  "calls": [
    {
      "expiry": "2025-03-21",
      "strike": 180,
      "premium": 4.65,
      "lastPrice": 4.65,
      "bid": 4.60,
      "ask": 4.70,
      "volume": 1823,
      "open_interest": 4250,
      "implied_volatility": 27.5,
      "delta": 0.48,
      "gamma": 0.09,
      "theta": -0.12,
      "vega": 0.25,
      "in_the_money": false,
      "type": "Call"
    },
    // Additional call options...
  ],
  "puts": [
    {
      "expiry": "2025-03-21",
      "strike": 180,
      "premium": 5.25,
      "lastPrice": 5.25,
      "bid": 5.20,
      "ask": 5.30,
      "volume": 1542,
      "open_interest": 3875,
      "implied_volatility": 28.2,
      "delta": -0.52,
      "gamma": 0.09,
      "theta": -0.11,
      "vega": 0.24,
      "in_the_money": true,
      "type": "Put"
    },
    // Additional put options...
  ]
}
```

### Account Information

#### GET /api/account

Fetches account information from Alpaca.

**Response:**

```json
{
  "id": "account_id",
  "status": "ACTIVE",
  "currency": "USD",
  "buying_power": 100000.00,
  "cash": 50000.00,
  "portfolio_value": 75000.00,
  "long_market_value": 25000.00,
  "short_market_value": 0.00,
  "equity": 75000.00,
  "last_equity": 74500.00,
  "initial_margin": 12500.00,
  "maintenance_margin": 8500.00,
  "daytrading_buying_power": 200000.00,
  "regt_buying_power": 100000.00,
  "non_marginable_buying_power": 50000.00,
  "sma": 63000.00,
  "created_at": "2025-03-19T12:00:00Z"
}
```

### Order Placement

#### POST /api/order

Places an options order with Alpaca.

**Request Body:**

```json
{
  "symbol": "AAPL",
  "contract": "AAPL250321C00180000",
  "quantity": 1,
  "side": "buy",
  "type": "market",
  "time_in_force": "day"
}
```

**Parameters:**

| Parameter     | Type   | Required | Description                                           |
|---------------|--------|----------|-------------------------------------------------------|
| symbol        | string | Yes      | Stock symbol (e.g., AAPL, MSFT)                       |
| contract      | string | Yes      | Options contract identifier                           |
| quantity      | int    | Yes      | Number of contracts                                   |
| side          | string | Yes      | Order side (buy, sell)                                |
| type          | string | Yes      | Order type (market, limit)                            |
| time_in_force | string | Yes      | Time in force (day, gtc, ioc, fok)                    |
| limit_price   | float  | No       | Limit price (required for limit orders)               |
| stop_price    | float  | No       | Stop price (required for stop and stop-limit orders)  |

**Response:**

```json
{
  "id": "order_id",
  "client_order_id": "client_order_id",
  "status": "accepted",
  "symbol": "AAPL",
  "asset_class": "option",
  "type": "market",
  "side": "buy",
  "qty": 1,
  "filled_qty": 0,
  "filled_avg_price": null,
  "order_class": "simple",
  "time_in_force": "day",
  "created_at": "2025-03-19T12:00:00Z",
  "updated_at": "2025-03-19T12:00:00Z",
  "submitted_at": "2025-03-19T12:00:00Z",
  "filled_at": null,
  "expired_at": null,
  "canceled_at": null,
  "failed_at": null,
  "replaced_at": null,
  "replaced_by": null,
  "replaces": null
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (invalid API credentials)
- 404: Not Found (resource not found)
- 500: Internal Server Error

Error responses include a message field with details about the error:

```json
{
  "detail": "Error message describing the issue"
}
```

## Rate Limiting

The backend does not implement rate limiting, but the Alpaca API does. Please refer to the [Alpaca API documentation](https://alpaca.markets/docs/api-documentation/) for details on rate limits.

## Mock Data

The backend includes a mock data mode for development and testing purposes. When enabled, the backend will return realistic mock data instead of making actual API calls to Alpaca. This is useful for development when you don't want to use real API credentials or make real API calls.

To enable mock data mode, set the `USE_MOCK_DATA` environment variable to `true` in the backend `.env` file.
