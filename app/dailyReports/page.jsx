"use client";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import Loader from "@/components/Loader/Loader";

export default function DailyReports() {
  const [products, setProducts] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // دالة حساب كمية منتج واحد (حسب الألوان والمقاسات)
  const computeTotalQtyFromColors = useCallback((colorsArr) => {
    let total = 0;
    if (!Array.isArray(colorsArr)) return 0;
    colorsArr.forEach((c) => {
      if (Array.isArray(c.sizes)) {
        c.sizes.forEach((s) => {
          total += Number(s.qty || 0);
        });
      } else if (c.quantity) {
        total += Number(c.quantity || 0);
      }
    });
    return total;
  }, []);

  // دالة حساب إجمالي كل المنتجات بعد الفلترة
  const computeTotalProducts = useCallback((arr) => {
    let total = 0;
    arr.forEach((product) => {
      if (product.colors && product.colors.length) {
        total += computeTotalQtyFromColors(product.colors);
      } else {
        total += Number(product.quantity || 0);
      }
    });
    return total;
  }, [computeTotalQtyFromColors]);

  // فلترة المنتجات حسب القسم
  const filteredProducts = useMemo(() => {
    if (!selectedSection) {
      return products;
    }
    return products.filter((p) => p.section === selectedSection);
  }, [products, selectedSection]);

  // حساب إجمالي الكمية
  const totalQty = useMemo(() => {
    return computeTotalProducts(filteredProducts);
  }, [filteredProducts, computeTotalProducts]);

  useEffect(() => {
    const shop = localStorage.getItem("shop");
    if (!shop) {
      setError("لم يتم العثور على المتجر");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "lacosteProducts"),
      where("shop", "==", shop),
      where("type", "==", "product")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setProducts(data);
          setError(null);
        } catch (err) {
          console.error("Error processing data:", err);
          setError("حدث خطأ أثناء معالجة البيانات");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError("حدث خطأ أثناء جلب البيانات");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className={styles.dailyReports}>
        <SideBar />
        <div className={styles.content}>
          <div className={styles.errorState}>
            <p>❌ {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dailyReports}>
      <SideBar />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>جرد يومي</h2>
        </div>

        {/* Search Box */}
        <div className={styles.searchBox}>
          <div className={styles.inputContainer}>
            <label className={styles.sectionLabel}>البحث بالقسم:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className={styles.sectionSelect}
            >
              <option value="">كل الأقسام</option>
              <option value="جينز">جينز</option>
              <option value="تيشيرت">تيشيرت</option>
              <option value="شروال">شروال</option>
              <option value="جاكت">جاكت</option>
              <option value="قميص">قميص</option>
              <option value="ترينج">ترينج</option>
              <option value="اندر شيرت">اندر شيرت</option>
            </select>
          </div>
        </div>

        {/* Total Quantity */}
        <div className={styles.totalCard}>
          <h3 className={styles.totalLabel}>إجمالي الكمية:</h3>
          <span className={styles.totalValue}>{totalQty}</span>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.reportsTable}>
            <thead>
              <tr>
                <th>الكود</th>
                <th>الاسم</th>
                <th>الكمية</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      <p>❌ لا توجد منتجات</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const qty = p.colors?.length
                    ? computeTotalQtyFromColors(p.colors)
                    : Number(p.quantity || 0);

                  return (
                    <tr key={p.id}>
                      <td className={styles.codeCell}>{p.code || "-"}</td>
                      <td className={styles.nameCell}>{p.name || "-"}</td>
                      <td className={styles.quantityCell}>{qty}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
