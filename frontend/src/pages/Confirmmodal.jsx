import { useState, useCallback, useRef } from 'react';
import styles from './Dashboard.module.css';
 
export function useConfirm() {
  const [state, setState] = useState(null); // null = closed
  const resolveRef = useRef(null);
 
  // Opens the modal, returns a Promise<boolean>
  const confirm = useCallback(({ title, message, label = 'Confirm', danger = false }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ title, message, label, danger });
    });
  }, []);
 
  const handleConfirm = () => {
    setState(null);
    resolveRef.current?.(true);
  };
 
  const handleCancel = () => {
    setState(null);
    resolveRef.current?.(false);
  };
 
  const ConfirmModal = () => {
    if (!state) return null;
    return (
      <div
        className={styles.overlay}
        onClick={(e) => e.target === e.currentTarget && handleCancel()}
        style={{ zIndex: 200 }}
      >
        <div className={styles.modal} style={{ maxWidth: 400 }}>
 
          {/* Icon */}
          <div style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: state.danger ? 'rgba(248,113,113,0.1)' : 'rgba(200,241,53,0.08)',
            border: `1px solid ${state.danger ? 'rgba(248,113,113,0.3)' : 'rgba(200,241,53,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            fontSize: '1.2rem',
          }}>
            {state.danger ? '⚠' : '◈'}
          </div>
 
          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            letterSpacing: '2px',
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}>{state.title}</h3>
 
          {/* Message */}
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 24,
          }}>{state.message}</p>
 
          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              autoFocus
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: state.danger
                  ? 'rgba(248,113,113,0.15)'
                  : 'var(--acid)',
                color: state.danger ? 'var(--red)' : 'var(--black)',
                border: state.danger
                  ? '1px solid rgba(248,113,113,0.4)'
                  : 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = state.danger
                  ? 'rgba(248,113,113,0.25)'
                  : 'var(--acid-dim)';
                if (!state.danger) e.currentTarget.style.boxShadow = '0 4px 16px var(--acid-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = state.danger
                  ? 'rgba(248,113,113,0.15)'
                  : 'var(--acid)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {state.label}
            </button>
          </div>
        </div>
      </div>
    );
  };
 
  return { confirm, ConfirmModal };
}