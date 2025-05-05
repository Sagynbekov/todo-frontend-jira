import { auth } from "./firebase";

// Wait for authentication to be ready
export const waitForAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Enhanced fetch function that includes the user's ID
export const authFetch = async (url: string, options: RequestInit = {}) => {
    // Wait for auth to initialize
    await waitForAuth();
    
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("No user logged in");
    }
    
    const uid = user.uid;
    
    // Add user_id to URL for ALL request types
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}user_id=${uid}`;
    
    // Add user_id to body for POST, PUT requests
    if (options.method === 'POST' || options.method === 'PUT') {
      let body = {};
      
      if (options.body) {
        try {
          body = JSON.parse(options.body.toString());
        } catch (e) {
          console.error("Error parsing request body:", e);
        }
      }
      
      // Add user_id to body also
      body = { ...body, user_id: uid };
      
      // Log request details for debugging
      if (options.method === 'PUT') {
        console.log(`Sending PUT request to ${url}`);
        console.log("Request body:", body);
      }
      
      options.body = JSON.stringify(body);
    }
    
    // Ensure headers are set for JSON
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    
    return fetch(url, {
      ...options,
      headers
    });
};