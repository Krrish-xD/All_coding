import React, { createContext, useState, useCallback, useRef } from 'react';

export const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = useState({
    message: '',
    type: 'info', // 'info', 'success', 'error'
    visible: false,
  });

  const [confirmation, setConfirmation] = useState({
    message: '',
    visible: false,
    onConfirm: () => {},
  });

  const timerRef = useRef(null);

  const hidePopup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPopup((prev) => ({ ...prev, visible: false }));
  }, []);

  const showPopup = useCallback((message, type = 'error', duration = 5000) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setPopup({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      hidePopup();
    }, duration);
  }, [hidePopup]);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmation({ message, visible: true, onConfirm });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmation({ message: '', visible: false, onConfirm: () => {} });
  }, []);

  return (
    <PopupContext.Provider value={{ popup, showPopup, hidePopup, confirmation, showConfirm, hideConfirm }}>
      {children}
    </PopupContext.Provider>
  );
};