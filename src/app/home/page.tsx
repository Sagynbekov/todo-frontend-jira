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
} from "react-icons/fa";
import { authFetch, waitForAuth } from "../lib/auth-utils";
import { auth } from "../lib/firebase";
import { syncFirebaseUserToBackend } from "../lib/firebase-sync";
import { useRouter } from "next/navigation";

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

type Task = {
  id: number;
  title: string;
  description: string;
  column: number;
  order: number;
  created_at: string;
  updated_at: string;
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
          description: ""
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
      const res = await authFetch(
        `http://localhost:8000/api/tasks/${task.id}/`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...task,
            ...newData
          }),
        }
      );
      
      if (res.ok) {
        const updatedTask: Task = await res.json();
        setTasks(prev => ({
          ...prev,
          [task.column]: prev[task.column].map(t => 
            t.id === task.id ? updatedTask : t
          )
        }));
        setSelectedTask(updatedTask);
      } else {
        console.error("Failed to update task", await res.text());
      }
    } catch (err) {
      console.error("Network error updating task:", err);
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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex justify-end items-center bg-gray-700 text-white p-4 shadow-md border-b border-gray-600">
        <button className="flex items-center gap-2 hover:text-gray-400">
          <FaCog size={20} />
          <span>Settings</span>
        </button>
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

          {/* Search + Add User */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="text"
              placeholder="Search board"
              className="w-64 p-2 text-sm text-black rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md transition-all duration-200"
            />
            
            {/* Add User button - only visible to project owner */}
            {selectedProject && selectedProject.user_id === auth.currentUser?.uid ? (
              <button 
                onClick={() => setShowUserModal(true)}
                className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 shadow-md transition-all duration-200 mr-2"
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
                    <div
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white ring-2 ring-white shadow-md cursor-pointer transition-transform hover:scale-110 hover:z-10"
                      style={{ backgroundColor: stringToColor(auth.currentUser.email || ''), zIndex: 99 }}
                      title={`${auth.currentUser.email} ${selectedProject.user_id === auth.currentUser.uid ? '(Owner)' : ''}`}
                    >
                      <span className="text-white font-semibold text-xs">{getInitials(auth.currentUser.email || '')}</span>
                      {/* Crown indicator only for actual owner */}
                      {selectedProject.user_id === auth.currentUser.uid && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" title="Project Owner">
                          <span className="text-white text-[8px]">★</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Then show all members */}
                  {selectedProject.members && selectedProject.members.length > 0 ? (
                    selectedProject.members.map((email, index) => (
                      <div
                        key={index}
                        className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white ring-2 ring-white shadow-md cursor-pointer transition-transform hover:scale-110 hover:z-10"
                        style={{ backgroundColor: stringToColor(email), zIndex: selectedProject.members.length - index }}
                        title={email}
                      >
                        <span className="text-white font-semibold text-xs">{getInitials(email)}</span>
                      </div>
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

          {/* Kanban Board */}
          {selectedProject ? (
            <div className="overflow-x-auto pb-8 flex-1">
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
                        <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                          {!tasks[col.id] || tasks[col.id].length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                              <p className="text-sm">No tasks yet</p>
                              <p className="text-xs mt-1">Click below to add a new task</p>
                            </div>
                          ) : (
                            tasks[col.id].map(task => (
                              <div 
                                key={task.id}
                                className={`p-4 bg-white rounded-lg shadow-md hover:shadow-lg border-l-4 border-indigo-400 cursor-pointer transition-all duration-200 transform hover:-translate-y-1 group ${
                                  expandedTaskId === task.id ? 'z-10 relative' : ''
                                }`}
                                onClick={() => {
                                  // Toggle expanded state on first click
                                  setExpandedTaskId(prev => prev === task.id ? null : task.id);
                                }}
                              >
                                <div className="flex justify-between">
                                  <p 
                                    className={`text-gray-700 font-medium break-words pr-2 w-full ${
                                      expandedTaskId === task.id 
                                        ? '' 
                                        : 'line-clamp-2 overflow-hidden text-ellipsis'
                                    }`}
                                  >
                                    {task.title}
                                  </p>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent card click handling
                                      handleDeleteTask(task.id, col.id);
                                    }}
                                    className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Delete task"
                                  >
                                    <FaTrash size={12} />
                                  </button>
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                  <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full truncate max-w-[80px]">
                                    {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    {/* Task owner avatar with the same color as in user list */}
                                    <div 
                                      className="h-7 w-7 rounded-full flex items-center justify-center shadow-md border border-white" 
                                      style={{ backgroundColor: selectedProject && selectedProject.user_id === auth.currentUser?.uid ? 
                                        stringToColor(auth.currentUser?.email || '') : 
                                        stringToColor(selectedProject?.members[0] || auth.currentUser?.email || '') 
                                      }}
                                      title={selectedProject?.user_id === auth.currentUser?.uid ? 
                                        `${auth.currentUser?.email} (Owner)` : (selectedProject?.members[0] || "")}
                                    >
                                      <span className="text-white text-xs font-semibold">
                                        {selectedProject?.user_id === auth.currentUser?.uid ? 
                                          getInitials(auth.currentUser?.email || '') : 
                                          getInitials(selectedProject?.members[0] || '')}
                                      </span>
                                    </div>
                                    
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
                            ))
                          )}
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
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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
                <span className="text-xs text-gray-500">
                  Updated: {new Date(selectedTask.updated_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="p-4 bg-gray-50 rounded-lg min-h-[100px]">
                  {selectedTask.description ? (
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {selectedTask.description}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">No description provided</p>
                  )}
                </div>
              </div>
              
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
                    const newDescription = prompt("Edit task description:", selectedTask.description);
                    if (newDescription !== null) {
                      handleUpdateTask(selectedTask, { description: newDescription });
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 transition-colors duration-200"
                >
                  Edit Description
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

    </div>
  );
}
