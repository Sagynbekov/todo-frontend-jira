// components/TaskCreatorAvatar.tsx
"use client";

import React, { useState, useEffect } from "react";
import { auth } from "../app/lib/firebase";

// Для цвета фона по email
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#FF5630','#FF8B00','#FFAB00','#36B37E','#00B8D9','#6554C0','#6B778C','#0052CC','#8777D9','#00C7E6','#4C9AFF','#172B4D'];
  return colors[Math.abs(hash) % colors.length];
};

// Получение инициалов из email
const getInitials = (email: string) => {
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
};

interface Props {
  creatorEmail?: string;
  currentPhotoURL: string | null;
}

export const TaskCreatorAvatar: React.FC<Props> = ({ creatorEmail, currentPhotoURL }) => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isCurrentUser = auth.currentUser?.email === creatorEmail;

  // Основная логика загрузки аватара
  useEffect(() => {
    console.log("Avatar:", { creatorEmail, currentPhotoURL, isCurrentUser });
  
    setIsLoading(true);
    setHasError(false);
  
    // 1) Если это текущий юзер — сразу ставим его avatar из пропса
    if (isCurrentUser) {
      setProfilePhoto(currentPhotoURL);
      setIsLoading(false);
      return;
    }
  
    // 2) Если нет email автора — выходим, будет фолбэк
    if (!creatorEmail) {
      setProfilePhoto(null);
      setIsLoading(false);
      return;
    }
  
    // 3) Иначе — запрашиваем фото автора по email с бэка
    const fetchUserPhoto = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(creatorEmail)}`
        );
        if (!res.ok) throw new Error(res.statusText);
        const users = await res.json();
        const photoUrl = users[0]?.profile_photo;
        if (photoUrl) {
          setProfilePhoto(
            photoUrl.startsWith("http")
              ? photoUrl
              : `http://localhost:8000${photoUrl}`
          );
        } else {
          setProfilePhoto(null);
        }
      } catch (error) {
        console.error("Ошибка при загрузке аватара:", error);
        setHasError(true);
        setProfilePhoto(null);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUserPhoto();
  }, [creatorEmail, isCurrentUser, currentPhotoURL]);
  
  

  // Показываем индикатор загрузки
  if (isLoading) {
    return <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse" />;
  }

  // Показываем фотографию, если она доступна и не было ошибок
  if (profilePhoto && !hasError) {
    return (
      <div className="h-7 w-7 rounded-full overflow-hidden shadow-md border border-white">
        <img
          src={profilePhoto}
          alt={`Аватар ${creatorEmail || 'пользователя'}`}
          className="w-full h-full object-cover"
          onError={() => {
            setHasError(true);
            setProfilePhoto(null);
          }}
        />
      </div>
    );
  }

  // Фолбэк - цветной круг с инициалами
  const initials = creatorEmail
    ? getInitials(creatorEmail)
    : getInitials(auth.currentUser?.email || "");

  return (
    <div
      className="h-7 w-7 rounded-full flex items-center justify-center shadow-md border border-white"
      style={{ backgroundColor: stringToColor(creatorEmail || "") }}
    >
      <span className="text-white text-xs font-semibold">{initials}</span>
    </div>
  );
};
