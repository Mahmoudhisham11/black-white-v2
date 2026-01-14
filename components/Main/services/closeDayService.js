// Service for closing day operations
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { offlineAdd, offlineDelete } from "@/utils/firebaseOffline";

// Helper function to check if online
const isOnline = () => {
  return typeof window !== "undefined" && navigator.onLine;
};

// Helper function to load offline invoices
const loadOfflineInvoices = (shop) => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("offlineInvoices");
    if (!saved) return [];
    const offlineInvoices = JSON.parse(saved);
    return offlineInvoices.filter(inv => inv.shop === shop);
  } catch (error) {
    console.error("Error loading offline invoices:", error);
    return [];
  }
};

// Helper function to load offline masrofat from queue
const loadOfflineMasrofat = (shop) => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("offlineQueue");
    if (!saved) return [];
    const queue = JSON.parse(saved);
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    
    // استخراج المصاريف من قائمة الانتظار
    return queue
      .filter(op => 
        !op.synced && 
        op.collectionName === "masrofat" && 
        op.action === "add" &&
        op.data?.shop === shop &&
        op.data?.date === todayStr
      )
      .map(op => ({
        id: op.id,
        ...op.data,
        isOffline: true
      }));
  } catch (error) {
    console.error("Error loading offline masrofat:", error);
    return [];
  }
};

export const closeDayService = {
  async closeDay(shop, userName) {
    try {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      const todayStr = `${day}/${month}/${year}`;

      // Get sales (من Firebase + localStorage)
      let allSales = [];
      try {
        const salesQuery = query(
          collection(db, "dailySales"),
          where("shop", "==", shop)
        );
        const salesSnapshot = await getDocs(salesQuery);
        salesSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allSales.push({ id: docSnap.id, ...data });
        });
      } catch (error) {
        console.error("Error getting sales from Firebase:", error);
      }

      // إضافة الفواتير المحلية
      const offlineInvoices = loadOfflineInvoices(shop);
      offlineInvoices.forEach(inv => {
        if (!allSales.find(s => s.id === inv.id)) {
          allSales.push(inv);
        }
      });

      if (allSales.length === 0) {
        return { success: false, message: "لا يوجد عمليات لتقفيلها اليوم" };
      }

      // Get expenses (من Firebase + localStorage)
      let allMasrofat = [];
      try {
        const masrofatQuery = query(
          collection(db, "masrofat"),
          where("shop", "==", shop)
        );
        const masrofatSnapshot = await getDocs(masrofatQuery);
        masrofatSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allMasrofat.push({ id: docSnap.id, ...data });
        });
      } catch (error) {
        console.error("Error getting masrofat from Firebase:", error);
      }

      // إضافة المصاريف المحلية من قائمة الانتظار
      const offlineMasrofat = loadOfflineMasrofat(shop);
      offlineMasrofat.forEach(masrof => {
        if (!allMasrofat.find(m => m.id === masrof.id)) {
          allMasrofat.push(masrof);
        }
      });

      // Calculate totals
      let totalSales = 0;
      allSales.forEach((sale) => {
        totalSales += sale.total || 0;
      });

      let totalMasrofat = 0;
      let returnedProfit = 0;
      let netMasrof = 0;

      allMasrofat.forEach((masrof) => {
        netMasrof += masrof.masrof || 0;
        if (masrof.date === todayStr) {
          if (masrof.reason === "فاتورة مرتجع") {
            returnedProfit += masrof.profit || 0;
          } else {
            totalMasrofat += masrof.masrof || 0;
          }
        }
      });

      // إنشاء بيانات التقفيلة
      const now = isOnline() ? Timestamp.now() : new Date();
      const closeDayData = {
        shop,
        closedBy: userName,
        closedAt: todayStr,
        closedAtTimestamp: now,
        sales: allSales,
        masrofat: allMasrofat,
        totalSales,
        totalMasrofat: Number(netMasrof),
        returnedProfit,
      };

      // عند online: استخدام Batch operations
      if (isOnline()) {
        try {
          const batch = writeBatch(db);

          // Move dailySales to reports (فقط من Firebase)
          const firebaseSales = allSales.filter(s => !s.id?.startsWith("temp-") && !s.id?.startsWith("offline-"));
          for (const sale of firebaseSales) {
            const saleRef = doc(db, "dailySales", sale.id);
            const reportRef = doc(collection(db, "reports"));
            batch.set(reportRef, {
              ...sale,
              closedBy: userName,
            });
            batch.delete(saleRef);
          }

          // Save daily profit
          const profitData = {
            shop,
            date: todayStr,
            totalSales,
            totalMasrofat: Number(netMasrof),
            returnedProfit,
            createdAt: Timestamp.now(),
            closedBy: userName,
          };
          const profitRef = doc(collection(db, "dailyProfit"));
          batch.set(profitRef, profitData);

          // Delete today's expenses (فقط من Firebase)
          const firebaseMasrofat = allMasrofat.filter(m => !m.isOffline);
          for (const masrof of firebaseMasrofat) {
            if (masrof.date === todayStr) {
              const masrofRef = doc(db, "masrofat", masrof.id);
              batch.delete(masrofRef);
            }
          }

          // Create close day history
          const closeRef = doc(collection(db, "closeDayHistory"));
          batch.set(closeRef, closeDayData);

          await batch.commit();

          // حذف الفواتير المحلية بعد التقفيل الناجح
          if (typeof window !== "undefined") {
            try {
              const offlineInvoices = loadOfflineInvoices(shop);
              const remainingInvoices = offlineInvoices.filter(inv => 
                !allSales.find(s => s.id === inv.id)
              );
              localStorage.setItem("offlineInvoices", JSON.stringify(remainingInvoices));
            } catch (err) {
              console.error("Error cleaning offline invoices:", err);
            }
          }

          return { success: true, message: "تم تقفيل اليوم بنجاح" };
        } catch (error) {
          console.error("Error in batch commit, saving offline:", error);
          // Fallback to offline save
        }
      }

      // عند offline: حفظ محلياً وإضافة للقائمة
      if (typeof window !== "undefined") {
        try {
          // حفظ التقفيلة محلياً
          const offlineCloses = JSON.parse(
            localStorage.getItem("offlineCloses") || "[]"
          );
          const closeId = `offline-close-${Date.now()}`;
          offlineCloses.push({
            id: closeId,
            ...closeDayData,
            closedAtTimestamp: new Date().toISOString(),
          });
          localStorage.setItem("offlineCloses", JSON.stringify(offlineCloses));

          // إضافة عمليات التقفيل للقائمة
          // 1. نقل الفواتير إلى reports
          for (const sale of allSales) {
            if (!sale.id?.startsWith("temp-") && !sale.id?.startsWith("offline-")) {
              await offlineAdd("reports", {
                ...sale,
                closedBy: userName,
              });
              await offlineDelete("dailySales", sale.id);
            }
          }

          // 2. حفظ daily profit
          await offlineAdd("dailyProfit", {
            shop,
            date: todayStr,
            totalSales,
            totalMasrofat: Number(netMasrof),
            returnedProfit,
            createdAt: new Date(),
            closedBy: userName,
          });

          // 3. حذف مصاريف اليوم
          for (const masrof of allMasrofat) {
            if (masrof.date === todayStr && !masrof.isOffline) {
              await offlineDelete("masrofat", masrof.id);
            }
          }

          // 4. حفظ closeDayHistory
          await offlineAdd("closeDayHistory", closeDayData);

          // حذف الفواتير المحلية بعد التقفيل
          const offlineInvoices = loadOfflineInvoices(shop);
          const remainingInvoices = offlineInvoices.filter(inv => 
            !allSales.find(s => s.id === inv.id)
          );
          localStorage.setItem("offlineInvoices", JSON.stringify(remainingInvoices));

          // إرسال event لتحديث القائمة
          window.dispatchEvent(new Event("offlineCloseAdded"));

          return { 
            success: true, 
            message: "تم تقفيل اليوم بنجاح (سيتم المزامنة عند عودة الاتصال)",
            offline: true,
            closeId
          };
        } catch (error) {
          console.error("Error saving offline close:", error);
          return { success: false, error, message: "حدث خطأ أثناء حفظ التقفيلة" };
        }
      }

      return { success: false, message: "لا يمكن تقفيل اليوم في هذا السياق" };
    } catch (error) {
      console.error("Error closing day:", error);
      return { success: false, error };
    }
  },
};
