// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// Optionally, if you plan to use Analytics, include:
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdarlN78cTImVW0_Ew-0xk3xws6UOHQYQ",
  authDomain: "todo-django-d8b04.firebaseapp.com",
  projectId: "todo-django-d8b04",
  storageBucket: "todo-django-d8b04.appspot.com",
  messagingSenderId: "119503983582",
  appId: "1:119503983582:web:f585e011766f7773ad434f",
  measurementId: "G-4B4D2J54QF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// If you want to enable Analytics later, you can do:
// const analytics = getAnalytics(app);

export default app;
