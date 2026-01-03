"use client";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaRegTrashAlt } from "react-icons/fa";
import { NotificationProvider, useNotification } from "@/contexts/NotificationContext";
import ConfirmModal from "@/components/Main/Modals/ConfirmModal";

function WaredContent() {
  const { success, error: showError } = useNotification();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const colRef = collection(db, "wared");

    const unsub = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ترتيب حسب التاريخ تنازليًا
      data.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.seconds || 0) * 1000;
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.seconds || 0) * 1000;
        return dateB - dateA;
      });

      setProducts(data);
      setFiltered(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    // Reset selection when filtered products change
    setSelectedIds(new Set());
  }, [filtered]);

  // Auto filter by date when searchDate changes
  useEffect(() => {
    if (!searchDate) {
      setFiltered(products);
      return;
    }

    const selectedDate = new Date(searchDate).toLocaleDateString("ar-EG");

    const result = products.filter(p => {
      if (!p.date?.toDate) return false;
      const productDate = p.date.toDate().toLocaleDateString("ar-EG");
      return productDate === selectedDate;
    });

    setFiltered(result);
  }, [searchDate, products]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length;

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      showError("يرجى تحديد منتج واحد على الأقل للحذف");
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const docRef = doc(db, "wared", id);
        batch.delete(docRef);
      });

      await batch.commit();
      success(`تم حذف ${selectedIds.size} منتج بنجاح`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error deleting products:", err);
      showError("حدث خطأ أثناء حذف المنتجات");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteSingle = (id) => {
    setSelectedIds(new Set([id]));
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSingle = async () => {
    const id = Array.from(selectedIds)[0];
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "wared", id));
      success("تم حذف المنتج بنجاح");
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error deleting product:", err);
      showError("حدث خطأ أثناء حذف المنتج");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedIds.size === 1) {
      confirmDeleteSingle();
    } else {
      confirmDeleteSelected();
    }
  };

  return (
    <div className={styles.wared}>
      <SideBar />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>الوارد</h2>
          <div className={styles.headerActions}>
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className={styles.deleteSelectedBtn}
                disabled={isDeleting}
              >
                <FaRegTrashAlt />
                حذف المحدد ({selectedIds.size})
              </button>
            )}
          </div>
        </div>

        {/* Search Box */}
        <div className={styles.searchBox}>
          <div className={styles.inputContainer}>
            <label className={styles.dateLabel}>البحث بالتاريخ:</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className={styles.dateInput}
              placeholder="اختر التاريخ"
            />
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.waredTable}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className={styles.checkbox}
                  />
                </th>
                <th>الكود</th>
                <th>الاسم</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>التاريخ</th>
                <th>خيارات</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      <p>❌ لا توجد منتجات</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className={selectedIds.has(p.id) ? styles.selectedRow : ""}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={(e) => handleSelectItem(p.id, e.target.checked)}
                        className={styles.checkbox}
                      />
                    </td>
                    <td className={styles.codeCell}>{p.code ?? "-"}</td>
                    <td className={styles.nameCell}>{p.name ?? "-"}</td>
                    <td className={styles.quantityCell}>{p.quantity ?? "-"}</td>
                    <td className={styles.priceCell}>{p.price ? `${p.price} EGP` : "-"}</td>
                    <td className={styles.dateCell}>
                      {p.date?.toDate
                        ? p.date.toDate().toLocaleDateString("ar-EG")
                        : "-"}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={() => handleDeleteSingle(p.id)}
                        className={styles.deleteBtn}
                        disabled={isDeleting}
                        title="حذف"
                      >
                        <FaRegTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          if (selectedIds.size === 1) {
            setSelectedIds(new Set());
          }
        }}
        title="تأكيد الحذف"
        message={
          selectedIds.size === 1
            ? "هل أنت متأكد أنك تريد حذف هذا المنتج؟"
            : `هل أنت متأكد أنك تريد حذف ${selectedIds.size} منتج؟`
        }
        onConfirm={handleConfirmDelete}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

export default function Wared() {
  return (
    <NotificationProvider>
      <WaredContent />
    </NotificationProvider>
  );
}
