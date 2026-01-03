// Pre-caching System - يجلب جميع البيانات الأساسية ويحفظها في IndexedDB
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/app/firebase";

/**
 * Pre-cache جميع البيانات الأساسية للتطبيق
 * @param {string} shop - اسم المتجر
 */
export async function preCacheData(shop) {
  if (!shop || typeof window === "undefined") {
    console.log("⚠️ Pre-cache skipped: shop not found or server-side");
    return;
  }

  if (!navigator.onLine) {
    console.log("⚠️ Pre-cache skipped: offline");
    return;
  }

  console.log("🔄 Starting pre-cache for shop:", shop);

  try {
    // قائمة بجميع Collections الأساسية
    const collections = [
      { name: "lacosteProducts", filter: { shop } },
      { name: "reports", filter: { shop } },
      { name: "masrofat", filter: { shop } },
      { name: "withdraws", filter: { shop } },
      { name: "employees", filter: { shop } },
      { name: "debts", filter: { shop } },
      { name: "dailySales", filter: { shop } },
      { name: "dailyProfit", filter: { shop } },
      { name: "debtsPayments", filter: { shop } },
      { name: "returns", filter: { shop } },
      { name: "deletedProducts", filter: { shop } },
      { name: "wared", filter: { shop } },
      { name: "employeeHours", filter: { shop } },
      { name: "employeeAdjustments", filter: { shop } },
      { name: "employeesReports", filter: { shop } },
      { name: "closeDayHistory", filter: { shop } },
    ];

    let totalCached = 0;
    const errors = [];

    // جلب البيانات من كل collection (Firebase يحفظها تلقائياً في IndexedDB)
    for (const col of collections) {
      try {
        const q = query(
          collection(db, col.name),
          where("shop", "==", shop)
        );
        
        // جلب البيانات (Firebase يحفظها تلقائياً في IndexedDB)
        const snapshot = await getDocs(q);
        totalCached += snapshot.size;
        
        console.log(`✅ Cached ${snapshot.size} documents from ${col.name}`);
      } catch (err) {
        console.error(`❌ Error caching ${col.name}:`, err);
        errors.push({ collection: col.name, error: err.message });
      }
    }

    // حفظ حالة Pre-cache في localStorage
    localStorage.setItem("preCacheCompleted", "true");
    localStorage.setItem("preCacheDate", new Date().toISOString());
    localStorage.setItem("preCacheShop", shop);

    console.log(`✅ Pre-cache completed: ${totalCached} total documents cached`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} collections failed to cache:`, errors);
    }

    return {
      success: true,
      totalCached,
      errors: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    console.error("❌ Error in pre-cache:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * التحقق من حالة Pre-cache
 */
export function getPreCacheStatus() {
  if (typeof window === "undefined") return null;

  const completed = localStorage.getItem("preCacheCompleted") === "true";
  const date = localStorage.getItem("preCacheDate");
  const shop = localStorage.getItem("preCacheShop");
  const currentShop = localStorage.getItem("shop");

  return {
    completed,
    date: date ? new Date(date) : null,
    shop,
    isCurrentShop: shop === currentShop,
  };
}

/**
 * مسح حالة Pre-cache (لإعادة التخزين)
 */
export function clearPreCacheStatus() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("preCacheCompleted");
  localStorage.removeItem("preCacheDate");
  localStorage.removeItem("preCacheShop");
}

