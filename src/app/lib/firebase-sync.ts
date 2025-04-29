import { auth } from "./firebase";

/**
 * При каждом успешном логине в Firebase вызывает 
 * создание пользователя в вашем Django-бэкенде.
 */
export async function syncFirebaseUserToBackend(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("syncFirebaseUser: нет залогиненного пользователя");
    return;
  }

  // принудительно обновляем токен, чтобы получить свежий
  const token = await user.getIdToken(true);

  const response = await fetch("http://localhost:8000/api/firebase-users/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // если бэкенд проверяет JWT, передаём токен
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      firebase_user_id: user.uid,
      email: user.email,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Ошибка синхронизации FirebaseUser:", response.status, text);
    throw new Error(`Sync failed: ${response.status}`);
  }
}


// src/lib/firebaseUsers.ts
export async function findUserByEmail(email: string) {
    const res = await fetch(
      `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(email)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { firebase_user_id: string; email: string }[];
  }
  