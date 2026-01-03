"use client";
import styles from "../styles.module.css";

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  type = "warning",
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
        <h3>{title || "تأكيد العملية"}</h3>
        <p style={{ margin: "20px 0", fontSize: "16px" }}>{message}</p>
        <div className={styles.popupBtns}>
          <button onClick={onClose} className={styles.cancelBtn}>
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`${styles.confirmBtn} ${
              type === "danger" ? styles.danger : ""
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}




