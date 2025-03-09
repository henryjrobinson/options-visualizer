import os
from dotenv import load_dotenv
import pandas as pd
import logging
from datetime import datetime, timedelta
import pytz
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import GetAssetsRequest
from alpaca.trading.enums import AssetClass, AssetStatus
from alpaca.trading.requests import MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class OptionsDataService:
    """Service for fetching options data and executing options trades via Alpaca API"""
    
    def __init__(self):
        """Initialize the options data service with Alpaca API credentials"""
        self.api_key = os.getenv('ALPACA_API_KEY')
        self.api_secret = os.getenv('ALPACA_API_SECRET')
        self.base_url = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')
        self.data_url = os.getenv('ALPACA_DATA_URL', 'https://data.alpaca.markets')
        
        if not self.api_key or not self.api_secret:
            logger.error("Alpaca API credentials not found in environment variables")
            raise ValueError("Alpaca API credentials are required")
        
        # Initialize Alpaca clients
        self.data_client = StockHistoricalDataClient(
            api_key=self.api_key,
            secret_key=self.api_secret,
            url_override=self.data_url
        )
        
        self.trading_client = TradingClient(
            api_key=self.api_key,
            secret_key=self.api_secret,
            paper=True  # Use paper trading by default
        )
        
        logger.info("Options data service initialized with Alpaca API")
    
    async def get_stock_data(self, symbol: str, timeframe: str = "1D", days: int = 30) -> pd.DataFrame:
        """
        Get historical stock data from Alpaca
        
        Args:
            symbol: Stock symbol
            timeframe: Time interval (1D, 1H, 15Min, etc.)
            days: Number of days of historical data to fetch
            
        Returns:
            DataFrame with historical stock data
        """
        try:
            # Map timeframe string to TimeFrame object
            if timeframe == "1D":
                tf_obj = TimeFrame.Day
            elif timeframe == "1H":
                tf_obj = TimeFrame.Hour
            elif timeframe == "15Min":
                tf_obj = TimeFrame.Minute
                days = min(days, 7)  # Limit minute data to 7 days to avoid excessive data
            else:
                tf_obj = TimeFrame.Minute
                days = min(days, 3)  # Limit minute data to 3 days
            
            # Calculate start and end dates
            end = datetime.now(pytz.UTC)
            start = end - timedelta(days=days)
            
            # Create request
            request = StockBarsRequest(
                symbol_or_symbols=symbol,
                timeframe=tf_obj,
                start=start,
                end=end,
                adjustment='all'
            )
            
            # Get data
            bars = self.data_client.get_stock_bars(request)
            
            if bars and symbol in bars:
                df = bars[symbol].df
                logger.info(f"Successfully retrieved {len(df)} bars for {symbol}")
                return df
            else:
                logger.warning(f"No data returned for {symbol}")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"Error fetching stock data: {str(e)}")
            return pd.DataFrame()
    
    async def get_option_chain(self, symbol: str) -> dict:
        """
        Get options chain data for a symbol
        
        Note: As of now, Alpaca's options data API is limited compared to other providers.
        This is a placeholder that would need to be expanded with actual options chain data.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Dictionary with options chain data
        """
        try:
            # This is a placeholder - Alpaca's options data API is currently limited
            # In a real implementation, you would use Alpaca's options API when available
            # or integrate with another provider like TDAmeritrade or IBKR
            
            # For now, we'll return a mock response with some basic structure
            logger.warning("Using mock options chain data - replace with actual API call")
            
            # Get current stock price to use as reference
            stock_data = await self.get_stock_data(symbol, timeframe="1D", days=1)
            if stock_data.empty:
                return {"error": f"Could not fetch stock data for {symbol}"}
            
            current_price = stock_data['close'].iloc[-1]
            
            # Generate mock options chain
            expiration_dates = [
                (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
            ]
            
            # Create strikes around current price
            base_strike = round(current_price / 5) * 5  # Round to nearest $5
            strikes = [base_strike + (i - 4) * 5 for i in range(9)]  # 4 below, current, 4 above
            
            options_chain = {
                "symbol": symbol,
                "current_price": current_price,
                "expiration_dates": expiration_dates,
                "calls": [],
                "puts": []
            }
            
            # Generate mock call options
            for expiry in expiration_dates:
                days_to_expiry = (datetime.strptime(expiry, "%Y-%m-%d") - datetime.now()).days
                
                for strike in strikes:
                    # Calculate mock values based on strike and days to expiry
                    itm = current_price > strike
                    distance = abs(current_price - strike) / current_price
                    
                    # Mock premium calculation
                    base_premium = current_price * 0.05 * (1 + days_to_expiry/30)
                    premium = base_premium * (1 - distance * 0.8) if itm else base_premium * (1 - distance * 1.2)
                    premium = max(0.05, premium)  # Minimum premium
                    
                    # Mock greeks
                    delta = 0.5 + (0.5 * (current_price - strike) / strike) if itm else 0.5 * (1 - distance)
                    delta = max(0.05, min(0.95, delta))
                    
                    theta = -premium / days_to_expiry * 0.1
                    gamma = 0.06 * (1 - distance * 2)
                    vega = premium * 0.1
                    
                    # Add call option
                    options_chain["calls"].append({
                        "expiry": expiry,
                        "strike": strike,
                        "premium": round(premium, 2),
                        "bid": round(premium * 0.95, 2),
                        "ask": round(premium * 1.05, 2),
                        "volume": int(1000 * (1 - distance)),
                        "open_interest": int(5000 * (1 - distance)),
                        "implied_volatility": round(30 + distance * 100, 2),
                        "delta": round(delta, 2),
                        "gamma": round(gamma, 3),
                        "theta": round(theta, 3),
                        "vega": round(vega, 3),
                        "in_the_money": itm
                    })
                    
                    # Add put option (with adjusted values)
                    put_itm = current_price < strike
                    put_delta = -0.5 - (0.5 * (current_price - strike) / strike) if put_itm else -0.5 * (1 - distance)
                    put_delta = min(-0.05, max(-0.95, put_delta))
                    
                    options_chain["puts"].append({
                        "expiry": expiry,
                        "strike": strike,
                        "premium": round(premium * (1.1 if put_itm else 0.9), 2),
                        "bid": round(premium * 0.95 * (1.1 if put_itm else 0.9), 2),
                        "ask": round(premium * 1.05 * (1.1 if put_itm else 0.9), 2),
                        "volume": int(800 * (1 - distance)),
                        "open_interest": int(4000 * (1 - distance)),
                        "implied_volatility": round(35 + distance * 100, 2),
                        "delta": round(put_delta, 2),
                        "gamma": round(gamma, 3),
                        "theta": round(theta * 1.1, 3),
                        "vega": round(vega, 3),
                        "in_the_money": put_itm
                    })
            
            return options_chain
            
        except Exception as e:
            logger.error(f"Error fetching options chain: {str(e)}")
            return {"error": str(e)}
    
    async def get_account_info(self) -> dict:
        """Get account information from Alpaca"""
        try:
            account = self.trading_client.get_account()
            return {
                "id": account.id,
                "cash": float(account.cash),
                "portfolio_value": float(account.portfolio_value),
                "buying_power": float(account.buying_power),
                "equity": float(account.equity),
                "status": account.status
            }
        except Exception as e:
            logger.error(f"Error fetching account info: {str(e)}")
            return {"error": str(e)}
    
    async def place_option_order(self, order_data: dict) -> dict:
        """
        Place an options order (placeholder - Alpaca's options trading API is limited)
        
        Args:
            order_data: Dictionary with order details
                - symbol: Option symbol (e.g., AAPL230616C00170000)
                - side: "buy" or "sell"
                - quantity: Number of contracts
                - order_type: "market", "limit", etc.
                - time_in_force: "day", "gtc", etc.
                - limit_price: Limit price (if applicable)
                
        Returns:
            Dictionary with order result
        """
        try:
            # This is a placeholder - Alpaca's options trading API is currently limited
            # In a real implementation, you would use Alpaca's options API when available
            logger.warning("Options trading is not fully implemented in Alpaca API")
            
            # Return a mock response
            return {
                "id": "mock-order-id-12345",
                "status": "accepted",
                "symbol": order_data.get("symbol"),
                "side": order_data.get("side"),
                "quantity": order_data.get("quantity"),
                "type": order_data.get("order_type"),
                "time_in_force": order_data.get("time_in_force"),
                "submitted_at": datetime.now().isoformat(),
                "filled_at": None,
                "filled_quantity": 0,
                "message": "This is a mock order. Alpaca's options trading API is limited."
            }
            
        except Exception as e:
            logger.error(f"Error placing option order: {str(e)}")
            return {"error": str(e)}
