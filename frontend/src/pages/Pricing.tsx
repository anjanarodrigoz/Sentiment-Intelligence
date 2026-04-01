import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Building2, Zap } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/ui/Button';

const TIERS = [
  {
    name: 'Starter',
    price: '$299',
    period: '/month',
    description: 'Perfect for single brands and small e-commerce sellers starting out.',
    icon: Zap,
    features: [
      '20,000 Analysis Credits / month',
      'Track up to 2 Competitors',
      'Access to Major Marketplaces',
      'Standard AI Analysis',
      'Export to CSV/Excel',
      'Email Support'
    ],
    highlighted: false,
    cta: 'Start Free Trial'
  },
  {
    name: 'Professional',
    price: '$899',
    period: '/month',
    description: 'Advanced features for growing D2C brands and mid-market companies.',
    icon: Sparkles,
    features: [
      '100,000 Analysis Credits / month',
      'Track up to 5 Competitors',
      'Global Marketplace Access',
      'Deep AI Sentiment Breakdown',
      'API Access & Webhooks',
      'Priority Support (24h)'
    ],
    highlighted: true,
    cta: 'Get Professional'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For Fortune 1000s, multinational agencies, and strict data compliance.',
    icon: Building2,
    features: [
      '500,000+ Analysis Credits',
      'Unlimited Competitor Tracking',
      'Custom Scraper Development',
      'On-Premise / VPC Deployment Available',
      'Single Sign-On (SAML/SSO)',
      'Dedicated Account Manager'
    ],
    highlighted: false,
    cta: 'Contact Sales'
  }
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto px-4 relative pb-20">
        
        {/* Animated Background Blobs */}
        <div className="absolute top-10 -left-32 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute top-20 -right-32 w-96 h-96 bg-cyan-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

        <div className="text-center mb-16 relative pt-16 z-10">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm">
            ✨ Transparent Pricing, Massive Value
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text text-gradient mb-6 pb-2 tracking-tight">
            Plans for Every Stage
          </h1>
          <p className="text-text-secondary text-xl max-w-2xl mx-auto">
            Choose the right plan to unlock consumer sentiment intelligence. Scale from a single product launch to global enterprise tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 mx-auto max-w-6xl">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div 
                key={tier.name}
                className={`flex flex-col rounded-3xl p-8 glass-panel relative ${
                  tier.highlighted 
                    ? 'border-primary shadow-2xl shadow-primary/20 scale-105' 
                    : 'border-border shadow-lg'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-sm font-bold rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-text-primary">{tier.name}</h3>
                  <div className={`p-3 rounded-xl ${tier.highlighted ? 'bg-primary/10 text-primary' : 'bg-surface-alt bg-text-secondary'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold text-text-primary">{tier.price}</span>
                    <span className="text-text-secondary font-medium ml-1">{tier.period}</span>
                  </div>
                  <p className="text-text-secondary mt-3 min-h-[48px] leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="mt-4 mb-8 flex-1">
                  <ul className="space-y-4">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-text-primary text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  size="lg" 
                  variant={tier.highlighted ? 'primary' : 'secondary'}
                  className="w-full py-4 text-lg"
                  onClick={() => navigate('/')}
                >
                  {tier.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
