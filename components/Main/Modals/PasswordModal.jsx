"use client";
import styles from "../styles.module.css";
import { useState, useEffect, useRef } from "react";

export default function PasswordModal({
  isOpen,
  onClose,
  onConfirm,
  finalPrice,
  title = "إدخال كلمة المرور",
  message = "أدخل كلمة المرور للسماح بالخصم",
}) {
  const [password, setPassword] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(password);
    setPassword("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {message && <p style={{ margin: "10px 0", color: "var(--text-secondary)" }}>{message}</p>}
        {finalPrice && (
          <p style={{ margin: "10px 0", fontSize: "14px", color: "var(--text-tertiary)" }}>
            السعر النهائي: {finalPrice} EGP
          </p>
        )}
        <div style={{ margin: "20px 0" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "var(--text-label)" }}>
            كلمة المرور:
          </label>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className={styles.modalInput}
            placeholder="أدخل كلمة المرور"
            autoFocus
          />
        </div>
        <div className={styles.popupBtns}>
          <button onClick={onClose} className={styles.cancelBtn}>
            إلغاء
          </button>
          <button onClick={handleConfirm} className={styles.addBtn} disabled={!password.trim()}>
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}



