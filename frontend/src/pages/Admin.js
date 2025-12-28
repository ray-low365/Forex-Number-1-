import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Shield, Users, TrendingUp, DollarSign, 
  RefreshCw, Loader2, Check, X, Sparkles,
  BarChart3, Crown
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const Admin = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [signals, setSignals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, signalsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/signals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setSignals(signalsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const generateBatch = async () => {
    setGenerating(true);
    try {
      await axios.post(`${API}/admin/signals/generate-batch`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to generate signals:', error);
    } finally {
      setGenerating(false);
    }
  };

  const togglePremium = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/premium`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle premium:', error);
    }
  };

  const updateSignalStatus = async (signalId, status) => {
    try {
      await axios.put(`${API}/admin/signals/${signalId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update signal:', error);
    }
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
      <div className="space-y-6" data-testid="admin-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage signals, users, and platform settings</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} className="btn-secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={generateBatch} disabled={generating} className="btn-primary">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Signals
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats?.users?.total || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Users</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-yellow-500">{stats?.users?.premium || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Premium Users</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats?.signals?.total || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Signals</p>
          </div>

          <div className="bg-card border border-white/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono">{stats?.transactions?.completed || 0}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Transactions</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList className="bg-card border border-white/5">
            <TabsTrigger value="signals" className="data-[state=active]:bg-primary/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Signals
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals">
            <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th>Pair</th>
                      <th>Type</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Premium</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.slice(0, 20).map(signal => (
                      <tr key={signal.signal_id}>
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
                        <td>{signal.confidence?.toFixed(1)}%</td>
                        <td>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            signal.status === 'ACTIVE' ? "bg-primary/20 text-primary" :
                            signal.status === 'TP_HIT' ? "bg-green-500/20 text-green-500" :
                            signal.status === 'SL_HIT' ? "bg-red-500/20 text-red-500" :
                            "bg-slate-500/20 text-slate-400"
                          )}>
                            {signal.status}
                          </span>
                        </td>
                        <td>{signal.is_premium ? <Check className="w-4 h-4 text-yellow-500" /> : <X className="w-4 h-4 text-muted-foreground" />}</td>
                        <td className="text-muted-foreground">{formatDate(signal.created_at)}</td>
                        <td>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => updateSignalStatus(signal.signal_id, 'TP_HIT')}
                              className="text-green-500 hover:bg-green-500/10"
                            >
                              TP
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => updateSignalStatus(signal.signal_id, 'SL_HIT')}
                              className="text-red-500 hover:bg-red-500/10"
                            >
                              SL
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th>Name</th>
                      <th>Email</th>
                      <th>Premium</th>
                      <th>Admin</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.user_id}>
                        <td className="font-medium">{user.name}</td>
                        <td className="text-muted-foreground">{user.email}</td>
                        <td>{user.is_premium ? <Crown className="w-4 h-4 text-yellow-500" /> : <X className="w-4 h-4 text-muted-foreground" />}</td>
                        <td>{user.is_admin ? <Shield className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-muted-foreground" />}</td>
                        <td className="text-muted-foreground">{formatDate(user.created_at)}</td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => togglePremium(user.user_id)}
                            className={user.is_premium ? "text-red-400" : "text-yellow-500"}
                          >
                            {user.is_premium ? 'Remove Pro' : 'Grant Pro'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
