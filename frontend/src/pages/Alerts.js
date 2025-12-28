import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Bell, BellOff, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const Alerts = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const markAsRead = async (alertId) => {
    try {
      await axios.put(`${API}/alerts/${alertId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alerts.map(a => a.alert_id === alertId ? { ...a, is_read: true } : a));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/alerts/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alerts.map(a => ({ ...a, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const getAlertIcon = (type) => {
    switch (type) {
      case 'NEW_SIGNAL':
        return <Bell className="w-5 h-5 text-primary" />;
      case 'TP_HIT':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'SL_HIT':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
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
      <div className="max-w-3xl mx-auto space-y-6" data-testid="alerts-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Alerts & Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary text-white">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">Stay updated on signal changes and market events</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="btn-secondary">
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Alerts List */}
        <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Alerts Yet</h3>
              <p className="text-muted-foreground">
                You'll receive notifications when new signals are generated or when signals hit targets.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {alerts.map(alert => (
                <div 
                  key={alert.alert_id}
                  className={cn(
                    "p-4 flex items-start gap-4 hover:bg-white/5 transition-colors",
                    !alert.is_read && "bg-primary/5"
                  )}
                  data-testid={`alert-${alert.alert_id}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-card border border-white/10 flex items-center justify-center">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      !alert.is_read && "font-medium"
                    )}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo(alert.created_at)}
                    </p>
                  </div>
                  {!alert.is_read && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAsRead(alert.alert_id)}
                      className="flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
