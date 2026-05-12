import { db, collection, addDoc, serverTimestamp } from './firebase';
import { Notification } from '../types';

export const sendNotification = async (
  userId: string,
  companyId: string,
  title: string,
  message: string,
  type: 'task' | 'message' | 'goal',
  relatedId?: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      companyId,
      title,
      message,
      type,
      read: false,
      relatedId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
