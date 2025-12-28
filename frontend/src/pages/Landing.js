import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Shield, Zap, BarChart3, Target, Clock, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Zap,
    title: "AI-Powered Precision",
    description: "Advanced algorithms analyze market patterns to deliver high-probability signals with remarkable accuracy."
  },
  {
    icon: Target,
    title: "Predictive Insights",
    description: "See where the market is heading with signals that predict price movements 1 minute ahead."
  },
  {
    icon: Shield,
    title: "Elegant Risk Management",
    description: "Sophisticated position calculators and risk tools to protect and grow your capital gracefully."
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Live charts with detailed candlestick patterns and technical indicators for informed decisions."
  },
  {
    icon: Clock,
    title: "Market Session Intelligence",
    description: "Know exactly which markets are open and the optimal times to trade each currency pair."
  },
  {
    icon: Sparkles,
    title: "Pro Strategy Insights",
    description: "Exclusive recommendations for Algorithmic, News, and Carry trading strategies."
  }
];

const stats = [
  { value: "82%", label: "Win Rate" },
  { value: "2.4:1", label: "Avg R:R" },
  { value: "500+", label: "Monthly Signals" },
  { value: "24/7", label: "Market Coverage" }
];

export const Landing = () => {
  return (
    <div className="min-h-screen luxury-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0F1115]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA8C2C] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0F1115]" />
              </div>
              <span className="font-heading text-xl tracking-tight">FX Pulse</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-slate-400 hover:text-[#D4AF37]" data-testid="login-btn">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button className="btn-primary" data-testid="get-started-btn">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Subtle gold ambient glow */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#D4AF37]/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse-gold" />
              <span className="text-sm text-[#D4AF37] font-medium">AI-Powered Trading Intelligence</span>
            </div>
            
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 leading-tight">
              Trading, Elevated to{' '}
              <span className="text-gold-gradient">an Art Form</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Experience the sophistication of AI-driven forex signals. Precise predictions, 
              elegant risk management, and real-time market intelligence — all in one refined platform.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="btn-primary text-lg px-10 py-4" data-testid="hero-cta">
                  Begin Your Journey
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" className="btn-secondary text-lg px-10 py-4">
                  Explore Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-8 glass-card glass-card-hover">
                <p className="text-3xl sm:text-4xl font-heading text-[#D4AF37] mb-2">{stat.value}</p>
                <p className="text-sm text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">
              Crafted for the Discerning Trader
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Every feature designed with precision and elegance to elevate your trading experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-8 glass-card glass-card-hover group"
              >
                <div className="w-14 h-14 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <h3 className="font-heading text-xl mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-4">
              Invest in Excellence
            </h2>
            <p className="text-lg text-slate-400">
              Choose the plan that matches your ambitions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 glass-card">
              <h3 className="font-heading text-2xl mb-2">Explorer</h3>
              <p className="text-slate-400 mb-6">Begin your journey</p>
              <p className="text-4xl font-heading mb-8">$0<span className="text-lg text-slate-500">/mo</span></p>
              <ul className="space-y-4 mb-8">
                {['5 signals daily', 'Major pairs', 'Basic analysis', 'Market status'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-slate-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button className="w-full btn-secondary" data-testid="free-plan-btn">Start Free</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 glass-card relative border-[#D4AF37]/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#AA8C2C] rounded-full text-sm font-semibold text-[#0F1115]">
                Most Popular
              </div>
              <h3 className="font-heading text-2xl mb-2 text-[#D4AF37]">Pro</h3>
              <p className="text-slate-400 mb-6">Unlock your full potential</p>
              <p className="text-4xl font-heading mb-8">$29.99<span className="text-lg text-slate-500">/mo</span></p>
              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited signals',
                  'All 20+ currency pairs',
                  'Predictive AI analysis',
                  'Real-time charts',
                  'Strategy insights (Algo, News, Carry)',
                  'Priority support'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button className="w-full btn-primary" data-testid="pro-plan-btn">Upgrade to Pro</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl tracking-tight mb-6">
            Ready to Trade with Elegance?
          </h2>
          <p className="text-lg text-slate-400 mb-10">
            Join a community of traders who appreciate precision and sophistication.
          </p>
          <Link to="/register">
            <Button size="lg" className="btn-primary text-lg px-10 py-4">
              Create Your Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#AA8C2C] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#0F1115]" />
              </div>
              <span className="font-heading text-lg">FX Pulse</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 FX Pulse. Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
