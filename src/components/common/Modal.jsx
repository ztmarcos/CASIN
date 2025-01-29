import React, { useEffect } from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, children, size = 'default' }) => {
  console.log('Modal props:', { isOpen, size });

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content modal-${size}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 