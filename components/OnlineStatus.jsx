"use client";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import styles from "./OnlineStatus.module.css";

export default function OnlineStatus() {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // لا تظهر أي شيء إذا كان كل شيء طبيعي
  }

  return (
    <div className={`${styles.statusBanner} ${!isOnline ? styles.offline : styles.online}`}>
      {!isOnline ? (
        <span>📴 لا يوجد اتصال بالإنترنت - وضع Offline</span>
      ) : isSyncing ? (
        <span>🔄 جاري المزامنة... ({pendingCount} عملية معلقة)</span>
      ) : pendingCount > 0 ? (
        <span>⏳ {pendingCount} عملية في انتظار المزامنة</span>
      ) : null}
    </div>
  );
}

