"use client";
import styles from "./styles.module.css";
import { IoMdSearch, IoIosCloseCircle } from "react-icons/io";
import { FaRegTrashAlt } from "react-icons/fa";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";

export default function CartSidebar({
  isOpen,
  onClose,
  cart,
  products,
  searchCode,
  onSearchChange,
  onDeleteInvoice,
  onSuspendInvoice,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  profit,
  finalTotal,
  appliedDiscount,
  onOpenClientModal,
  isSaving = false,
}) {
  return (
    <div className={`${styles.resetContainer} ${isOpen ? styles.active : ''}`}>
      <div className={styles.reset}>
        <div className={styles.topReset}>
          <div className={styles.resetTitle}>
            <h3>محتوى الفاتورة</h3>
            <button className={styles.sallesBtn} onClick={onClose}>
              <IoIosCloseCircle />
            </button>
          </div>
          
          <div className={styles.resetActions}>
            <div className={styles.inputBox}>
              <label>
                <IoMdSearch />
              </label>
              <input
                type="text"
                list="codeList"
                placeholder="ابحث بالكود"
                value={searchCode}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <datalist id="codeList">
                {products.map((p) => (
                  <option key={p.id} value={p.code} />
                ))}
              </datalist>
            </div>
            <button onClick={onDeleteInvoice} className={styles.deleteBtn}>
              حذف الفاتورة
            </button>
          </div>
        </div>
        
        <hr />
        
        <div className={styles.orderBox}>
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🛒</div>
              <h3>السلة فارغة</h3>
              <p>ابدأ بإضافة منتجات للفاتورة</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onUpdateQuantity={onUpdateQuantity}
                isLoading={isSaving}
              />
            ))
          )}
        </div>

        <CartSummary
          subtotal={subtotal}
          profit={profit}
          finalTotal={finalTotal}
          appliedDiscount={appliedDiscount}
          onOpenClientModal={onOpenClientModal}
          onSuspendInvoice={onSuspendInvoice}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
