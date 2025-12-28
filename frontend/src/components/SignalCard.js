import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Clock, Lock } from 'lucide-react';
import { cn, formatPrice, formatConfidence, getConfidenceColor, timeAgo } from '../lib/utils';

export const SignalCard = ({ signal, showPremiumLock = false }) => {
  const getSignalIcon = () => {
    switch (signal.signal_type) {
      case 'BUY':
        return <ArrowUpRight className="w-5 h-5" />;
      case 'SELL':
        return <ArrowDownRight className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getSignalColors = () => {
    switch (signal.signal_type) {
      case 'BUY':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'SELL':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = () => {
    switch (signal.status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">Active</span>;
      case 'TP_HIT':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">TP Hit</span>;
      case 'SL_HIT':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-500">SL Hit</span>;
      case 'EXPIRED':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400">Expired</span>;
      default:
        return null;
    }
  };

  if (showPremiumLock && signal.is_premium) {
    return (
      <div className="signal-card relative overflow-hidden opacity-60">
        <div className="absolute inset-0 backdrop-blur-sm bg-background/50 flex items-center justify-center z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Premium Signal</p>
          </div>
        </div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-mono font-semibold text-lg">{signal.currency_pair}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {signal.timeframe}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link 
      to={`/analysis/${signal.currency_pair.replace('/', '-')}`} 
      className="signal-card block hover:-translate-y-0.5 transition-transform duration-200"
      data-testid={`signal-card-${signal.signal_id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-mono font-semibold text-lg">{signal.currency_pair}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {signal.timeframe} · {timeAgo(signal.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {signal.is_premium && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-500">PRO</span>
          )}
        </div>
      </div>

      {/* Signal Type & Confidence */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", getSignalColors())}>
          {getSignalIcon()}
          <span className="font-semibold">{signal.signal_type}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Confidence</p>
          <p className={cn("font-mono font-bold text-lg", getConfidenceColor(signal.confidence))}>
            {formatConfidence(signal.confidence)}
          </p>
        </div>
      </div>

      {/* Price Levels */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Entry</p>
          <p className="font-mono text-sm">{formatPrice(signal.entry_price, signal.currency_pair)}</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-2">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Stop Loss</p>
          <p className="font-mono text-sm text-red-400">{formatPrice(signal.stop_loss, signal.currency_pair)}</p>
        </div>
        <div className="bg-green-500/10 rounded-lg p-2">
          <p className="text-xs text-green-400 uppercase tracking-wider mb-1">Take Profit</p>
          <p className="font-mono text-sm text-green-400">{formatPrice(signal.take_profit, signal.currency_pair)}</p>
        </div>
      </div>

      {/* Market Bias */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-muted-foreground">
          Market Bias: <span className={cn(
            "font-medium",
            signal.market_bias === 'BULLISH' && "text-green-400",
            signal.market_bias === 'BEARISH' && "text-red-400",
            signal.market_bias === 'RANGING' && "text-slate-400"
          )}>{signal.market_bias}</span>
        </p>
      </div>
    </Link>
  );
};
