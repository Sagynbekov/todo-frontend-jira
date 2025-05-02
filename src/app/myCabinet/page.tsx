"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, storage } from "../lib/firebase";
import { authFetch } from "../lib/auth-utils";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaEdit, FaSave, FaArrowLeft, FaSignOutAlt, FaChartBar, FaTasks, FaClipboardCheck, FaCamera, FaCheck, FaTimes, FaArrowRight, FaEye, FaUsers, FaInfoCircle, FaLock, FaShieldAlt, FaExclamationTriangle, FaTrash, FaUserSlash } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, deleteUser } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import ActivityCalendar from "../../components/ActivityCalendar";

interface UserStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
}

interface Project {
  id: number;
  name: string;
  user_id: string;
  members: string[];
}

export default function MyCabinetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
  });
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showTaskActivity, setShowTaskActivity] = useState(false);
  const [taskActivity, setTaskActivity] = useState<{[date: string]: number}>({});
  const [loadingTaskActivity, setLoadingTaskActivity] = useState(false);
  const [completedTaskActivity, setCompletedTaskActivity] = useState<{[date: string]: number}>({});
  const [showCompletedTaskActivity, setShowCompletedTaskActivity] = useState(false);
  const [loadingCompletedTaskActivity, setLoadingCompletedTaskActivity] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Состояния для смены пароля
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Состояния для удаления аккаунта
  const [isAccountDeleteModalOpen, setIsAccountDeleteModalOpen] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [showDeleteAccountPassword, setShowDeleteAccountPassword] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || "User");
        
        // Make sure we're handling the photo URL correctly
        if (currentUser.photoURL) {
          console.log("Current photo URL:", currentUser.photoURL);
          setProfilePhotoURL(currentUser.photoURL);
        } else {
          setProfilePhotoURL(null);
        }
        
        fetchUserStats();
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserStats = async () => {
    try {
      // Fetch projects
      const projectsResponse = await authFetch("http://localhost:8000/api/projects/");
      if (!projectsResponse.ok) throw new Error(`Error: ${projectsResponse.status}`);
      const projects = await projectsResponse.json();
      
      setProjects(projects);
      
      // Count tasks across all projects
      let taskCount = 0;
      let completedCount = 0;
      
      // For now, just use projects count
      setStats({
        totalProjects: projects.length,
        totalTasks: taskCount,
        completedTasks: completedCount,
      });
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  };

  const fetchProjectDetails = async (projectId: number) => {
    try {
      const response = await authFetch(`http://localhost:8000/api/projects/${projectId}/`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching project details for ID ${projectId}:`, error);
      return null;
    }
  };

  const toggleShowProjects = () => {
    setShowProjects(!showProjects);
    if (!showProjects && projects.length === 0) {
      setLoadingProjects(true);
      fetchUserStats().finally(() => setLoadingProjects(false));
    }
  };

  const goToProject = (projectId: number) => {
    router.push(`/home?projectId=${projectId}`);
  };

  const viewProjectDetails = (projectId: number) => {
    router.push(`/project-details/${projectId}`);
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      setDisplayName(user?.displayName || user?.email?.split('@')[0] || "User");
      setIsEditingName(false);
      return;
    }

    try {
      await updateProfile(user, {
        displayName: displayName.trim()
      });
      
      // Refresh user data
      setUser(auth.currentUser);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating display name:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewURL(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      // Create a FormData object to send the file to the backend
      const formData = new FormData();
      formData.append('profile_photo', selectedFile);
      formData.append('email', user.email || '');
      
      // Send the profile photo to the Django backend
      const response = await fetch(`http://localhost:8000/api/profile-photo/?user_id=${user.uid}`, {
        method: 'PUT',
        body: formData,
        // No Content-Type header with FormData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload profile photo: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get the complete photo URL - make sure it's absolute
      const photoURL = data.profile_photo.startsWith('http') 
        ? data.profile_photo 
        : `http://localhost:8000${data.profile_photo}`;
      
      console.log("Profile photo uploaded successfully, URL:", photoURL);
      
      // Update user profile with the new photo URL in Firebase
      await updateProfile(user, {
        photoURL: photoURL
      });
      
      // Update local state
      setProfilePhotoURL(photoURL);
      setIsChangingPhoto(false);
      setSelectedFile(null);
      setPreviewURL(null);
      
      // Refresh user data
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force a refresh to ensure we get updated data
        await currentUser.reload();
        setUser(auth.currentUser);
      }
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    }
  };

  const cancelPhotoChange = () => {
    setIsChangingPhoto(false);
    setSelectedFile(null);
    setPreviewURL(null);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleBackToHome = () => {
    router.push("/home");
  };

  const fetchTaskActivity = async () => {
    if (!user) return;
    
    setLoadingTaskActivity(true);
    try {
      // Получаем все проекты пользователя
      const projectsResponse = await authFetch("http://localhost:8000/api/projects/");
      if (!projectsResponse.ok) throw new Error(`Error: ${projectsResponse.status}`);
      const projects = await projectsResponse.json();
      
      // Собираем данные по активности из всех проектов
      const activityData: {[date: string]: number} = {};
      
      for (const project of projects) {
        // Получаем все колонки проекта
        const columnsResponse = await authFetch(`http://localhost:8000/api/columns/?project_id=${project.id}`);
        if (!columnsResponse.ok) continue;
        const columns = await columnsResponse.json();
        
        // Получаем задачи из каждой колонки
        for (const column of columns) {
          const tasksResponse = await authFetch(`http://localhost:8000/api/tasks/?column_id=${column.id}`);
          if (!tasksResponse.ok) continue;
          const tasks = await tasksResponse.json();
          
          // Фильтруем задачи, созданные текущим пользователем
          const userTasks = tasks.filter((task: any) => 
            task.creator_email === user.email
          );
          
          // Группируем задачи по дате создания
          userTasks.forEach((task: any) => {
            const date = new Date(task.created_at).toISOString().split('T')[0];
            if (!activityData[date]) {
              activityData[date] = 0;
            }
            activityData[date]++;
          });
        }
      }
      
      setTaskActivity(activityData);
      setStats(prevStats => ({
        ...prevStats,
        totalTasks: Object.values(activityData).reduce((sum, count) => sum + count, 0)
      }));
    } catch (err) {
      console.error("Error fetching task activity:", err);
    } finally {
      setLoadingTaskActivity(false);
    }
  };

  const toggleShowTaskActivity = () => {
    setShowTaskActivity(!showTaskActivity);
    if (!showTaskActivity && Object.keys(taskActivity).length === 0) {
      fetchTaskActivity();
    }
  };

  const fetchCompletedTaskActivity = async () => {
    if (!user) return;
    
    setLoadingCompletedTaskActivity(true);
    try {
      // Получаем все проекты пользователя
      const projectsResponse = await authFetch("http://localhost:8000/api/projects/");
      if (!projectsResponse.ok) throw new Error(`Error: ${projectsResponse.status}`);
      const projects = await projectsResponse.json();
      
      // Собираем данные по активности выполненных задач
      const activityData: {[date: string]: number} = {};
      
      for (const project of projects) {
        // Получаем все колонки проекта
        const columnsResponse = await authFetch(`http://localhost:8000/api/columns/?project_id=${project.id}`);
        if (!columnsResponse.ok) continue;
        const columns = await columnsResponse.json();
        
        // Находим колонку "Завершено" или "Выполнено" или последнюю колонку
        const completedColumn = columns.find((col: any) => 
          /заверш|выполн|done|complet/i.test(col.name)
        ) || columns[columns.length - 1];
        
        if (completedColumn) {
          // Получаем задачи из колонки "Завершено"
          const tasksResponse = await authFetch(`http://localhost:8000/api/tasks/?column_id=${completedColumn.id}`);
          if (!tasksResponse.ok) continue;
          const tasks = await tasksResponse.json();
          
          // Фильтруем задачи, созданные текущим пользователем
          const userTasks = tasks.filter((task: any) => 
            task.creator_email === user.email
          );
          
          // Группируем задачи по дате обновления (когда они были перемещены в колонку "Завершено")
          userTasks.forEach((task: any) => {
            // Используем дату обновления как примерную дату завершения
            const date = new Date(task.updated_at).toISOString().split('T')[0];
            if (!activityData[date]) {
              activityData[date] = 0;
            }
            activityData[date]++;
          });
        }
      }
      
      setCompletedTaskActivity(activityData);
      setStats(prevStats => ({
        ...prevStats,
        completedTasks: Object.values(activityData).reduce((sum, count) => sum + count, 0)
      }));
    } catch (err) {
      console.error("Error fetching completed task activity:", err);
    } finally {
      setLoadingCompletedTaskActivity(false);
    }
  };

  const toggleShowCompletedTaskActivity = () => {
    setShowCompletedTaskActivity(!showCompletedTaskActivity);
    if (!showCompletedTaskActivity && Object.keys(completedTaskActivity).length === 0) {
      fetchCompletedTaskActivity();
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Новые пароли не совпадают");
      return;
    }

    setIsPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordSuccess("Пароль успешно изменен");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setPasswordError("Ошибка при смене пароля: " + errorMessage);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        deleteAccountPassword
      );
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      router.push("/account-deleted");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDeleteAccountError("Ошибка при удалении аккаунта: " + errorMessage);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Модальное окно смены пароля */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaShieldAlt className="text-indigo-600" /> 
              Смена пароля
            </h3>
            
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
                <FaCheck className="flex-shrink-0" />
                <p>{passwordSuccess}</p>
              </div>
            )}
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <FaExclamationTriangle className="flex-shrink-0" />
                <p>{passwordError}</p>
              </div>
            )}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePasswordChange();
            }}>
              <div className="space-y-4">
                {/* Текущий пароль */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Текущий пароль</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      placeholder="Введите текущий пароль"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <FaEye size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Новый пароль */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Новый пароль</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      placeholder="Введите новый пароль"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <FaEye size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Подтверждение нового пароля */}
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Подтверждение пароля</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                      placeholder="Подтвердите новый пароль"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <FaEye size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    {isPasswordLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <FaSave size={14} />
                        Сохранить
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно удаления аккаунта */}
      {isAccountDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FaTrash className="text-red-600" /> 
              Удаление аккаунта
            </h3>
            
            {deleteAccountError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <FaExclamationTriangle className="flex-shrink-0" />
                <p>{deleteAccountError}</p>
              </div>
            )}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleDeleteAccount();
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Пароль</label>
                  <div className="relative">
                    <input
                      type={showDeleteAccountPassword ? "text" : "password"}
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
                      placeholder="Введите пароль для подтверждения"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowDeleteAccountPassword(!showDeleteAccountPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <FaEye size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountDeleteModalOpen(false);
                      setDeleteAccountPassword("");
                      setDeleteAccountError("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isDeletingAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    {isDeletingAccount ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Удаление...
                      </>
                    ) : (
                      <>
                        <FaUserSlash size={14} />
                        Удалить аккаунт
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-700 text-white shadow-md border-b border-gray-600">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBackToHome}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors"
            >
              <FaArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors"
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative">
                {isChangingPhoto ? (
                  <div className="bg-white p-2 rounded-full shadow-lg relative">
                    {previewURL ? (
                      <img 
                        src={previewURL} 
                        alt="Avatar Preview" 
                        className="w-28 h-28 rounded-full object-cover"
                      />
                    ) : (
                      <FaUserCircle size={100} className="text-indigo-600" />
                    )}
                    
                    <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/40">
                      <button
                        onClick={triggerFileInput}
                        className="bg-transparent hover:bg-white/20 p-2 rounded-full transition-colors mb-2"
                      >
                        <FaCamera size={24} className="text-white" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                      />
                      
                      <div className="flex gap-2">
                        {selectedFile && (
                          <button
                            onClick={handleAvatarUpload}
                            className="bg-green-500 hover:bg-green-600 p-1 rounded-full transition-colors"
                          >
                            <FaCheck size={14} className="text-white" />
                          </button>
                        )}
                        <button
                          onClick={cancelPhotoChange}
                          className="bg-red-500 hover:bg-red-600 p-1 rounded-full transition-colors"
                        >
                          <FaTimes size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="bg-white p-2 rounded-full shadow-lg relative cursor-pointer group"
                    onClick={() => setIsChangingPhoto(true)}
                  >
                    {profilePhotoURL ? (
                      <img 
                        src={profilePhotoURL} 
                        alt="User Avatar" 
                        className="w-28 h-28 rounded-full object-cover"
                        onError={(e) => {
                          console.error("Image failed to load:", profilePhotoURL);
                          // Fallback to default icon on error
                          e.currentTarget.style.display = 'none';
                          setProfilePhotoURL(null);
                        }}
                      />
                    ) : (
                      <FaUserCircle size={100} className="text-indigo-600" />
                    )}
                    
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FaCamera size={24} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center md:text-left">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative w-full max-w-xs">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2.5 pl-4 rounded-xl bg-white/20 backdrop-blur-sm text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg transition-all placeholder-white/70"
                        autoFocus
                        placeholder="Enter your name..."
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button 
                          onClick={handleUpdateDisplayName}
                          className="p-1.5 rounded-lg bg-white/25 hover:bg-white/40 text-white transition-colors"
                        >
                          <FaSave size={14} />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setDisplayName(user?.displayName || user?.email?.split('@')[0] || "User");
                        setIsEditingName(false);
                      }}
                      className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <FaEdit size={18} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <FaEnvelope size={16} />
                  <span>{user?.email}</span>
                </div>
                
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <FaCalendarAlt size={16} />
                  <span>Account created: {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Stats */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200 cursor-pointer transition-all hover:shadow-md"
                onClick={toggleShowProjects}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white p-3 rounded-lg">
                    <FaChartBar size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Projects</h3>
                    <p className="text-3xl font-bold text-blue-700">{stats.totalProjects}</p>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200 cursor-pointer transition-all hover:shadow-md"
                onClick={toggleShowTaskActivity}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 text-white p-3 rounded-lg">
                    <FaTasks size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Tasks</h3>
                    <p className="text-3xl font-bold text-purple-700">{stats.totalTasks}</p>
                  </div>
                </div>
              </div>
              
              <div 
                className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200 cursor-pointer transition-all hover:shadow-md"
                onClick={toggleShowCompletedTaskActivity}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 text-white p-3 rounded-lg">
                    <FaClipboardCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Completed Tasks</h3>
                    <p className="text-3xl font-bold text-green-700">{stats.completedTasks}</p>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showProjects && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Projects</h3>
                  {loadingProjects ? (
                    <div className="text-center text-gray-600">Loading projects...</div>
                  ) : (
                    <div className={`space-y-4 ${projects.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                      {projects.map((project) => (
                        <div 
                          key={project.id} 
                          className="p-4 bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
                          onClick={() => viewProjectDetails(project.id)}
                        >
                          <div>
                            <h4 className="font-medium text-gray-700">{project.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <FaUsers size={14} /> 
                              <span>{project.members.length} members</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FaArrowRight size={16} className="text-blue-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showTaskActivity && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Task Activity</h3>
                  {loadingTaskActivity ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading your activity data...</p>
                    </div>
                  ) : Object.keys(taskActivity).length > 0 ? (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-gray-700 font-medium mb-3">Your GitHub-style contribution calendar</h4>
                      <div className="overflow-x-auto">
                        <ActivityCalendar 
                          activityData={taskActivity} 
                          colorMode="purple"
                          title="Tasks created this month" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <FaInfoCircle size={36} className="text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No task activity found. Start creating tasks to see your activity calendar!</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showCompletedTaskActivity && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Completed Task Activity</h3>
                  {loadingCompletedTaskActivity ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Loading your completed tasks data...</p>
                    </div>
                  ) : Object.keys(completedTaskActivity).length > 0 ? (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h4 className="text-gray-700 font-medium mb-3">Your GitHub-style completion calendar</h4>
                      <div className="overflow-x-auto">
                        <ActivityCalendar 
                          activityData={completedTaskActivity} 
                          colorMode="green"
                          title="Tasks completed this month" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <FaInfoCircle size={36} className="text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No completed tasks found for this month. Complete tasks to see your activity calendar!</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Account Settings */}
          <div className="border-t border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Email Address</h3>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.emailVerified 
                    ? "Your email is verified" 
                    : "Your email is not verified. Please check your inbox."}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Security</h3>
                <button 
                  onClick={() => setIsChangingPassword(true)} 
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <FaLock size={14} />
                  Change Password
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Account Management</h3>
                <button 
                  onClick={() => setIsAccountDeleteModalOpen(true)} 
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <FaTrash size={14} />
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}