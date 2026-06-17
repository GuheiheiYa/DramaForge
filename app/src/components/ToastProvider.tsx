import { Toaster } from 'sonner';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      expand={false}
      richColors
      closeButton
      duration={3000}
      toastOptions={{
        style: {
          fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '13px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(30,28,26,0.12)',
        },
      }}
    />
  );
}
