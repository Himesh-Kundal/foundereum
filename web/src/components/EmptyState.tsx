import { BlockButton } from './Buttons';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, description, action, onAction }: EmptyStateProps) => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 border border-ink dotted text-center min-h-[300px]">
      <h3 className="font-mono uppercase text-xl text-ink mb-4">{title}</h3>
      <p className="font-mono text-ink-mut mb-8 max-w-md">{description}</p>
      {action && onAction && (
        <BlockButton onClick={onAction}>
          {action}
        </BlockButton>
      )}
    </div>
  );
};
