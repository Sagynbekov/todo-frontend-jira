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
    setIsLoading(true);
    setHasError(false);
    
    // Первый приоритет - если это текущий пользователь и у него есть фото
    if (isCurrentUser && auth.currentUser?.photoURL) {
      setProfilePhoto(auth.currentUser.photoURL);
      setIsLoading(false);
      return;
    }
    
    // Второй приоритет - фото из props (если передано)
    if (currentPhotoURL) {
      setProfilePhoto(currentPhotoURL);
      setIsLoading(false);
      return;
    }

    if (!creatorEmail) {
      setIsLoading(false);
      return;
    }

    // Третий приоритет - запрос к API для получения фото
    const fetchUserPhoto = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(creatorEmail)}`
        );
        
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        
        const users = await res.json();
        
        if (users.length === 0) {
          setProfilePhoto(null);
          setIsLoading(false);
          return;
        }
        
        const photoUrl = users[0]?.profile_photo;
        
        if (!photoUrl) {
          setProfilePhoto(null);
        } else {
          // Убедимся, что URL полный
          const fullUrl = photoUrl.startsWith("http") ? photoUrl : `http://localhost:8000${photoUrl}`;
          setProfilePhoto(fullUrl);
        }
      } catch (error) {
        console.error(`Ошибка при загрузке аватара:`, error);
        setProfilePhoto(null);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPhoto();
  }, [creatorEmail, currentPhotoURL, isCurrentUser]);

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
