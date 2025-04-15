"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect to the Home page upon successful login
      router.push("/home");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-purple-600">
      <form onSubmit={handleLogin} className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-xl w-80">
        <h2 className="text-2xl font-bold text-center mb-2">To-do</h2>
        <input
          type="email"
          placeholder="Enter your Gmail"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 text-gray-900 placeholder-gray-700"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Enter your password"
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-purple-500 text-gray-900 placeholder-gray-700"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700">
          Sign in
        </button>
        <Link href="/register">
          <button type="button" className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700">
            Sign up
          </button>
        </Link>
      </form>
    </div>
  );
}
