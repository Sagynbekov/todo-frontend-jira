// components/UserAvatar.tsx
"use client";

import React, { useState, useEffect } from "react";
import { auth } from "../app/lib/firebase";

// Для цвета фона по email (фолбэк)
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
  email: string;
  currentPhotoURL: string | null;
  size?: 'sm' | 'md' | 'lg';
  showIndicator?: boolean;
  isOwner?: boolean;
}

export const UserAvatar: React.FC<Props> = ({ 
  email, 
  currentPhotoURL,
  size = 'md',
  showIndicator = false,
  isOwner = false
}) => {
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isCurrentUser = auth.currentUser?.email === email;

  // Размеры аватара
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm"
  };

  // Основная логика загрузки аватара
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  
    // 1) Если это текущий юзер — сразу ставим его avatar из пропса
    if (isCurrentUser) {
      setProfilePhoto(currentPhotoURL);
      setIsLoading(false);
      return;
    }
  
    // 2) Если нет email — выходим, будет фолбэк
    if (!email) {
      setProfilePhoto(null);
      setIsLoading(false);
      return;
    }
  
    // 3) Иначе — запрашиваем фото пользователя по email с бэка
    const fetchUserPhoto = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(email)}`
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
  }, [email, isCurrentUser, currentPhotoURL]);
  
  // Показываем индикатор загрузки
  if (isLoading) {
    return <div className={`${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse`} />;
  }

  // Показываем фотографию, если она доступна и не было ошибок
  if (profilePhoto && !hasError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white ring-2 ring-white shadow-md relative`}>
        <img
          src={profilePhoto}
          alt={`Аватар ${email || 'пользователя'}`}
          className="w-full h-full object-cover"
          onError={() => {
            setHasError(true);
            setProfilePhoto(null);
          }}
        />
        {isOwner && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" title="Project Owner">
            <span className="text-white text-[8px]">★</span>
          </div>
        )}
      </div>
    );
  }

  // Фолбэк - цветной круг с инициалами
  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 border-white ring-2 ring-white shadow-md flex items-center justify-center relative ${showIndicator ? 'transition-transform hover:scale-110' : ''}`}
      style={{ backgroundColor: stringToColor(email || "") }}
    >
      <span className="text-white font-semibold">{getInitials(email)}</span>
      {isOwner && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" title="Project Owner">
          <span className="text-white text-[8px]">★</span>
        </div>
      )}
    </div>
  );
};