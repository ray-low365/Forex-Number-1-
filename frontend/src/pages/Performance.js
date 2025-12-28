import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { BarChart3, TrendingUp, TrendingDown, Target, Percent, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn, formatDate } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const Performance = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes] = await Promise.all([
          axios.get(`${API}/performance`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
          axios.get(`${API}/performance/chart`)
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data);
      } catch (error) {
        console.error('Failed to fetch performance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

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
      <div className="space-y-6" data-testid="performance-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">Track signal accuracy and trading performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground text-sm">Win Rate</span>
            </div>
            <p className="text-3xl font-bold font-mono text-green-500">{stats?.win_rate || 0}%</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground text-sm">Avg R:R</span>
            </div>
            <p className="text-3xl font-bold font-mono">{stats?.avg_rr_ratio || 0}:1</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-muted-foreground text-sm">TP Hit</span>
            </div>
            <p className="text-3xl font-bold font-mono text-green-500">{stats?.tp_hit || 0}</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-muted-foreground text-sm">SL Hit</span>
            </div>
            <p className="text-3xl font-bold font-mono text-red-500">{stats?.sl_hit || 0}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance Chart */}
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Performance Over Time
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.split('-').slice(1).join('/')}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#121826', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`$${value}`, 'Portfolio']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Signals Distribution */}
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6">Signal Results Distribution</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(-10)}>
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.split('-').slice(1).join('/')}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#121826', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="wins" radius={[4, 4, 0, 0]}>
                    {chartData.slice(-10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#22C55E" />
                    ))}
                  </Bar>
                  <Bar dataKey="signals" radius={[4, 4, 0, 0]}>
                    {chartData.slice(-10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3B82F6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-lg font-semibold">Signal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="border-b border-white/5">
                  <th>Pair</th>
                  <th>Type</th>
                  <th>Entry</th>
                  <th>SL</th>
                  <th>TP</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats?.history?.length > 0 ? (
                  stats.history.map((signal, i) => (
                    <tr key={i}>
                      <td className="font-medium">{signal.currency_pair}</td>
                      <td>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          signal.signal_type === 'BUY' ? "bg-green-500/20 text-green-500" :
                          signal.signal_type === 'SELL' ? "bg-red-500/20 text-red-500" :
                          "bg-slate-500/20 text-slate-400"
                        )}>
                          {signal.signal_type}
                        </span>
                      </td>
                      <td>{signal.entry_price?.toFixed(5)}</td>
                      <td className="text-red-400">{signal.stop_loss?.toFixed(5)}</td>
                      <td className="text-green-400">{signal.take_profit?.toFixed(5)}</td>
                      <td>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          signal.status === 'TP_HIT' ? "bg-green-500/20 text-green-500" :
                          signal.status === 'SL_HIT' ? "bg-red-500/20 text-red-500" :
                          "bg-slate-500/20 text-slate-400"
                        )}>
                          {signal.status}
                        </span>
                      </td>
                      <td>{signal.confidence?.toFixed(1)}%</td>
                      <td className="text-muted-foreground">{formatDate(signal.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-muted-foreground">
                      No completed signals yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
