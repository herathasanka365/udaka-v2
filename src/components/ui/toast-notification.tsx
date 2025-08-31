import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastNotificationProps {
  type: ToastType;
  message: string;
  title?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: 'bg-green-500/20 border-green-500/30 text-green-100',
  error: 'bg-red-500/20 border-red-500/30 text-red-100',
  warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-100',
  info: 'bg-blue-500/20 border-blue-500/30 text-blue-100',
};

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  type,
  message,
  title,
  onClose,
  autoClose = true,
  duration = 5000,
  className,
}) => {
  const Icon = toastIcons[type];

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-start gap-3 p-4 rounded-glass',
        'backdrop-blur-glass border shadow-lg min-w-[320px] max-w-md',
        'bg-gradient-glass',
        toastStyles[type],
        'animate-in slide-in-from-top-2 duration-300',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 space-y-1">
        {title && (
          <p className="font-semibold text-sm leading-none">
            {title}
          </p>
        )}
        <p className="text-sm leading-relaxed opacity-90">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Hook for managing toasts
export const useToastNotification = () => {
  const [toasts, setToasts] = React.useState<Array<{
    id: string;
    type: ToastType;
    message: string;
    title?: string;
  }>>([]);

  const addToast = React.useCallback((toast: Omit<ToastNotificationProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const ToastContainer = React.useCallback(() => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  ), [toasts, removeToast]);

  return {
    addToast,
    removeToast,
    ToastContainer,
  };
};

export default ToastNotification;