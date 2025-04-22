"use client";

import { useState, useEffect } from "react";
import { FaCog, FaUserCircle, FaEllipsisH, FaEdit, FaTrash } from "react-icons/fa";

export default function HomePage() {
  const [projects, setProjects] = useState<string[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null); // Track which dropdown is open

  // 1) Fetch existing projects on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/projects/")
      .then((res) => res.json())
      .then((data: { id: number; name: string }[]) => {
        setProjects(data.map((p) => p.name));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading projects:", err);
        setIsLoading(false);
      });
  }, []);

  // 2) POST new project to backend
  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/api/projects/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (res.ok) {
        const project = await res.json(); // { id, name }
        setProjects((prev) => [...prev, project.name]);
        setNewProjectName("");
        setShowInput(false);
      } else {
        console.error("Failed to save project", await res.text());
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  // 3) Handle delete project
  const handleDeleteProject = (index: number) => {
    const updatedProjects = [...projects];
    updatedProjects.splice(index, 1);
    setProjects(updatedProjects);
    setActiveDropdown(null); // Close dropdown
  };

  // 4) Handle edit project
  const handleEditProject = (index: number) => {
    const newName = prompt("Enter new project name:", projects[index]);
    if (newName) {
      const updatedProjects = [...projects];
      updatedProjects[index] = newName;
      setProjects(updatedProjects);
    }
    setActiveDropdown(null); // Close dropdown
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
              {projects.map((project, i) => (
                <li
                  key={i}
                  className="mb-2 p-2 rounded hover:bg-gray-600 cursor-pointer flex justify-between items-center"
                >
                  <span>{project}</span>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveDropdown((prev) => (prev === i ? null : i))
                      }
                      className="text-gray-400 hover:text-white"
                    >
                      <FaEllipsisH />
                    </button>
                    {activeDropdown === i && (
                      <div className="absolute right-[-150px] mt-2 w-32 bg-gray-300 text-black shadow-lg rounded">
                      <button onClick={() => handleEditProject(i)} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-500">
                        <FaEdit />
                        <span>Edit</span>
                      </button>
                      <button onClick={() => handleDeleteProject(i)} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-500">
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
          <h1 className="text-3xl font-bold text-black">
            {projects[0] || "No projects yet"}
          </h1>
        </main>
      </div>
    </div>
  );
}