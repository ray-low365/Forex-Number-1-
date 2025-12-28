import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  BarChart3, 
  Calculator, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  Crown,
  Shield,
  Sparkles,
  Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Signals', icon: LayoutDashboard },
  { path: '/analysis', label: 'Analysis', icon: TrendingUp },
  { path: '/performance', label: 'Performance', icon: BarChart3 },
  { path: '/calculator', label: 'Calculator', icon: Calculator },
  { path: '/alerts', label: 'Alerts', icon: Bell },
];

const proItems = [
  { path: '/insights', label: 'Pro Insights', icon: Sparkles },
];

const adminItems = [
  { path: '/admin', label: 'Admin', icon: Shield },
];

export const Layout = ({ children }) => {
  const { user, logout, isPremium, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen luxury-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0F1115]/80 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA8C2C] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0F1115]" />
              </div>
              <span className="font-heading text-xl tracking-tight">FX Pulse</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "nav-link flex items-center gap-2 text-sm",
                    location.pathname === item.path && "active"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {isPremium && proItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "nav-link flex items-center gap-2 text-sm text-[#D4AF37]",
                    location.pathname === item.path && "active"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "nav-link flex items-center gap-2 text-sm",
                    location.pathname === item.path && "active"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {!isPremium && (
                <Link to="/subscription">
                  <Button size="sm" className="hidden sm:flex items-center gap-2 btn-primary text-sm">
                    <Crown className="w-4 h-4" />
                    Upgrade
                  </Button>
                </Link>
              )}
              
              <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-slate-500 flex items-center justify-end gap-1">
                    {isPremium && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                    {isAdmin ? 'Admin' : isPremium ? 'Pro' : 'Free'}
                  </p>
                </div>
                <Link to="/settings">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]">
                    <Settings className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#CD5C5C]/10 hover:text-[#CD5C5C]" onClick={handleLogout}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-[#D4AF37]/10"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0F1115] animate-fade-in">
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    location.pathname === item.path
                      ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              {isPremium && proItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    location.pathname === item.path
                      ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    location.pathname === item.path
                      ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10">
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#CD5C5C] hover:bg-[#CD5C5C]/10"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};
