import { useMemo } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import type { ProductAnalysis } from '../../types/product';
import SentimentChart from '../analysis/SentimentChart';
import RatingsDistribution from '../analysis/RatingsDistribution';
import AttributesChart from '../analysis/AttributesChart';
import KeywordCloud from '../analysis/KeywordCloud';
import TopSellingPoints from '../analysis/TopSellingPoints';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  analyses?: ProductAnalysis[];
}

const CHART_MARKER_RE = /(\{\{chart:\w+\}\})/g;

function renderChart(marker: string, analyses: ProductAnalysis[]) {
  const analysis = analyses[0];
  if (!analysis) return null;

  const type = marker.replace('{{chart:', '').replace('}}', '');

  switch (type) {
    case 'sentiment':
      return <SentimentChart data={analysis.sentimentSummary} compact />;
    case 'ratings':
      return <RatingsDistribution data={analysis.ratingDistribution} compact />;
    case 'attributes':
      return <AttributesChart data={analysis.attributeCounts} compact />;
    case 'keywords':
      return <KeywordCloud words={analysis.topKeywords} compact />;
    case 'sellingpoints':
      return <TopSellingPoints points={analysis.topSellingPoints} compact />;
    default:
      return null;
  }
}

export default function ChatMessage({ role, content, analyses }: ChatMessageProps) {
  const segments = useMemo(() => {
    if (role === 'user' || !analyses || analyses.length === 0) return null;
    const parts = content.split(CHART_MARKER_RE);
    if (parts.length === 1) return null; // no chart markers found
    return parts;
  }, [role, content, analyses]);

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
      <div className="text-sm leading-relaxed flex-1 min-w-0">
        {role === 'user' ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : segments ? (
          // Has chart markers — render segments
          segments.map((segment, i) =>
            CHART_MARKER_RE.test(segment) ? (
              <div key={i} className="my-3">
                {renderChart(segment, analyses!)}
              </div>
            ) : segment ? (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {segment}
              </ReactMarkdown>
            ) : null
          )
        ) : (
          // No chart markers — render full content as markdown (assistant) or text
          role === 'assistant' ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )
        )}
      </div>
    </div>
  );
}

// Custom markdown component styles for chat context
const markdownComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border-collapse border border-border" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) => (
    <thead className="bg-gray-100" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="border border-border px-3 py-1.5 text-left font-medium" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="border border-border px-3 py-1.5" {...props}>{children}</td>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside my-1 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5" {...props}>{children}</ol>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="my-1" {...props}>{children}</p>
  ),
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-base font-bold mt-2 mb-1" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-sm font-bold mt-2 mb-1" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-sm font-semibold mt-1.5 mb-0.5" {...props}>{children}</h3>
  ),
  code: ({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'>) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <pre className="bg-gray-800 text-gray-100 rounded-md p-2 my-2 overflow-x-auto text-xs">
        <code {...props}>{children}</code>
      </pre>
    ) : (
      <code className="bg-gray-200 px-1 py-0.5 rounded text-xs" {...props}>
        {children}
      </code>
    );
  },
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
};
