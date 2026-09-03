// src/components/Account/ConfirmModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',   // 'default' | 'danger'
  requireText = null,    // e.g., "confirm delete"
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const [value, setValue] = useState('');

  // Lock scroll and manage focus
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      if (requireText) setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.body.style.overflow = prev || '';
      };
    }
  }, [open, requireText]);

  // Close on ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') {
        const canConfirm = requireText
          ? value.trim().toLowerCase() === requireText.trim().toLowerCase()
          : true;
        if (canConfirm && !loading) onConfirm?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, value, requireText, loading, onConfirm, onCancel]);

  // Click outside to close
  const handleOverlayMouseDown = (e) => {
    if (e.target === overlayRef.current) onCancel?.();
  };

  const canConfirm = requireText
    ? value.trim().toLowerCase() === requireText.trim().toLowerCase()
    : true;

  // Reset input when closing
  useEffect(() => {
    if (!open) setValue('');
  }, [open]);

  return !open ? null : (
    <div
      className="cm-overlay"
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cm-title"
    >
      <div className={`cm-dialog ${variant === 'danger' ? 'cm-danger' : ''}`}>
        <div className="cm-head">
          <h4 id="cm-title">{title}</h4>
          <button className="cm-close" aria-label="Close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="cm-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
          {requireText && (
            <div className="cm-require">
              <label htmlFor="cm-input">Type "{requireText}" to confirm</label>
              <input
                id="cm-input"
                ref={inputRef}
                className="cm-input"
                type="text"
                placeholder={requireText}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="cm-actions">
          <button className="cm-btn cm-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`cm-btn cm-primary ${variant === 'danger' ? 'cm-btn-danger' : ''}`}
            onClick={onConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;