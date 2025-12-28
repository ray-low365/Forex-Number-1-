import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { User, Mail, Crown, Calendar, Shield, LogOut, ExternalLink } from 'lucide-react';
import { formatDate } from '../lib/utils';

export const Settings = () => {
  const { user, logout, isPremium, isAdmin } = useAuth();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{user?.name}</p>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-card border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Subscription</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPremium ? 'bg-yellow-500/20' : 'bg-slate-500/20'}`}>
                <Crown className={`w-6 h-6 ${isPremium ? 'text-yellow-500' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="font-medium">{isPremium ? 'Pro Plan' : 'Free Plan'}</p>
                <p className="text-sm text-muted-foreground">
                  {isPremium ? 'Full access to all features' : 'Limited signal access'}
                </p>
              </div>
            </div>
            {!isPremium && (
              <Link to="/subscription">
                <Button className="btn-primary">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-card border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Member Since
              </div>
              <span className="font-mono text-sm">{formatDate(user?.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield className="w-4 h-4" />
                Account Type
              </div>
              <span className="font-mono text-sm">
                {isAdmin ? 'Administrator' : isPremium ? 'Premium' : 'Free'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                User ID
              </div>
              <span className="font-mono text-sm text-muted-foreground">{user?.user_id}</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card border border-red-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">Log out of your account on this device</p>
            </div>
            <Button 
              variant="outline" 
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={logout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
