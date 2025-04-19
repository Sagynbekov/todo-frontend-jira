"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      // Create the user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Optionally update the user profile with the full name
      await updateProfile(userCredential.user, { displayName: fullName });

      // Redirect to the Home page on success
      router.push("/home");
    } catch (error: any) {
      console.error("Registration error:", error.message);
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <form onSubmit={handleRegister} className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-xl w-80">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">Register</h2>

        {/* Display Error Message */}
        {error && <p className="text-red-500 text-center">{error}</p>}

        {/* Full Name Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Full Name:</span>
          <input
            type="text"
            placeholder="Enter your full name"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-gray-500 placeholder-gray-400 text-gray-700"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        {/* Email Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Email:</span>
          <input
            type="email"
            placeholder="Enter your email"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-gray-500 placeholder-gray-400 text-gray-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        {/* Password Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Password:</span>
          <input
            type="password"
            placeholder="Enter your password"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-gray-500 placeholder-gray-400 text-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {/* Confirm Password Field */}
        <label className="flex flex-col">
          <span className="mb-1 font-semibold text-gray-700">Confirm Password:</span>
          <input
            type="password"
            placeholder="Confirm your password"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-gray-500 placeholder-gray-400 text-gray-700"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>

        {/* Register Button */}
        <button type="submit" className="w-full bg-gray-700 text-white font-semibold py-2 rounded hover:bg-gray-600">
          Register
        </button>

        {/* Navigation to Login Page */}
        <Link href="/login">
          <button type="button" className="w-full bg-gray-700 text-white font-semibold py-2 rounded hover:bg-gray-600">
            Sign in
          </button>
        </Link>
      </form>
    </div>
  );
};

export default Register;