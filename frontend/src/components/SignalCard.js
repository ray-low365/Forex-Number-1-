import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Clock, Lock, TrendingUp } from 'lucide-react';
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
        return 'bg-[#2E8B57]/10 text-[#2E8B57] border-[#2E8B57]/20';
      case 'SELL':
        return 'bg-[#CD5C5C]/10 text-[#CD5C5C] border-[#CD5C5C]/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = () => {
    switch (signal.status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-xs bg-[#D4AF37]/20 text-[#D4AF37] font-medium">Active</span>;
      case 'TP_HIT':
        return <span className="px-2.5 py-1 rounded-full text-xs bg-[#2E8B57]/20 text-[#2E8B57]">TP Hit</span>;
      case 'SL_HIT':
        return <span className="px-2.5 py-1 rounded-full text-xs bg-[#CD5C5C]/20 text-[#CD5C5C]">SL Hit</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">Expired</span>;
      default:
        return null;
    }
  };

  if (showPremiumLock && signal.is_premium) {
    return (
      <div className="signal-card relative overflow-hidden opacity-60">
        <div className="absolute inset-0 backdrop-blur-sm bg-[#0F1115]/50 flex items-center justify-center z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
            <p className="text-sm text-slate-400">Pro Signal</p>
          </div>
        </div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-mono font-semibold text-lg">{signal.currency_pair}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
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
      className="signal-card block hover:-translate-y-1 transition-all duration-300"
      data-testid={`signal-card-${signal.signal_id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading text-xl tracking-tight">{signal.currency_pair}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {signal.timeframe} · {timeAgo(signal.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {signal.is_premium && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-[#D4AF37]/20 text-[#D4AF37] font-medium">PRO</span>
          )}
        </div>
      </div>

      {/* Signal Type & Confidence */}
      <div className="flex items-center justify-between mb-5">
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border", getSignalColors())}>
          {getSignalIcon()}
          <span className="font-semibold">{signal.signal_type}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Confidence</p>
          <p className={cn("font-mono font-bold text-xl", getConfidenceColor(signal.confidence))}>
            {formatConfidence(signal.confidence)}
          </p>
        </div>
      </div>

      {/* Prediction Badge */}
      {signal.predicted_price && (
        <div className="mb-4 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
              Predicted (1 min)
            </span>
            <span className="font-mono text-[#D4AF37]">{formatPrice(signal.predicted_price, signal.currency_pair)}</span>
          </div>
        </div>
      )}

      {/* Price Levels */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Entry</p>
          <p className="font-mono text-sm">{formatPrice(signal.entry_price, signal.currency_pair)}</p>
        </div>
        <div className="bg-[#CD5C5C]/5 rounded-lg p-3">
          <p className="text-xs text-[#CD5C5C]/70 uppercase tracking-wider mb-1">Stop Loss</p>
          <p className="font-mono text-sm text-[#CD5C5C]">{formatPrice(signal.stop_loss, signal.currency_pair)}</p>
        </div>
        <div className="bg-[#2E8B57]/5 rounded-lg p-3">
          <p className="text-xs text-[#2E8B57]/70 uppercase tracking-wider mb-1">Take Profit</p>
          <p className="font-mono text-sm text-[#2E8B57]">{formatPrice(signal.take_profit, signal.currency_pair)}</p>
        </div>
      </div>

      {/* Market Bias */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <p className="text-xs text-slate-500">
          Market Bias: <span className={cn(
            "font-medium",
            signal.market_bias === 'BULLISH' && "text-[#2E8B57]",
            signal.market_bias === 'BEARISH' && "text-[#CD5C5C]",
            signal.market_bias === 'RANGING' && "text-slate-400"
          )}>{signal.market_bias}</span>
        </p>
      </div>
    </Link>
  );
};
