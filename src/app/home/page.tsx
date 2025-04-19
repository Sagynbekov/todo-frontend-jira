// src/app/home/page.tsx
export default function HomePage() {
  // Example list of projects (replace or fetch from your backend as needed)
  const projects = [
    "Project Alpha",
    "Project Beta",
    "Project Gamma",
    "Project Delta",
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Projects</h2>
        <ul>
          {projects.map((project, index) => (
            <li
              key={index}
              className="mb-2 p-2 rounded hover:bg-gray-700 cursor-pointer"
            >
              {project}
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-100">
        <h1 className="text-3xl font-bold">Home Page</h1>
        {/* You can add further content here */}
      </main>
    </div>
  );
}
