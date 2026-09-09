export interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-ink text-paper border border-forge px-4 py-2 text-xs font-mono shadow-lg flex items-center gap-2 animate-bounce">
      <span className="w-2 h-2 bg-forge inline-block shrink-0" />
      <span>{message}</span>
    </div>
  );
}
