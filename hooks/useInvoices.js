"use client";
import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/app/firebase";

// Helper function to load offline invoices from localStorage
const loadOfflineInvoices = (shop) => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("offlineInvoices");
    if (!saved) return [];
    const offlineInvoices = JSON.parse(saved);
    // فلترة حسب shop
    return offlineInvoices.filter(inv => inv.shop === shop);
  } catch (error) {
    console.error("Error loading offline invoices:", error);
    return [];
  }
};

// Helper function to merge invoices (Firebase + localStorage)
const mergeInvoices = (firebaseInvoices, offlineInvoices) => {
  // دمج الفواتير مع إزالة التكرارات
  const merged = [...firebaseInvoices];
  const firebaseIds = new Set(firebaseInvoices.map(inv => inv.id));
  
  // إنشاء Set للفواتير في Firebase باستخدام invoiceNumber + total + shop للتحقق من التكرار
  const firebaseInvoiceKeys = new Set(
    firebaseInvoices.map(inv => 
      `${inv.invoiceNumber}-${inv.total}-${inv.shop || ""}`
    )
  );
  
  offlineInvoices.forEach(offlineInv => {
    // التحقق من التكرار بطريقتين:
    // 1. التحقق من ID (للفواتير التي تم مزامنتها)
    // 2. التحقق من invoiceNumber + total + shop (للفواتير المكررة)
    const offlineKey = `${offlineInv.invoiceNumber}-${offlineInv.total}-${offlineInv.shop || ""}`;
    
    if (!firebaseIds.has(offlineInv.id) && !firebaseInvoiceKeys.has(offlineKey)) {
      // الفاتورة غير موجودة في Firebase، أضفها
      merged.push(offlineInv);
    } else {
      // الفاتورة موجودة في Firebase، لا تضيفها (تم مزامنتها)
      console.log(`🔄 Skipping duplicate offline invoice: ${offlineInv.invoiceNumber}`);
    }
  });
  
  // ترتيب حسب رقم الفاتورة (تنازلي)
  return merged.sort((a, b) => {
    const numA = a.invoiceNumber || 0;
    const numB = b.invoiceNumber || 0;
    return numB - numA;
  });
};

export function useInvoices(shop) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load offline invoices immediately
  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    // تحميل الفواتير المحلية فوراً
    const offlineInvoices = loadOfflineInvoices(shop);
    if (offlineInvoices.length > 0) {
      setInvoices(offlineInvoices);
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "dailySales"), where("shop", "==", shop));

    const unsubscribe = onSnapshot(
      q,
      {
        includeMetadataChanges: false,
      },
      (snapshot) => {
        const firebaseData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // دمج مع الفواتير المحلية
        const offlineInvoices = loadOfflineInvoices(shop);
        
        // تنظيف نهائي لجميع الفواتير المكررة من localStorage (حل احتياطي)
        if (offlineInvoices.length > 0 && firebaseData.length > 0) {
          const firebaseInvoiceKeys = new Set(
            firebaseData.map(inv => 
              `${inv.invoiceNumber}-${inv.total}-${inv.shop || ""}`
            )
          );
          
          // جلب جميع الفواتير المحلية (من جميع المتاجر)
          const allOfflineInvoices = JSON.parse(
            localStorage.getItem("offlineInvoices") || "[]"
          );
          
          // تنظيف جميع الفواتير المحلية (ليس فقط للمتجر الحالي)
          const cleanedAllInvoices = allOfflineInvoices.filter(offlineInv => {
            const offlineKey = `${offlineInv.invoiceNumber}-${offlineInv.total}-${offlineInv.shop || ""}`;
            const isDuplicate = firebaseInvoiceKeys.has(offlineKey);
            
            if (isDuplicate) {
              console.log(`🧹 Cleaning duplicate offline invoice: ${offlineInv.invoiceNumber} (shop: ${offlineInv.shop || "N/A"})`);
            }
            
            return !isDuplicate;
          });
          
          // حفظ الفواتير المحدثة إذا تغيرت
          if (cleanedAllInvoices.length < allOfflineInvoices.length) {
            try {
              localStorage.setItem("offlineInvoices", JSON.stringify(cleanedAllInvoices));
              const removedCount = allOfflineInvoices.length - cleanedAllInvoices.length;
              console.log(`🧹 Cleaned ${removedCount} duplicate invoice(s) from localStorage (final cleanup in useInvoices)`);
              
              // إعادة تحميل الفواتير المحلية للمتجر الحالي بعد التنظيف
              const cleanedShopInvoices = cleanedAllInvoices.filter(inv => inv.shop === shop);
              const merged = mergeInvoices(firebaseData, cleanedShopInvoices);
              setInvoices(merged);
              setError(null);
              setLoading(false);
              return; // الخروج مبكراً لأننا قمنا بتحديث القائمة
            } catch (err) {
              console.error("Error cleaning duplicate invoices:", err);
            }
          }
        }
        
        const merged = mergeInvoices(firebaseData, offlineInvoices);
        
        setInvoices(merged);
        setError(null);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching invoices:", error);
        // عند الخطأ، نستخدم الفواتير المحلية فقط
        const offlineInvoices = loadOfflineInvoices(shop);
        if (offlineInvoices.length > 0) {
          setInvoices(offlineInvoices);
        }
        setError(error);
        setLoading(false);
      }
    );

    // Listen for localStorage changes (when new offline invoices are added)
    const handleStorageChange = () => {
      setInvoices(prevInvoices => {
        const offlineInvoices = loadOfflineInvoices(shop);
        // تصفية الفواتير من Firebase (تلك التي ليست من localStorage)
        const currentFirebase = prevInvoices.filter(inv => 
          !inv.id?.startsWith("temp-") && 
          !inv.id?.startsWith("offline-") &&
          !inv.queueId // الفواتير من Firebase لا تحتوي على queueId
        );
        const merged = mergeInvoices(currentFirebase, offlineInvoices);
        return merged;
      });
    };

    // Handler خاص لحذف الفواتير
    const handleInvoiceRemoved = () => {
      console.log("🔄 Invoice removed event received, updating list...");
      setInvoices(prevInvoices => {
        // إعادة تحميل الفواتير المحلية
        const offlineInvoices = loadOfflineInvoices(shop);
        // تصفية الفواتير من Firebase فقط
        const currentFirebase = prevInvoices.filter(inv => 
          !inv.id?.startsWith("temp-") && 
          !inv.id?.startsWith("offline-") &&
          !inv.queueId
        );
        const merged = mergeInvoices(currentFirebase, offlineInvoices);
        console.log(`📊 Updated invoices: ${merged.length} total (${currentFirebase.length} from Firebase, ${offlineInvoices.length} offline)`);
        return merged;
      });
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Custom events for same-window updates
    window.addEventListener("offlineInvoiceAdded", handleStorageChange);
    window.addEventListener("offlineInvoiceRemoved", handleInvoiceRemoved);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("offlineInvoiceAdded", handleStorageChange);
      window.removeEventListener("offlineInvoiceRemoved", handleInvoiceRemoved);
    };
  }, [shop]);

  const filterInvoices = (searchTerm) => {
    if (!searchTerm) return invoices;
    return invoices.filter((inv) =>
      inv.invoiceNumber?.toString().includes(searchTerm)
    );
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return {
    invoices,
    loading,
    error,
    filterInvoices,
    formatDate,
  };
}