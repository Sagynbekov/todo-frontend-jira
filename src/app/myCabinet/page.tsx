"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, storage } from "../lib/firebase";
import { authFetch } from "../lib/auth-utils";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaEdit, FaSave, FaArrowLeft, FaSignOutAlt, FaChartBar, FaTasks, FaClipboardCheck, FaCamera, FaCheck, FaTimes } from "react-icons/fa";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

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
  const [profilePhotoURL, setProfilePhotoURL] = useState<string | null>(null);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || "User");
        
        // Make sure we're handling the photo URL correctly
        if (currentUser.photoURL) {
          console.log("Current photo URL:", currentUser.photoURL);
          setProfilePhotoURL(currentUser.photoURL);
        } else {
          setProfilePhotoURL(null);
        }
        
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
      await updateProfile(user, {
        displayName: displayName.trim()
      });
      
      // Refresh user data
      setUser(auth.currentUser);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating display name:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewURL(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      // Create a FormData object to send the file to the backend
      const formData = new FormData();
      formData.append('profile_photo', selectedFile);
      formData.append('email', user.email || '');
      
      // Send the profile photo to the Django backend
      const response = await fetch(`http://localhost:8000/api/profile-photo/?user_id=${user.uid}`, {
        method: 'PUT',
        body: formData,
        // No Content-Type header with FormData
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload profile photo: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get the complete photo URL - make sure it's absolute
      const photoURL = data.profile_photo.startsWith('http') 
        ? data.profile_photo 
        : `http://localhost:8000${data.profile_photo}`;
      
      console.log("Profile photo uploaded successfully, URL:", photoURL);
      
      // Update user profile with the new photo URL in Firebase
      await updateProfile(user, {
        photoURL: photoURL
      });
      
      // Update local state
      setProfilePhotoURL(photoURL);
      setIsChangingPhoto(false);
      setSelectedFile(null);
      setPreviewURL(null);
      
      // Refresh user data
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force a refresh to ensure we get updated data
        await currentUser.reload();
        setUser(auth.currentUser);
      }
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    }
  };

  const cancelPhotoChange = () => {
    setIsChangingPhoto(false);
    setSelectedFile(null);
    setPreviewURL(null);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
              <div className="relative">
                {isChangingPhoto ? (
                  <div className="bg-white p-2 rounded-full shadow-lg relative">
                    {previewURL ? (
                      <img 
                        src={previewURL} 
                        alt="Avatar Preview" 
                        className="w-28 h-28 rounded-full object-cover"
                      />
                    ) : (
                      <FaUserCircle size={100} className="text-indigo-600" />
                    )}
                    
                    <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/40">
                      <button
                        onClick={triggerFileInput}
                        className="bg-transparent hover:bg-white/20 p-2 rounded-full transition-colors mb-2"
                      >
                        <FaCamera size={24} className="text-white" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                      />
                      
                      <div className="flex gap-2">
                        {selectedFile && (
                          <button
                            onClick={handleAvatarUpload}
                            className="bg-green-500 hover:bg-green-600 p-1 rounded-full transition-colors"
                          >
                            <FaCheck size={14} className="text-white" />
                          </button>
                        )}
                        <button
                          onClick={cancelPhotoChange}
                          className="bg-red-500 hover:bg-red-600 p-1 rounded-full transition-colors"
                        >
                          <FaTimes size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="bg-white p-2 rounded-full shadow-lg relative cursor-pointer group"
                    onClick={() => setIsChangingPhoto(true)}
                  >
                    {profilePhotoURL ? (
                      <img 
                        src={profilePhotoURL} 
                        alt="User Avatar" 
                        className="w-28 h-28 rounded-full object-cover"
                        onError={(e) => {
                          console.error("Image failed to load:", profilePhotoURL);
                          // Fallback to default icon on error
                          e.currentTarget.style.display = 'none';
                          setProfilePhotoURL(null);
                        }}
                      />
                    ) : (
                      <FaUserCircle size={100} className="text-indigo-600" />
                    )}
                    
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FaCamera size={24} className="text-white" />
                    </div>
                  </div>
                )}
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