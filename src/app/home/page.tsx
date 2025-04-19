import { FaCog, FaUserCircle } from "react-icons/fa"; // Import icons from react-icons

export default function HomePage() {
  // Example list of projects (replace or fetch from your backend as needed)
  const projects = [
    "Project Alpha",
    "Project Beta",
    "Project Gamma",
    "Project Delta",
  ];

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
          <ul>
            {projects.map((project, index) => (
              <li
                key={index}
                className="mb-2 p-2 rounded hover:bg-gray-600 cursor-pointer"
              >
                {project}
              </li>
            ))}
          </ul>
          {/* Add New Project Button */}
          <button className="w-full mt-4 bg-gray-700 text-white font-semibold py-2 rounded hover:bg-gray-600">
            + Create New Project
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-100">
          <h1 className="text-3xl font-bold text-black">{projects[0]}</h1>
          {/* You can add further content here */}
        </main>
      </div>
    </div>
  );
}