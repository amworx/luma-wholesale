import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; kind: ToastKind }
interface ToastApi { show: (message: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' ? <CheckCircle2 size={19} /> : t.kind === 'error' ? <XCircle size={19} /> : <Info size={19} />}
            <span className="grow">{t.message}</span>
            <button className="btn-icon" style={{ color: '#fff', padding: 2 }} onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))}><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
