import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description = '',
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-modal flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden"
          >
            {/* Content */}
            <div className="px-6 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FDF2F0] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-[#B85C50]" />
              </div>
              <h3 className="text-h3 text-[#383431] mb-2">{title}</h3>
              {description && (
                <p className="text-small text-[#6E6862]">{description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-lg border border-[#DEDBD8] text-small font-medium text-[#524D48] hover:bg-[#F8F7F6] transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 h-10 rounded-lg text-small font-medium text-white transition-colors ${
                  confirmVariant === 'danger'
                    ? 'bg-[#B85C50] hover:bg-[#A34E43]'
                    : 'bg-[#A8835F] hover:bg-[#8E6A48]'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
