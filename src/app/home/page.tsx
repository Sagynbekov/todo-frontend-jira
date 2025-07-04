// home page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  FaCog,
  FaUserCircle,
  FaEllipsisH,
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaSignOutAlt,
  FaPlus,
  FaTimes,
  FaSearch,
  FaUserMinus,
  FaCalendarAlt,
  FaFilter,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { DragDropContext, Droppable, Draggable, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from "react-beautiful-dnd";
import { authFetch, waitForAuth } from "../lib/auth-utils";
import { auth } from "../lib/firebase";
import { syncFirebaseUserToBackend } from "../lib/firebase-sync";
import { useRouter } from "next/navigation";
import { TaskCreatorAvatar } from '../../components/TaskCreatorAvatar';
import { UserAvatar } from '../../components/UserAvatar';

// Generate consistent color based on string (email)
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Choose from a set of vibrant colors good for avatars
  const colors = [
    '#FF5630', // Red
    '#FF8B00', // Orange
    '#FFAB00', // Yellow
    '#36B37E', // Green
    '#00B8D9', // Blue
    '#6554C0', // Purple
    '#6B778C', // Gray
    '#0052CC', // Navy
    '#8777D9', // Violet
    '#00C7E6', // Aqua
    '#4C9AFF', // Light blue
    '#172B4D', // Dark blue
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from email
const getInitials = (email: string) => {
  if (!email) return '?';
  return email.charAt(0).toUpperCase();
};

type Project = {
  id: number;
  name: string;
  user_id: string;
  members: string[];    // ← добавь это
};

type Column = {
  id: number;
  name: string;
  project: number;
  order: number;
};

// Update the Task type to include deadline
type Task = {
  id: number;
  title: string;
  description: string;
  column: number;
  order: number;
  created_at: string;
  updated_at: string;
  creator_id?: string;
  creator_email?: string;
  completed?: boolean;  // Field for tracking completion status
  completed_by?: number | null; // ID of the user who completed the task
  completed_by_email?: string | null; // Email of the user who completed the task
  deadline?: string | null; // New field for task deadline
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const router = useRouter();
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  
  // User management state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSearchEmail, setUserSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{email: string, name: string, id: string} | null>(null);
  const [addedUsers, setAddedUsers] = useState<{email: string, name: string, id: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Columns state
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  
  // Tasks state
  const [tasks, setTasks] = useState<{ [key: number]: Task[] }>({});
  const [addingTaskToColumn, setAddingTaskToColumn] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Date filtering state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // Add new state for deadline edit
  const [newDeadline, setNewDeadline] = useState<string>("");
  const [isDeadlineOpen, setIsDeadlineOpen] = useState(false);

  // Add new status filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(u => {
      setCurrentPhotoURL(u?.photoURL || null);
    });
    return () => unsubscribe();
  }, []);


  // // Check if user is logged in
  // useEffect(() => {
  //   const unsubscribe = auth.onAuthStateChanged((user) => {
  //     if (!user) {
  //       router.push("/login");
  //     } else {
  //       fetchProjects();
  //     }
  //   });
  //   return () => unsubscribe();
  // }, [router]);


  // Check if user is logged in and sync with backend
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
      } else {
        try {
          // Синхронизируем текущего Firebase-пользователя с бэкендом
          await syncFirebaseUserToBackend();
        } catch (e) {
          console.error("Sync error:", e);
        }
        // Только после успешной (или неудачной) синхронизации загружаем проекты
        fetchProjects();
      }
    });

    return () => unsubscribe();
  }, [router]);


  // Fetch columns when selected project changes
  useEffect(() => {
    if (selectedProject) {
      fetchColumns(selectedProject.id);
    } else {
      setColumns([]);
      setTasks({});
    }
  }, [selectedProject]);

  // Fetch tasks when columns change
  useEffect(() => {
    if (columns.length > 0) {
      Promise.all(columns.map(col => fetchTasks(col.id)));
    } else {
      setTasks({});
    }
  }, [columns]);

  const fetchProjects = async () => {
    try {
      await waitForAuth();
      if (!auth.currentUser) {
        router.push("/login");
        return;
      }
      setIsLoading(true);
      const response = await authFetch("http://localhost:8000/api/projects/");
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColumns = async (projectId: number) => {
    if (!projectId) return;
    
    try {
      setIsLoadingColumns(true);
      const response = await authFetch(
        `http://localhost:8000/api/columns/?project_id=${projectId}`
      );
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const data = await response.json();
      setColumns(data);
      
      // If no columns exist for this project, create a default "Tasks" column
      // if (data.length === 0) {
      //   await handleAddColumn("Tasks", projectId);
      // }
    } catch (err) {
      console.error("Error loading columns:", err);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const fetchTasks = async (columnId: number) => {
    try {
      const response = await authFetch(
        `http://localhost:8000/api/tasks/?column_id=${columnId}`
      );
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const data: Task[] = await response.json();
      setTasks(prev => ({
        ...prev,
        [columnId]: data
      }));
    } catch (err) {
      console.error(`Error loading tasks for column ${columnId}:`, err);
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

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await authFetch("http://localhost:8000/api/projects/", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName }),
      });
      if (res.ok) {
        const project: Project = await res.json();
        setProjects((prev) => [...prev, project]);
        setSelectedProject(project); // Select the newly created project
        setNewProjectName("");
        setShowInput(false);
      } else {
        console.error("Failed to save project", await res.text());
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/projects/${id}/`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (selectedProject?.id === id) {
          // If we're deleting the currently selected project, select another one
          const remainingProjects = projects.filter(p => p.id !== id);
          setSelectedProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
        }
      }
      setActiveDropdown(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleEditProject = async (id: number) => {
    if (!editingProjectName.trim()) return;
    try {
      console.log(`Editing project ${id} with name: ${editingProjectName}`);
      console.log(`Current user: ${auth.currentUser?.uid}`);

      const res = await authFetch(
        `http://localhost:8000/api/projects/${id}/`,
        {
          method: "PUT",
          body: JSON.stringify({ name: editingProjectName }),
        }
      );

      if (res.ok) {
        const updated: Project = await res.json();
        console.log("Update successful:", updated);
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );
        if (selectedProject?.id === id) setSelectedProject(updated);
      } else {
        const errorText = await res.text();
        console.error(`Update failed for project ${id}: ${errorText}`);
        console.error(`Response status: ${res.status}`);
        fetchProjects();
      }
    } catch (err) {
      console.error("Update error", err);
      fetchProjects();
    } finally {
      setEditingProjectId(null);
      setEditingProjectName("");
    }
  };

  const handleAddColumn = async (projectId?: number) => {
    if (!selectedProject && !projectId) return;
    
    if (!newColumnName.trim()) {
      setIsAddingColumn(false);
      return;
    }
    
    try {
      const targetProjectId = projectId || selectedProject!.id;
      
      // Get the highest order value to place new column at the end
      const highestOrder = columns.length > 0 
        ? Math.max(...columns.map(col => col.order)) 
        : -1;
        
      const res = await authFetch("http://localhost:8000/api/columns/", {
        method: "POST",
        body: JSON.stringify({ 
          name: newColumnName.trim(),
          project: targetProjectId,
          order: highestOrder + 1
        }),
      });
      
      if (res.ok) {
        const newColumn: Column = await res.json();
        setColumns(prev => [...prev, newColumn]);
        setNewColumnName("");
        setIsAddingColumn(false);
      } else {
        console.error("Failed to create column", await res.text());
      }
    } catch (err) {
      console.error("Network error creating column:", err);
    }
  };

  const handleDeleteColumn = async (columnId: number) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/columns/${columnId}/`,
        { method: "DELETE" }
      );
      
      if (res.ok) {
        setColumns(prev => prev.filter(col => col.id !== columnId));
        // Also remove tasks associated with this column
        setTasks(prev => {
          const newTasks = {...prev};
          delete newTasks[columnId];
          return newTasks;
        });
      } else {
        console.error("Failed to delete column", await res.text());
      }
    } catch (err) {
      console.error("Network error deleting column:", err);
    }
  };


  const handleEditColumn = async (columnId: number) => {
    if (!editingColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    
    try {
      const res = await authFetch(
        `http://localhost:8000/api/columns/${columnId}/`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editingColumnName.trim(),
            project: columns.find(col => col.id === columnId)?.project,
            order: columns.find(col => col.id === columnId)?.order
          }),
        }
      );
      
      if (res.ok) {
        const updatedColumn: Column = await res.json();
        setColumns(prev => 
          prev.map(col => col.id === columnId ? updatedColumn : col)
        );
      } else {
        console.error("Failed to update column", await res.text());
      }
    } catch (err) {
      console.error("Network error updating column:", err);
    } finally {
      setEditingColumnId(null);
      setEditingColumnName("");
    }
  };

  const handleAddTask = async (columnId: number) => {
    if (!newTaskTitle.trim()) {
      setAddingTaskToColumn(null);
      return;
    }
    
    try {
      // Find the highest order in the column
      const columnTasks = tasks[columnId] || [];
      const highestOrder = columnTasks.length > 0
        ? Math.max(...columnTasks.map(task => task.order))
        : -1;
        
      const res = await authFetch("http://localhost:8000/api/tasks/", {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          column: columnId,
          order: highestOrder + 1,
          description: "",
          creator_id: auth.currentUser?.uid,
          creator_email: auth.currentUser?.email
        }),
      });
      
      if (res.ok) {
        const newTask: Task = await res.json();
        setTasks(prev => ({
          ...prev,
          [columnId]: [...(prev[columnId] || []), newTask]
        }));
        setNewTaskTitle("");
      } else {
        console.error("Failed to create task", await res.text());
      }
    } catch (err) {
      console.error("Network error creating task:", err);
    } finally {
      setAddingTaskToColumn(null);
    }
  };

  const handleDeleteTask = async (taskId: number, columnId: number) => {
    try {
      const res = await authFetch(
        `http://localhost:8000/api/tasks/${taskId}/`,
        { method: "DELETE" }
      );
      
      if (res.ok) {
        setTasks(prev => ({
          ...prev,
          [columnId]: prev[columnId].filter(task => task.id !== taskId)
        }));
      } else {
        console.error("Failed to delete task", await res.text());
      }
    } catch (err) {
      console.error("Network error deleting task:", err);
    }
  };

  const handleUpdateTask = async (task: Task, newData: Partial<Task>) => {
    try {
      console.log(`Updating task ${task.id} with data:`, newData);
      
      // If marking as completed, include the current user's ID
      let requestBody: any = {
        ...task,
        ...newData
      };
      
      // If marking as completed, add user_id for the backend to know who completed it
      if (newData.completed === true && auth.currentUser) {
        requestBody.user_id = auth.currentUser.uid;
      }
      
      const res = await authFetch(
        `http://localhost:8000/api/tasks/${task.id}/`,
        {
          method: "PUT",
          body: JSON.stringify(requestBody)
        }
      );
      
      if (res.ok) {
        const updatedTask: Task = await res.json();
        console.log("Task updated successfully:", updatedTask);
        
        setTasks(prev => ({
          ...prev,
          [task.column]: prev[task.column].map(t => 
            t.id === task.id ? updatedTask : t
          )
        }));
        
        // Update selected task if we're currently viewing it
        if (selectedTask?.id === task.id) {
          setSelectedTask(updatedTask);
        }
        
        return updatedTask; // Return the updated task for chaining
      } else {
        const errorText = await res.text();
        console.error(`Failed to update task (${res.status}):`, errorText);
        throw new Error(`Failed to update task: ${errorText}`);
      }
    } catch (err) {
      console.error("Network error updating task:", err);
      throw err; // Re-throw to allow handling by the caller
    }
  };

  const handleSearchUser = async () => {
    if (!userSearchEmail.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/firebase-users/?email=${encodeURIComponent(userSearchEmail.trim())}`
      );      
      if (!res.ok) throw new Error(await res.text());
      const users = await res.json();
      setSearchResult(users.length ? users[0] : null);
    } catch (e) {
      console.error("Search error:", e);
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleInviteUser = async () => {
    if (!searchResult || !selectedProject) return;
    // Собираем новый массив email’ов:
    const newMembers = [
      ...(selectedProject.members || []),
      searchResult.email
    ];
    try {
      const res = await authFetch(
        `http://localhost:8000/api/projects/${selectedProject.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ members: newMembers }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      // Обновляем стейт
      setProjects(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      );
      setSelectedProject(updated);
      // Закрываем модалку и сбрасываем поиск
      setShowUserModal(false);
      setUserSearchEmail("");
      setSearchResult(null);
    } catch (e) {
      console.error("Invite error:", e);
    }
  };

  const handleRemoveUser = async (emailToRemove: string) => {
    if (!selectedProject) return;
    
    // Filter out the user to remove
    const newMembers = selectedProject.members.filter(email => email !== emailToRemove);
    
    try {
      const res = await authFetch(
        `http://localhost:8000/api/projects/${selectedProject.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify({ members: newMembers }),
        }
      );
      
      if (!res.ok) throw new Error(await res.text());
      
      const updated = await res.json();
      
      // Update state
      setProjects(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      );
      setSelectedProject(updated);
      
    } catch (e) {
      console.error("Error removing user:", e);
    }
  };

  // Add this state for task title editing
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");

  // Function to filter tasks based on search query, date range, status and deadline
  const getFilteredTasks = (columnId: number): Task[] => {
    if (!tasks[columnId]) {
      return [];
    }

    return tasks[columnId].filter(task => {
      // Text filter
      const matchesText = !searchQuery.trim() || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      // Date filter
      let matchesDate = true;
      if (isDateFilterActive) {
        const taskDate = new Date(task.created_at);
        const startFilterDate = startDate ? new Date(startDate) : null;
        const endFilterDate = endDate ? new Date(endDate) : null;
        
        // If we have a start date filter and the task is before it
        if (startFilterDate && taskDate < startFilterDate) {
          matchesDate = false;
        }
        
        // If we have an end date filter and the task is after it
        // Set end date to end of day
        if (endFilterDate) {
          endFilterDate.setHours(23, 59, 59, 999);
          if (taskDate > endFilterDate) {
            matchesDate = false;
          }
        }
      }
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && !task.completed) {
          matchesStatus = false;
        }
        if (statusFilter === 'incomplete' && task.completed) {
          matchesStatus = false;
        }
      }
      
      // Deadline filter
      let matchesDeadline = true;
      if (deadlineFilter !== 'all') {
        const status = getDeadlineStatus(task);
        
        if (deadlineFilter === 'overdue' && status !== 'overdue') {
          matchesDeadline = false;
        }
        if (deadlineFilter === 'upcoming' && (status !== 'upcoming' || task.completed)) {
          matchesDeadline = false;
        }
      }
      
      return matchesText && matchesDate && matchesStatus && matchesDeadline;
    });
  };

  // Function to check if any tasks match the filters
  const hasMatchingTasks = (): boolean => {
    if (!searchQuery.trim() && !isDateFilterActive && statusFilter === 'all' && deadlineFilter === 'all') return true;
    
    return Object.keys(tasks).some(columnId => {
      const columnTasks = tasks[parseInt(columnId)] || [];
      
      return columnTasks.some(task => {
        // Text match check
        const matchesText = !searchQuery.trim() || 
          task.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

        // Date match check
        let matchesDate = true;
        if (isDateFilterActive) {
          const taskDate = new Date(task.created_at);
          const startFilterDate = startDate ? new Date(startDate) : null;
          const endFilterDate = endDate ? new Date(endDate) : null;
          
          if (startFilterDate && taskDate < startFilterDate) {
            matchesDate = false;
          }
          
          if (endFilterDate) {
            endFilterDate.setHours(23, 59, 59, 999);
            if (taskDate > endFilterDate) {
              matchesDate = false;
            }
          }
        }
        
        // Status filter
        let matchesStatus = true;
        if (statusFilter !== 'all') {
          if (statusFilter === 'completed' && !task.completed) {
            matchesStatus = false;
          }
          if (statusFilter === 'incomplete' && task.completed) {
            matchesStatus = false;
          }
        }
        
        // Deadline filter
        let matchesDeadline = true;
        if (deadlineFilter !== 'all') {
          const status = getDeadlineStatus(task);
          
          if (deadlineFilter === 'overdue' && status !== 'overdue') {
            matchesDeadline = false;
          }
          if (deadlineFilter === 'upcoming' && (status !== 'upcoming' || task.completed)) {
            matchesDeadline = false;
          }
        }
        
        return matchesText && matchesDate && matchesStatus && matchesDeadline;
      });
    });
  };

  // Update filter state when date filters change
  useEffect(() => {
    setIsDateFilterActive(!!(startDate || endDate));
  }, [startDate, endDate]);

  // Function to clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setIsDateFilterActive(false);
    setShowDateFilter(false);
    setStatusFilter('all');
    setDeadlineFilter('all');
    setShowStatusFilter(false);
  };

  // Function to clear just the date filter
  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setIsDateFilterActive(false);
  };

  // Function to clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Функция для обработки окончания перетаскивания
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    
    // Выход, если нет места назначения (перетаскивание отменено пользователем)
    if (!destination) return;
    
    // Выход, если позиция не изменилась
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;
    
    // Получаем ID задачи и ID колонок
    const taskId = parseInt(draggableId.split('-')[1]);
    const sourceColumnId = parseInt(source.droppableId.split('-')[1]);
    const destinationColumnId = parseInt(destination.droppableId.split('-')[1]);
    const task = tasks[sourceColumnId]?.find(t => t.id === taskId);
    
    if (!task) {
      console.error("Task not found:", taskId);
      return;
    }
    
    // Создаем оптимистичное обновление интерфейса
    // 1. Удаляем задачу из исходной колонки
    const sourceTasksCopy = [...(tasks[sourceColumnId] || [])];
    const [removedTask] = sourceTasksCopy.splice(source.index, 1);
    
    // 2. Добавляем задачу в колонку назначения
    const destinationTasksCopy = [...(tasks[destinationColumnId] || [])];
    destinationTasksCopy.splice(destination.index, 0, {
      ...removedTask,
      column: destinationColumnId  // Обновляем ID колонки в задаче
    });
    
    // 3. Обновляем локальное состояние (оптимистично)
    setTasks({
      ...tasks,
      [sourceColumnId]: sourceTasksCopy,
      [destinationColumnId]: destinationTasksCopy
    });
    
    try {
      // Обновляем позицию задачи на сервере
      const updatedTaskData = {
        ...task,
        column: destinationColumnId,
        order: destination.index  // Новый порядок в колонке
      };
      
      // Вызов API для обновления задачи
      const response = await authFetch(
        `http://localhost:8000/api/tasks/${taskId}/`,
        {
          method: "PUT",
          body: JSON.stringify(updatedTaskData)
        }
      );
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      // Получаем обновленную задачу с сервера
      const updatedTask: Task = await response.json();
      
      // Если нужно, можно обновить локальное состояние с данными с сервера
      // (но мы уже сделали оптимистичное обновление)
    } catch (error) {
      console.error("Error updating task position:", error);
      
      // В случае ошибки, восстанавливаем исходное состояние
      // Можно повторно загрузить все задачи или восстановить из кэша
      if (sourceColumnId === destinationColumnId) {
        fetchTasks(sourceColumnId);
      } else {
        fetchTasks(sourceColumnId);
        fetchTasks(destinationColumnId);
      }
    }
  };

  // Function to check if a task is overdue (deadline is in the past)
  const isTaskOverdue = (task: Task): boolean => {
    if (!task.deadline) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for fair comparison
    
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    
    return deadline < today;
  };
  
  // New function to determine deadline status for display
  const getDeadlineStatus = (task: Task): 'overdue' | 'met' | 'upcoming' => {
    if (!task.deadline) return 'upcoming';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    
    const isPastDeadline = deadline < today;
    
    if (task.completed) {
      // If completed, check if it was completed before or after deadline
      return isPastDeadline ? 'overdue' : 'met';
    } else {
      // If not completed, then it's either overdue or upcoming
      return isPastDeadline ? 'overdue' : 'upcoming';
    }
  };
  
  // Helper function to get deadline badge color based on status
  const getDeadlineBadgeStyle = (task: Task) => {
    const status = getDeadlineStatus(task);
    
    switch(status) {
      case 'overdue':
        return 'bg-red-100 text-red-700'; // Red for overdue
      case 'met':
        return 'bg-green-100 text-green-700'; // Green for meeting deadline
      case 'upcoming':
      default:
        return 'bg-orange-100 text-orange-700'; // Orange for upcoming
    }
  };

  // Fix the deadline update function
  const handleUpdateDeadline = async () => {
    if (!selectedTask) return;
    
    try {
      console.log(`Setting deadline to: ${newDeadline || 'null'}`);
      
      // Use the same update task method to ensure consistency
      await handleUpdateTask(selectedTask, { 
        deadline: newDeadline || null 
      });
      
      setIsDeadlineOpen(false);
    } catch (err) {
      console.error('Error updating deadline:', err);
      alert('Failed to update deadline. Please try again.');
    }
  };


  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex justify-end items-center bg-gray-700 text-white p-4 shadow-md border-b border-gray-600">
        <button 
          onClick={() => router.push("/myCabinet")}
          className="flex items-center gap-2 ml-6 hover:text-gray-400"
        >
          <FaUserCircle size={20} />
          <span>My Cabinet</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 ml-6 hover:text-gray-400"
        >
          <FaSignOutAlt size={20} />
          <span>Logout</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 text-white p-4 shadow-lg border-r border-gray-600 flex-shrink-0">
          <h2 className="text-xl font-bold mb-4">Projects</h2>

          {isLoading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <ul>
              {projects.map((project) => (
                <li
                  key={project.id}
                  className={`mb-2 p-2 rounded hover:bg-gray-600 cursor-pointer flex justify-between items-center ${
                    selectedProject?.id === project.id ? "bg-gray-600" : ""
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) =>
                        setEditingProjectName(e.target.value)
                      }
                      onBlur={() => handleEditProject(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleEditProject(project.id);
                        if (e.key === "Escape") {
                          setEditingProjectId(null);
                          setEditingProjectName("");
                        }
                      }}
                      className="w-full p-1 text-sm rounded border border-gray-300 bg-gray-700 text-white"
                      autoFocus
                    />
                  ) : (
                    <span>{project.name}</span>
                  )}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown((prev) =>
                          prev === project.id ? null : project.id
                        );
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <FaEllipsisH />
                    </button>
                    {activeDropdown === project.id && (
                      <div className="absolute right-[-145px] mt-2 w-32 bg-gray-400 text-black shadow-lg rounded">
                        <button
                          onClick={() => {
                            setEditingProjectId(project.id);
                            setEditingProjectName(project.name);
                            setActiveDropdown(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-500"
                        >
                          <FaEdit />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteProject(project.id)
                          }
                          className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-500"
                        >
                          <FaTrash />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Add New Project */}
          <button
            onClick={() => setShowInput((v) => !v)}
            className="w-full mt-4 bg-gray-700 text-white font-semibold py-2 rounded hover:bg-gray-600"
          >
            + Add New Project
          </button>

          {showInput && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 text-gray-200 placeholder-gray-500"
              />
              <button
                onClick={handleAddProject}
                className="w-full mt-2 bg-gray-700 text-white font-semibold py-2 rounded hover:bg-gray-600"
              >
                Save Project
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-100 overflow-hidden flex flex-col">
          {/* <h1 className="text-3xl font-bold text-black mb-4">
            {selectedProject?.name || "No projects yet"}
          </h1> */}

          <div className="project-header flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-black">
              {selectedProject?.name || "No projects yet"}
            </h1>
          </div>

          {/* Search + Filter + Add User */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search input */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 text-sm text-black rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md transition-all duration-200 pr-8"
              />
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>
            
            {/* Date Filter Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDateFilter(!showDateFilter);
                  setShowStatusFilter(false);
                }}
                className={`p-2 rounded-lg ${isDateFilterActive ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'} shadow-md transition-all duration-200 flex items-center justify-center`}
                title="Filter by date"
              >
                <FaCalendarAlt size={18} className={isDateFilterActive ? "text-white" : "text-gray-600"} />
              </button>
              
              {/* Date Filter Dropdown */}
              {showDateFilter && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl z-10 p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Filter by Date</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 text-sm text-black rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 text-sm text-black rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex justify-between pt-2">
                      <button 
                        onClick={clearDateFilter}
                        className="px-3 py-1 text-xs rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={() => setShowDateFilter(false)}
                        className="px-3 py-1 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Filter Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowStatusFilter(!showStatusFilter);
                  setShowDateFilter(false);
                }}
                className={`p-2 rounded-lg ${statusFilter !== 'all' || deadlineFilter !== 'all' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-200 hover:bg-gray-300'} shadow-md transition-all duration-200 flex items-center justify-center`}
                title="Filter by status"
              >
                <FaFilter size={18} className={statusFilter !== 'all' || deadlineFilter !== 'all' ? "text-white" : "text-gray-600"} />
              </button>
              
              {/* Status Filter Dropdown */}
              {showStatusFilter && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-10 p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Filter by Status</h4>
                  
                  <div className="space-y-4">
                    {/* Task Status Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Task Status</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            statusFilter === 'all'
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setStatusFilter('completed')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            statusFilter === 'completed'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <FaCheckCircle size={12} className="mr-1" />
                          Completed
                        </button>
                        <button
                          onClick={() => setStatusFilter('incomplete')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            statusFilter === 'incomplete'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          Incomplete
                        </button>
                      </div>
                    </div>
                    
                    {/* Deadline Status Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">Deadline Status</label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setDeadlineFilter('all')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            deadlineFilter === 'all'
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setDeadlineFilter('overdue')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            deadlineFilter === 'overdue'
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <FaExclamationCircle size={12} className="mr-1" />
                          Overdue
                        </button>
                        <button
                          onClick={() => setDeadlineFilter('upcoming')}
                          className={`px-3 py-2 text-xs rounded-md flex items-center justify-center ${
                            deadlineFilter === 'upcoming'
                              ? 'bg-orange-100 text-orange-700 border border-orange-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          Upcoming
                        </button>
                      </div>
                    </div>
                    
                    {/* Apply and Clear buttons */}
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => {
                          setStatusFilter('all');
                          setDeadlineFilter('all');
                        }}
                        className="px-3 py-1 text-xs rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={() => setShowStatusFilter(false)}
                        className="px-3 py-1 text-xs rounded-md bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear All Filters button - show only when filters are active */}
            {(searchQuery || isDateFilterActive || statusFilter !== 'all' || deadlineFilter !== 'all') && (
              <button
                onClick={clearAllFilters}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 shadow-md transition-all duration-200 flex items-center justify-center"
                title="Clear all filters"
              >
                <FaTimes size={18} className="text-gray-600" />
              </button>
            )}
            
            {/* Add User button - only visible to project owner */}
            {selectedProject && selectedProject.user_id === auth.currentUser?.uid ? (
              <button 
                onClick={() => setShowUserModal(true)}
                className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 shadow-md transition-all duration-200 ml-2"
                title="Add user to project"
              >
                <FaUserPlus size={18} className="text-white" />
              </button>
            ) : null}
            
            {/* User Avatars - displaying both owner and members */}
            <div className="flex -space-x-2 overflow-hidden">
              {selectedProject && (
                <>
                  {/* First show the owner with correct owner check */}
                  {auth.currentUser && (
                    <UserAvatar
                      email={auth.currentUser.email || ''}
                      currentPhotoURL={currentPhotoURL}
                      isOwner={selectedProject.user_id === auth.currentUser.uid}
                      showIndicator={true}
                    />
                  )}
                  
                  {/* Then show all members */}
                  {selectedProject.members && selectedProject.members.length > 0 ? (
                    selectedProject.members.map((email, index) => (
                      <UserAvatar
                        key={index}
                        email={email}
                        currentPhotoURL={null}
                        showIndicator={true}
                      />
                    ))
                  ) : auth.currentUser ? null : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border-2 border-white shadow-md">
                      <span className="text-xs">0</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Active filters indicator */}
          {(statusFilter !== 'all' || deadlineFilter !== 'all') && (
            <div className="mb-4 flex flex-wrap gap-2">
              {statusFilter !== 'all' && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  statusFilter === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {statusFilter === 'completed' ? 'Completed' : 'Incomplete'} tasks
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 text-opacity-70 hover:text-opacity-100"
                  >
                    <FaTimes size={10} />
                  </button>
                </span>
              )}
              
              {deadlineFilter !== 'all' && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  deadlineFilter === 'overdue' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {deadlineFilter === 'overdue' ? 'Overdue' : 'Upcoming'} deadlines
                  <button 
                    onClick={() => setDeadlineFilter('all')}
                    className="ml-1 text-opacity-70 hover:text-opacity-100"
                  >
                    <FaTimes size={10} />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Kanban Board */}
          {selectedProject ? (
            <div className="overflow-x-auto pb-8 flex-1">
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-6 min-h-[calc(100vh-280px)] inline-flex">
                  {isLoadingColumns ? (
                    <div className="flex items-center justify-center w-full">
                      <p className="text-gray-500">Loading columns...</p>
                    </div>
                  ) : (
                    <>
                      {columns.map((col) => (
                        <div
                          key={col.id}
                          className="bg-white shadow-xl rounded-lg w-72 flex-shrink-0 flex flex-col h-[calc(100vh-280px)] border-2 border-indigo-100 hover:border-indigo-300 transition-all duration-200 hover:transform hover:scale-102 hover:-translate-y-1"
                        >
                          <div className="p-4 font-bold border-b-2 border-indigo-100 text-indigo-800 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg flex justify-between items-center">
                            {editingColumnId === col.id ? (
                              <input
                                type="text"
                                value={editingColumnName}
                                onChange={(e) => setEditingColumnName(e.target.value)}
                                onBlur={() => handleEditColumn(col.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEditColumn(col.id);
                                  if (e.key === "Escape") {
                                    setEditingColumnId(null);
                                    setEditingColumnName("");
                                  }
                                }}
                                className="text-lg p-1 w-36 rounded border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-indigo-800"
                                autoFocus
                              />
                            ) : (
                              <>
                                <span className="text-lg">{col.name}</span>
                                <div className="flex items-center space-x-3">
                                  <span className="text-indigo-420 font-semibold px-2 py-1 bg-indigo-50 rounded-full text-sm">
                                    {tasks[col.id]?.length || 0}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingColumnId(col.id);
                                      setEditingColumnName(col.name);
                                    }}
                                    className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                    title="Edit column name"
                                  >
                                    <FaEdit size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteColumn(col.id)} 
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                    title="Delete column"
                                  >
                                    <FaTrash size={18} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <Droppable droppableId={`column-${col.id}`}>
                            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                              <div 
                                className={`flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar ${
                                  snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                                }`}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {!tasks[col.id] || tasks[col.id].length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p className="text-sm">No tasks yet</p>
                                    <p className="text-xs mt-1">Click below to add a new task</p>
                                  </div>
                                ) : searchQuery && getFilteredTasks(col.id).length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p className="text-sm">No matching tasks</p>
                                    <p className="text-xs mt-1">Try a different search term</p>
                                  </div>
                                ) : (
                                  getFilteredTasks(col.id).map((task, index) => (
                                    <Draggable 
                                      key={`task-${task.id}`} 
                                      draggableId={`task-${task.id}`} 
                                      index={index}
                                    >
                                      {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                        <div 
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`p-4 rounded-lg shadow-md ${
                                            snapshot.isDragging ? 'opacity-75 shadow-lg scale-105' : ''
                                          } ${
                                            task.completed 
                                              ? 'bg-gray-300 border-l-4 border-gray-600 opacity-100' 
                                              : isTaskOverdue(task)
                                                ? 'bg-red-50 border-l-4 border-red-400'
                                                : 'bg-white border-l-4 border-indigo-400'
                                          } cursor-pointer transition-all duration-200 transform hover:-translate-y-1 group ${
                                            expandedTaskId === task.id ? 'z-10 relative' : ''
                                          }`}
                                          onClick={(e) => {
                                            // Only toggle expanded state or open details if we're not currently editing
                                            if (editingTaskId !== task.id) {
                                              // Toggle expanded state on first click
                                              setExpandedTaskId(prev => prev === task.id ? null : task.id);
                                            }
                                          }}
                                          onDoubleClick={(e) => {
                                            // Only open the details modal on double click if we're not editing
                                            if (editingTaskId !== task.id) {
                                              setSelectedTask(task);
                                            }
                                          }}
                                        >
                                          <div className="flex justify-between">
                                            {editingTaskId === task.id ? (
                                              <input
                                                type="text"
                                                value={editingTaskTitle}
                                                onChange={(e) => setEditingTaskTitle(e.target.value)}
                                                onBlur={() => {
                                                  if (editingTaskTitle.trim()) {
                                                    handleUpdateTask(task, { title: editingTaskTitle.trim() });
                                                  }
                                                  setEditingTaskId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter" && editingTaskTitle.trim()) {
                                                    handleUpdateTask(task, { title: editingTaskTitle.trim() });
                                                    setEditingTaskId(null);
                                                  }
                                                  if (e.key === "Escape") {
                                                    setEditingTaskId(null);
                                                  }
                                                }}
                                                className="w-full p-1 text-sm rounded border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700"
                                                autoFocus
                                              />
                                            ) : (
                                              <p 
                                                className={`text-gray-700 font-medium break-words pr-2 w-full ${
                                                  expandedTaskId === task.id 
                                                    ? '' 
                                                    : 'line-clamp-2 overflow-hidden text-ellipsis'
                                                } ${
                                                  task.completed 
                                                    ? 'line-through text-gray-400' 
                                                    : isTaskOverdue(task) 
                                                      ? 'text-red-700' 
                                                      : ''
                                                }`}
                                              >
                                                {task.title}
                                              </p>
                                            )}
                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation(); // Prevent card click handling
                                                  setEditingTaskId(task.id);
                                                  setEditingTaskTitle(task.title);
                                                }}
                                                className="text-indigo-400 hover:text-indigo-600 mr-2 flex-shrink-0"
                                                title="Edit task"
                                              >
                                                <FaEdit size={12} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation(); // Prevent card click handling
                                                  handleDeleteTask(task.id, col.id);
                                                }}
                                                className="text-red-400 hover:text-red-600 flex-shrink-0"
                                                title="Delete task"
                                              >
                                                <FaTrash size={12} />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="flex justify-between items-center mt-3">
                                            <div className="flex space-x-1 flex-wrap">
                                              <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full truncate max-w-[80px] mb-1">
                                                {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </span>
                                              
                                              {/* Add deadline badge if it exists */}
                                              {task.deadline && (
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full truncate max-w-[80px] ml-1 mb-1 ${
                                                  getDeadlineBadgeStyle(task)
                                                }`}>
                                                  {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              {/* Task owner avatar - use the dedicated component */}
                                              <TaskCreatorAvatar 
                                                creatorEmail={task.creator_email}
                                                currentPhotoURL={currentPhotoURL}
                                              />
                                              
                                              {/* Task detail info button */}
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation(); // Prevent card click handling
                                                  setSelectedTask(task); // Open modal
                                                }}
                                                className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors flex items-center justify-center shadow-sm"
                                                title="View details"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                )}
                                {provided.placeholder}
                                {addingTaskToColumn === col.id && (
                                  <div className="p-4 bg-white rounded-lg shadow-md border-l-4 border-indigo-400 hover:border-indigo-500 transition-all duration-200">
                                    <input
                                      type="text"
                                      value={newTaskTitle}
                                      onChange={(e) => setNewTaskTitle(e.target.value)}
                                      onBlur={() => handleAddTask(col.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddTask(col.id);
                                        if (e.key === "Escape") setAddingTaskToColumn(null);
                                      }}
                                      placeholder="Enter task title..."
                                      className="w-full p-2.5 text-sm rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50 text-indigo-700 placeholder-indigo-300 shadow-inner transition-all duration-200"
                                      autoFocus
                                    />
                                    <div className="flex justify-end mt-2 space-x-2">
                                      <button 
                                        onClick={() => setAddingTaskToColumn(null)}
                                        className="px-3 py-1 text-xs rounded-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        onClick={() => handleAddTask(col.id)}
                                        className="px-3 py-1 text-xs rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors duration-200"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Droppable>
                          <button 
                            onClick={() => {
                              setAddingTaskToColumn(col.id);
                              setNewTaskTitle("");
                            }}
                            className="mt-auto p-3 text-sm text-indigo-600 hover:bg-indigo-50 border-t-2 border-indigo-100 font-semibold flex items-center justify-center transition-all duration-200 rounded-b-lg"
                          >
                            <FaPlus size={12} className="mr-2" /> Add Task
                          </button>
                        </div>
                      ))}

                      {/* "+ New Column" button */}
                      {!isAddingColumn ? (
                        <button
                          onClick={() => setIsAddingColumn(true)}
                          className="flex items-center justify-center w-72 flex-shrink-0 h-20 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border-2 border-dashed border-indigo-300 text-indigo-600 hover:text-indigo-800 mt-1 shadow-md hover:shadow-lg"
                        >
                          <FaPlus size={18} className="mr-2" />
                          <span className="font-bold text-lg">Add Column</span>
                        </button>
                      ) : (
                        <div className="w-72 flex-shrink-0 bg-white shadow-xl rounded-lg border-2 border-indigo-100 p-4 mt-1">
                          <h3 className="text-lg font-bold text-indigo-800 mb-3">New Column</h3>
                          <input
                            type="text"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Column name"
                            className="w-full p-2.5 text-sm rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50 text-indigo-700 placeholder-indigo-300 shadow-inner transition-all duration-200 mb-3"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddColumn();
                              if (e.key === "Escape") {
                                setIsAddingColumn(false);
                                setNewColumnName("");
                              }
                            }}
                          />
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => {
                                setIsAddingColumn(false);
                                setNewColumnName("");
                              }}
                              className="px-3 py-1.5 text-xs rounded-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleAddColumn()}
                              className="px-3 py-1.5 text-xs rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors duration-200"
                              disabled={!newColumnName.trim()}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DragDropContext>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-gray-500 mb-4">Select or create a project to see your board</p>
                <button
                  onClick={() => setShowInput(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all duration-200"
                >
                  Create New Project
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="p-5 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-800">{selectedTask.title}</h3>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                  {new Date(selectedTask.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </span>
                {selectedTask.deadline && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    getDeadlineBadgeStyle(selectedTask)
                  }`}>
                    Due: {new Date(selectedTask.deadline).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Updated: {new Date(selectedTask.updated_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="p-5">
              {/* Deadline Management section - Only visible to project owner */}
              {selectedProject && selectedProject.user_id === auth.currentUser?.uid && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Management</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {!isDeadlineOpen ? (
                      <div className="flex justify-between items-center">
                        <div>
                          {selectedTask.deadline ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${
                                getDeadlineStatus(selectedTask) === 'overdue' 
                                  ? 'text-red-600' 
                                  : getDeadlineStatus(selectedTask) === 'met'
                                    ? 'text-green-600'
                                    : 'text-gray-700'
                              }`}>
                                Due: {new Date(selectedTask.deadline).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </span>
                              {getDeadlineStatus(selectedTask) === 'overdue' && !selectedTask.completed && (
                                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                                  Overdue
                                </span>
                              )}
                              {getDeadlineStatus(selectedTask) === 'met' && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                  Completed on time
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 italic">No deadline set</span>
                          )}
                        </div>
                        <div>
                          <button 
                            onClick={() => {
                              // Convert to YYYY-MM-DD format for the input if a deadline exists
                              setNewDeadline(selectedTask.deadline ? 
                                new Date(selectedTask.deadline).toISOString().split('T')[0] : 
                                ''
                              );
                              setIsDeadlineOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                          >
                            {selectedTask.deadline ? 'Change Deadline' : 'Set Deadline'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <label className="text-xs text-gray-600 mb-1">Select Deadline Date</label>
                          <input
                            type="date"
                            value={newDeadline}
                            // Removed min attribute to allow setting deadlines in the past for testing
                            onChange={(e) => setNewDeadline(e.target.value)}
                            className="p-2 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          {selectedTask.deadline && (
                            <button 
                              onClick={() => {
                                setNewDeadline('');
                                handleUpdateDeadline();
                              }}
                              className="px-3 py-1.5 text-xs rounded-md bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              Remove Deadline
                            </button>
                          )}
                          <button 
                            onClick={() => setIsDeadlineOpen(false)}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleUpdateDeadline}
                            className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                          >
                            Save Deadline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show deadline info for non-owners */}
              {selectedProject && selectedProject.user_id !== auth.currentUser?.uid && selectedTask.deadline && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        getDeadlineStatus(selectedTask) === 'overdue' 
                          ? 'text-red-600' 
                          : getDeadlineStatus(selectedTask) === 'met'
                            ? 'text-green-600'
                            : 'text-gray-700'
                      }`}>
                        Due: {new Date(selectedTask.deadline).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric'
                        })}
                      </span>
                      {getDeadlineStatus(selectedTask) === 'overdue' && !selectedTask.completed && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                      {getDeadlineStatus(selectedTask) === 'met' && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                          Completed on time
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Details</label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Created:</span>
                      <p className="text-sm text-gray-700">
                        {new Date(selectedTask.created_at).toLocaleString('en-US', {
                          year: 'numeric', 
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Last updated:</span>
                      <p className="text-sm text-gray-700">
                        {new Date(selectedTask.updated_at).toLocaleString('en-US', {
                          year: 'numeric', 
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Task ID:</span>
                      <p className="text-sm text-gray-700">{selectedTask.id}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Column:</span>
                      <p className="text-sm text-gray-700">
                        {columns.find(col => col.id === selectedTask.column)?.name || "Unknown"}
                      </p>
                    </div>
                    
                    {/* Creator information */}
                    <div className="col-span-2 flex items-center gap-3 mt-2 pt-3 border-t border-gray-200">
                      <div className="flex-shrink-0">
                        <TaskCreatorAvatar 
                          creatorEmail={selectedTask.creator_email} 
                          currentPhotoURL={currentPhotoURL}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Created by:</span>
                        <p className="text-sm text-gray-700 font-medium">{selectedTask.creator_email}</p>
                      </div>
                    </div>
                    
                    {/* Completed by information - only show when task is completed */}
                    {selectedTask.completed && selectedTask.completed_by_email && (
                      <div className="col-span-2 flex items-center gap-3 mt-2 pt-3 border-t border-gray-200">
                        <div className="flex-shrink-0">
                          <TaskCreatorAvatar 
                            creatorEmail={selectedTask.completed_by_email} 
                            currentPhotoURL={currentPhotoURL}
                          />
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Completed by:</span>
                          <p className="text-sm text-gray-700 font-medium">{selectedTask.completed_by_email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleUpdateTask(selectedTask, { completed: !selectedTask.completed });
                  }}
                  className={`px-4 py-2 rounded-md ${
                    selectedTask.completed 
                      ? 'bg-gray-500 hover:bg-gray-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white transition-colors duration-200`}
                >
                  {selectedTask.completed ? 'Mark as incomplete' : 'Mark as completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowUserModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full max-w-md transform transition-all"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="p-5 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold text-gray-800">Manage Project Users</h3>
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-5">
              {/* Current Project Users Section */}
              {selectedProject && (
                <div className="mb-5">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Current Users</h4>
                  
                  {/* Project Owner - Now correctly checking against project.user_id */}
                  {auth.currentUser && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 border border-gray-200">
                      <div className="flex items-center">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                          style={{ backgroundColor: stringToColor(auth.currentUser.email || '') }}
                        >
                          <span className="text-white font-semibold text-xs">{getInitials(auth.currentUser.email || '')}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{auth.currentUser.email}</p>
                          {selectedProject.user_id === auth.currentUser.uid ? (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">Owner</span>
                          ) : (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Member</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Project Members */}
                  {selectedProject.members && selectedProject.members.length > 0 ? (
                    selectedProject.members.map((email, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 border border-gray-200">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                            style={{ backgroundColor: stringToColor(email) }}
                          >
                            <span className="text-white font-semibold text-xs">{getInitials(email)}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-800">{email}</p>
                        </div>
                        {/* Only show remove button to project owner */}
                        {selectedProject.user_id === auth.currentUser?.uid && (
                          <button 
                            onClick={() => handleRemoveUser(email)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Remove user"
                          >
                            <FaUserMinus size={18} />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center py-2">No additional users in this project</p>
                  )}
                </div>
              )}
              
              {/* Only show Add New User section to project owner */}
              {selectedProject && selectedProject.user_id === auth.currentUser?.uid ? (
                <>
                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>
                  
                  {/* Add New User Section */}
                  <div className="mb-5">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Add New User</h4>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User Email</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="Enter user email"
                        value={userSearchEmail}
                        onChange={(e) => setUserSearchEmail(e.target.value)}
                        className="flex-1 p-2.5 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearchUser();
                        }}
                      />
                      <button 
                        onClick={handleSearchUser}
                        disabled={isSearching || !userSearchEmail.trim()}
                        className="p-2.5 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                      >
                        {isSearching ? (
                          <span className="animate-pulse">Searching...</span>
                        ) : (
                          <><FaSearch size={16} className="mr-1" /> Search</>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {searchResult ? (
                    <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                            style={{ backgroundColor: stringToColor(searchResult.email) }}
                          >
                            <span className="text-white font-semibold text-xs">{getInitials(searchResult.email)}</span>
                          </div>
                          <h4 className="font-medium text-gray-800">{searchResult.email}</h4>
                        </div>
                        {/* Check if user is already a member and show appropriate button */}
                        {selectedProject.members.includes(searchResult.email) ? (
                          <button 
                            onClick={() => handleRemoveUser(searchResult.email)}
                            className="px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 flex items-center gap-1"
                          >
                            <FaUserMinus size={14} /> Remove
                          </button>
                        ) : (
                          <button 
                            onClick={handleInviteUser}
                            className="px-3 py-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
                          >
                            <FaUserPlus size={14} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  ) : userSearchEmail.trim() && !isSearching ? (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No user found with that email</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg mt-4">
                  <p className="text-gray-500">Only the project owner can add or remove users</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  onClick={() => {
                    setShowUserModal(false);
                    setUserSearchEmail("");
                    setSearchResult(null);
                  }}
                  className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter indicators */}
      {(searchQuery.trim() || isDateFilterActive || statusFilter !== 'all' || deadlineFilter !== 'all') && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 border border-gray-200 z-40">
          <FaFilter className="text-indigo-500" />
          <span className="font-medium">
            {hasMatchingTasks() ? 'Filtering results' : 'No matching tasks'}
          </span>
          
          {/* Show filter details */}
          <div className="flex flex-wrap gap-2 ml-2">
            {searchQuery.trim() && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                Text: "{searchQuery.trim()}"
                <button onClick={() => setSearchQuery("")} className="ml-1 text-blue-600 hover:text-blue-800">
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {isDateFilterActive && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                Date: {startDate ? new Date(startDate).toLocaleDateString() : "Any"} - {endDate ? new Date(endDate).toLocaleDateString() : "Any"}
                <button onClick={clearDateFilter} className="ml-1 text-green-600 hover:text-green-800">
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {statusFilter !== 'all' && (
              <span className={`text-xs px-2 py-1 rounded-full flex items-center ${
                statusFilter === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <button onClick={() => setStatusFilter('all')} className="ml-1 text-blue-600 hover:text-blue-800">
                  <FaTimes size={10} />
                </button>
              </span>
            )}
            
            {deadlineFilter !== 'all' && (
              <span className={`text-xs px-2 py-1 rounded-full flex items-center ${
                deadlineFilter === 'overdue' 
                  ? 'bg-red-100 text-red-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                Deadline: {deadlineFilter.charAt(0).toUpperCase() + deadlineFilter.slice(1)}
                <button onClick={() => setDeadlineFilter('all')} className="ml-1 text-blue-600 hover:text-blue-800">
                  <FaTimes size={10} />
                </button>
              </span>
            )}
          </div>
          
          <button 
            onClick={clearAllFilters}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <FaTimes size={14} />
          </button>
        </div>
      )}

      {/* Search result indicator */}
      {searchQuery.trim() && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 border border-gray-200 z-40">
          <FaSearch className="text-indigo-500" />
          <span className="font-medium">
            {hasMatchingTasks() ? 'Filtering results' : 'No matching tasks'}
          </span>
          <button 
            onClick={clearSearch}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <FaTimes size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
