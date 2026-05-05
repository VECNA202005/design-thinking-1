import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function Message({ type, text, onClear }) {
  useEffect(() => {
    if (text) {
      const timer = setTimeout(onClear, 5000);
      return () => clearTimeout(timer);
    }
  }, [text, onClear]);

  if (!text) return null;

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 2000,
      background: isSuccess ? '#ecfdf5' : '#fef2f2',
      color: isSuccess ? '#059669' : '#dc2626',
      padding: '1rem 1.5rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      border: `1px solid ${isSuccess ? '#10b98133' : '#ef444433'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      animation: 'slideIn 0.3s ease'
    }}>
      {isSuccess ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span style={{ fontWeight: 600 }}>{text}</span>
      <button onClick={onClear} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}>
        <X size={18} />
      </button>

      <style>
        {`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}
      </style>
    </div>
  );
}
