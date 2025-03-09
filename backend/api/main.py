from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging
import os
import sys

# Add parent directory to path to import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.options_data_service import OptionsDataService

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Options Visualizer API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize options data service
options_service = OptionsDataService()

# Models
class OrderRequest(BaseModel):
    symbol: str
    side: str
    quantity: int
    order_type: str
    time_in_force: str
    limit_price: Optional[float] = None

# Routes
@app.get("/")
async def root():
    return {"message": "Options Visualizer API"}

@app.get("/api/stock/{symbol}")
async def get_stock_data(symbol: str, timeframe: str = "1D", days: int = 30):
    """Get historical stock data"""
    try:
        data = await options_service.get_stock_data(symbol, timeframe, days)
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        # Convert DataFrame to dict for JSON serialization
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "data": data.reset_index().to_dict(orient="records")
        }
    except Exception as e:
        logger.error(f"Error in get_stock_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/options/{symbol}")
async def get_options_chain(symbol: str):
    """Get options chain data for a symbol"""
    try:
        options_chain = await options_service.get_option_chain(symbol)
        if "error" in options_chain:
            raise HTTPException(status_code=404, detail=options_chain["error"])
        return options_chain
    except Exception as e:
        logger.error(f"Error in get_options_chain: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/account")
async def get_account_info():
    """Get account information"""
    try:
        account_info = await options_service.get_account_info()
        if "error" in account_info:
            raise HTTPException(status_code=500, detail=account_info["error"])
        return account_info
    except Exception as e:
        logger.error(f"Error in get_account_info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order")
async def place_order(order: OrderRequest):
    """Place an options order"""
    try:
        order_data = order.dict()
        result = await options_service.place_option_order(order_data)
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except Exception as e:
        logger.error(f"Error in place_order: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Explicitly set port to 8080 to avoid conflicts
    port = 8080
    host = "0.0.0.0"
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
