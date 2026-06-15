/**
 * Firebase Configuration & Initialization
 * Design: Coastal Morning — Horizon Blue theme
 * 
 * Firebase is used for:
 * - Authentication (Email/Password + Google OAuth)
 * - Firestore (cloud data sync for trips and activities)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Authentication (Email/Password + Google)
 * 3. Enable Firestore Database
 * 4. Copy your config values to the environment variables below
 * 
 * Environment variables (create .env.local):
 * VITE_FIREBASE_API_KEY=your_api_key
 * VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 * VITE_FIREBASE_PROJECT_ID=your_project_id
 * VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 * VITE_FIREBASE_APP_ID=your_app_id
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";

// Firebase configuration — reads from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
};

// Check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== "demo-api-key"
  );
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth functions
export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
};

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

export const logout = () => signOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

// Firestore data types
export interface Trip {
  id?: string;
  userId: string;
  title: string;
  destination: string;
  coverImage?: string;
  startDate: string;
  endDate: string;
  description?: string;
  budget?: number;
  currency?: string;
  status: "planning" | "ongoing" | "completed";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Activity {
  id?: string;
  tripId: string;
  userId: string;
  day: number; // Day number within the trip (1-based)
  date: string; // ISO date string
  time?: string;
  title: string;
  category: "attraction" | "restaurant" | "hotel" | "transport" | "other";
  location?: string;
  address?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  duration?: number; // in minutes
  order: number; // display order within the day
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Firestore CRUD operations for Trips
export const tripsCollection = (userId: string) =>
  query(
    collection(db, "trips"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

export const createTrip = async (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">) => {
  // Filter out undefined values to prevent Firestore errors
  const cleanedTrip = Object.fromEntries(
    Object.entries(trip).filter(([, value]) => value !== undefined)
  );
  
  const docRef = await addDoc(collection(db, "trips"), {
    ...cleanedTrip,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateTrip = async (tripId: string, data: Partial<Trip>) => {
  await updateDoc(doc(db, "trips", tripId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTrip = async (tripId: string) => {
  // Also delete all activities for this trip
  const activitiesQuery = query(
    collection(db, "activities"),
    where("tripId", "==", tripId)
  );
  const activitiesSnapshot = await getDocs(activitiesQuery);
  const deletePromises = activitiesSnapshot.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  await deleteDoc(doc(db, "trips", tripId));
};

export const getTrip = async (tripId: string): Promise<Trip | null> => {
  const docSnap = await getDoc(doc(db, "trips", tripId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Trip;
  }
  return null;
};

export const subscribeToTrips = (
  userId: string,
  callback: (trips: Trip[]) => void
) => {
  const q = query(
    collection(db, "trips"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Trip[];
    callback(trips);
  });
};

// Firestore CRUD operations for Activities
export const createActivity = async (
  activity: Omit<Activity, "id" | "createdAt" | "updatedAt">
) => {
  const docRef = await addDoc(collection(db, "activities"), {
    ...activity,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateActivity = async (
  activityId: string,
  data: Partial<Activity>
) => {
  await updateDoc(doc(db, "activities", activityId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteActivity = async (activityId: string) => {
  await deleteDoc(doc(db, "activities", activityId));
};

export const subscribeToActivities = (
  tripId: string,
  callback: (activities: Activity[]) => void
) => {
  const q = query(
    collection(db, "activities"),
    where("tripId", "==", tripId),
    orderBy("day", "asc"),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Activity[];
    callback(activities);
  });
};

export type { User, DocumentData };
