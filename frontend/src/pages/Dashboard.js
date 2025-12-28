import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { SignalCard } from '../components/SignalCard';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RefreshCw, Filter, TrendingUp, TrendingDown, Minus, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const Dashboard = () => {
  const { token, isPremium } = useAuth();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    pair: 'all',
    timeframe: 'all',
    type: 'all',
    status: 'all'
  });
  const [pairs, setPairs] = useState([]);
  const [timeframes, setTimeframes] = useState([]);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.pair !== 'all') params.append('pair', filters.pair);
      if (filters.timeframe !== 'all') params.append('timeframe', filters.timeframe);
      if (filters.status !== 'all') params.append('status', filters.status);
      
      const response = await axios.get(`${API}/signals?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      let filteredSignals = response.data;
      if (filters.type !== 'all') {
        filteredSignals = filteredSignals.filter(s => s.signal_type === filters.type);
      }
      
      setSignals(filteredSignals);
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const fetchPairs = async () => {
    try {
      const response = await axios.get(`${API}/pairs`);
      setPairs(response.data.pairs);
      setTimeframes(response.data.timeframes);
    } catch (error) {
      console.error('Failed to fetch pairs:', error);
    }
  };

  const generateSignal = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
      const randomTimeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
      
      await axios.post(`${API}/signals/generate`, 
        { currency_pair: randomPair, timeframe: randomTimeframe },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSignals();
    } catch (error) {
      console.error('Failed to generate signal:', error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchPairs();
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const signalStats = {
    buy: signals.filter(s => s.signal_type === 'BUY').length,
    sell: signals.filter(s => s.signal_type === 'SELL').length,
    neutral: signals.filter(s => s.signal_type === 'NEUTRAL').length,
    active: signals.filter(s => s.status === 'ACTIVE').length
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trading Signals</h1>
            <p className="text-muted-foreground">AI-generated forex trading opportunities</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSignals}
              className="btn-secondary"
              data-testid="refresh-signals"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {token && (
              <Button 
                size="sm" 
                onClick={generateSignal}
                disabled={generating}
                className="btn-primary"
                data-testid="generate-signal"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Signal
              </Button>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <TrendingUp className="w-5 h-5" />
              <span className="text-2xl font-bold font-mono">{signalStats.buy}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Buy Signals</p>
          </div>
          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <TrendingDown className="w-5 h-5" />
              <span className="text-2xl font-bold font-mono">{signalStats.sell}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sell Signals</p>
          </div>
          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Minus className="w-5 h-5" />
              <span className="text-2xl font-bold font-mono">{signalStats.neutral}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Neutral</p>
          </div>
          <div className="bg-card border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-2xl font-bold font-mono">{signalStats.active}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Select value={filters.pair} onValueChange={(v) => setFilters({...filters, pair: v})}>
              <SelectTrigger data-testid="pair-filter">
                <SelectValue placeholder="Currency Pair" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pairs</SelectItem>
                {pairs.map(pair => (
                  <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.timeframe} onValueChange={(v) => setFilters({...filters, timeframe: v})}>
              <SelectTrigger data-testid="timeframe-filter">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Timeframes</SelectItem>
                {timeframes.map(tf => (
                  <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(v) => setFilters({...filters, type: v})}>
              <SelectTrigger data-testid="type-filter">
                <SelectValue placeholder="Signal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
                <SelectItem value="NEUTRAL">Neutral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="TP_HIT">TP Hit</SelectItem>
                <SelectItem value="SL_HIT">SL Hit</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Signals Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-20 bg-card border border-white/5 rounded-lg">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Signals Available</h3>
            <p className="text-muted-foreground mb-4">Generate your first AI trading signal to get started.</p>
            {token && (
              <Button onClick={generateSignal} disabled={generating} className="btn-primary">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Signal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {signals.map(signal => (
              <SignalCard 
                key={signal.signal_id} 
                signal={signal} 
                showPremiumLock={!isPremium}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
