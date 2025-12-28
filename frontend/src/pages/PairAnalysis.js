import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, TrendingUp, TrendingDown, Loader2, Lock, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatPrice, cn } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const PairAnalysis = () => {
  const { pair } = useParams();
  const { token, isPremium } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [priceData, setPriceData] = useState([]);
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
      const response = await axios.get(`${API}/pairs/${pair}/history?timeframe=${timeframe}&limit=50`);
      const formatted = response.data.map(d => ({
        ...d,
        time: new Date(d.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: d.close
      }));
      setPriceData(formatted);
    } catch (error) {
      console.error('Failed to fetch price data:', error);
    } finally {
      setLoading(false);
    }
  }, [pair, timeframe]);

  useEffect(() => {
    fetchAnalysis();
    fetchPriceData();
  }, [fetchAnalysis, fetchPriceData]);

  const getIndicatorColor = (name, value) => {
    if (name === 'rsi') {
      if (value > 70) return 'text-red-500';
      if (value < 30) return 'text-green-500';
      return 'text-slate-400';
    }
    return 'text-slate-400';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="pair-analysis-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight">{pairFormatted}</h1>
              <div className="flex items-center gap-2 mt-1">
                {analysis && (
                  <>
                    <span className="font-mono text-xl">
                      {formatPrice(analysis.current_price, pairFormatted)}
                    </span>
                    <span className={cn(
                      "text-sm font-medium",
                      analysis.change_24h >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {analysis.change_24h >= 0 ? '+' : ''}{analysis.change_24h}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24" data-testid="timeframe-select">
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
            <Button variant="outline" size="icon" onClick={() => { fetchAnalysis(); fetchPriceData(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-card border border-white/5 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4">Price Chart</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceData}>
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => v.toFixed(4)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#121826', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [formatPrice(value, pairFormatted), 'Price']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                  {analysis?.signals?.[0] && (
                    <>
                      <ReferenceLine 
                        y={analysis.signals[0].entry_price} 
                        stroke="#3B82F6" 
                        strokeDasharray="5 5"
                        label={{ value: 'Entry', fill: '#3B82F6', fontSize: 12 }}
                      />
                      <ReferenceLine 
                        y={analysis.signals[0].stop_loss} 
                        stroke="#EF4444" 
                        strokeDasharray="5 5"
                        label={{ value: 'SL', fill: '#EF4444', fontSize: 12 }}
                      />
                      <ReferenceLine 
                        y={analysis.signals[0].take_profit} 
                        stroke="#22C55E" 
                        strokeDasharray="5 5"
                        label={{ value: 'TP', fill: '#22C55E', fontSize: 12 }}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="space-y-4">
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Technical Indicators</h2>
              {analysis?.indicators && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">RSI (14)</span>
                    <span className={cn("font-mono font-medium", getIndicatorColor('rsi', analysis.indicators.rsi))}>
                      {analysis.indicators.rsi}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MACD</span>
                    <span className={cn(
                      "font-mono font-medium",
                      analysis.indicators.macd > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {analysis.indicators.macd > 0 ? '+' : ''}{analysis.indicators.macd}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EMA 20</span>
                    <span className="font-mono">{formatPrice(analysis.indicators.ema_20, pairFormatted)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EMA 50</span>
                    <span className="font-mono">{formatPrice(analysis.indicators.ema_50, pairFormatted)}</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Trend</span>
                      <span className={cn(
                        "flex items-center gap-1 font-medium",
                        analysis.indicators.trend === 'BULLISH' ? "text-green-500" : "text-red-500"
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
            <div className="bg-card border border-white/5 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Active Signals</h2>
              {analysis?.is_premium_content && !isPremium ? (
                <div className="text-center py-6">
                  <Lock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Premium signals available</p>
                  <Link to="/subscription">
                    <Button size="sm" className="btn-primary">Upgrade</Button>
                  </Link>
                </div>
              ) : analysis?.signals?.length > 0 ? (
                <div className="space-y-3">
                  {analysis.signals.map((signal, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          signal.signal_type === 'BUY' ? "bg-green-500/20 text-green-500" :
                          signal.signal_type === 'SELL' ? "bg-red-500/20 text-red-500" :
                          "bg-slate-500/20 text-slate-400"
                        )}>
                          {signal.signal_type}
                        </span>
                        <span className="text-xs text-muted-foreground">{signal.timeframe}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-mono">{formatPrice(signal.entry_price, pairFormatted)}</p>
                        </div>
                        <div>
                          <p className="text-red-400">SL</p>
                          <p className="font-mono text-red-400">{formatPrice(signal.stop_loss, pairFormatted)}</p>
                        </div>
                        <div>
                          <p className="text-green-400">TP</p>
                          <p className="font-mono text-green-400">{formatPrice(signal.take_profit, pairFormatted)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No active signals</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {analysis?.signals?.[0]?.ai_rationale && (
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs">AI</span>
              </span>
              Why This Signal Was Generated
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {analysis.signals[0].ai_rationale}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
