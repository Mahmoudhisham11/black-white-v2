"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import SideBar from "../SideBar/page";
import styles from "./styles.module.css";
import { FaBars } from "react-icons/fa6";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FaWifi } from "react-icons/fa";
import { FaSatellite } from "react-icons/fa";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getAvailableQuantity } from "@/utils/productHelpers";
import { db } from "@/app/firebase";
import { NotificationProvider, useNotification } from "@/contexts/NotificationContext";
import { useCart } from "@/hooks/useCart";
import { useProducts } from "@/hooks/useProducts";
import { useInvoices } from "@/hooks/useInvoices";
import { useEmployees } from "@/hooks/useEmployees";
import { useMasrofat } from "@/hooks/useMasrofat";
import { CONFIG } from "@/constants/config";
import { calculateFinalTotal } from "@/utils/cartHelpers";
import { invoiceService } from "./services/invoiceService";
import { stockService } from "./services/stockService";
import { closeDayService } from "./services/closeDayService";
import { printInvoice } from "./utils/printInvoice";
import StatsCards from "./StatsCards";
import InvoiceList from "./InvoiceList";
import InvoiceDetails from "./InvoiceDetails";
import CartSidebar from "./CartSidebar";
import ClientModal from "./Modals/ClientModal";
import VariantModal from "./Modals/VariantModal";
import PriceModal from "./Modals/PriceModal";
import ConfirmModal from "./Modals/ConfirmModal";
import PasswordModal from "./Modals/PasswordModal";
import SuspendInvoiceModal from "./Modals/SuspendInvoiceModal";
import SuspendedInvoicesModal from "./Modals/SuspendedInvoicesModal";
import EmployeeStatsModal from "./Modals/EmployeeStatsModal";
import { useInvoiceReturn } from "./hooks/useInvoiceReturn";
import { FaBookmark, FaBook } from "react-icons/fa";
import { useOfflineSync } from "@/hooks/useOfflineSync";

function MainContent() {
  const { success, error: showError, warning } = useNotification();
  const [openSalles, setOpenSalles] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("hideFinance") === "true";
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchClient, setSearchClient] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [showClientPopup, setShowClientPopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [variantProduct, setVariantProduct] = useState(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [openSideBar, setOpenSideBar] = useState(false);
  const [showCloseDayConfirm, setShowCloseDayConfirm] = useState(false);
  const [showDeleteInvoiceConfirm, setShowDeleteInvoiceConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showSuspendedInvoicesModal, setShowSuspendedInvoicesModal] = useState(false);
  const [suspendedInvoices, setSuspendedInvoices] = useState([]);
  const [showEmployeeStatsModal, setShowEmployeeStatsModal] = useState(false);
  const [selectedEmployeeStats, setSelectedEmployeeStats] = useState(null);

  const shop = typeof window !== "undefined" ? localStorage.getItem("shop") : "";
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";

  // Hooks
  const { cart, subtotal, profit, addToCart, updateQuantity, removeFromCart, clearCart } = useCart(shop);
  const { products } = useProducts(shop);
  const { invoices, filterInvoices, formatDate } = useInvoices(shop);
  const { employees } = useEmployees(shop);
  const { totalMasrofat } = useMasrofat(shop);
  const { returnProduct, returningItemsState } = useInvoiceReturn();
  const { isOnline } = useOfflineSync();

  // Filtered data - using useMemo for performance
  const filteredInvoices = useMemo(
    () => filterInvoices(searchClient),
    [invoices, searchClient, filterInvoices]
  );
  const [searchCode, setSearchCode] = useState("");

  // Load suspended invoices from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("suspendedInvoices");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSuspendedInvoices(parsed || []);
      }
    } catch (error) {
      console.error("Error loading suspended invoices:", error);
    }
  }, []);

  // Save suspended invoices to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("suspendedInvoices", JSON.stringify(suspendedInvoices));
    } catch (error) {
      console.error("Error saving suspended invoices:", error);
    }
  }, [suspendedInvoices]);

  // Check user subscription
  useEffect(() => {
    if (typeof window === "undefined" || !userName) return;
    
    const checkSubscription = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("userName", "==", userName)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          if (userData.isSubscribed === false) {
            showError("لقد تم إغلاق الحساب برجاء التواصل مع المطور");
            localStorage.clear();
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
      }
    };

    checkSubscription();
  }, [userName, showError]);

  // Product search
  useEffect(() => {
    if (!searchCode || !shop) return;

    const timer = setTimeout(() => {
      const trimmedCode = searchCode.trim();
      if (!trimmedCode) return;

      const foundProduct = products.find(
        (p) => p.code?.toString() === trimmedCode
      );
      
      if (!foundProduct) {
        // لا نمسح الحقل إذا لم نجد منتج - نترك المستخدم يرى ما كتبه
        return;
      }

      const hasVariants =
        (foundProduct.colors && foundProduct.colors.length > 0) ||
        (foundProduct.sizes && foundProduct.sizes.length > 0);

      if (hasVariants) {
        setVariantProduct(foundProduct);
        setShowVariantPopup(true);
        // مسح الحقل بعد فتح الـ modal
        setSearchCode("");
      } else {
        const alreadyInCart = cart.some(
          (item) =>
            item.originalProductId === foundProduct.id &&
            !item.color &&
            !item.size
        );
        if (!alreadyInCart) {
          setVariantProduct(foundProduct);
          setShowPricePopup(true);
          // مسح الحقل بعد فتح الـ modal
          setSearchCode("");
        } else {
          // المنتج موجود في السلة بالفعل - نمسح الحقل
          setSearchCode("");
        }
      }
    }, 800); // زيادة وقت الـ debounce إلى 800ms لإعطاء المستخدم وقت لكتابة الرقم كاملاً

    return () => clearTimeout(timer);
  }, [searchCode, products, cart, shop]);

  // Toggle hidden state
  const toggleHidden = useCallback(() => {
    // إذا كانت الأرقام مخفية، نطلب كلمة المرور لإظهارها
    if (isHidden) {
      setShowPasswordModal(true);
    } else {
      // إذا كانت الأرقام ظاهرة، يمكن إخفاؤها مباشرة
      setIsHidden(true);
      localStorage.setItem("hideFinance", "true");
    }
  }, [isHidden]);

  // التحقق من كلمة المرور لإظهار الأرقام
  const handlePasswordConfirm = useCallback((password) => {
    setShowPasswordModal(false);
    
    const EYE_PASSWORD = "2468";
    
    if (password !== EYE_PASSWORD) {
      showError("❌ كلمة المرور غير صحيحة");
      return;
    }

    // كلمة المرور صحيحة، إظهار الأرقام
    setIsHidden(false);
    localStorage.setItem("hideFinance", "false");
    success("✅ تم إظهار الأرقام بنجاح");
  }, [success, showError]);

  // Handle add to cart with stock reservation
  const handleAddToCart = useCallback(async (product, options = {}) => {
    try {
      const qty = Number(options.quantity) || 1;
      if (qty <= 0) {
        showError("الكمية يجب أن تكون أكبر من صفر");
        return;
      }

      // Check available quantity for all products (with or without variants)
      // Note: We only check availability, we don't reserve stock until invoice is saved
      let productWithFullData = product;
      
      if (product.id) {
        // Get current product data from Firestore to check availability and get full data
        const prodRef = doc(db, "lacosteProducts", product.id);
        const prodSnap = await getDoc(prodRef);
        
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          
          // استخدام البيانات الكاملة من Firebase لضمان وجود جميع الحقول
          productWithFullData = {
            ...product,
            ...prodData,
            id: product.id, // الحفاظ على الـ id الأصلي
          };
          
          const available = getAvailableQuantity(
            prodData,
            options.color || null,
            options.size || null
          );

          // Calculate quantity already in cart for the same product variant
          const existingInCart = cart
            .filter(item => 
              item.originalProductId === product.id &&
              (item.color || "") === (options.color || "") &&
              (item.size || "") === (options.size || "")
            )
            .reduce((sum, item) => sum + (item.quantity || 0), 0);

          // Check if requested quantity (including existing in cart) exceeds available
          const totalRequested = existingInCart + qty;
          if (totalRequested > available) {
            const canAdd = available - existingInCart;
            showError(
              `⚠️ الكمية المطلوبة (${totalRequested}) أكبر من المتاح (${available})\n` +
              `الكمية في السلة: ${existingInCart}\n` +
              `الكمية المتاحة: ${available}\n` +
              `يمكن إضافة: ${canAdd > 0 ? canAdd : 0}`
            );
            return;
          }
        } else {
          // Product doesn't exist in stock
          showError("المنتج غير موجود في المخزون");
          return;
        }
      }

      // Add to cart with full product data
      const result = await addToCart(productWithFullData, options);
      if (result.success) {
        success("تم إضافة المنتج للسلة");
      } else {
        showError("فشل إضافة المنتج للسلة");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء إضافة المنتج: ${errorMessage}`);
    }
  }, [addToCart, success, showError, shop, cart]);

  // Handle quantity change
  const handleQtyChange = useCallback(async (item, delta) => {
    // Pass all cart items to check total quantity in cart for this variant
    const result = await updateQuantity(item, delta, cart);
    if (!result.success) {
      showError(result.message || "فشل تحديث الكمية");
    }
  }, [updateQuantity, cart, showError]);

  // Handle remove from cart
  // Note: We don't restore stock when removing from cart because stock wasn't reserved
  const handleRemoveFromCart = useCallback(async (itemId) => {
    try {
      const result = await removeFromCart(itemId);
      if (result.success) {
        success("تم حذف المنتج من السلة");
      } else {
        showError("فشل حذف المنتج من السلة");
      }
    } catch (err) {
      console.error("Error removing from cart:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء حذف المنتج: ${errorMessage}`);
    }
  }, [removeFromCart, success, showError]);

  // Handle save invoice
  const handleSaveInvoice = useCallback(async (clientData) => {
    if (cart.length === 0) {
      showError("يرجى إضافة منتجات إلى السلة قبل الحفظ");
      return;
    }

    setIsSaving(true);
    try {
      // Verify all items are still available in stock before saving (using Promise.all for better performance)
      const stockChecks = await Promise.all(
        cart.map(async (item) => {
          if (!item.originalProductId) {
            return { success: true, item };
          }

          try {
            const prodRef = doc(db, "lacosteProducts", item.originalProductId);
            const prodSnap = await getDoc(prodRef);
            
            if (!prodSnap.exists()) {
              return {
                success: false,
                item,
                error: `المنتج "${item.name}" غير موجود في المخزون`,
              };
            }

            const prodData = prodSnap.data();
            const available = getAvailableQuantity(prodData, item.color, item.size);
            
            // Check total quantity in cart for this variant
            const totalInCart = cart
              .filter(cartItem => 
                cartItem.originalProductId === item.originalProductId &&
                (cartItem.color || "") === (item.color || "") &&
                (cartItem.size || "") === (item.size || "")
              )
              .reduce((sum, cartItem) => sum + (cartItem.quantity || 0), 0);

            if (totalInCart > available) {
              return {
                success: false,
                item,
                error: `⚠️ الكمية المطلوبة للمنتج "${item.name}" (${totalInCart}) أكبر من المتاح (${available})\nالكمية المتاحة: ${available}`,
              };
            }

            return { success: true, item };
          } catch (err) {
            console.error(`Error checking stock for item ${item.name}:`, err);
            return {
              success: false,
              item,
              error: `حدث خطأ أثناء التحقق من المنتج "${item.name}"`,
            };
          }
        })
      );

      // Check if any validation failed
      const failedCheck = stockChecks.find(check => !check.success);
      if (failedCheck) {
        showError(failedCheck.error);
        setIsSaving(false);
        return;
      }

      // Create invoice
      const result = await invoiceService.createInvoice(
        cart,
        clientData,
        shop,
        selectedEmployee
      );

      if (!result.success) {
        const errorMessage = result.message || result.error?.message || "فشل حفظ الفاتورة";
        showError(`❌ خطأ في حفظ الفاتورة: ${errorMessage}`);
        setIsSaving(false);
        return;
      }

      // Update stock - deduct quantities only when invoice is saved
      try {
        await stockService.updateStockAfterSale(cart);
      } catch (stockErr) {
        console.error("Error updating stock:", stockErr);
        showError(`⚠️ تم حفظ الفاتورة لكن حدث خطأ في تحديث المخزون: ${stockErr.message || "خطأ غير معروف"}`);
        // Continue anyway as invoice is saved
      }

      // Print invoice
      try {
        printInvoice(result.invoice);
      } catch (printErr) {
        console.error("Error printing invoice:", printErr);
        warning("تم حفظ الفاتورة لكن حدث خطأ في الطباعة");
      }

      // Clear cart
      try {
        await clearCart();
      } catch (clearErr) {
        console.error("Error clearing cart:", clearErr);
        warning("تم حفظ الفاتورة لكن حدث خطأ في مسح السلة");
      }

      success(`✅ تم حفظ الفاتورة رقم ${result.invoice?.invoiceNumber || ""} بنجاح`);
      setShowClientPopup(false);
      setOpenSalles(false);
    } catch (err) {
      console.error("Error saving invoice:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء حفظ الفاتورة: ${errorMessage}\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني`);
    } finally {
      setIsSaving(false);
    }
  }, [cart, shop, selectedEmployee, clearCart, success, showError]);

  // Handle close day
  const handleCloseDay = useCallback(async () => {
    try {
      const result = await closeDayService.closeDay(shop, userName);
      if (result.success) {
        success(result.message);
      } else {
        showError(result.message || "فشل تقفيل اليوم");
      }
    } catch (err) {
      console.error("Error closing day:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء تقفيل اليوم: ${errorMessage}`);
    }
  }, [shop, userName, success, showError]);

  // Handle clear cart (delete current invoice draft)
  // Note: This clears the cart, not a saved invoice. Stock wasn't reserved when adding to cart, so no restoration needed.
  const handleDeleteInvoice = useCallback(async () => {
    try {
      if (cart.length === 0) {
        warning("السلة فارغة بالفعل");
        return;
      }
      
      await clearCart();
      setAppliedDiscount(0);
      success("تم مسح السلة بنجاح");
    } catch (err) {
      console.error("Error clearing cart:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء مسح السلة: ${errorMessage}`);
    }
  }, [clearCart, success, showError, warning, cart.length]);

  // Handle print invoice
  const handlePrintInvoice = useCallback(async (invoiceNumber) => {
    try {
      const result = await invoiceService.getInvoiceByNumber(invoiceNumber);
      if (result.success) {
        printInvoice(result.invoice);
      } else {
        showError(result.message || "الفاتورة غير موجودة");
      }
    } catch (err) {
      console.error("Error printing invoice:", err);
      const errorMessage = err.message || err.toString() || "خطأ غير معروف";
      showError(`❌ حدث خطأ أثناء طباعة الفاتورة: ${errorMessage}`);
    }
  }, [showError]);

  // Handle return product
  const handleReturn = useCallback(async (item) => {
    if (!selectedInvoice) return;
    
    try {
      await returnProduct(item, selectedInvoice.id, (updatedInvoice) => {
        // تحديث selectedInvoice بالفاتورة المحدثة
        setSelectedInvoice(updatedInvoice);
      });
    } catch (err) {
      console.error("Error in handleReturn:", err);
      // الخطأ تم معالجته في useInvoiceReturn
    }
  }, [selectedInvoice, returnProduct]);

  // Handle suspend invoice
  const handleSuspendInvoice = useCallback(async (clientName) => {
    if (cart.length === 0) {
      showError("السلة فارغة");
      return;
    }

    const currentTotal = calculateFinalTotal(subtotal, appliedDiscount);
    const suspendedInvoice = {
      id: Date.now().toString(),
      clientName,
      items: JSON.parse(JSON.stringify(cart)), // Deep copy
      subtotal,
      profit,
      total: currentTotal,
      appliedDiscount,
      createdAt: new Date().toISOString(),
    };

    setSuspendedInvoices((prev) => [...prev, suspendedInvoice]);
    await clearCart();
    setAppliedDiscount(0);
    success(`✅ تم تعليق الفاتورة للعميل: ${clientName}`);
    setShowSuspendModal(false);
  }, [cart, subtotal, profit, appliedDiscount, clearCart, success, showError]);

  // Handle restore suspended invoice
  const handleRestoreInvoice = useCallback(async (index) => {
    const invoice = suspendedInvoices[index];
    if (!invoice) return;

    // Clear current cart first
    await clearCart();
    setAppliedDiscount(0);

    // Restore cart items
    for (const item of invoice.items) {
      await addToCart(
        {
          id: item.originalProductId,
          name: item.name,
          code: item.code,
          sellPrice: item.sellPrice,
          buyPrice: item.buyPrice,
          finalPrice: item.finalPrice,
          section: item.section,
          merchantName: item.merchantName,
        },
        {
          quantity: item.quantity,
          price: item.sellPrice,
          color: item.color,
          size: item.size,
        }
      );
    }

    // Restore discount if any
    if (invoice.appliedDiscount) {
      setAppliedDiscount(invoice.appliedDiscount);
    }

    // Remove from suspended invoices
    setSuspendedInvoices((prev) => prev.filter((_, i) => i !== index));
    success(`✅ تم استعادة الفاتورة للعميل: ${invoice.clientName}`);
    setShowSuspendedInvoicesModal(false);
  }, [suspendedInvoices, addToCart, clearCart, success]);

  // Handle delete suspended invoice
  const handleDeleteSuspendedInvoice = useCallback((index) => {
    const invoice = suspendedInvoices[index];
    setSuspendedInvoices((prev) => prev.filter((_, i) => i !== index));
    success(`✅ تم حذف الفاتورة المعلقة للعميل: ${invoice?.clientName || "غير معروف"}`);
  }, [suspendedInvoices, success]);

  // Handle top employee click
  const handleTopEmployeeClick = useCallback((employeeName) => {
    // حساب إحصائيات الموظف لليوم
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    
    // تصفية الفواتير للموظف بتاريخ اليوم
    const todayInvoices = filteredInvoices.filter((invoice) => {
      if (invoice.employee !== employeeName) return false;
      
      // التحقق من التاريخ
      const invoiceDate = invoice.date?.toDate 
        ? invoice.date.toDate() 
        : (invoice.date?.seconds ? new Date(invoice.date.seconds * 1000) : null);
      
      if (!invoiceDate) return false;
      
      const invoiceDateStr = `${String(invoiceDate.getDate()).padStart(2, "0")}/${String(invoiceDate.getMonth() + 1).padStart(2, "0")}/${invoiceDate.getFullYear()}`;
      return invoiceDateStr === todayStr;
    });

    // حساب الإحصائيات
    const stats = {
      invoiceCount: todayInvoices.length,
      totalItems: todayInvoices.reduce((sum, invoice) => {
        return sum + (invoice.cart || []).reduce((itemSum, item) => {
          return itemSum + (item.quantity || 0);
        }, 0);
      }, 0),
      totalSales: todayInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0),
    };

    setSelectedEmployeeStats({
      name: employeeName,
      stats,
    });
    setShowEmployeeStatsModal(true);
  }, [filteredInvoices]);

  const finalTotal = calculateFinalTotal(subtotal, appliedDiscount);

  return (
    <div className={styles.mainContainer}>
      <SideBar openSideBar={openSideBar} setOpenSideBar={setOpenSideBar} />

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={() => setOpenSideBar(true)} className={styles.menuBtn}>
              <FaBars />
            </button>
            <h2 className={styles.title}>المبيعات اليومية</h2>
          </div>

          <div className={styles.headerActions}>
            <button 
              className={styles.connectionBtn} 
              title={isOnline ? "متصل بالإنترنت" : "غير متصل - وضع Offline"}
              style={{ 
                color: isOnline ? "#4CAF50" : "#FF9800",
                cursor: "default"
              }}
            >
              {isOnline ? <FaWifi /> : <FaSatellite />}
            </button>
            <button className={styles.eyeBtn} onClick={toggleHidden} title={isHidden ? "إظهار" : "إخفاء"}>
              {isHidden ? <FaRegEye /> : <FaRegEyeSlash />}
            </button>
            <button
              className={styles.suspendedInvoicesBtn}
              onClick={() => setShowSuspendedInvoicesModal(true)}
              title="الفواتير المعلقة"
            >
              <FaBookmark />
              {suspendedInvoices.length > 0 && (
                <span className={styles.badge}>{suspendedInvoices.length}</span>
              )}
            </button>
            <button
              className={styles.sallesBtn}
              onClick={() => setOpenSalles(true)}
            >
              فتح البيع
            </button>
            <button className={styles.closeDay} onClick={() => setShowCloseDayConfirm(true)}>
              تقفيل اليوم
            </button>
          </div>
        </div>

        <StatsCards
          invoices={filteredInvoices}
          totalMasrofat={totalMasrofat}
          isHidden={isHidden}
          userName={userName}
          onTopEmployeeClick={handleTopEmployeeClick}
        />

        <InvoiceList
          invoices={filteredInvoices}
          searchTerm={searchClient}
          onSelect={setSelectedInvoice}
          selected={selectedInvoice}
          isHidden={isHidden}
          formatDate={formatDate}
        />
      </div>

      <CartSidebar
        isOpen={openSalles}
        onClose={() => setOpenSalles(false)}
        cart={cart}
        products={products}
        searchCode={searchCode}
        onSearchChange={setSearchCode}
        onDeleteInvoice={() => setShowDeleteInvoiceConfirm(true)}
        onSuspendInvoice={() => setShowSuspendModal(true)}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleQtyChange}
        onRemoveItem={handleRemoveFromCart}
        subtotal={subtotal}
        profit={profit}
        finalTotal={finalTotal}
        appliedDiscount={appliedDiscount}
        onOpenClientModal={() => setShowClientPopup(true)}
        isSaving={isSaving}
      />

      {selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          onClose={() => {
            setSelectedInvoice(null);
          }}
          onPrint={handlePrintInvoice}
          onReturn={handleReturn}
          returningItemsState={returningItemsState}
          userName={userName}
        />
      )}

      <ClientModal
        isOpen={showClientPopup}
        onClose={() => setShowClientPopup(false)}
        onSave={handleSaveInvoice}
        employees={employees}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
        isSaving={isSaving}
      />

      <VariantModal
        isOpen={showVariantPopup}
        onClose={() => {
          setShowVariantPopup(false);
          setVariantProduct(null);
          setSearchCode(""); // مسح الحقل عند إغلاق الـ modal
        }}
        product={variantProduct}
        onAddToCart={handleAddToCart}
        db={db}
        doc={doc}
        getDoc={getDoc}
      />

      <PriceModal
        isOpen={showPricePopup}
        onClose={() => {
          setShowPricePopup(false);
          setVariantProduct(null);
          setSearchCode(""); // مسح الحقل عند إغلاق الـ modal
        }}
        product={variantProduct}
        onAddToCart={handleAddToCart}
      />

      <ConfirmModal
        isOpen={showCloseDayConfirm}
        onClose={() => setShowCloseDayConfirm(false)}
        title="تقفيل اليوم"
        message="هل أنت متأكد أنك تريد تقفيل اليوم؟"
        onConfirm={handleCloseDay}
        confirmText="تأكيد التقفيل"
        type="warning"
      />

      <ConfirmModal
        isOpen={showDeleteInvoiceConfirm}
        onClose={() => setShowDeleteInvoiceConfirm(false)}
        title="مسح السلة"
        message="هل أنت متأكد أنك تريد مسح السلة بالكامل؟ سيتم حذف جميع المنتجات من السلة."
        onConfirm={handleDeleteInvoice}
        confirmText="مسح السلة"
        type="danger"
      />

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handlePasswordConfirm}
        title="إظهار الأرقام"
        message="أدخل كلمة المرور لإظهار الأرقام"
      />

      <SuspendInvoiceModal
        isOpen={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        onConfirm={handleSuspendInvoice}
      />

      <SuspendedInvoicesModal
        isOpen={showSuspendedInvoicesModal}
        onClose={() => setShowSuspendedInvoicesModal(false)}
        suspendedInvoices={suspendedInvoices}
        onRestore={handleRestoreInvoice}
        onDelete={handleDeleteSuspendedInvoice}
      />

      <EmployeeStatsModal
        isOpen={showEmployeeStatsModal}
        onClose={() => {
          setShowEmployeeStatsModal(false);
          setSelectedEmployeeStats(null);
        }}
        employeeName={selectedEmployeeStats?.name || ""}
        stats={selectedEmployeeStats?.stats || { invoiceCount: 0, totalItems: 0, totalSales: 0 }}
      />
    </div>
  );
}

function Main() {
  return (
    <NotificationProvider>
      <MainContent />
    </NotificationProvider>
  );
}

export default Main;

