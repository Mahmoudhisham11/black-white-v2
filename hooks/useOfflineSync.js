"use client";
import { useEffect, useState, useCallback } from "react";
import { offlineQueue } from "@/utils/offlineQueue";
import { useNotification } from "@/contexts/NotificationContext";

export function useOfflineSync() {
  const { success, warning } = useNotification();
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = useCallback(() => {
    const count = offlineQueue.getPendingCount();
    setPendingCount(count);
  }, []);

  // Sync function
  const sync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("📴 No internet connection");
      return;
    }

    setIsSyncing(true);
    try {
      const results = await offlineQueue.sync();
      if (results && results.success > 0) {
        success(`✅ تم مزامنة ${results.success} عملية بنجاح`);
      }
      if (results && results.failed > 0) {
        warning(`⚠️ فشلت ${results.failed} عملية في المزامنة`);
      }
      updatePendingCount();
    } catch (error) {
      console.error("Sync error:", error);
      warning("حدث خطأ أثناء المزامنة");
    } finally {
      setIsSyncing(false);
    }
  }, [success, warning, updatePendingCount]);

  useEffect(() => {
    // Initial pending count
    updatePendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      console.log("🌐 Internet connection restored");
      
      // انتظر قليلاً قبل المزامنة للتأكد من استقرار الاتصال
      setTimeout(() => {
        sync();
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Internet connection lost");
      // لا نعرض إشعار - فقط نحدث الحالة
    };

    // Listen to online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic sync check (every 30 seconds if online)
    const syncInterval = setInterval(() => {
      if (navigator.onLine && !isSyncing) {
        const pending = offlineQueue.getPendingCount();
        if (pending > 0) {
          console.log(`🔄 Auto-syncing ${pending} pending operations...`);
          sync();
        }
      }
      updatePendingCount();
    }, 30000); // كل 30 ثانية

    // Sync on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine && !isSyncing) {
        const pending = offlineQueue.getPendingCount();
        if (pending > 0) {
          sync();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(syncInterval);
    };
  }, [sync, isSyncing, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    sync,
    updatePendingCount,
  };
}

