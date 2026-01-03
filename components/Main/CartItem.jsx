"use client";
import styles from "./styles.module.css";
import { FaRegTrashAlt } from "react-icons/fa";

export default function CartItem({ item, onRemove, onUpdateQuantity, isLoading = false }) {
  return (
    <div className={styles.ordersContainer}>
      <div className={styles.orderInfo}>
        <div className={styles.orderContent}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className={styles.deleteItemBtn}
            disabled={isLoading}
            title={isLoading ? "جاري المعالجة..." : "حذف"}
          >
            <FaRegTrashAlt />
          </button>
          <div className={styles.text}>
            <h4>
              {item.name} {item.color ? ` - ${item.color}` : ""}{" "}
              {item.size ? ` - ${item.size}` : ""}
            </h4>
            <p>{item.total} EGP</p>
          </div>
        </div>
        <div className={styles.qtyInput}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(item, -1);
            }}
            disabled={isLoading}
            title={isLoading ? "جاري المعالجة..." : "تقليل الكمية"}
          >
            -
          </button>
          <input type="text" value={item.quantity} readOnly disabled={isLoading} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(item, 1);
            }}
            disabled={isLoading}
            title={isLoading ? "جاري المعالجة..." : "زيادة الكمية"}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
