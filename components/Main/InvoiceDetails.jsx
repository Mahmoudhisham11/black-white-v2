"use client";
import styles from "./styles.module.css";
import { IoIosCloseCircle } from "react-icons/io";
import { PERMISSIONS } from "@/constants/config";

export default function InvoiceDetails({ 
  invoice, 
  onClose, 
  onPrint, 
  onReturn,
  returningItemsState,
  userName 
}) {
  if (!invoice) return null;

  const canReturn = PERMISSIONS.RETURN_PRODUCTS(userName);
  const canViewProfit = PERMISSIONS.VIEW_PROFIT(userName);

  const formatDate = (date) => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className={styles.invoiceSidebar}>
      <div className={styles.sidebarHeader}>
        <h4>فاتورة العميل</h4>
        <button onClick={onClose} className={styles.closeBtn}>
          <IoIosCloseCircle size={22} />
        </button>
      </div>

      <button onClick={() => onPrint(invoice.invoiceNumber)} className={styles.printBtn}>
        🖨️ طباعة فاتورة
      </button>

      <div className={styles.sidebarInfo}>
        <p>
          <strong>👤 العميل:</strong> {invoice.clientName || "بدون اسم"}
        </p>
        <p>
          <strong>📞 الهاتف:</strong> {invoice.phone || "-"}
        </p>
        <p>
          <strong>💼 الموظف:</strong> {invoice.employee || "غير محدد"}
        </p>
        <p>
          <strong>🕒 التاريخ:</strong> {formatDate(invoice.date)}
        </p>
        
        {canViewProfit && invoice.profit !== undefined && (
          <p>
            <strong>📈 ربح الفاتورة:</strong> {invoice.profit} جنيه
          </p>
        )}

        {invoice.discount > 0 && (
          <p>
            <strong>🔖 الخصم:</strong> {invoice.discount} جنيه
            {invoice.discountNotes
              ? ` (ملاحظة: ${invoice.discountNotes})`
              : ""}
          </p>
        )}
        
        <p>
          <strong>💰 الإجمالي:</strong> {invoice.total} جنيه
        </p>
      </div>

      <div className={styles.sidebarProducts}>
        <h5>المنتجات</h5>
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>المنتج</th>
              <th>السعر</th>
              {canViewProfit && <th>سعر الجملة</th>}
              <th>الكمية</th>
              {canReturn && <th>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {invoice.cart?.map((item, idx) => {
              const itemKey = `${item.code}_${item.color || ""}_${item.size || ""}`;
              const isReturning = returningItemsState[itemKey];
              
              return (
                <tr key={idx}>
                  <td>{item.code}</td>
                  <td>
                    {item.name} 
                    {item.color ? ` - ${item.color}` : ""}{" "}
                    {item.size ? ` - ${item.size}` : ""}
                  </td>
                  <td>{item.sellPrice}</td>
                  {canViewProfit && <td>{item.buyPrice}</td>}
                  <td>{item.quantity}</td>
                  {canReturn && (
                    <td>
                      <button
                        className={styles.returnBtn}
                        disabled={isReturning}
                        onClick={() => onReturn(item)}
                      >
                        {isReturning ? "جاري التنفيذ..." : "مرتجع"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
