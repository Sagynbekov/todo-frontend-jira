// src/app/register/page.tsx
import Link from 'next/link';

const Register = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-purple-600">
      <form className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-xl w-80">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Register</h2>

        {/* Full Name Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Full Name:</span>
          <input
            type="text"
            placeholder="Enter your full name"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-400 text-gray-700"
            required
          />
        </label>

        {/* Email Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Email:</span>
          <input
            type="email"
            placeholder="Enter your email"
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

        {/* Confirm Password Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Confirm Password:</span>
          <input
            type="password"
            placeholder="Confirm your password"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-400 text-gray-700"
            required
          />
        </label>

        {/* Register Button */}
        <button
          type="submit"
          className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700"
        >
          Register
        </button>

        {/* Navigation to Login Page */}
        <Link href="/login">
          <button
            type="button"
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700"
          >Sign in
          </button>
        </Link>
      </form>
    </div>
  );
}
export default Register