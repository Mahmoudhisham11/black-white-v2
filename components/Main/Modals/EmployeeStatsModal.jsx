"use client";
import styles from "../styles.module.css";

export default function EmployeeStatsModal({
  isOpen,
  onClose,
  employeeName,
  stats,
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
        <h3>إحصائيات الموظف - {employeeName}</h3>
        <div style={{ marginTop: "20px" }}>
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "16px",
            padding: "20px",
            background: "var(--surface-hover)",
            borderRadius: "12px"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px",
              background: "var(--surface)",
              borderRadius: "8px"
            }}>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                عدد الفواتير:
              </span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--main-color)" }}>
                {stats.invoiceCount}
              </span>
            </div>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px",
              background: "var(--surface)",
              borderRadius: "8px"
            }}>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                عدد القطع:
              </span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--main-color)" }}>
                {stats.totalItems}
              </span>
            </div>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: "12px",
              background: "var(--surface)",
              borderRadius: "8px"
            }}>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                إجمالي المبيعات:
              </span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--success)" }}>
                {stats.totalSales.toFixed(2)} جنيه
              </span>
            </div>
          </div>
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

