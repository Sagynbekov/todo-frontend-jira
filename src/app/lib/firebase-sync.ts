import { auth } from "./firebase";

/**
 * При каждом успешном логине в Firebase вызывает 
 * создание пользователя в вашем Django-бэкенде или обновление существующего.
 */
export async function syncFirebaseUserToBackend(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("syncFirebaseUser: нет залогиненного пользователя");
    return;
  }

  // принудительно обновляем токен, чтобы получить свежий
  const token = await user.getIdToken(true);

  try {
    // Сначала проверяем, существует ли пользователь
    const checkResponse = await fetch(
      `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(user.email || '')}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (checkResponse.ok) {
      const users = await checkResponse.json();
      
      // Пользователь уже существует, не нужно создавать нового
      if (users.length > 0) {
        console.log("Пользователь уже существует в бэкенде, синхронизация не требуется");
        return;
      }
    }

    // Если пользователь не найден, создаем нового
    const createResponse = await fetch("http://localhost:8000/api/firebase-users/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        firebase_user_id: user.uid,
        email: user.email,
      }),
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      console.error("Ошибка синхронизации FirebaseUser:", createResponse.status, text);
      throw new Error(`Sync failed: ${createResponse.status}`);
    }
    
    console.log("Пользователь успешно синхронизирован с бэкендом");
  } catch (error) {
    console.error("Ошибка при синхронизации пользователя:", error);
    // Не выбрасываем ошибку, чтобы не блокировать пользовательский опыт
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
