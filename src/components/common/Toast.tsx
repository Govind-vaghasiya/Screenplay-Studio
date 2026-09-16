// Toast notification component
import { useNotificationStore } from '@/stores/notificationStore';
import { IconX } from '@/components/common/Icons';
import './Toast.css';

export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type}`}
        >
          <div className="toast-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </div>
          <p className="toast-message">{notification.message}</p>
          <button
            className="toast-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Dismiss notification"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
