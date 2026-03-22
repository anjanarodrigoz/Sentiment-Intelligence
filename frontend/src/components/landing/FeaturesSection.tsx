import { Clock, MessageSquare, Activity, Download } from 'lucide-react';
import Card from '../ui/Card';

const FEATURES = [
  {
    icon: Clock,
    title: 'Save 10+ Hours',
    description: 'Stop manually reading Amazon reviews. Instantly summarize thousands of data points into top pros and cons.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Activity,
    title: 'Spy on Competitors',
    description: 'Drop competitor links and instantly reveal their biggest flaws. Use their weakness for your marketing advantage.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: MessageSquare,
    title: 'Chat with Feedback',
    description: 'Ask specific questions like "What do people think about the battery life?" and get instantaneous, data-backed answers.',
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    icon: Download,
    title: 'Exportable Data',
    description: 'Instantly download raw reviews and sentiment scores directly to CSV for seamless integration with Excel and BI tools.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
];

export default function FeaturesSection() {
  return (
    <div className="py-12 mb-16 border-t border-border/50">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Why Top Brands Use Us</h2>
        <p className="text-text-secondary">Actionable insights delivered in seconds, not weeks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feat, i) => (
          <Card key={i} className="text-left border-none shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-white/50 backdrop-blur-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feat.bg}`}>
              <feat.icon className={`w-6 h-6 ${feat.color}`} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">{feat.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{feat.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
