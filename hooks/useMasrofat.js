"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase";

export function useMasrofat(shop) {
  const [masrofat, setMasrofat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    const fetchMasrofat = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "masrofat"),
          where("shop", "==", shop)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setMasrofat(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching masrofat:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMasrofat();
  }, [shop]);

  // حساب إجمالي المصروفات بدون "فاتورة مرتجع"
  const totalMasrofat = masrofat.reduce((sum, item) => {
    // استبعاد المصروفات التي سببها "فاتورة مرتجع"
    if (item.reason === "فاتورة مرتجع") {
      return sum;
    }
    return sum + Number(item.masrof || 0);
  }, 0);

  // إجمالي المصروفات الكامل (شامل المرتجع)
  const totalMasrofatWithReturn = masrofat.reduce(
    (sum, item) => sum + Number(item.masrof || 0),
    0
  );

  return {
    masrofat,
    loading,
    error,
    totalMasrofat,
    totalMasrofatWithReturn,
  };
}
