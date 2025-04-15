"use client";
import { useEffect, useState } from "react";

export default function MainWindow() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/welcome/";

    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error("Failed to fetch message:", err);
        setMessage("Welcome to our main page");
      });
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold">{message}</h1>
    </div>
  );
}