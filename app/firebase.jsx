// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6e9iyE-CyOIL0E4qcoc5IWvprYFYWsjo",
  authDomain: "blackwhite-f216c.firebaseapp.com",
  projectId: "blackwhite-f216c",
  storageBucket: "blackwhite-f216c.firebasestorage.app",
  messagingSenderId: "482138627056",
  appId: "1:482138627056:web:c576a01672a9e64b0e5b35"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firebase persistence failed: Multiple tabs open");
    } else if (err.code === "unimplemented") {
      // The current browser does not support all of the features required
      console.warn("Firebase persistence not available in this browser");
    } else {
      console.error("Firebase persistence error:", err);
    }
  });
}