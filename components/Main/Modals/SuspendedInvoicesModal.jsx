"use client";
import styles from "../styles.module.css";
import { FaRegTrashAlt } from "react-icons/fa";

export default function SuspendedInvoicesModal({
  isOpen,
  onClose,
  suspendedInvoices,
  onRestore,
  onDelete,
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
        <h3>الفواتير المعلقة</h3>
        <div style={{ marginTop: "20px" }}>
          {suspendedInvoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              <p>لا توجد فواتير معلقة</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {suspendedInvoices.map((invoice, index) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    background: "var(--surface-hover)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                      {invoice.clientName || "بدون اسم"}
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                      {invoice.items?.length || 0} منتج - الإجمالي: {invoice.total?.toFixed(2) || "0.00"} جنيه
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => onRestore(index)}
                      className={styles.confirmBtn}
                      style={{ padding: "8px 16px", fontSize: "14px" }}
                    >
                      استعادة
                    </button>
                    <button
                      onClick={() => onDelete(index)}
                      className={styles.deleteBtn}
                      style={{ padding: "8px 12px" }}
                      title="حذف"
                    >
                      <FaRegTrashAlt />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.popupBtns} style={{ marginTop: "20px" }}>
          <button onClick={onClose} className={styles.cancelBtn}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

