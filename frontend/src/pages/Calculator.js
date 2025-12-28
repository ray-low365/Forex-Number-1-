import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calculator, DollarSign, Percent, Target, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY"
];

export const RiskCalculator = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    account_balance: 10000,
    risk_percentage: 2,
    entry_price: 1.0850,
    stop_loss: 1.0800,
    currency_pair: 'EUR/USD'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/calculator/position-size`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setResult(response.data);
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setResult(null);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="calculator-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Position Size Calculator
          </h1>
          <p className="text-muted-foreground">Calculate optimal position size based on your risk parameters</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calculator Form */}
          <div className="bg-card border border-white/5 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="balance" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Account Balance
                </Label>
                <Input
                  id="balance"
                  type="number"
                  value={formData.account_balance}
                  onChange={(e) => handleChange('account_balance', parseFloat(e.target.value))}
                  className="font-mono"
                  data-testid="account-balance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk" className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  Risk Per Trade (%)
                </Label>
                <Input
                  id="risk"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  value={formData.risk_percentage}
                  onChange={(e) => handleChange('risk_percentage', parseFloat(e.target.value))}
                  className="font-mono"
                  data-testid="risk-percentage"
                />
                <p className="text-xs text-muted-foreground">Recommended: 1-2% per trade</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Currency Pair
                </Label>
                <Select 
                  value={formData.currency_pair} 
                  onValueChange={(v) => handleChange('currency_pair', v)}
                >
                  <SelectTrigger data-testid="pair-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIRS.map(pair => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry">Entry Price</Label>
                  <Input
                    id="entry"
                    type="number"
                    step="0.00001"
                    value={formData.entry_price}
                    onChange={(e) => handleChange('entry_price', parseFloat(e.target.value))}
                    className="font-mono"
                    data-testid="entry-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sl">Stop Loss</Label>
                  <Input
                    id="sl"
                    type="number"
                    step="0.00001"
                    value={formData.stop_loss}
                    onChange={(e) => handleChange('stop_loss', parseFloat(e.target.value))}
                    className="font-mono text-red-400"
                    data-testid="stop-loss"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary" 
                disabled={loading}
                data-testid="calculate-btn"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Position Size
              </Button>
            </form>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {result ? (
              <>
                <div className="bg-card border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Position Size</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                      <span>Standard Lots</span>
                      <span className="text-2xl font-bold font-mono text-primary">{result.lot_size}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-muted-foreground">Mini Lots (0.1)</span>
                      <span className="font-mono">{result.mini_lots}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-muted-foreground">Micro Lots (0.01)</span>
                      <span className="font-mono">{result.micro_lots}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-white/5 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Risk Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Risk Amount</span>
                      <span className="font-mono text-red-400">${result.risk_amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Stop Loss Distance</span>
                      <span className="font-mono">{result.sl_pips} pips</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Max Loss</span>
                      <span className="font-mono text-red-400">${result.potential_loss}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-500">Risk Warning</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This calculation is for educational purposes. Always verify with your broker's specifications 
                        and consider additional factors like spread and slippage.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-card border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <Calculator className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Enter your parameters and click calculate<br />to see position size recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
