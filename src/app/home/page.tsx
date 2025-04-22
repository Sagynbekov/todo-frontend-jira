// src/app/home/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  FaCog,
  FaUserCircle,
  FaEllipsisH,
  FaEdit,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa";

type Project = {
  id: number;
  name: string;
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  // Fetch projects on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/projects/")
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
      })
      .catch((err) => console.error("Error loading projects:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Create new project
  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch("http://localhost:8000/api/projects/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // Delete project
  const handleDeleteProject = async (id: number) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/projects/${id}/`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
      setActiveDropdown(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // Edit project
  const handleEditProject = async (id: number) => {
    if (!editingProjectName.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingProjectName }),
      });
      if (res.ok) {
        const updated: Project = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      } else {
        console.error("Update failed", await res.text());
      }
    } catch (err) {
      console.error("Update error", err);
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
                  className="mb-2 p-2 rounded hover:bg-gray-600 cursor-pointer flex justify-between items-center"
                >
                  {editingProjectId === project.id ? (
                    <input
                      type="text"
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      onBlur={() => handleEditProject(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditProject(project.id);
                      }}
                      className="w-full p-2 rounded border border-gray-300 text-gray-200 placeholder-gray-500 bg-gray-800"
                      autoFocus
                    />
                  ) : (
                    <span>{project.name}</span>
                  )}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveDropdown((prev) =>
                          prev === project.id ? null : project.id
                        )
                      }
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
                          onClick={() => handleDeleteProject(project.id)}
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
            {projects[0]?.name || "No projects yet"}
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
          {/* Future board content goes here */}
        </main>
      </div>
    </div>
  );
}
