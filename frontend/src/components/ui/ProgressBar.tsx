interface ProgressBarProps {
  current: number;
  estimated: number | null;
  percentage: number;
}

export default function ProgressBar({ current, estimated, percentage }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      {/* Progress text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          Fetching reviews...{' '}
          <span className="font-medium text-text-primary">
            ({current}
            {estimated ? ` of ~${estimated}` : ''})
          </span>
        </span>
        {percentage > 0 && (
          <span className="font-medium text-primary">{percentage}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
