import { Bot, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
      )}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          role === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        )}
      >
        {role === 'user' ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap flex-1 min-w-0">
        {content}
      </div>
    </div>
  );
}
