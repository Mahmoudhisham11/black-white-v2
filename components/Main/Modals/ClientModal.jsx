"use client";
import styles from "../styles.module.css";
import { useRef } from "react";

export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  employees,
  selectedEmployee,
  onEmployeeChange,
  isSaving,
}) {
  const nameRef = useRef();
  const phoneRef = useRef();

  if (!isOpen) return null;

  const handleSave = () => {
    const clientName = nameRef.current?.value || "";
    const phone = phoneRef.current?.value || "";
    onSave({ clientName, phone });
  };

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
        <h3>إضافة بيانات العميل</h3>
        <label>اسم العميل:</label>
        <input
          type="text"
          ref={nameRef}
          placeholder="اكتب اسم العميل"
          className={styles.modalInput}
        />
        <label>رقم الهاتف:</label>
        <input
          type="text"
          ref={phoneRef}
          placeholder="اكتب رقم الهاتف"
          className={styles.modalInput}
        />
        <label>اسم الموظف:</label>
        <select
          value={selectedEmployee}
          onChange={(e) => onEmployeeChange(e.target.value)}
          className={styles.modalSelect}
        >
          <option value="">اختر الموظف</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.name}>
              {emp.name}
            </option>
          ))}
        </select>
        <div className={styles.popupBtns}>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={styles.addBtn}
            style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "not-allowed" : "pointer" }}
          >
            {isSaving ? "⏳ جاري الحفظ..." : "حفظ"}
          </button>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className={styles.cancelBtn}
            style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "not-allowed" : "pointer" }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}


