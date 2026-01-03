// Service for invoice operations
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase";
import { calculateSubtotal, calculateProfit } from "@/utils/cartHelpers";
import { offlineAdd, offlineUpdate, offlineGet, offlineDoc } from "@/utils/firebaseOffline";

// Helper function to check if online
const isOnline = () => {
  return typeof window !== "undefined" && navigator.onLine;
};

// Helper function to get next invoice number (works offline)
// محسّن: استخدام localStorage أولاً للسرعة، ثم المزامنة مع Firebase في الخلفية
const getNextInvoiceNumber = async () => {
  if (typeof window === "undefined") return 1;
  
  try {
    // استخدام localStorage أولاً للسرعة (حتى عند online)
    const saved = localStorage.getItem("lastInvoiceNumber");
    let currentNumber = saved ? parseInt(saved, 10) : 0;
    const invoiceNumber = currentNumber + 1;
    
    // حفظ في localStorage فوراً
    localStorage.setItem("lastInvoiceNumber", invoiceNumber.toString());
    
    // مزامنة مع Firebase في الخلفية (غير متزامن)
    if (isOnline()) {
      // تحديث Firebase في الخلفية بدون انتظار
      setDoc(
        doc(db, "counters", "invoiceCounter"),
        { lastInvoiceNumber: invoiceNumber },
        { merge: true }
      ).catch((error) => {
        console.error("Error syncing invoice number to Firebase:", error);
        // إذا فشلت المزامنة، نحاول جلب الرقم من Firebase في المرة القادمة
      });
    }
    
    return invoiceNumber;
  } catch (error) {
    console.error("Error getting invoice number:", error);
    // Fallback: استخدام localStorage فقط
    const saved = localStorage.getItem("lastInvoiceNumber");
    const currentNumber = saved ? parseInt(saved, 10) : 0;
    const invoiceNumber = currentNumber + 1;
    localStorage.setItem("lastInvoiceNumber", invoiceNumber.toString());
    return invoiceNumber;
  }
};

export const invoiceService = {
  async createInvoice(cart, clientData, shop, employee) {
    try {
      // Get next invoice number (works offline)
      const invoiceNumber = await getNextInvoiceNumber();

      // Calculate totals
      const total = calculateSubtotal(cart);
      const profit = calculateProfit(cart);

      // Prepare invoice data
      const saleData = {
        invoiceNumber,
        cart,
        clientName: clientData.clientName || "",
        phone: clientData.phone || "",
        date: new Date(),
        shop,
        total,
        profit,
        employee: employee || "غير محدد",
        discount: clientData.discount || 0,
        discountNotes: clientData.discountNotes || "",
      };

      // Save invoice using offlineAdd (works offline)
      const result = await offlineAdd("dailySales", saleData);

      if (result.success) {
        // Online: Invoice saved to Firebase
        return { 
          success: true, 
          invoice: { id: result.id, ...saleData },
          offline: false
        };
      } else {
        // Offline: Invoice added to queue, save locally for printing
        const tempId = result.queueId || `temp-${Date.now()}`;
        
        // Save invoice locally for printing and immediate display
        if (typeof window !== "undefined") {
          try {
            const offlineInvoices = JSON.parse(
              localStorage.getItem("offlineInvoices") || "[]"
            );
            offlineInvoices.push({ id: tempId, ...saleData });
            localStorage.setItem("offlineInvoices", JSON.stringify(offlineInvoices));
            
            // إرسال event لتحديث القائمة فوراً
            window.dispatchEvent(new Event("offlineInvoiceAdded"));
          } catch (err) {
            console.error("Error saving offline invoice:", err);
          }
        }

        return { 
          success: true, 
          invoice: { id: tempId, ...saleData },
          offline: true,
          queueId: result.queueId
        };
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      return { success: false, error };
    }
  },

  async getInvoiceByNumber(invoiceNumber) {
    try {
      const q = query(
        collection(db, "dailySales"),
        where("invoiceNumber", "==", Number(invoiceNumber))
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, message: "الفاتورة غير موجودة" };
      }

      const invoiceData = snapshot.docs[0].data();
      return { success: true, invoice: invoiceData };
    } catch (error) {
      console.error("Error getting invoice:", error);
      return { success: false, error };
    }
  },

  async returnProduct(item, invoiceId) {
    try {
      const invoiceRef = doc(db, "dailySales", invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (!invoiceSnap.exists()) {
        return { success: false, message: "الفاتورة غير موجودة" };
      }

      const invoiceData = invoiceSnap.data();
      
      if (!Array.isArray(invoiceData.cart) || invoiceData.cart.length === 0) {
        return { success: false, message: "الفاتورة فارغة" };
      }

      // البحث عن المنتج المراد إرجاعه
      // نستخدم منطق أفضل: نبحث عن أول منتج يطابق الكود واللون والمقاس
      // ثم نحذف الكمية المطلوبة (أو المنتج بالكامل إذا كانت الكمية متطابقة)
      let itemFound = false;
      let itemIndex = -1;
      
      for (let i = 0; i < invoiceData.cart.length; i++) {
        const p = invoiceData.cart[i];
        const matchesCode = p.code === item.code;
        const matchesColor = (p.color || "") === (item.color || "");
        const matchesSize = (p.size || "") === (item.size || "");
        
        if (matchesCode && matchesColor && matchesSize) {
          itemIndex = i;
          itemFound = true;
          break;
        }
      }

      if (!itemFound) {
        return { success: false, message: "المنتج غير موجود في الفاتورة" };
      }

      const foundItem = invoiceData.cart[itemIndex];
      
      // التحقق من الكمية
      if (foundItem.quantity < item.quantity) {
        return { 
          success: false, 
          message: `الكمية المطلوبة (${item.quantity}) أكبر من الكمية في الفاتورة (${foundItem.quantity})` 
        };
      }

      // إنشاء نسخة محدثة من الـ cart
      const updatedCart = [...invoiceData.cart];
      
      if (foundItem.quantity === item.quantity) {
        // حذف المنتج بالكامل إذا كانت الكمية متطابقة
        updatedCart.splice(itemIndex, 1);
      } else {
        // تقليل الكمية إذا كانت الكمية المطلوبة أقل
        updatedCart[itemIndex] = {
          ...foundItem,
          quantity: foundItem.quantity - item.quantity,
        };
      }

      if (updatedCart.length > 0) {
        const newTotal = calculateSubtotal(updatedCart);
        const newProfit = calculateProfit(updatedCart);

        await updateDoc(invoiceRef, {
          cart: updatedCart,
          total: newTotal,
          profit: newProfit,
        });

        return { success: true, message: "تم إرجاع المنتج بنجاح" };
      } else {
        await deleteDoc(invoiceRef);
        return { success: true, message: "تم إرجاع المنتج وحذف الفاتورة" };
      }
    } catch (error) {
      console.error("Error returning product:", error);
      return { 
        success: false, 
        message: error.message || "حدث خطأ أثناء إرجاع المنتج",
        error 
      };
    }
  },
};
