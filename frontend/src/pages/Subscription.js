import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Crown, Check, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const Subscription = () => {
  const { token, isPremium, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API}/subscription/plans`);
        setPlans(response.data);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && token) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams, token]);

  const checkPaymentStatus = async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      try {
        const response = await axios.get(`${API}/subscription/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.payment_status === 'paid') {
          setPaymentSuccess(true);
          await refreshUser();
          return;
        }
        
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setCheckingPayment(false);
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
        setCheckingPayment(false);
      }
    };
    
    poll();
  };

  const handleSubscribe = async (planId) => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/subscription/checkout`, 
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout failed:', error);
      setLoading(false);
    }
  };

  if (checkingPayment) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      </Layout>
    );
  }

  if (paymentSuccess) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Welcome to Pro!</h1>
          <p className="text-muted-foreground mb-8">
            Your subscription is now active. Enjoy unlimited access to all premium features and signals.
          </p>
          <Link to="/dashboard">
            <Button className="btn-primary">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (isPremium) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">You're a Pro Member!</h1>
          <p className="text-muted-foreground mb-8">
            You have full access to all premium features and unlimited trading signals.
          </p>
          <Link to="/dashboard">
            <Button className="btn-primary">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8" data-testid="subscription-page">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-500">Upgrade to Pro</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Unlock Premium Trading Signals
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get access to high-confidence signals, all currency pairs, AI analysis, and priority alerts.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-card border border-white/5 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-2">Free</h3>
            <p className="text-muted-foreground mb-6">Basic access to trading signals</p>
            <p className="text-4xl font-bold mb-6">$0<span className="text-lg text-muted-foreground">/mo</span></p>
            <ul className="space-y-3 mb-8">
              {['5 signals per day', 'Major pairs only', 'Basic analysis', 'Email alerts'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-5 h-5 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full btn-secondary" disabled>Current Plan</Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary rounded-full text-sm font-medium text-white">
              Recommended
            </div>
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <p className="text-muted-foreground mb-6">Full access to all features</p>
            <p className="text-4xl font-bold mb-6">$29.99<span className="text-lg text-muted-foreground">/mo</span></p>
            <ul className="space-y-3 mb-8">
              {[
                'Unlimited signals',
                'All 20+ currency pairs',
                'Premium AI analysis',
                'Real-time push alerts',
                'Priority support',
                'Risk calculator'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-5 h-5 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button 
              className="w-full btn-primary" 
              onClick={() => handleSubscribe('monthly')}
              disabled={loading}
              data-testid="subscribe-btn"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              Upgrade to Pro
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card border border-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">Can I cancel anytime?</p>
              <p className="text-muted-foreground">Yes, you can cancel your subscription at any time. No questions asked.</p>
            </div>
            <div>
              <p className="font-medium mb-1">Is there a free trial?</p>
              <p className="text-muted-foreground">The free plan gives you limited access. Upgrade to Pro for full features.</p>
            </div>
            <div>
              <p className="font-medium mb-1">What payment methods do you accept?</p>
              <p className="text-muted-foreground">We accept all major credit cards through Stripe secure checkout.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
