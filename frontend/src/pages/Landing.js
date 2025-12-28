import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, BarChart3, Target, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Zap,
    title: "AI-Powered Signals",
    description: "Advanced machine learning analyzes market patterns to generate high-probability trading signals."
  },
  {
    icon: Target,
    title: "Precise Entry & Exit",
    description: "Every signal includes entry price, stop loss, and take profit levels with clear risk parameters."
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Built-in position size calculator and risk tools to protect your capital."
  },
  {
    icon: BarChart3,
    title: "Performance Tracking",
    description: "Transparent track record with detailed statistics on signal accuracy and win rates."
  },
  {
    icon: Clock,
    title: "Multiple Timeframes",
    description: "Signals across 15M, 1H, 4H, and daily timeframes for all trading styles."
  },
  {
    icon: TrendingUp,
    title: "20+ Currency Pairs",
    description: "Coverage of major, minor, and exotic pairs including EUR/USD, GBP/JPY, and more."
  }
];

const stats = [
  { value: "78%", label: "Win Rate" },
  { value: "2.1:1", label: "Avg R:R" },
  { value: "500+", label: "Monthly Signals" },
  { value: "24/7", label: "Market Coverage" }
];

export const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">SmartSignalFX</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" data-testid="login-btn">
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
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[128px]" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-primary">AI-Powered Forex Signals</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Trade Smarter with{' '}
              <span className="text-primary">AI-Driven</span>{' '}
              Forex Signals
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Get precise buy/sell signals with confidence scores, risk parameters, and AI-generated analysis. 
              Make informed trading decisions backed by data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="btn-primary text-lg px-8 py-6" data-testid="hero-cta">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="btn-secondary text-lg px-8 py-6">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-card border border-white/5">
                <p className="text-3xl sm:text-4xl font-bold font-mono text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Trade Confidently
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines AI analysis with proven trading strategies to deliver actionable signals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="p-6 rounded-xl bg-background border border-white/5 hover:border-primary/30 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free and upgrade when you're ready for more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-card border border-white/5">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-muted-foreground mb-6">Get started with basic signals</p>
              <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-muted-foreground">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {['5 signals per day', 'Major pairs only', 'Basic analysis', 'Email alerts'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button className="w-full btn-secondary" data-testid="free-plan-btn">Start Free</Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl bg-primary/10 border border-primary/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-muted-foreground mb-6">Unlimited access to all features</p>
              <p className="text-4xl font-bold mb-6">$29.99<span className="text-lg text-muted-foreground">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {['Unlimited signals', 'All 20+ pairs', 'Premium AI analysis', 'Real-time alerts', 'Risk calculator', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <Button className="w-full btn-primary" data-testid="pro-plan-btn">Get Pro Access</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of traders using AI-powered signals to make smarter decisions.
          </p>
          <Link to="/register">
            <Button size="lg" className="btn-primary text-lg px-8 py-6">
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">SmartSignalFX</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 SmartSignalFX. Trading involves risk. Not financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
