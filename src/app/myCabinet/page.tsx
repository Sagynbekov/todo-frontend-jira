"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";
import { authFetch } from "../lib/auth-utils";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaEdit, FaSave, FaArrowLeft, FaSignOutAlt, FaChartBar, FaTasks, FaClipboardCheck } from "react-icons/fa";

interface UserStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
}

export default function MyCabinetPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || "User");
        fetchUserStats();
      } else {
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserStats = async () => {
    try {
      // Fetch projects
      const projectsResponse = await authFetch("http://localhost:8000/api/projects/");
      if (!projectsResponse.ok) throw new Error(`Error: ${projectsResponse.status}`);
      const projects = await projectsResponse.json();
      
      // Count tasks across all projects
      let taskCount = 0;
      let completedCount = 0;
      
      // For now, just use projects count
      setStats({
        totalProjects: projects.length,
        totalTasks: taskCount,
        completedTasks: completedCount,
      });
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!displayName.trim()) {
      setDisplayName(user?.displayName || user?.email?.split('@')[0] || "User");
      setIsEditingName(false);
      return;
    }

    try {
      await user.updateProfile({
        displayName: displayName.trim()
      });
      
      // Refresh user data
      setUser(auth.currentUser);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating display name:", error);
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

  const handleBackToHome = () => {
    router.push("/home");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-700 text-white shadow-md border-b border-gray-600">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBackToHome}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors"
            >
              <FaArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors"
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-12 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="bg-white p-2 rounded-full shadow-lg">
                <FaUserCircle size={100} className="text-indigo-600" />
              </div>
              
              <div className="text-center md:text-left">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-3 py-2 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button 
                      onClick={handleUpdateDisplayName}
                      className="bg-white text-indigo-600 p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <FaSave size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <FaEdit size={18} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <FaEnvelope size={16} />
                  <span>{user?.email}</span>
                </div>
                
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <FaCalendarAlt size={16} />
                  <span>Account created: {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* User Stats */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow border border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 text-white p-3 rounded-lg">
                    <FaChartBar size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Projects</h3>
                    <p className="text-3xl font-bold text-blue-700">{stats.totalProjects}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow border border-purple-200">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 text-white p-3 rounded-lg">
                    <FaTasks size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Tasks</h3>
                    <p className="text-3xl font-bold text-purple-700">{stats.totalTasks}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 text-white p-3 rounded-lg">
                    <FaClipboardCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Completed Tasks</h3>
                    <p className="text-3xl font-bold text-green-700">{stats.completedTasks}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Account Settings */}
          <div className="border-t border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Email Address</h3>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.emailVerified 
                    ? "Your email is verified" 
                    : "Your email is not verified. Please check your inbox."}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Security</h3>
                <button className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                  Change Password
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Account Management</h3>
                <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}