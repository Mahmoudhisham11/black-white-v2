"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { IoCheckmarkCircle, IoCloseCircle, IoWarning, IoInformationCircle } from "react-icons/io5";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const success = useCallback((message) => showNotification(message, 'success'), [showNotification]);
  const error = useCallback((message) => showNotification(message, 'error'), [showNotification]);
  const warning = useCallback((message) => showNotification(message, 'warning'), [showNotification]);
  const info = useCallback((message) => showNotification(message, 'info'), [showNotification]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, warning, info }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({ notifications, onRemove }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <IoCheckmarkCircle />;
      case 'error':
        return <IoCloseCircle />;
      case 'warning':
        return <IoWarning />;
      default:
        return <IoInformationCircle />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <div
          key={notification.id}
          onClick={() => onRemove(notification.id)}
          style={{
            background: notification.type === 'success' ? '#4caf50' :
                        notification.type === 'error' ? '#f44336' :
                        notification.type === 'warning' ? '#ff9800' : '#2196f3',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            animation: 'slideInLeft 0.3s ease',
            minWidth: '300px'
          }}
        >
          <span style={{ fontSize: '24px' }}>{getIcon(notification.type)}</span>
          <span style={{ flex: 1, fontSize: '16px', fontWeight: 500 }}>
            {notification.message}
          </span>
        </div>
      ))}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}




