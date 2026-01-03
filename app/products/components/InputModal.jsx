"use client";
import { useState, useEffect, useRef } from "react";
import styles from "../styles.module.css";

export default function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title = "إدخال البيانات",
  message = "",
  placeholder = "",
  defaultValue = "",
  type = "text",
  min,
  max,
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setValue(defaultValue);
    } else {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (value.trim() || type === "number") {
      onConfirm(value);
      setValue("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>{title}</h3>
            <button onClick={onClose} className={styles.closeBtn}>
              ✖
            </button>
          </div>
          {message && (
            <p style={{ margin: "10px 0", color: "var(--text-secondary)" }}>
              {message}
            </p>
          )}
          <div style={{ margin: "20px 0" }}>
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className={styles.modalInput}
              placeholder={placeholder}
              min={min}
              max={max}
              autoFocus
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 20,
            }}
          >
            <button onClick={onClose} className={styles.btnOutline}>
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className={styles.btnPrimary}
              disabled={type === "text" && !value.trim()}
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



