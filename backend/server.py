from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from jose import jwt, JWTError
from passlib.context import CryptContext
import json
import openai
import stripe
import asyncio
import aiohttp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'fxpulse-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Stripe
stripe.api_key = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# OpenAI
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
openai_client = openai.AsyncOpenAI(api_key=EMERGENT_LLM_KEY)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Admin credentials
ADMIN_EMAIL = "admin@fxpulse.com"
ADMIN_PASSWORD = "FxPulse2024!"

# Create the main app
app = FastAPI(title="FX Pulse API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# CoinGecko cache
crypto_cache = {"data": {}, "last_update": None}

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_premium: bool = False
    is_admin: bool = False
    subscription_tier: str = "free"
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: User

class SignalCreate(BaseModel):
    currency_pair: str
    timeframe: str = "1H"

class PositionSizeRequest(BaseModel):
    account_balance: float
    risk_percentage: float
    entry_price: float
    stop_loss: float
    currency_pair: str

class AdminSignalUpdate(BaseModel):
    status: Optional[str] = None
    confidence: Optional[float] = None
    is_active: Optional[bool] = None

class CheckoutRequest(BaseModel):
    origin_url: str
    plan: str = "pro"

# ===================== HELPERS =====================

def create_jwt_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    session_token = request.cookies.get("session_token")
    
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            return user
        except JWTError:
            pass
    
    return None

async def require_auth(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(request, credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await require_auth(request, credentials)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_premium(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await require_auth(request, credentials)
    tier = user.get("subscription_tier", "free")
    if tier == "free" and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Premium subscription required")
    return user

# ===================== FOREX & CRYPTO DATA =====================

FOREX_PAIRS = [
    # Major
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
    # Minor
    "EUR/GBP", "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD", "GBP/AUD", "EUR/CHF",
    "GBP/CHF", "AUD/CAD", "NZD/JPY", "EUR/NZD", "GBP/NZD", "CHF/JPY",
    # Exotic
    "USD/ZAR", "USD/TRY", "EUR/TRY"
]

CRYPTO_PAIRS = [
    "BTC/USD", "ETH/USD", "XRP/USD", "BTC/EUR", "ETH/BTC",
    "ADA/USD", "SOL/USD", "DOGE/USD"
]

ALL_PAIRS = FOREX_PAIRS + CRYPTO_PAIRS

TIMEFRAMES = ["1M", "5M", "15M", "30M", "1H", "4H", "1D", "1W"]

# Market sessions with times (UTC)
MARKET_SESSIONS = {
    "sydney": {"open": 22, "close": 7, "name": "Sydney", "pairs": ["AUD/USD", "NZD/USD", "AUD/JPY", "AUD/CAD", "NZD/JPY"]},
    "tokyo": {"open": 0, "close": 9, "name": "Tokyo", "pairs": ["USD/JPY", "EUR/JPY", "GBP/JPY", "AUD/JPY", "CHF/JPY"]},
    "london": {"open": 8, "close": 17, "name": "London", "pairs": ["EUR/USD", "GBP/USD", "EUR/GBP", "GBP/CHF", "EUR/CHF"]},
    "new_york": {"open": 13, "close": 22, "name": "New York", "pairs": ["EUR/USD", "USD/CAD", "GBP/USD", "USD/CHF"]}
}

COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "XRP": "ripple",
    "ADA": "cardano",
    "SOL": "solana",
    "DOGE": "dogecoin"
}

async def fetch_crypto_prices():
    """Fetch real crypto prices from CoinGecko"""
    global crypto_cache
    
    # Check cache (update every 30 seconds)
    if crypto_cache["last_update"]:
        elapsed = (datetime.now(timezone.utc) - crypto_cache["last_update"]).total_seconds()
        if elapsed < 30 and crypto_cache["data"]:
            return crypto_cache["data"]
    
    try:
        ids = ",".join(COINGECKO_IDS.values())
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd,eur,btc&include_24hr_change=true"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    crypto_cache["data"] = data
                    crypto_cache["last_update"] = datetime.now(timezone.utc)
                    return data
    except Exception as e:
        logger.error(f"CoinGecko fetch error: {e}")
    
    return crypto_cache.get("data", {})

def get_market_status():
    """Get current market open/close status"""
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    day_of_week = now.weekday()
    
    if day_of_week >= 5:
        return {
            "forex_open": False,
            "crypto_open": True,
            "message": "Forex closed for weekend. Crypto markets 24/7!",
            "sessions": {k: {"status": "closed", "name": v["name"]} for k, v in MARKET_SESSIONS.items()},
            "next_open": "Sunday 22:00 UTC (Sydney Open)"
        }
    
    sessions_status = {}
    active_sessions = []
    
    for session_key, session in MARKET_SESSIONS.items():
        open_hour = session["open"]
        close_hour = session["close"]
        
        if open_hour > close_hour:
            is_open = current_hour >= open_hour or current_hour < close_hour
        else:
            is_open = open_hour <= current_hour < close_hour
        
        sessions_status[session_key] = {
            "status": "open" if is_open else "closed",
            "name": session["name"],
            "open_time": f"{open_hour:02d}:00 UTC",
            "close_time": f"{close_hour:02d}:00 UTC",
            "active_pairs": session["pairs"] if is_open else []
        }
        
        if is_open:
            active_sessions.append(session["name"])
    
    return {
        "forex_open": len(active_sessions) > 0,
        "crypto_open": True,
        "active_sessions": active_sessions,
        "sessions": sessions_status,
        "server_time": now.strftime("%H:%M UTC"),
        "best_trading_time": len(active_sessions) >= 2
    }

async def get_forex_price(pair: str) -> dict:
    """Get forex price data (simulated with realistic movement)"""
    import random
    import math
    
    base_prices = {
        "EUR/USD": 1.0850, "GBP/USD": 1.2650, "USD/JPY": 149.50, "USD/CHF": 0.8750,
        "AUD/USD": 0.6550, "USD/CAD": 1.3650, "NZD/USD": 0.6150, "EUR/GBP": 0.8580,
        "EUR/JPY": 162.20, "GBP/JPY": 189.10, "AUD/JPY": 97.90, "EUR/AUD": 1.6550,
        "GBP/AUD": 1.9300, "EUR/CHF": 0.9500, "GBP/CHF": 1.1070, "AUD/CAD": 0.8950,
        "NZD/JPY": 91.80, "EUR/NZD": 1.7650, "GBP/NZD": 2.0580, "CHF/JPY": 170.80,
        "USD/ZAR": 18.50, "USD/TRY": 32.80, "EUR/TRY": 35.60
    }
    
    base = base_prices.get(pair, 1.0)
    now = datetime.now(timezone.utc)
    
    time_factor = now.timestamp() / 60
    wave1 = math.sin(time_factor * 0.1) * 0.001
    wave2 = math.sin(time_factor * 0.05) * 0.0005
    noise = random.uniform(-0.0002, 0.0002)
    
    current_price = base * (1 + wave1 + wave2 + noise)
    
    spread = 0.00015 if "JPY" not in pair else 0.015
    if "ZAR" in pair or "TRY" in pair:
        spread *= 3
    
    bid = current_price - spread / 2
    ask = current_price + spread / 2
    
    return {
        "pair": pair,
        "type": "forex",
        "bid": round(bid, 5 if "JPY" not in pair else 3),
        "ask": round(ask, 5 if "JPY" not in pair else 3),
        "price": round(current_price, 5 if "JPY" not in pair else 3),
        "change_24h": round(random.uniform(-1.5, 1.5), 2),
        "high_24h": round(current_price * 1.008, 5 if "JPY" not in pair else 3),
        "low_24h": round(current_price * 0.992, 5 if "JPY" not in pair else 3),
        "volume": random.randint(50000, 200000),
        "timestamp": now.isoformat(),
        "spread_pips": round(spread * (10000 if "JPY" not in pair else 100), 1)
    }

async def get_crypto_price(pair: str) -> dict:
    """Get real crypto price from CoinGecko"""
    base_currency = pair.split("/")[0]
    quote_currency = pair.split("/")[1]
    
    crypto_data = await fetch_crypto_prices()
    coin_id = COINGECKO_IDS.get(base_currency)
    
    if coin_id and coin_id in crypto_data:
        coin = crypto_data[coin_id]
        
        if quote_currency == "USD":
            price = coin.get("usd", 0)
            change = coin.get("usd_24h_change", 0)
        elif quote_currency == "EUR":
            price = coin.get("eur", 0)
            change = coin.get("eur_24h_change", 0)
        elif quote_currency == "BTC":
            price = coin.get("btc", 0)
            change = 0
        else:
            price = coin.get("usd", 0)
            change = coin.get("usd_24h_change", 0)
        
        if price > 0:
            import random
            spread = price * 0.0001
            
            return {
                "pair": pair,
                "type": "crypto",
                "bid": round(price - spread, 2 if price > 1 else 6),
                "ask": round(price + spread, 2 if price > 1 else 6),
                "price": round(price, 2 if price > 1 else 6),
                "change_24h": round(change, 2) if change else round(random.uniform(-3, 3), 2),
                "high_24h": round(price * 1.02, 2 if price > 1 else 6),
                "low_24h": round(price * 0.98, 2 if price > 1 else 6),
                "volume": random.randint(100000, 1000000),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "spread_pips": round(spread * 100, 2),
                "source": "coingecko"
            }
    
    # Fallback to simulated
    base_prices = {
        "BTC/USD": 97500, "ETH/USD": 3400, "XRP/USD": 2.35,
        "BTC/EUR": 92000, "ETH/BTC": 0.035,
        "ADA/USD": 0.95, "SOL/USD": 195, "DOGE/USD": 0.32
    }
    
    import random
    base = base_prices.get(pair, 100)
    price = base * (1 + random.uniform(-0.01, 0.01))
    
    return {
        "pair": pair,
        "type": "crypto",
        "bid": round(price * 0.9999, 2 if price > 1 else 6),
        "ask": round(price * 1.0001, 2 if price > 1 else 6),
        "price": round(price, 2 if price > 1 else 6),
        "change_24h": round(random.uniform(-5, 5), 2),
        "high_24h": round(price * 1.03, 2 if price > 1 else 6),
        "low_24h": round(price * 0.97, 2 if price > 1 else 6),
        "volume": random.randint(100000, 1000000),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "spread_pips": 1,
        "source": "simulated"
    }

async def get_price(pair: str) -> dict:
    """Get price for any pair (forex or crypto)"""
    if pair in CRYPTO_PAIRS:
        return await get_crypto_price(pair)
    return await get_forex_price(pair)

async def get_historical_prices(pair: str, timeframe: str = "1H", limit: int = 100) -> List[dict]:
    """Generate detailed historical price data"""
    import random
    import math
    
    is_crypto = pair in CRYPTO_PAIRS
    
    if is_crypto:
        base_prices = {
            "BTC/USD": 97500, "ETH/USD": 3400, "XRP/USD": 2.35,
            "BTC/EUR": 92000, "ETH/BTC": 0.035,
            "ADA/USD": 0.95, "SOL/USD": 195, "DOGE/USD": 0.32
        }
    else:
        base_prices = {
            "EUR/USD": 1.0850, "GBP/USD": 1.2650, "USD/JPY": 149.50
        }
    
    base = base_prices.get(pair, 1.0 if not is_crypto else 100)
    
    timeframe_minutes = {"1M": 1, "5M": 5, "15M": 15, "30M": 30, "1H": 60, "4H": 240, "1D": 1440, "1W": 10080}
    interval = timeframe_minutes.get(timeframe, 60)
    
    prices = []
    current_time = datetime.now(timezone.utc)
    price = base
    
    trend = random.choice([-1, 1])
    volatility = 0.02 if is_crypto else 0.002
    
    for i in range(limit):
        timestamp = current_time - timedelta(minutes=interval * (limit - i))
        
        trend_change = trend * random.uniform(0, 0.0003) * price
        vol = random.uniform(-volatility, volatility) * price
        mean_reversion = (base - price) * 0.005
        
        price = price + trend_change + vol + mean_reversion
        
        body_size = abs(random.gauss(0, 0.001)) * price
        wick_size = abs(random.gauss(0, 0.0005)) * price
        
        if random.random() > 0.5:
            open_price = price - body_size / 2
            close_price = price + body_size / 2
        else:
            open_price = price + body_size / 2
            close_price = price - body_size / 2
        
        high = max(open_price, close_price) + wick_size
        low = min(open_price, close_price) - wick_size
        
        decimals = 2 if is_crypto and base > 1 else (3 if "JPY" in pair else 5)
        
        prices.append({
            "time": int(timestamp.timestamp()),
            "open": round(open_price, decimals),
            "high": round(high, decimals),
            "low": round(low, decimals),
            "close": round(close_price, decimals),
            "volume": random.randint(1000, 15000)
        })
    
    return prices

# ===================== SIGNAL GENERATION =====================

async def generate_ai_signal(pair: str, timeframe: str) -> dict:
    """Generate AI trading signal with prediction"""
    import random
    
    price_data = await get_price(pair)
    current_price = price_data["price"]
    is_crypto = pair in CRYPTO_PAIRS
    
    prediction_direction = random.choice([-1, 1])
    
    if is_crypto:
        pip_value = current_price * 0.001
    else:
        pip_value = 0.0001 if "JPY" not in pair else 0.01
    
    predicted_change = prediction_direction * random.randint(2, 10) * pip_value
    predicted_price = round(current_price + predicted_change, 2 if is_crypto else (3 if "JPY" in pair else 5))
    prediction_time = (datetime.now(timezone.utc) + timedelta(minutes=1)).isoformat()
    
    if predicted_price > current_price * 1.0002:
        signal_type = "BUY"
        market_bias = "BULLISH"
    elif predicted_price < current_price * 0.9998:
        signal_type = "SELL"
        market_bias = "BEARISH"
    else:
        signal_type = "NEUTRAL"
        market_bias = "RANGING"
    
    confidence = round(random.uniform(60, 95), 1)
    
    sl_pips = random.randint(15, 40)
    tp_pips = random.randint(30, 80)
    
    if signal_type == "BUY":
        stop_loss = round(current_price - (sl_pips * pip_value), 2 if is_crypto else 5)
        take_profit = round(current_price + (tp_pips * pip_value), 2 if is_crypto else 5)
    elif signal_type == "SELL":
        stop_loss = round(current_price + (sl_pips * pip_value), 2 if is_crypto else 5)
        take_profit = round(current_price - (tp_pips * pip_value), 2 if is_crypto else 5)
    else:
        stop_loss = round(current_price - (sl_pips * pip_value), 2 if is_crypto else 5)
        take_profit = round(current_price + (tp_pips * pip_value), 2 if is_crypto else 5)
    
    ai_rationale = f"Technical analysis indicates {market_bias.lower()} momentum on {pair}. {'Crypto volatility' if is_crypto else 'Key support/resistance levels'} suggests {signal_type.lower()} opportunity with {confidence}% confidence."
    
    timeframe_hours = {"1M": 0.25, "5M": 0.5, "15M": 1, "30M": 2, "1H": 4, "4H": 16, "1D": 48, "1W": 168}
    expires_in = timeframe_hours.get(timeframe, 4)
    
    return {
        "signal_id": f"sig_{uuid.uuid4().hex[:12]}",
        "currency_pair": pair,
        "asset_type": "crypto" if is_crypto else "forex",
        "signal_type": signal_type,
        "entry_price": current_price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "confidence": confidence,
        "timeframe": timeframe,
        "status": "ACTIVE",
        "ai_rationale": ai_rationale,
        "market_bias": market_bias,
        "predicted_price": predicted_price,
        "prediction_time": prediction_time,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=expires_in)).isoformat(),
        "is_premium": confidence > 80
    }

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    is_admin = user_data.email == ADMIN_EMAIL and user_data.password == ADMIN_PASSWORD
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "is_premium": is_admin,
        "is_admin": is_admin,
        "subscription_tier": "premium" if is_admin else "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, is_admin)
    
    user = User(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        picture=None,
        is_premium=is_admin,
        is_admin=is_admin,
        subscription_tier="premium" if is_admin else "free",
        created_at=datetime.now(timezone.utc)
    )
    
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc:
        if credentials.email == ADMIN_EMAIL and credentials.password == ADMIN_PASSWORD:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = {
                "user_id": user_id,
                "email": ADMIN_EMAIL,
                "name": "Admin",
                "password_hash": hash_password(ADMIN_PASSWORD),
                "picture": None,
                "is_premium": True,
                "is_admin": True,
                "subscription_tier": "premium",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    elif not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc["user_id"], user_doc["email"], user_doc.get("is_admin", False))
    
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    user = User(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc.get("name", "User"),
        picture=user_doc.get("picture"),
        is_premium=user_doc.get("is_premium", False),
        is_admin=user_doc.get("is_admin", False),
        subscription_tier=user_doc.get("subscription_tier", "free"),
        created_at=created_at
    )
    
    return TokenResponse(token=token, user=user)

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(require_auth)):
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return User(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name", "User"),
        picture=user.get("picture"),
        is_premium=user.get("is_premium", False),
        is_admin=user.get("is_admin", False),
        subscription_tier=user.get("subscription_tier", "free"),
        created_at=created_at
    )

@api_router.post("/auth/session")
async def process_oauth_session(request: Request, response: Response):
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            oauth_data = resp.json()
        except Exception as e:
            logger.error(f"OAuth session error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = oauth_data.get("email")
    name = oauth_data.get("name", "User")
    picture = oauth_data.get("picture")
    session_token = oauth_data.get("session_token")
    
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_admin = email == ADMIN_EMAIL
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "is_premium": is_admin,
            "is_admin": is_admin,
            "subscription_tier": "premium" if is_admin else "free",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    else:
        user_id = user_doc["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    
    return {
        "user": User(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture,
            is_premium=user_doc.get("is_premium", False),
            is_admin=user_doc.get("is_admin", False),
            subscription_tier=user_doc.get("subscription_tier", "free"),
            created_at=created_at
        ),
        "token": create_jwt_token(user_id, email, user_doc.get("is_admin", False))
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ===================== MARKET STATUS ROUTE =====================

@api_router.get("/market/status")
async def market_status():
    return get_market_status()

# ===================== SIGNALS ROUTES =====================

@api_router.get("/signals")
async def get_signals(
    pair: Optional[str] = None,
    timeframe: Optional[str] = None,
    status: Optional[str] = None,
    asset_type: Optional[str] = None,
    min_confidence: Optional[float] = None,
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = await get_current_user(request, credentials)
    tier = user.get("subscription_tier", "free") if user else "free"
    is_premium = tier in ["pro", "premium"] or (user and user.get("is_admin"))
    
    query = {}
    if pair:
        query["currency_pair"] = pair
    if timeframe:
        query["timeframe"] = timeframe
    if status:
        query["status"] = status
    if asset_type:
        query["asset_type"] = asset_type
    if min_confidence:
        query["confidence"] = {"$gte": min_confidence}
    
    signals = await db.trading_signals.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    
    if not is_premium:
        signals = [s for s in signals if not s.get("is_premium", False)]
    
    return signals

@api_router.get("/signals/{signal_id}")
async def get_signal(signal_id: str, request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(request, credentials)
    signal = await db.trading_signals.find_one({"signal_id": signal_id}, {"_id": 0})
    
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    tier = user.get("subscription_tier", "free") if user else "free"
    is_premium = tier in ["pro", "premium"] or (user and user.get("is_admin"))
    if signal.get("is_premium") and not is_premium:
        raise HTTPException(status_code=403, detail="Premium subscription required")
    
    return signal

@api_router.post("/signals/generate")
async def generate_signal(data: SignalCreate, user: dict = Depends(require_auth)):
    if data.currency_pair not in ALL_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    if data.timeframe not in TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    
    signal = await generate_ai_signal(data.currency_pair, data.timeframe)
    signal_to_insert = signal.copy()
    await db.trading_signals.insert_one(signal_to_insert)
    
    alert = {
        "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "signal_id": signal["signal_id"],
        "alert_type": "NEW_SIGNAL",
        "message": f"New {signal['signal_type']} signal for {signal['currency_pair']} with {signal['confidence']}% confidence",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    alert_to_insert = alert.copy()
    await db.alerts.insert_one(alert_to_insert)
    
    return signal

# ===================== PAIR ROUTES =====================

@api_router.get("/pairs")
async def get_pairs():
    return {
        "forex": FOREX_PAIRS,
        "crypto": CRYPTO_PAIRS,
        "all": ALL_PAIRS,
        "timeframes": TIMEFRAMES
    }

@api_router.get("/pairs/{pair}/price")
async def get_pair_price(pair: str):
    pair = pair.replace("-", "/")
    if pair not in ALL_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    return await get_price(pair)

@api_router.get("/pairs/{pair}/history")
async def get_pair_history(pair: str, timeframe: str = "1H", limit: int = 100):
    pair = pair.replace("-", "/")
    if pair not in ALL_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    return await get_historical_prices(pair, timeframe, limit)

@api_router.get("/pairs/{pair}/analysis")
async def get_pair_analysis(pair: str, request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    pair = pair.replace("-", "/")
    if pair not in ALL_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    
    user = await get_current_user(request, credentials)
    tier = user.get("subscription_tier", "free") if user else "free"
    is_premium = tier in ["pro", "premium"] or (user and user.get("is_admin"))
    
    price_data = await get_price(pair)
    signals = await db.trading_signals.find(
        {"currency_pair": pair, "status": "ACTIVE"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    import random
    rsi = round(random.uniform(30, 70), 2)
    macd = round(random.uniform(-0.005, 0.005), 5)
    ema_20 = round(price_data["price"] * random.uniform(0.998, 1.002), 5)
    ema_50 = round(price_data["price"] * random.uniform(0.995, 1.005), 5)
    
    analysis = {
        "pair": pair,
        "current_price": price_data["price"],
        "bid": price_data["bid"],
        "ask": price_data["ask"],
        "spread": price_data.get("spread_pips", 0),
        "change_24h": price_data["change_24h"],
        "asset_type": price_data.get("type", "forex"),
        "indicators": {
            "rsi": rsi,
            "macd": macd,
            "ema_20": ema_20,
            "ema_50": ema_50,
            "sma_20": round(price_data["price"] * random.uniform(0.997, 1.003), 5),
            "sma_50": round(price_data["price"] * random.uniform(0.994, 1.006), 5),
            "trend": "BULLISH" if ema_20 > ema_50 else "BEARISH",
            "atr": round(random.uniform(0.0010, 0.0030), 5),
            "bollinger_upper": round(price_data["price"] * 1.01, 5),
            "bollinger_lower": round(price_data["price"] * 0.99, 5),
            "bollinger_middle": price_data["price"]
        },
        "signals": signals if is_premium else signals[:2],
        "is_premium_content": not is_premium
    }
    
    return analysis

# ===================== PRO INSIGHTS =====================

@api_router.get("/pro/insights")
async def get_insights(user: dict = Depends(require_premium)):
    import random
    
    algo_pairs = []
    for pair in random.sample(ALL_PAIRS, 5):
        price_data = await get_price(pair)
        trend = random.choice(["BULLISH", "BEARISH"])
        confidence = round(random.uniform(70, 95), 1)
        algo_pairs.append({
            "pair": pair,
            "trend": trend,
            "confidence": confidence,
            "signal": "BUY" if trend == "BULLISH" else "SELL",
            "reason": f"Strong {trend.lower()} momentum. RSI divergence confirmed.",
            "entry": price_data["price"],
            "target": round(price_data["price"] * (1.02 if trend == "BULLISH" else 0.98), 5),
            "risk_reward": round(random.uniform(1.5, 3.0), 1)
        })
    
    news_events = [
        {"event": "Fed Interest Rate Decision", "impact": "HIGH", "time": "14:00 UTC"},
        {"event": "ECB Press Conference", "impact": "HIGH", "time": "12:45 UTC"},
        {"event": "UK GDP Release", "impact": "MEDIUM", "time": "07:00 UTC"}
    ]
    
    news_pairs = []
    for event in news_events:
        affected = random.sample(FOREX_PAIRS, 2)
        news_pairs.append({
            "event": event["event"],
            "impact": event["impact"],
            "time": event["time"],
            "affected_pairs": affected,
            "expected_volatility": random.choice(["HIGH", "VERY HIGH"]),
            "recommended_action": random.choice(["Wait for breakout", "Trade the spike", "Fade the move"])
        })
    
    carry_pairs = [
        {"pair": "AUD/JPY", "yield_diff": 4.35, "direction": "LONG", "monthly_carry": 0.36},
        {"pair": "NZD/JPY", "yield_diff": 4.85, "direction": "LONG", "monthly_carry": 0.40},
        {"pair": "USD/JPY", "yield_diff": 5.25, "direction": "LONG", "monthly_carry": 0.44}
    ]
    
    return {
        "algorithmic": {"title": "Algorithmic Signals", "description": "AI-detected patterns", "pairs": sorted(algo_pairs, key=lambda x: x["confidence"], reverse=True)},
        "news": {"title": "News Trading", "description": "Upcoming high-impact events", "events": news_pairs},
        "carry": {"title": "Carry Trade", "description": "Interest rate differentials", "pairs": carry_pairs},
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

# ===================== PERFORMANCE =====================

@api_router.get("/performance")
async def get_performance(request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    total_signals = await db.trading_signals.count_documents({})
    tp_hit = await db.trading_signals.count_documents({"status": "TP_HIT"})
    sl_hit = await db.trading_signals.count_documents({"status": "SL_HIT"})
    active = await db.trading_signals.count_documents({"status": "ACTIVE"})
    
    win_rate = round((tp_hit / max(tp_hit + sl_hit, 1)) * 100, 1)
    
    history = await db.trading_signals.find(
        {"status": {"$in": ["TP_HIT", "SL_HIT"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "total_signals": total_signals,
        "active_signals": active,
        "tp_hit": tp_hit,
        "sl_hit": sl_hit,
        "win_rate": win_rate,
        "avg_confidence": 75.5,
        "avg_rr_ratio": 2.1,
        "history": history
    }

@api_router.get("/performance/chart")
async def get_performance_chart():
    import random
    data = []
    cumulative = 1000
    
    for i in range(30):
        date = (datetime.now(timezone.utc) - timedelta(days=30-i)).strftime("%Y-%m-%d")
        change = random.uniform(-50, 100)
        cumulative += change
        data.append({
            "date": date,
            "value": round(cumulative, 2),
            "signals": random.randint(1, 5),
            "wins": random.randint(0, 3)
        })
    
    return data

# ===================== CALCULATOR =====================

@api_router.post("/calculator/position-size")
async def calculate_position_size(data: PositionSizeRequest):
    is_crypto = data.currency_pair in CRYPTO_PAIRS
    
    if is_crypto:
        pip_value = data.entry_price * 0.0001
    else:
        pip_value = 0.0001 if "JPY" not in data.currency_pair else 0.01
    
    sl_pips = abs(data.entry_price - data.stop_loss) / pip_value
    risk_amount = data.account_balance * (data.risk_percentage / 100)
    lot_size = risk_amount / (sl_pips * 10)
    
    return {
        "lot_size": round(lot_size, 2),
        "mini_lots": round(lot_size * 10, 2),
        "micro_lots": round(lot_size * 100, 2),
        "risk_amount": round(risk_amount, 2),
        "sl_pips": round(sl_pips, 1),
        "potential_loss": round(risk_amount, 2)
    }

# ===================== ALERTS =====================

@api_router.get("/alerts")
async def get_alerts(user: dict = Depends(require_auth)):
    alerts = await db.alerts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return alerts

@api_router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user: dict = Depends(require_auth)):
    result = await db.alerts.update_one(
        {"alert_id": alert_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert marked as read"}

@api_router.put("/alerts/read-all")
async def mark_all_alerts_read(user: dict = Depends(require_auth)):
    await db.alerts.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All alerts marked as read"}

# ===================== SUBSCRIPTION =====================

SUBSCRIPTION_PLANS = {
    "free": {
        "plan_id": "free",
        "name": "Free",
        "price": 0,
        "features": ["10 pairs access", "Basic charts (1 timeframe)", "Standard spreads", "7-day historical", "2 indicators"]
    },
    "pro": {
        "plan_id": "pro",
        "name": "Pro",
        "price": 5.99,
        "features": ["All 30+ pairs", "All timeframes", "Real-time spreads", "1-year historical", "All indicators", "10 price alerts", "No ads"]
    },
    "premium": {
        "plan_id": "premium",
        "name": "Premium",
        "price": 29.99,
        "features": ["Everything in Pro", "Advanced analytics", "Unlimited alerts", "API access", "Priority support", "Backtesting", "Trading signals"]
    }
}

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return list(SUBSCRIPTION_PLANS.values())

@api_router.post("/subscription/checkout")
async def create_checkout(data: CheckoutRequest, user: dict = Depends(require_auth)):
    plan = SUBSCRIPTION_PLANS.get(data.plan, SUBSCRIPTION_PLANS["pro"])
    
    success_url = f"{data.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/subscription"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": f"FX Pulse {plan['name']}"},
                    "unit_amount": int(plan["price"] * 100)
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["user_id"], "plan": data.plan}
        )
        
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "session_id": session.id,
            "plan": data.plan,
            "amount": plan["price"],
            "currency": "usd",
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Payment processing error")

@api_router.get("/subscription/status/{session_id}")
async def get_checkout_status(session_id: str, user: dict = Depends(require_auth)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == "paid":
            plan = session.metadata.get("plan", "pro")
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"is_premium": True, "subscription_tier": plan}}
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "COMPLETED", "payment_status": session.payment_status}}
            )
        
        return {
            "status": session.status,
            "payment_status": session.payment_status,
            "amount_total": session.amount_total
        }
    except Exception as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")

# ===================== ADMIN =====================

@api_router.get("/admin/signals")
async def admin_get_signals(user: dict = Depends(require_admin)):
    signals = await db.trading_signals.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return signals

@api_router.put("/admin/signals/{signal_id}")
async def admin_update_signal(signal_id: str, data: AdminSignalUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.trading_signals.update_one(
        {"signal_id": signal_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"message": "Signal updated"}

@api_router.post("/admin/signals/generate-batch")
async def admin_generate_batch(user: dict = Depends(require_admin)):
    signals = []
    pairs_to_generate = FOREX_PAIRS[:7] + CRYPTO_PAIRS[:3]
    for pair in pairs_to_generate:
        signal = await generate_ai_signal(pair, "1H")
        signal_to_insert = signal.copy()
        await db.trading_signals.insert_one(signal_to_insert)
        signals.append(signal)
    return {"generated": len(signals), "signals": signals}

@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).limit(100).to_list(100)
    return users

@api_router.put("/admin/users/{user_id}/premium")
async def admin_toggle_premium(user_id: str, tier: str = "pro", user: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_tier = target_user.get("subscription_tier", "free")
    new_tier = "free" if current_tier != "free" else tier
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_premium": new_tier != "free", "subscription_tier": new_tier}}
    )
    return {"user_id": user_id, "subscription_tier": new_tier}

@api_router.get("/admin/stats")
async def admin_get_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"subscription_tier": {"$ne": "free"}})
    total_signals = await db.trading_signals.count_documents({})
    active_signals = await db.trading_signals.count_documents({"status": "ACTIVE"})
    total_transactions = await db.payment_transactions.count_documents({})
    completed_transactions = await db.payment_transactions.count_documents({"status": "COMPLETED"})
    
    return {
        "users": {"total": total_users, "premium": premium_users},
        "signals": {"total": total_signals, "active": active_signals},
        "transactions": {"total": total_transactions, "completed": completed_transactions}
    }

# ===================== ROOT =====================

@api_router.get("/")
async def root():
    return {"message": "FX Pulse API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
