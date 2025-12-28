import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sparkles, TrendingUp, TrendingDown, Newspaper, Percent, RefreshCw, Loader2, ArrowRight, Clock, Zap } from 'lucide-react';
import { cn, formatPrice } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const ProInsights = () => {
  const { token } = useAuth();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/pro/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 60000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="insights-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-sm font-medium uppercase tracking-widest">Pro Exclusive</span>
            </div>
            <h1 className="font-heading text-2xl tracking-tight">Strategy Insights</h1>
            <p className="text-slate-500">Best trading opportunities by strategy type</p>
          </div>
          <Button onClick={fetchInsights} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Insights
          </Button>
        </div>

        {/* Strategy Tabs */}
        <Tabs defaultValue="algorithmic" className="space-y-6">
          <TabsList className="glass-card p-1.5 border-[#D4AF37]/20">
            <TabsTrigger value="algorithmic" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]">
              <Zap className="w-4 h-4 mr-2" />
              Algorithmic
            </TabsTrigger>
            <TabsTrigger value="news" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]">
              <Newspaper className="w-4 h-4 mr-2" />
              News Trading
            </TabsTrigger>
            <TabsTrigger value="carry" className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]">
              <Percent className="w-4 h-4 mr-2" />
              Carry Trade
            </TabsTrigger>
          </TabsList>

          {/* Algorithmic Trading Tab */}
          <TabsContent value="algorithmic" className="space-y-4">
            <div className="glass-card p-6">
              <h2 className="font-heading text-xl mb-2">{insights?.algorithmic?.title}</h2>
              <p className="text-slate-500 text-sm mb-6">{insights?.algorithmic?.description}</p>
              
              <div className="space-y-4">
                {insights?.algorithmic?.pairs?.map((pair, index) => (
                  <div key={index} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-semibold">{pair.pair}</span>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-medium",
                          pair.trend === 'BULLISH' ? "bg-[#2E8B57]/20 text-[#2E8B57]" : "bg-[#CD5C5C]/20 text-[#CD5C5C]"
                        )}>
                          {pair.trend === 'BULLISH' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                          {pair.signal}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Confidence</p>
                        <p className={cn(
                          "font-mono font-bold text-lg",
                          pair.confidence >= 80 ? "text-[#2E8B57]" : pair.confidence >= 60 ? "text-[#D4AF37]" : "text-[#CD5C5C]"
                        )}>{pair.confidence}%</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-4">{pair.reason}</p>
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Entry</p>
                        <p className="font-mono text-sm">{formatPrice(pair.entry, pair.pair)}</p>
                      </div>
                      <div className="bg-[#2E8B57]/5 rounded-lg p-3">
                        <p className="text-xs text-[#2E8B57] mb-1">Target</p>
                        <p className="font-mono text-sm text-[#2E8B57]">{formatPrice(pair.target, pair.pair)}</p>
                      </div>
                      <div className="bg-[#D4AF37]/5 rounded-lg p-3">
                        <p className="text-xs text-[#D4AF37] mb-1">R:R Ratio</p>
                        <p className="font-mono text-sm text-[#D4AF37]">{pair.risk_reward}:1</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* News Trading Tab */}
          <TabsContent value="news" className="space-y-4">
            <div className="glass-card p-6">
              <h2 className="font-heading text-xl mb-2">{insights?.news?.title}</h2>
              <p className="text-slate-500 text-sm mb-6">{insights?.news?.description}</p>
              
              <div className="space-y-4">
                {insights?.news?.events?.map((event, index) => (
                  <div key={index} className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-lg mb-1">{event.event}</h3>
                        <div className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            event.impact === 'HIGH' ? "bg-[#CD5C5C]/20 text-[#CD5C5C]" : "bg-[#D4AF37]/20 text-[#D4AF37]"
                          )}>
                            {event.impact} IMPACT
                          </span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2">Affected Pairs</p>
                      <div className="flex flex-wrap gap-2">
                        {event.affected_pairs?.map((pair, i) => (
                          <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-sm font-mono">{pair}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Expected Volatility: <span className="text-[#CD5C5C]">{event.expected_volatility}</span></span>
                      <span className="text-[#D4AF37] flex items-center gap-1">
                        <ArrowRight className="w-4 h-4" />
                        {event.recommended_action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Carry Trading Tab */}
          <TabsContent value="carry" className="space-y-4">
            <div className="glass-card p-6">
              <h2 className="font-heading text-xl mb-2">{insights?.carry?.title}</h2>
              <p className="text-slate-500 text-sm mb-6">{insights?.carry?.description}</p>
              
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Direction</th>
                      <th>Yield Differential</th>
                      <th>Monthly Carry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights?.carry?.pairs?.map((pair, index) => (
                      <tr key={index}>
                        <td className="font-mono font-medium">{pair.pair}</td>
                        <td>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            pair.direction === 'LONG' ? "bg-[#2E8B57]/20 text-[#2E8B57]" : "bg-[#CD5C5C]/20 text-[#CD5C5C]"
                          )}>
                            {pair.direction}
                          </span>
                        </td>
                        <td className="font-mono text-[#D4AF37]">{pair.yield_diff}%</td>
                        <td className="font-mono text-[#2E8B57]">{pair.monthly_carry}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                <p className="text-sm text-slate-400">
                  <span className="text-[#D4AF37] font-medium">Pro Tip:</span> Carry trades work best during low volatility periods. 
                  Consider holding positions for weeks or months to maximize interest rate differentials.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Last Updated */}
        <p className="text-xs text-slate-500 text-center">
          Last updated: {insights?.updated_at ? new Date(insights.updated_at).toLocaleTimeString() : 'N/A'}
        </p>
      </div>
    </Layout>
  );
};
