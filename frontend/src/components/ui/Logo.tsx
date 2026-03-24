import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className={cn(
        "flex items-center gap-3 hover:opacity-90 transition-all active:scale-95",
        className
      )}
    >
      <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-white/50 backdrop-blur-sm border border-primary/10 shadow-sm transition-transform duration-300 hover:rotate-3">
        <img
          src="/favicon.png"
          alt="Sentiment Intelligence Logo"
          className="w-full h-full object-contain p-1"
        />
      </div>
      {showText && (
        <div className="flex flex-col items-start">
          <span className="text-xl font-bold tracking-tight text-text-primary leading-tight">
            Sentiment
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary leading-none -mt-0.5">
            Intelligence
          </span>
        </div>
      )}
    </button>
  );
}
