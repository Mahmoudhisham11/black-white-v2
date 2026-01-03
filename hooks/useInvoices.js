"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/app/firebase";

export function useInvoices(shop) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "dailySales"), where("shop", "==", shop));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInvoices(data);
        setError(null);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching invoices:", error);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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