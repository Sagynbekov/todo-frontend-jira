"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { auth } from '../../lib/firebase';
import { authFetch } from '../../lib/auth-utils';
import { FaArrowLeft, FaUsers, FaCalendarAlt, FaUserCircle, FaTasks, FaHome, FaUserCog } from 'react-icons/fa';

interface Project {
  id: number;
  name: string;
  user_id: string;
  members: string[];
}

interface Column {
  id: number;
  name: string;
  project: number;
  order: number;
}

interface Task {
  id: number;
  title: string;
  description: string;
  column: number;
  order: number;
  created_at: string;
  updated_at: string;
  creator: string | null;
  creator_email: string | null;
}

interface Member {
  firebase_user_id: string;
  email: string;
  profile_photo: string | null;
}

export default function ProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      if (projectId) {
        fetchProjectDetails(parseInt(projectId));
      }
    });

    return () => unsubscribe();
  }, [projectId, router]);

  const fetchProjectDetails = async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch project details
      const projectResponse = await authFetch(`http://localhost:8000/api/projects/${id}/`);
      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project: ${projectResponse.status}`);
      }
      const projectData = await projectResponse.json();
      setProject(projectData);

      // Fetch columns for this project
      const columnsResponse = await authFetch(`http://localhost:8000/api/columns/?project_id=${id}`);
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        setColumns(columnsData);

        // Fetch tasks for each column
        const allTasks: Task[] = [];
        for (const column of columnsData) {
          const tasksResponse = await authFetch(`http://localhost:8000/api/tasks/?column_id=${column.id}`);
          if (tasksResponse.ok) {
            const columnTasks = await tasksResponse.json();
            allTasks.push(...columnTasks);
          }
        }
        setTasks(allTasks);
      }

      // Fetch members details
      if (projectData.members && projectData.members.length > 0) {
        const memberDetails: Member[] = [];
        for (const email of projectData.members) {
          const userResponse = await authFetch(`http://localhost:8000/api/firebase-users/?email=${email}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.length > 0) {
              memberDetails.push(userData[0]);
            }
          }
        }
        setMembers(memberDetails);
      }
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/home');
  };

  const handleGoToProjectPage = () => {
    router.push(`/home?projectId=${projectId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка информации о проекте...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/home')}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBackToHome}
                className="hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <FaArrowLeft size={18} />
              </button>
              <h1 className="text-2xl font-bold">{project?.name || 'Информация о проекте'}</h1>
            </div>
            
            <button
              onClick={handleGoToProjectPage}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <FaHome size={16} />
              <span>Открыть проект</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {project && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основная информация */}
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                  <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Статистика проекта</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                            <FaUsers size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Участников</p>
                            <p className="text-lg font-semibold">{project.members.length}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                            <FaTasks size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Задач</p>
                            <p className="text-lg font-semibold">{tasks.length}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                            <FaCalendarAlt size={20} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Колонок</p>
                            <p className="text-lg font-semibold">{columns.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Колонки</h3>
                      <div className="space-y-3">
                        {columns.length > 0 ? (
                          columns.map(column => (
                            <div 
                              key={column.id}
                              className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium text-gray-700">{column.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {tasks.filter(t => t.column === column.id).length} задач
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">Колонки не найдены</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Последние задачи */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <h2 className="text-2xl font-bold text-white">Последние задачи</h2>
                </div>
                <div className="p-6">
                  {tasks.length > 0 ? (
                    <div className="space-y-4">
                      {tasks.slice(0, 5).map(task => (
                        <div 
                          key={task.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <h4 className="font-medium text-gray-800 mb-2">{task.title}</h4>
                          {task.description && (
                            <p className="text-gray-600 mb-3">{task.description}</p>
                          )}
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">
                              {columns.find(c => c.id === task.column)?.name || 'Неизвестная колонка'}
                            </span>
                            <span className="text-sm text-gray-500">
                              Обновлено: {formatDate(task.updated_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {tasks.length > 5 && (
                        <div className="text-center mt-4">
                          <p className="text-gray-500">
                            Показано 5 из {tasks.length} задач
                          </p>
                          <button 
                            onClick={handleGoToProjectPage}
                            className="mt-2 text-indigo-600 hover:text-indigo-800"
                          >
                            Открыть все задачи
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">В проекте нет задач</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Участники и инфо */}
            <div className="col-span-1">
              {/* Владелец проекта */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
                  <h2 className="text-2xl font-bold text-white">Владелец проекта</h2>
                </div>
                <div className="p-6">
                  {/* Here we would normally display the project owner info */}
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-full">
                      <FaUserCog size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-medium">ID владельца: {project.user_id}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Участники проекта */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
                  <h2 className="text-2xl font-bold text-white">Участники проекта</h2>
                </div>
                <div className="p-6">
                  {members.length > 0 ? (
                    <div className="space-y-4">
                      {members.map(member => (
                        <div 
                          key={member.firebase_user_id}
                          className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-shrink-0">
                            {member.profile_photo ? (
                              <img 
                                src={member.profile_photo} 
                                alt={`${member.email}'s avatar`}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0xMiAwYzYuNjIzIDAgMTIgNS4zNzcgMTIgMTJzLTUuMzc3IDEyLTEyIDEyLTEyLTUuMzc3LTEyLTEyIDUuMzc3LTEyIDEyLTEyem04LjEyNyAxOS40MWMtLjI4Mi0uNDAxLS43NzItLjY1NC0xLjYyNC0uODUtMy44NDgtLjkwNi00LjAyNy0xLjUwMS00LjAyNy0yLjIyOCAwLS40NzguMzQ2LTEuMzE4IDEuNTc1LTEuOTguMjA0LS4xMTUuNTMyLS4zNCAxLjA0Mi0uNzY2aDEuNDExYy0uMDM0LjIwMi0uMDc2LjQwNS0uMTI5LjYwNWExMi40MyAxMi40MyAwIDAxLS4xNzYuNjA1aC0uNDUxYy4xNzUuMTUuMzUuMjk4LjUyOC40NDMgMS41NDQgMS4yNS45NzIgMS45NzQgMi4xOTcgMi42NjctMS4zNS43OC0yLjgwMSAxLjMxNi00LjMyOCAxLjU3LTEuMTk2LTEuMjc1LTEuOTM3LTIuOTU3LTEuOTM3LTQuODA4IDAtMy44MSAyLjY3Ni02LjkgNi0xLjkzOSAuMTQ1LS40MDguMjIyLS44NDEuMjIyLTEuMjg4LjAwMS0uNDQ3LS4wNzYtLjg4LS4yNzEtMS4yODctMy4wNjktMS4yNTgtNS4yNTItNC4yMDktNS4yNTItNy42OCAwLTQuNTU4IDMuNjk3LTguMjU0IDguMjU0LTguMjU0czguMjUzIDMuNjk2IDguMjUzIDguMjU0YzAgMy43MzEtMi40NyA2Ljg4OC01Ljg2MSA3Ljk1MWExMS45OSAxMS45OSAwIDAxLS4yNzIgMS4yODZjLS4yMjIuNzQ0LS41MTggMS40NC0uODc3IDIuMDcyIDIuNDU4LjU5NSA0LjUwOSAyLjA3MSA0LjUwOSA0LjY0NyAwIC4zNzItLjA1OC43MDUtLjE3MyAxaC0yLjc1NHoiLz48L3N2Zz4=';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <FaUserCircle size={24} className="text-orange-600" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-800 font-medium truncate">{member.email}</p>
                            <p className="text-xs text-gray-500">{member.firebase_user_id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Нет участников проекта</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}