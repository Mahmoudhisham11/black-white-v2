// Offline Queue System - يحفظ العمليات المعلقة عند عدم وجود إنترنت
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";

class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.syncing = false;
  }

  loadQueue() {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("offlineQueue");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading offline queue:", error);
      return [];
    }
  }

  saveQueue() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("offlineQueue", JSON.stringify(this.queue));
    } catch (error) {
      console.error("Error saving offline queue:", error);
    }
  }

  add(operation) {
    const queueItem = {
      ...operation,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0,
    };

    this.queue.push(queueItem);
    this.saveQueue();
    console.log("📝 Added to offline queue:", queueItem);
    return queueItem.id;
  }

  remove(queueId) {
    this.queue = this.queue.filter((item) => item.id !== queueId);
    this.saveQueue();
  }

  getPending() {
    return this.queue.filter((item) => !item.synced);
  }

  async sync() {
    if (this.syncing) {
      console.log("⏳ Sync already in progress");
      return;
    }

    if (!navigator.onLine) {
      console.log("📴 No internet connection, skipping sync");
      return;
    }

    const pending = this.getPending();
    if (pending.length === 0) {
      console.log("✅ No pending operations to sync");
      return;
    }

    this.syncing = true;
    console.log(`🔄 Syncing ${pending.length} pending operations...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of pending) {
      try {
        await this.executeOperation(item);
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        results.success++;
        console.log(`✅ Synced operation: ${item.id}`);
      } catch (error) {
        item.retries = (item.retries || 0) + 1;
        results.failed++;
        results.errors.push({ id: item.id, error: error.message });
        console.error(`❌ Failed to sync operation ${item.id}:`, error);

        // إذا فشلت العملية أكثر من 5 مرات، نحذفها من القائمة
        if (item.retries >= 5) {
          console.warn(`⚠️ Removing failed operation after 5 retries: ${item.id}`);
          this.remove(item.id);
        }
      }
      this.saveQueue();
    }

    // حذف العمليات المكتملة
    this.queue = this.queue.filter((item) => item.synced || item.retries >= 5);
    this.saveQueue();

    this.syncing = false;
    console.log(`✅ Sync completed: ${results.success} success, ${results.failed} failed`);

    return results;
  }

  async executeOperation(item) {
    const { collectionName, action, data, docId } = item;

    switch (action) {
      case "add":
        if (!data) {
          throw new Error("Data is required for add operation");
        }
        await addDoc(collection(db, collectionName), data);
        break;

      case "update":
        if (!docId || !data) {
          throw new Error("docId and data are required for update operation");
        }
        await updateDoc(doc(db, collectionName, docId), data);
        break;

      case "delete":
        if (!docId) {
          throw new Error("docId is required for delete operation");
        }
        await deleteDoc(doc(db, collectionName, docId));
        break;

      default:
        throw new Error(`Unknown operation: ${action}`);
    }
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  getQueueSize() {
    return this.queue.length;
  }

  getPendingCount() {
    return this.getPending().length;
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

