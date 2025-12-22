import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastOptions = {
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (message: string, opts?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastOptions['type']>('info');

  const showToast = useCallback((msg: string, opts?: ToastOptions) => {
    setMessage(msg);
    setType(opts?.type ?? 'info');

    const duration = opts?.durationMs ?? 3000;
    setTimeout(() => setMessage(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 24,
            padding: '8px 12px',
            background: type === 'error' ? '#D9534F' : '#323232',
            color: 'white',
            borderRadius: 6,
            zIndex: 9999,
          }}
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    showToast: (message: string) => {
      // eslint-disable-next-line no-alert
      alert(message);
    },
  };
};
