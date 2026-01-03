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
  
  offlineInvoices.forEach(offlineInv => {
    // إذا كانت الفاتورة غير موجودة في Firebase، أضفها
    if (!firebaseIds.has(offlineInv.id)) {
      merged.push(offlineInv);
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
        const currentFirebase = prevInvoices.filter(inv => !inv.id?.startsWith("temp-") && !inv.id?.startsWith("offline-"));
        const merged = mergeInvoices(currentFirebase, offlineInvoices);
        return merged;
      });
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-window updates
    window.addEventListener("offlineInvoiceAdded", handleStorageChange);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("offlineInvoiceAdded", handleStorageChange);
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