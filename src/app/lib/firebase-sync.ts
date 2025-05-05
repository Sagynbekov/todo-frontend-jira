import { auth } from "./firebase";
import { API_URL } from "./api-config";

/**
 * При каждом успешном логине в Firebase вызывает 
 * создание пользователя в вашем Django-бэкенде или обновление существующего.
 */
export const syncFirebaseUserToBackend = async () => {
  try {
    // Wait for Firebase auth to initialize and get the current user
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in");
      return null;
    }

    // Get the ID token from Firebase
    const token = await user.getIdToken();

    // Send the ID token to your backend
    const response = await fetch(`${API_URL}/sync-user/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        // Add any additional user info you want to sync here
        // These fields should match what your backend expects
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error syncing user to backend:", error);
    throw error;
  }
};


// src/lib/firebaseUsers.ts
export async function findUserByEmail(email: string) {
    const res = await fetch(
      `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { firebase_user_id: string; email: string }[];
  }
