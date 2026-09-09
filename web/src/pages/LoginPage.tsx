import { PrivyAuthModal } from '../components/PrivyAuthModal';
import type { AuthSession } from '../types';

export interface LoginPageProps {
  onClose: () => void;
  onSuccess: (session: AuthSession) => void;
}

export function LoginPage({ onClose, onSuccess }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-paper dotted flex items-center justify-center p-4 font-mono">
      <PrivyAuthModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
