import React, { useContext } from 'react';
import { PopupContext } from '../../context/PopupContext';
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from 'react-icons/fi';
import './Popup.css';

const iconMap = {
  success: <FiCheckCircle />,
  error: <FiXCircle />,
  info: <FiInfo />,
};

const Popup = () => {
  const { popup, hidePopup, confirmation, hideConfirm } = useContext(PopupContext);

  const handleConfirm = () => {
    confirmation.onConfirm();
    hideConfirm();
  };

  return (
    <>
      {popup.visible && (
        <div className="popup-container">
          <div className={`popup popup--${popup.type} popup--visible`}>
            <div className="popup-icon">{iconMap[popup.type] || <FiInfo />}</div>
            <div className="popup-message">{popup.message}</div>
            <button onClick={hidePopup} className="popup-close-btn">
              <FiX />
            </button>
          </div>
        </div>
      )}
      {confirmation.visible && (
        <div className="popup-overlay">
          <div className="confirmation-popup">
            <p>{confirmation.message}</p>
            <div className="confirmation-actions">
              <button onClick={hideConfirm} className="btn-cancel">Cancel</button>
              <button onClick={handleConfirm} className="btn-confirm">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Popup;
