export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationMessage {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
}

type Listener = (notification: NotificationMessage) => void;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

class NotificationBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(notification: NotificationMessage) {
    for (const listener of this.listeners) {
      listener({ ...notification, id: createId() });
    }
  }
}

export const notificationBus = new NotificationBus();
