// Firebase Offline Wrapper - يتحقق من الاتصال ويضيف للقائمة عند عدم وجود إنترنت
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { offlineQueue } from "./offlineQueue";

// Helper function to check if online
const isOnline = () => {
  return typeof window !== "undefined" && navigator.onLine;
};

// Wrapper for addDoc
export const offlineAdd = async (collectionName, data) => {
  if (isOnline()) {
    try {
      const result = await addDoc(collection(db, collectionName), data);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Error adding document (online):", error);
      // إذا فشلت العملية online، أضفها للقائمة
      const queueId = offlineQueue.add({
        collectionName,
        action: "add",
        data,
      });
      return { success: false, queueId, error };
    }
  } else {
    // Offline: أضف للقائمة مباشرة
    const queueId = offlineQueue.add({
      collectionName,
      action: "add",
      data,
    });
    return { success: false, queueId, offline: true };
  }
};

// Wrapper for updateDoc
export const offlineUpdate = async (collectionName, docId, data) => {
  if (isOnline()) {
    try {
      await updateDoc(doc(db, collectionName, docId), data);
      return { success: true };
    } catch (error) {
      console.error("Error updating document (online):", error);
      // إذا فشلت العملية online، أضفها للقائمة
      const queueId = offlineQueue.add({
        collectionName,
        action: "update",
        docId,
        data,
      });
      return { success: false, queueId, error };
    }
  } else {
    // Offline: أضف للقائمة مباشرة
    const queueId = offlineQueue.add({
      collectionName,
      action: "update",
      docId,
      data,
    });
    return { success: false, queueId, offline: true };
  }
};

// Wrapper for deleteDoc
export const offlineDelete = async (collectionName, docId) => {
  if (isOnline()) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting document (online):", error);
      // إذا فشلت العملية online، أضفها للقائمة
      const queueId = offlineQueue.add({
        collectionName,
        action: "delete",
        docId,
      });
      return { success: false, queueId, error };
    }
  } else {
    // Offline: أضف للقائمة مباشرة
    const queueId = offlineQueue.add({
      collectionName,
      action: "delete",
      docId,
    });
    return { success: false, queueId, offline: true };
  }
};

// Read operations work directly with Firebase (uses cache when offline)
export const offlineGet = getDoc;
export const offlineGetDocs = getDocs;
export const offlineQuery = query;
export const offlineWhere = where;
export const offlineCollection = collection;
export const offlineDoc = doc;

// Export db for direct use when needed
export { db };

