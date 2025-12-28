import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, Lock, RefreshCw, Clock, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar, Line } from 'recharts';
import { formatPrice, cn } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const PairAnalysis = () => {
  const { pair } = useParams();
  const { token, isPremium } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [priceData, setPriceData] = useState([]);
  const [realtimeData, setRealtimeData] = useState([]);
  const [timeframe, setTimeframe] = useState('1H');
  const [loading, setLoading] = useState(true);
  
  const pairFormatted = pair?.replace('-', '/');

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/pairs/${pair}/analysis`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAnalysis(response.data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    }
  }, [pair, token]);

  const fetchPriceData = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/pairs/${pair}/history?timeframe=${timeframe}&limit=100`);
      const formatted = response.data.map(d => ({
        ...d,
        time: new Date(d.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: d.time
      }));
      setPriceData(formatted);
    } catch (error) {
      console.error('Failed to fetch price data:', error);
    } finally {
      setLoading(false);
    }
  }, [pair, timeframe]);

  const fetchRealtimeData = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/pairs/${pair}/realtime?limit=60`);
      const formatted = response.data.map(d => ({
        ...d,
        time: new Date(d.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: d.time
      }));
      setRealtimeData(formatted);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    }
  }, [pair]);

  useEffect(() => {
    fetchAnalysis();
    fetchPriceData();
    fetchRealtimeData();
    
    // Real-time updates
    const realtimeInterval = setInterval(fetchRealtimeData, 5000);
    const analysisInterval = setInterval(fetchAnalysis, 10000);
    
    return () => {
      clearInterval(realtimeInterval);
      clearInterval(analysisInterval);
    };
  }, [fetchAnalysis, fetchPriceData, fetchRealtimeData]);

  const getIndicatorColor = (name, value) => {
    if (name === 'rsi') {
      if (value > 70) return 'text-[#CD5C5C]';
      if (value < 30) return 'text-[#2E8B57]';
      return 'text-slate-400';
    }
    return 'text-slate-400';
  };

  const getRsiStatus = (value) => {
    if (value > 70) return { label: 'Overbought', color: 'text-[#CD5C5C]' };
    if (value < 30) return { label: 'Oversold', color: 'text-[#2E8B57]' };
    return { label: 'Neutral', color: 'text-slate-400' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      </Layout>
    );
  }

  const currentSignal = analysis?.signals?.[0];

  return (
    <Layout>
      <div className="space-y-6" data-testid="pair-analysis-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-heading text-2xl tracking-tight">{pairFormatted}</h1>
              <div className="flex items-center gap-3 mt-1">
                {analysis && (
                  <>
                    <span className="font-mono text-xl text-[#D4AF37]">
                      {formatPrice(analysis.current_price, pairFormatted)}
                    </span>
                    <span className={cn(
                      "text-sm font-medium px-2 py-0.5 rounded",
                      analysis.change_24h >= 0 ? "text-[#2E8B57] bg-[#2E8B57]/10" : "text-[#CD5C5C] bg-[#CD5C5C]/10"
                    )}>
                      {analysis.change_24h >= 0 ? '+' : ''}{analysis.change_24h}%
                    </span>
                    <span className="text-xs text-slate-500">Spread: {analysis.spread} pips</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24 bg-[#0F1115] border-white/10" data-testid="timeframe-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15M">15M</SelectItem>
                <SelectItem value="30M">30M</SelectItem>
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="4H">4H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => { fetchAnalysis(); fetchPriceData(); fetchRealtimeData(); }} className="hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] hover:border-[#D4AF37]/30">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">Price Chart</h2>
                <span className="text-xs text-slate-500">{timeframe} Timeframe</span>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={priceData}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => v.toFixed(4)}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#161920', 
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}
                      formatter={(value, name) => {
                        const labels = { open: 'Open', high: 'High', low: 'Low', close: 'Close' };
                        return [formatPrice(value, pairFormatted), labels[name] || name];
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#D4AF37" 
                      strokeWidth={2}
                      fill="url(#priceGradient)"
                    />
                    {currentSignal && (
                      <>
                        <ReferenceLine 
                          y={currentSignal.entry_price} 
                          stroke="#D4AF37" 
                          strokeDasharray="5 5"
                        />
                        <ReferenceLine 
                          y={currentSignal.stop_loss} 
                          stroke="#CD5C5C" 
                          strokeDasharray="5 5"
                        />
                        <ReferenceLine 
                          y={currentSignal.take_profit} 
                          stroke="#2E8B57" 
                          strokeDasharray="5 5"
                        />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Chart Legend */}
              {currentSignal && (
                <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#D4AF37]" />
                    <span className="text-slate-400">Entry: {formatPrice(currentSignal.entry_price, pairFormatted)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#CD5C5C]" />
                    <span className="text-slate-400">SL: {formatPrice(currentSignal.stop_loss, pairFormatted)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#2E8B57]" />
                    <span className="text-slate-400">TP: {formatPrice(currentSignal.take_profit, pairFormatted)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time 1-Minute Chart */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2E8B57] animate-pulse" />
                  <h2 className="font-heading text-lg">Real-Time (1 Min)</h2>
                </div>
                <span className="text-xs text-slate-500">Updates every 5 seconds</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realtimeData}>
                    <defs>
                      <linearGradient id="realtimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2E8B57" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2E8B57" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => v.toFixed(4)}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: '#161920', 
                        border: '1px solid rgba(46, 139, 87, 0.2)',
                        borderRadius: '12px'
                      }}
                      formatter={(value) => [formatPrice(value, pairFormatted), 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="close" 
                      stroke="#2E8B57" 
                      strokeWidth={2}
                      fill="url(#realtimeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Technical Indicators */}
            <div className="glass-card p-6">
              <h2 className="font-heading text-lg mb-4">Technical Indicators</h2>
              {analysis?.indicators && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">RSI (14)</span>
                      <span className={cn("font-mono font-semibold text-lg", getIndicatorColor('rsi', analysis.indicators.rsi))}>
                        {analysis.indicators.rsi}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          analysis.indicators.rsi > 70 ? "bg-[#CD5C5C]" : 
                          analysis.indicators.rsi < 30 ? "bg-[#2E8B57]" : "bg-[#D4AF37]"
                        )}
                        style={{ width: `${analysis.indicators.rsi}%` }}
                      />
                    </div>
                    <p className={cn("text-xs mt-1", getRsiStatus(analysis.indicators.rsi).color)}>
                      {getRsiStatus(analysis.indicators.rsi).label}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-slate-400">MACD</span>
                    <span className={cn(
                      "font-mono font-medium",
                      analysis.indicators.macd > 0 ? "text-[#2E8B57]" : "text-[#CD5C5C]"
                    )}>
                      {analysis.indicators.macd > 0 ? '+' : ''}{analysis.indicators.macd}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-slate-400">EMA 20</span>
                    <span className="font-mono">{formatPrice(analysis.indicators.ema_20, pairFormatted)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-slate-400">EMA 50</span>
                    <span className="font-mono">{formatPrice(analysis.indicators.ema_50, pairFormatted)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-slate-400">ATR</span>
                    <span className="font-mono">{analysis.indicators.atr}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Trend</span>
                      <span className={cn(
                        "flex items-center gap-2 font-medium px-3 py-1 rounded-full",
                        analysis.indicators.trend === 'BULLISH' 
                          ? "text-[#2E8B57] bg-[#2E8B57]/10" 
                          : "text-[#CD5C5C] bg-[#CD5C5C]/10"
                      )}>
                        {analysis.indicators.trend === 'BULLISH' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {analysis.indicators.trend}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Signals */}
            <div className="glass-card p-6">
              <h2 className="font-heading text-lg mb-4">Active Signals</h2>
              {analysis?.is_premium_content && !isPremium ? (
                <div className="text-center py-8">
                  <Lock className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
                  <p className="text-sm text-slate-400 mb-4">Premium signals available</p>
                  <Link to="/subscription">
                    <Button size="sm" className="btn-primary">Upgrade to Pro</Button>
                  </Link>
                </div>
              ) : analysis?.signals?.length > 0 ? (
                <div className="space-y-4">
                  {analysis.signals.map((signal, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/20 transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          signal.signal_type === 'BUY' ? "bg-[#2E8B57]/20 text-[#2E8B57]" :
                          signal.signal_type === 'SELL' ? "bg-[#CD5C5C]/20 text-[#CD5C5C]" :
                          "bg-slate-500/20 text-slate-400"
                        )}>
                          {signal.signal_type}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {signal.timeframe}
                        </span>
                      </div>
                      
                      {/* Prediction */}
                      {signal.predicted_price && (
                        <div className="mb-3 p-2 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/10">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Target className="w-3 h-3 text-[#D4AF37]" />
                              Predicted (1 min)
                            </span>
                            <span className="font-mono text-[#D4AF37]">{formatPrice(signal.predicted_price, pairFormatted)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white/5 rounded-lg p-2">
                          <p className="text-slate-500 mb-1">Entry</p>
                          <p className="font-mono">{formatPrice(signal.entry_price, pairFormatted)}</p>
                        </div>
                        <div className="bg-[#CD5C5C]/5 rounded-lg p-2">
                          <p className="text-[#CD5C5C]/70 mb-1">SL</p>
                          <p className="font-mono text-[#CD5C5C]">{formatPrice(signal.stop_loss, pairFormatted)}</p>
                        </div>
                        <div className="bg-[#2E8B57]/5 rounded-lg p-2">
                          <p className="text-[#2E8B57]/70 mb-1">TP</p>
                          <p className="font-mono text-[#2E8B57]">{formatPrice(signal.take_profit, pairFormatted)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">No active signals for this pair</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {analysis?.signals?.[0]?.ai_rationale && (
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <span className="text-sm text-[#D4AF37]">AI</span>
              </span>
              Signal Analysis
            </h2>
            <p className="text-slate-400 leading-relaxed">
              {analysis.signals[0].ai_rationale}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
