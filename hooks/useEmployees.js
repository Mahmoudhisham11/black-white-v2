"use client";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase";

export function useEmployees(shop) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "employees"),
          where("shop", "==", shop)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setEmployees(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [shop]);

  return {
    employees,
    loading,
    error,
  };
}
