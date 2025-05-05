// API configuration to handle different environments

// Get the API base URL from environment variables
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Helper function to build API endpoints
export const getApiEndpoint = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}/${cleanPath}`;
};
