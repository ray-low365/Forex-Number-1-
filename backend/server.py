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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'smartsignalfx-secret-key-2024')
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
ADMIN_EMAIL = "admin@smartsignalfx.com"
ADMIN_PASSWORD = "AdminFx2024!"

# Create the main app
app = FastAPI(title="SmartSignalFX API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
    created_at: datetime

class TokenResponse(BaseModel):
    token: str
    user: User

class TradingSignal(BaseModel):
    signal_id: str
    currency_pair: str
    signal_type: str  # BUY, SELL, NEUTRAL
    entry_price: float
    stop_loss: float
    take_profit: float
    confidence: float
    timeframe: str
    status: str  # ACTIVE, TP_HIT, SL_HIT, EXPIRED
    ai_rationale: str
    market_bias: str
    created_at: datetime
    expires_at: datetime

class SignalCreate(BaseModel):
    currency_pair: str
    timeframe: str = "1H"

class PositionSizeRequest(BaseModel):
    account_balance: float
    risk_percentage: float
    entry_price: float
    stop_loss: float
    currency_pair: str

class AlertCreate(BaseModel):
    signal_id: str
    alert_type: str

class Alert(BaseModel):
    alert_id: str
    user_id: str
    signal_id: str
    alert_type: str
    message: str
    is_read: bool
    created_at: datetime

class AdminSignalUpdate(BaseModel):
    status: Optional[str] = None
    confidence: Optional[float] = None
    is_active: Optional[bool] = None

class CheckoutRequest(BaseModel):
    origin_url: str

class SubscriptionPlan(BaseModel):
    plan_id: str
    name: str
    price: float
    features: List[str]

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
    # Try cookie first
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
    
    # Try Authorization header
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
    if not user.get("is_premium") and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Premium subscription required")
    return user

# ===================== FOREX DATA =====================

FOREX_PAIRS = [
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
    "EUR/GBP", "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD", "GBP/AUD", "EUR/CHF",
    "GBP/CHF", "AUD/CAD", "NZD/JPY", "EUR/NZD", "GBP/NZD", "CHF/JPY"
]

TIMEFRAMES = ["15M", "30M", "1H", "4H", "1D"]

# Simulated price data for demo
async def get_forex_price(pair: str) -> dict:
    """Get simulated forex price data"""
    import random
    base_prices = {
        "EUR/USD": 1.0850, "GBP/USD": 1.2650, "USD/JPY": 149.50, "USD/CHF": 0.8750,
        "AUD/USD": 0.6550, "USD/CAD": 1.3650, "NZD/USD": 0.6150, "EUR/GBP": 0.8580,
        "EUR/JPY": 162.20, "GBP/JPY": 189.10, "AUD/JPY": 97.90, "EUR/AUD": 1.6550,
        "GBP/AUD": 1.9300, "EUR/CHF": 0.9500, "GBP/CHF": 1.1070, "AUD/CAD": 0.8950,
        "NZD/JPY": 91.80, "EUR/NZD": 1.7650, "GBP/NZD": 2.0580, "CHF/JPY": 170.80
    }
    base = base_prices.get(pair, 1.0)
    variation = random.uniform(-0.005, 0.005) * base
    current_price = round(base + variation, 5)
    
    return {
        "pair": pair,
        "price": current_price,
        "change_24h": round(random.uniform(-1.5, 1.5), 2),
        "high_24h": round(current_price * 1.005, 5),
        "low_24h": round(current_price * 0.995, 5),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

async def get_historical_prices(pair: str, timeframe: str = "1H", limit: int = 100) -> List[dict]:
    """Generate simulated historical price data"""
    import random
    base_prices = {
        "EUR/USD": 1.0850, "GBP/USD": 1.2650, "USD/JPY": 149.50, "USD/CHF": 0.8750,
        "AUD/USD": 0.6550, "USD/CAD": 1.3650, "NZD/USD": 0.6150
    }
    base = base_prices.get(pair, 1.0)
    
    timeframe_minutes = {"15M": 15, "30M": 30, "1H": 60, "4H": 240, "1D": 1440}
    interval = timeframe_minutes.get(timeframe, 60)
    
    prices = []
    current_time = datetime.now(timezone.utc)
    price = base
    
    for i in range(limit):
        timestamp = current_time - timedelta(minutes=interval * (limit - i))
        change = random.uniform(-0.002, 0.002) * price
        price = price + change
        
        high = price + abs(random.uniform(0, 0.001) * price)
        low = price - abs(random.uniform(0, 0.001) * price)
        open_price = price + random.uniform(-0.0005, 0.0005) * price
        
        prices.append({
            "time": int(timestamp.timestamp()),
            "open": round(open_price, 5),
            "high": round(high, 5),
            "low": round(low, 5),
            "close": round(price, 5),
            "volume": random.randint(1000, 10000)
        })
    
    return prices

# ===================== AI SIGNAL GENERATION =====================

async def generate_ai_signal(pair: str, timeframe: str) -> dict:
    """Generate AI trading signal using GPT"""
    import random
    
    price_data = await get_forex_price(pair)
    current_price = price_data["price"]
    
    # Try OpenAI if key is available
    ai_rationale = ""
    try:
        if EMERGENT_LLM_KEY:
            response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional forex analyst. Provide concise trading analysis."},
                    {"role": "user", "content": f"Analyze {pair} for a {timeframe} trade. Current price: {current_price}. Provide a brief 2-3 sentence analysis with signal direction (BUY/SELL/NEUTRAL), key technical factors, and confidence level."}
                ],
                max_tokens=150
            )
            ai_rationale = response.choices[0].message.content
    except Exception as e:
        logger.error(f"AI generation error: {e}")
    
    # Generate signal parameters
    signal_type = random.choice(["BUY", "SELL", "NEUTRAL"])
    confidence = round(random.uniform(55, 95), 1)
    
    pip_value = 0.0001 if "JPY" not in pair else 0.01
    sl_pips = random.randint(20, 50)
    tp_pips = random.randint(40, 100)
    
    if signal_type == "BUY":
        stop_loss = round(current_price - (sl_pips * pip_value), 5)
        take_profit = round(current_price + (tp_pips * pip_value), 5)
    elif signal_type == "SELL":
        stop_loss = round(current_price + (sl_pips * pip_value), 5)
        take_profit = round(current_price - (tp_pips * pip_value), 5)
    else:
        stop_loss = round(current_price - (sl_pips * pip_value), 5)
        take_profit = round(current_price + (tp_pips * pip_value), 5)
    
    market_bias = random.choice(["BULLISH", "BEARISH", "RANGING"])
    
    if not ai_rationale:
        ai_rationale = f"Technical analysis indicates {market_bias.lower()} momentum on {pair}. RSI and MACD convergence suggests potential {signal_type.lower()} opportunity with {confidence}% confidence."
    
    timeframe_hours = {"15M": 1, "30M": 2, "1H": 4, "4H": 16, "1D": 48}
    expires_in = timeframe_hours.get(timeframe, 4)
    
    return {
        "signal_id": f"sig_{uuid.uuid4().hex[:12]}",
        "currency_pair": pair,
        "signal_type": signal_type,
        "entry_price": current_price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "confidence": confidence,
        "timeframe": timeframe,
        "status": "ACTIVE",
        "ai_rationale": ai_rationale,
        "market_bias": market_bias,
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
        created_at=datetime.now(timezone.utc)
    )
    
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc:
        # Check for admin first login
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
        created_at=created_at
    )

@api_router.post("/auth/session")
async def process_oauth_session(request: Request, response: Response):
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Fetch user data from Emergent Auth
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
    
    # Find or create user
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
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    else:
        user_id = user_doc["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    
    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
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

# ===================== SIGNALS ROUTES =====================

@api_router.get("/signals")
async def get_signals(
    pair: Optional[str] = None,
    timeframe: Optional[str] = None,
    status: Optional[str] = None,
    min_confidence: Optional[float] = None,
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = await get_current_user(request, credentials)
    is_premium = user and (user.get("is_premium") or user.get("is_admin"))
    
    query = {}
    if pair:
        query["currency_pair"] = pair
    if timeframe:
        query["timeframe"] = timeframe
    if status:
        query["status"] = status
    if min_confidence:
        query["confidence"] = {"$gte": min_confidence}
    
    signals = await db.trading_signals.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    
    # Filter premium signals for non-premium users
    if not is_premium:
        signals = [s for s in signals if not s.get("is_premium", False)]
    
    return signals

@api_router.get("/signals/{signal_id}")
async def get_signal(signal_id: str, request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(request, credentials)
    signal = await db.trading_signals.find_one({"signal_id": signal_id}, {"_id": 0})
    
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    is_premium = user and (user.get("is_premium") or user.get("is_admin"))
    if signal.get("is_premium") and not is_premium:
        raise HTTPException(status_code=403, detail="Premium subscription required")
    
    return signal

@api_router.post("/signals/generate")
async def generate_signal(data: SignalCreate, user: dict = Depends(require_auth)):
    if data.currency_pair not in FOREX_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    if data.timeframe not in TIMEFRAMES:
        raise HTTPException(status_code=400, detail="Invalid timeframe")
    
    signal = await generate_ai_signal(data.currency_pair, data.timeframe)
    # Make a copy before insert to avoid _id mutation
    signal_to_insert = signal.copy()
    await db.trading_signals.insert_one(signal_to_insert)
    
    # Create alert for new signal
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

# ===================== PAIR ANALYSIS ROUTES =====================

@api_router.get("/pairs")
async def get_pairs():
    return {"pairs": FOREX_PAIRS, "timeframes": TIMEFRAMES}

@api_router.get("/pairs/{pair}/price")
async def get_pair_price(pair: str):
    pair = pair.replace("-", "/")
    if pair not in FOREX_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    return await get_forex_price(pair)

@api_router.get("/pairs/{pair}/history")
async def get_pair_history(pair: str, timeframe: str = "1H", limit: int = 100):
    pair = pair.replace("-", "/")
    if pair not in FOREX_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    return await get_historical_prices(pair, timeframe, limit)

@api_router.get("/pairs/{pair}/analysis")
async def get_pair_analysis(pair: str, request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    pair = pair.replace("-", "/")
    if pair not in FOREX_PAIRS:
        raise HTTPException(status_code=400, detail="Invalid currency pair")
    
    user = await get_current_user(request, credentials)
    is_premium = user and (user.get("is_premium") or user.get("is_admin"))
    
    price_data = await get_forex_price(pair)
    signals = await db.trading_signals.find(
        {"currency_pair": pair, "status": "ACTIVE"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Calculate technical indicators (simplified)
    import random
    rsi = round(random.uniform(30, 70), 2)
    macd = round(random.uniform(-0.005, 0.005), 5)
    ema_20 = round(price_data["price"] * random.uniform(0.998, 1.002), 5)
    ema_50 = round(price_data["price"] * random.uniform(0.995, 1.005), 5)
    
    analysis = {
        "pair": pair,
        "current_price": price_data["price"],
        "change_24h": price_data["change_24h"],
        "indicators": {
            "rsi": rsi,
            "macd": macd,
            "ema_20": ema_20,
            "ema_50": ema_50,
            "trend": "BULLISH" if ema_20 > ema_50 else "BEARISH"
        },
        "signals": signals if is_premium else signals[:2],
        "is_premium_content": not is_premium
    }
    
    return analysis

# ===================== PERFORMANCE ROUTES =====================

@api_router.get("/performance")
async def get_performance(request: Request = None, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(request, credentials)
    
    # Get signal statistics
    total_signals = await db.trading_signals.count_documents({})
    tp_hit = await db.trading_signals.count_documents({"status": "TP_HIT"})
    sl_hit = await db.trading_signals.count_documents({"status": "SL_HIT"})
    active = await db.trading_signals.count_documents({"status": "ACTIVE"})
    
    win_rate = round((tp_hit / max(tp_hit + sl_hit, 1)) * 100, 1)
    
    # Get recent history
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
    # Generate simulated performance data for chart
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

# ===================== RISK CALCULATOR =====================

@api_router.post("/calculator/position-size")
async def calculate_position_size(data: PositionSizeRequest):
    pip_value = 0.0001 if "JPY" not in data.currency_pair else 0.01
    sl_pips = abs(data.entry_price - data.stop_loss) / pip_value
    
    risk_amount = data.account_balance * (data.risk_percentage / 100)
    lot_size = risk_amount / (sl_pips * 10)  # Standard lot pip value ~$10
    
    return {
        "lot_size": round(lot_size, 2),
        "mini_lots": round(lot_size * 10, 2),
        "micro_lots": round(lot_size * 100, 2),
        "risk_amount": round(risk_amount, 2),
        "sl_pips": round(sl_pips, 1),
        "potential_loss": round(risk_amount, 2)
    }

# ===================== ALERTS ROUTES =====================

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

# ===================== SUBSCRIPTION ROUTES =====================

SUBSCRIPTION_PLANS = {
    "monthly": {"plan_id": "monthly", "name": "Pro Monthly", "price": 29.99, "features": ["Unlimited signals", "Premium pairs", "AI analysis", "Priority alerts"]},
    "yearly": {"plan_id": "yearly", "name": "Pro Yearly", "price": 249.99, "features": ["All monthly features", "40% savings", "Early access", "1-on-1 support"]}
}

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return list(SUBSCRIPTION_PLANS.values())

@api_router.post("/subscription/checkout")
async def create_checkout(data: CheckoutRequest, user: dict = Depends(require_auth)):
    success_url = f"{data.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/subscription"
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "SmartSignalFX Pro Monthly"},
                    "unit_amount": 2999
                },
                "quantity": 1
            }],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["user_id"]}
        )
        
        # Record transaction
        await db.payment_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "session_id": session.id,
            "amount": 29.99,
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
            # Update user to premium
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"is_premium": True}}
            )
            # Update transaction
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

# ===================== ADMIN ROUTES =====================

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
    for pair in FOREX_PAIRS[:10]:
        signal = await generate_ai_signal(pair, "1H")
        await db.trading_signals.insert_one(signal)
        signals.append(signal)
    return {"generated": len(signals), "signals": signals}

@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).limit(100).to_list(100)
    return users

@api_router.put("/admin/users/{user_id}/premium")
async def admin_toggle_premium(user_id: str, user: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_premium = not target_user.get("is_premium", False)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_premium": new_premium}}
    )
    return {"user_id": user_id, "is_premium": new_premium}

@api_router.get("/admin/stats")
async def admin_get_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"is_premium": True})
    total_signals = await db.trading_signals.count_documents({})
    active_signals = await db.trading_signals.count_documents({"status": "ACTIVE"})
    total_transactions = await db.payment_transactions.count_documents({})
    completed_transactions = await db.payment_transactions.count_documents({"status": "COMPLETED"})
    
    return {
        "users": {"total": total_users, "premium": premium_users},
        "signals": {"total": total_signals, "active": active_signals},
        "transactions": {"total": total_transactions, "completed": completed_transactions}
    }

# ===================== WEBHOOK ROUTES =====================

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.environ.get("STRIPE_WEBHOOK_SECRET", "")
        )
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"is_premium": True}}
            )
            await db.payment_transactions.update_one(
                {"session_id": session["id"]},
                {"$set": {"status": "COMPLETED", "payment_status": "paid"}}
            )
    
    return {"status": "success"}

# ===================== ROOT ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "SmartSignalFX API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router
app.include_router(api_router)

# CORS
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
