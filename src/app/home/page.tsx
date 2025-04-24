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
  FaPlus,               // ←— ADDED: import plus icon
} from "react-icons/fa";
import { authFetch, waitForAuth } from "../lib/auth-utils";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

type Project = {
  id: number;
  name: string;
  user_id: string;
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

  // ←— ADDED: Kanban column state
  const [columns, setColumns] = useState<string[]>(["Tasks"]);

  // ←— ADDED: Handler to prompt & add a new column
  const handleAddColumn = () => {
    const name = prompt("Enter new column name");
    if (name?.trim()) {
      setColumns((cols) => [...cols, name.trim()]);
    }
  };

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        fetchProjects();
      }
    });
    return () => unsubscribe();
  }, [router]);

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
        if (selectedProject?.id === id) setSelectedProject(null);
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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex justify-end items-center bg-gray-700 text-white p-4 shadow-md border-b border-gray-600">
        <button className="flex items-center gap-2 hover:text-gray-400">
          <FaCog size={20} />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-2 ml-6 hover:text-gray-400">
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

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 text-white p-4 shadow-lg border-r border-gray-600">
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
        <main className="flex-1 p-6 bg-gray-100">
          <h1 className="text-3xl font-bold text-black mb-4">
            {selectedProject?.name || "No projects yet"}
          </h1>

          {/* Search + Add User */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="text"
              placeholder="Search board"
              className="w-64 p-2 text-sm text-black rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-md transition-all duration-200"
            />
            <button className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 shadow-md transition-all duration-200">
              <FaUserPlus size={18} className="text-white" />
            </button>
          </div>



          {/* Kanban Board */}
          <div className="flex gap-6 overflow-x-auto pb-8 min-h-[calc(100vh-220px)]">
            {columns.map((col) => (
              <div
                key={col}
                className="bg-white shadow-xl rounded-lg w-72 flex flex-col h-[calc(100vh-280px)] border-2 border-indigo-100 hover:border-indigo-300 transition-all duration-200 hover:transform hover:scale-102 hover:-translate-y-1"
              >
                <div className="p-4 font-bold border-b-2 border-indigo-100 text-indigo-800 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-lg flex justify-between items-center">
                  <span className="text-lg">{col}</span>
                  <span className="text-indigo-400 font-semibold px-2 py-1 bg-indigo-50 rounded-full text-sm">0</span>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                  {/* Placeholder card for visual effect */}
                  <div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg border-l-4 border-blue-400 cursor-pointer transition-all duration-200 transform hover:-translate-y-1">
                    <p className="text-gray-700 font-medium">Sample task card</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">Apr 24</span>
                      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 shadow-sm"></div>
                    </div>
                  </div>
                  
                  {/* Second sample card for better visualization */}
                  <div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg border-l-4 border-purple-400 cursor-pointer transition-all duration-200 transform hover:-translate-y-1">
                    <p className="text-gray-700 font-medium">Another sample task</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-semibold text-purple-500 bg-purple-50 px-2 py-1 rounded-full">Apr 25</span>
                      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-sm"></div>
                    </div>
                  </div>
                </div>
                <button className="mt-auto p-3 text-sm text-indigo-600 hover:bg-indigo-50 border-t-2 border-indigo-100 font-semibold flex items-center justify-center transition-all duration-200 rounded-b-lg">
                  <FaPlus size={12} className="mr-2" /> Add Card
                </button>
              </div>
            ))}

            {/* "+ New Column" button */}
            <button
              onClick={handleAddColumn}
              className="flex items-center justify-center w-72 h-20 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border-2 border-dashed border-indigo-300 text-indigo-600 hover:text-indigo-800 mt-1 shadow-md hover:shadow-lg"
            >
              <FaPlus size={18} className="mr-2" />
              <span className="font-bold text-lg">Add Column</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
