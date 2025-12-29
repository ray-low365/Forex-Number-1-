import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, BarChart3, Target, Clock, ArrowRight, CheckCircle2, Sparkles, Shield, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

const features = [
  {
    icon: Zap,
    title: "AI-POWERED SIGNALS",
    description: "Real-time predictions using advanced algorithms. Get ahead of the market."
  },
  {
    icon: Target,
    title: "PREDICTIVE ANALYTICS",
    description: "See price movements 1 minute before they happen. Trade with confidence."
  },
  {
    icon: BarChart3,
    title: "LIVE CRYPTO DATA",
    description: "Real-time BTC, ETH, SOL prices from CoinGecko. No delays."
  },
  {
    icon: Globe,
    title: "24/7 MARKETS",
    description: "Forex sessions + Crypto never sleeps. Trade anytime, anywhere."
  },
  {
    icon: Shield,
    title: "RISK CALCULATOR",
    description: "Smart position sizing. Protect your capital like a pro."
  },
  {
    icon: Sparkles,
    title: "PRO STRATEGIES",
    description: "Algo trading, news trading, carry trade insights. Level up."
  }
];

const stats = [
  { value: "30+", label: "PAIRS" },
  { value: "8", label: "TIMEFRAMES" },
  { value: "LIVE", label: "CRYPTO DATA" },
  { value: "24/7", label: "MARKETS" }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--accent-primary)] rounded-full blur-[200px] opacity-10 animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[var(--accent-secondary)] rounded-full blur-[180px] opacity-10" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[var(--accent-tertiary)] rounded-full blur-[150px] opacity-5" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--gradient-main)] flex items-center justify-center transform -skew-x-6">
                <TrendingUp className="w-5 h-5 text-[var(--bg-primary)]" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tighter uppercase">FX PULSE</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)]" data-testid="login-btn">
                  LOGIN
                </Button>
              </Link>
              <Link to="/register">
                <button className="btn-primary" data-testid="get-started-btn">
                  <span>GET STARTED</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <motion.div 
          className="max-w-7xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 mb-8 transform -skew-x-6"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            <span className="text-sm text-[var(--accent-primary)] font-bold uppercase tracking-widest transform skew-x-6">LIVE TRADING SIGNALS</span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="font-heading text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tighter uppercase mb-6"
          >
            TRADE THE
            <br />
            <span className="text-gradient">FUTURE</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg sm:text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto"
          >
            AI-powered predictions. Real-time crypto from CoinGecko. 
            Forex & Crypto in one place. Built for Gen Z traders.
          </motion.p>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <button className="btn-primary text-lg" data-testid="hero-cta">
                <span className="flex items-center gap-2">
                  START TRADING
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </Link>
            <Link to="/login">
              <button className="btn-secondary text-lg">
                <span>VIEW DEMO</span>
              </button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={containerVariants}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="glass-card glass-card-hover p-6 text-center transform -skew-x-3"
              >
                <p className="text-3xl sm:text-4xl font-heading font-extrabold text-[var(--accent-primary)] mb-1 transform skew-x-3">{stat.value}</p>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest transform skew-x-3">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tighter uppercase mb-4">
              BUILT FOR <span className="text-gradient">WINNERS</span>
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Everything you need to dominate the markets
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="glass-card glass-card-hover p-6 group"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--accent-primary)]/20 transition-colors transform -skew-x-6">
                  <feature.icon className="w-6 h-6 text-[var(--accent-primary)] transform skew-x-6" />
                </div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--accent-primary)]/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tighter uppercase mb-4">
              PICK YOUR <span className="text-gradient">LEVEL</span>
            </h2>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Free */}
            <motion.div variants={itemVariants} className="glass-card tier-free p-6">
              <h3 className="font-heading text-xl font-bold uppercase mb-2">FREE</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Get started</p>
              <p className="text-4xl font-heading font-extrabold mb-6">$0<span className="text-lg text-[var(--text-muted)]">/mo</span></p>
              <ul className="space-y-3 mb-6">
                {['10 pairs', 'Basic charts', '7-day data', '2 indicators'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--text-muted)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <button className="w-full btn-secondary">
                  <span>START FREE</span>
                </button>
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div variants={itemVariants} className="glass-card tier-pro p-6 relative border-[var(--accent-primary)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider transform -skew-x-6">
                <span className="transform skew-x-6 inline-block">POPULAR</span>
              </div>
              <h3 className="font-heading text-xl font-bold uppercase mb-2 text-[var(--accent-primary)]">PRO</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Level up</p>
              <p className="text-4xl font-heading font-extrabold mb-6">$5.99<span className="text-lg text-[var(--text-muted)]">/mo</span></p>
              <ul className="space-y-3 mb-6">
                {['All 30+ pairs', 'All timeframes', '1-year data', 'All indicators', '10 alerts', 'No ads'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <button className="w-full btn-primary">
                  <span>GO PRO</span>
                </button>
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div variants={itemVariants} className="glass-card tier-premium p-6 border-[var(--accent-secondary)]">
              <h3 className="font-heading text-xl font-bold uppercase mb-2 text-[var(--accent-secondary)]">PREMIUM</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Go all in</p>
              <p className="text-4xl font-heading font-extrabold mb-6">$29.99<span className="text-lg text-[var(--text-muted)]">/mo</span></p>
              <ul className="space-y-3 mb-6">
                {['Everything in Pro', 'Advanced analytics', 'Unlimited alerts', 'API access', 'Priority support', 'Backtesting'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-secondary)]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register">
                <button className="w-full btn-secondary border-[var(--accent-secondary)] text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)] hover:text-[var(--bg-primary)]">
                  <span>GO PREMIUM</span>
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tighter uppercase mb-6">
            READY TO <span className="text-gradient">TRADE?</span>
          </h2>
          <p className="text-lg text-[var(--text-secondary)] mb-10">
            Join the next generation of traders.
          </p>
          <Link to="/register">
            <button className="btn-primary text-xl px-10 py-4">
              <span className="flex items-center gap-2">
                LET'S GO
                <ArrowRight className="w-6 h-6" />
              </span>
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--gradient-main)] flex items-center justify-center transform -skew-x-6">
              <TrendingUp className="w-4 h-4 text-[var(--bg-primary)]" />
            </div>
            <span className="font-heading text-lg font-bold uppercase">FX PULSE</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © 2024 FX Pulse. Trading involves risk. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
};
