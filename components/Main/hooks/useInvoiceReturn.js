"use client";
import { useState, useRef } from "react";
import { invoiceService } from "../services/invoiceService";
import { stockService } from "../services/stockService";
import { useNotification } from "@/contexts/NotificationContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase";

export function useInvoiceReturn() {
  const [returningItemsState, setReturningItemsState] = useState({});
  const processingRef = useRef({}); // استخدام useRef لتجنب race condition
  const { success, error: showError } = useNotification();

  const returnProduct = async (item, invoiceId, onUpdateInvoice) => {
    const itemKey = `${item.code}_${item.color || ""}_${item.size || ""}`;

    // التحقق من المعالجة باستخدام useRef لتجنب race condition
    if (processingRef.current[itemKey]) {
      return;
    }
    
    // تعيين حالة المعالجة
    processingRef.current[itemKey] = true;
    setReturningItemsState((prev) => ({ ...prev, [itemKey]: true }));

    let stockRestored = false;

    try {
      // Restore stock أولاً
      await stockService.restoreStock(item);
      stockRestored = true;

      // Update invoice
      const result = await invoiceService.returnProduct(item, invoiceId);

      if (result.success) {
        success(result.message || "تم إرجاع المنتج بنجاح");
        
        // جلب الفاتورة المحدثة من Firebase
        try {
          const invoiceRef = doc(db, "dailySales", invoiceId);
          const invoiceSnap = await getDoc(invoiceRef);
          
          if (invoiceSnap.exists()) {
            const updatedInvoice = {
              id: invoiceSnap.id,
              ...invoiceSnap.data(),
            };
            
            // تحديث الفاتورة باستخدام callback
            if (onUpdateInvoice) {
              onUpdateInvoice(updatedInvoice);
            }
          } else {
            // الفاتورة تم حذفها (جميع المنتجات تم إرجاعها)
            if (onUpdateInvoice) {
              onUpdateInvoice(null);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching updated invoice:", fetchErr);
          // لا نوقف العملية إذا فشل جلب الفاتورة المحدثة
        }
      } else {
        // Rollback: إرجاع المخزون مرة أخرى
        if (stockRestored) {
          try {
            await stockService.updateStockAfterSale([item]);
          } catch (rollbackErr) {
            console.error("Error rolling back stock:", rollbackErr);
            showError("⚠️ تم إرجاع المخزون لكن حدث خطأ في تحديث الفاتورة. يرجى التحقق يدوياً");
          }
        }
        showError(result.message || "حدث خطأ أثناء إرجاع المنتج");
      }
    } catch (err) {
      console.error("Error returning product:", err);
      
      // Rollback: إرجاع المخزون مرة أخرى في حالة الخطأ
      if (stockRestored) {
        try {
          await stockService.updateStockAfterSale([item]);
        } catch (rollbackErr) {
          console.error("Error rolling back stock:", rollbackErr);
        }
      }
      
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء إرجاع المنتج: ${errorMessage}`);
    } finally {
      // إزالة حالة المعالجة
      delete processingRef.current[itemKey];
      setReturningItemsState((prev) => {
        const newState = { ...prev };
        delete newState[itemKey];
        return newState;
      });
    }
  };

  return { returnProduct, returningItemsState };
}
