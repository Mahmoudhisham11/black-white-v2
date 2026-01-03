"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/app/firebase";

export function useProducts(shop) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "lacosteProducts"),
      where("shop", "==", shop)
    );

    // استخدام includeMetadataChanges: false لتحسين الأداء offline
    const unsubscribe = onSnapshot(
      q,
      {
        includeMetadataChanges: false, // تحسين الأداء - لا نستمع للتغييرات في metadata
      },
      (snapshot) => {
        // استخدام metadata للتحقق من مصدر البيانات
        const isFromCache = snapshot.metadata.fromCache;
        
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setProducts(data);
        setError(null);
        setLoading(false);
        
        // Log للتحقق من مصدر البيانات
        if (isFromCache) {
          console.log("📦 Products loaded from cache (offline)");
        } else {
          console.log("🌐 Products loaded from server (online)");
        }
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shop]);

  // استخدام useMemo لتحسين الأداء
  const filterProducts = useCallback((searchCode, filterType = "all") => {
    return products.filter((p) => {
      const search = searchCode.trim().toLowerCase();
      const matchName =
        search === "" ||
        (p.code && p.code.toString().toLowerCase().includes(search));
      const matchType =
        filterType === "all"
          ? true
          : filterType === "phone"
          ? p.type === "phone"
          : p.type !== "phone";
      return matchName && matchType;
    });
  }, [products]);

  return {
    products,
    loading,
    error,
    filterProducts,
  };
}
