import { PrivyAuthModal } from '../components/PrivyAuthModal';
import { ThemeToggle } from '../components/ThemeToggle';
import type { AuthSession } from '../types';

export interface LoginPageProps {
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export function LoginPage({ onClose, onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-paper dotted flex flex-col items-center justify-center p-4 font-mono relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <PrivyAuthModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
