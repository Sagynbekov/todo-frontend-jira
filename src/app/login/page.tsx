// src/app/login/page.tsx
import Link from 'next/link';

const Login = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-purple-600">
      <form className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-xl w-80">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">To-do</h2>

        {/* Gmail Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Gmail:</span>
          <input
            type="email"
            placeholder="Enter your Gmail"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-400 text-gray-700"
            required
          />
        </label>

        {/* Password Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Password:</span>
          <input
            type="password"
            placeholder="Enter your password"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-400 text-gray-700"
            required
          />
        </label>

        {/* Sign in Button */}
        <button
          type="submit"
          className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700"
        >
          Sign in
        </button>

        {/* Sign up Button (Link to /register) */}
        <Link href="/register">
          <button
            type="button"
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700"
          >
            Sign up
          </button>
        </Link>
      </form>
    </div>
  );
}
export default Login