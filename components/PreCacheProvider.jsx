"use client";
import { useEffect } from "react";
import { preCacheData, getPreCacheStatus } from "@/utils/preCache";

export default function PreCacheProvider() {
  useEffect(() => {
    // التحقق من حالة Pre-cache
    const status = getPreCacheStatus();
    const shop = localStorage.getItem("shop");

    if (!shop) {
      console.log("⚠️ Pre-cache skipped: shop not found");
      return;
    }

    // إذا كان Pre-cache تم بالفعل لنفس المتجر، لا حاجة لإعادة التخزين
    if (status?.completed && status?.isCurrentShop) {
      console.log("✅ Pre-cache already completed for this shop");
      return;
    }

    // إذا كان المستخدم online، قم بـ Pre-cache
    if (navigator.onLine) {
      console.log("🔄 Starting pre-cache...");
      preCacheData(shop).then((result) => {
        if (result?.success) {
          console.log(`✅ Pre-cache completed: ${result.totalCached} documents`);
        } else {
          console.error("❌ Pre-cache failed:", result?.error);
        }
      });
    } else {
      console.log("⚠️ Pre-cache skipped: offline");
    }
  }, []);

  return null; // هذا component لا يعرض أي شيء
}

