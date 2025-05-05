import { auth } from './firebase';

export const waitForAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve();
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve();
    });
  });
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
  await waitForAuth();

  const token = await auth.currentUser?.getIdToken();
  
  if (!token) {
    throw new Error('User not authenticated');
  }
  
  // Set default headers if not provided
  const headers = options.headers || {};

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
};