import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { SwipeConfirm } from './SwipeConfirm';

/**
 * Confirmation dialog for critical actions. The action only runs after the
 * user slides the bar, so a stray tap can never delete a record or change an
 * order status. Used for deletes, order confirmation/status changes and reset.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionModal({
  open, onClose, title, description, confirmLabel = 'اسحب للحذف', tone = 'danger', onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={() => { if (!busy) onClose(); }} title={title}>
      <div className="confirm-body">
        <div className={`confirm-icon ${tone}`}><AlertTriangle size={26} /></div>
        <div className="confirm-desc">{description}</div>
        <SwipeConfirm
          tone={tone}
          label={confirmLabel}
          onConfirm={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        />
        <button type="button" className="confirm-cancel" onClick={onClose} disabled={busy}>إلغاء</button>
      </div>
    </Modal>
  );
}
