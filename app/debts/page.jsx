"use client";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useEffect, useState, useMemo } from "react";
import { CiSearch, CiPhone } from "react-icons/ci";
import { FaRegTrashAlt } from "react-icons/fa";
import { GiMoneyStack } from "react-icons/gi";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { FaPlus } from "react-icons/fa6";
import { FaEye } from "react-icons/fa";
import { db } from "@/app/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader/Loader";
import { NotificationProvider, useNotification } from "@/contexts/NotificationContext";
import ConfirmModal from "@/components/Main/Modals/ConfirmModal";

function DebtsContent() {
  const router = useRouter();
  const { success, error: showError, warning } = useNotification();
  const [detailsAslDebt, setDetailsAslDebt] = useState(0);
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [searchText, setSearchText] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    debt: "",
    debtType: "",
    debtDirection: "",
    dateInput: "",
    paymentAmount: "",
    paymentSource: "درج",
  });

  const [customers, setCustomers] = useState([]);
  const [paymentsByDate, setPaymentsByDate] = useState([]); // عمليات السداد/الزيادة حسب التاريخ
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const shop =
    typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  const getTreasuryBalance = async () => {
    const q = query(collection(db, "dailyProfit"), where("shop", "==", shop));
    const snapshot = await getDocs(q);

    let totalSales = 0;
    let totalMasrofat = 0;
    let totalSaddad = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === "سداد") {
        totalSaddad += Number(data.totalSales || 0);
      } else {
        totalSales += Number(data.totalSales || 0);
      }
      totalMasrofat += Number(data.totalMasrofat || 0);
    });

    const balance = totalSales - totalMasrofat - totalSaddad;
    return balance;
  };

  // ===== payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentSource, setPaymentSource] = useState("درج");
  const [processingPayment, setProcessingPayment] = useState(false);

  // ===== increase debt modal state
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [increaseAmount, setIncreaseAmount] = useState("");
  const [increaseCustomer, setIncreaseCustomer] = useState(null);
  const [processingIncrease, setProcessingIncrease] = useState(false);

  // ===== details popup
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [detailsPayments, setDetailsPayments] = useState([]);

  useEffect(() => {
    const checkLock = async () => {
      const userName = localStorage.getItem("userName");
      if (!userName) {
        router.push("/");
        return;
      }
      const q = query(
        collection(db, "users"),
        where("userName", "==", userName)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data();
        if (user.permissions?.debts === true) {
          showError("ليس لديك الصلاحية للوصول إلى هذه الصفحة❌");
          router.push("/");
          return;
        } else {
          setAuth(true);
        }
      } else {
        router.push("/");
        return;
      }
      setLoading(false);
    };
    checkLock();
  }, [router, showError]);

  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "debts"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // ترتيب حسب التاريخ تنازليًا
      data.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : (a.date?.seconds || 0) * 1000;
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : (b.date?.seconds || 0) * 1000;
        return dateB - dateA;
      });
      setCustomers(data);
    });

    return () => unsubscribe();
  }, [shop]);

  // جلب عمليات السداد/الزيادة عند البحث بالتاريخ
  useEffect(() => {
    if (!shop || !searchCode) {
      setPaymentsByDate([]);
      return;
    }

    const fetchPaymentsByDate = async () => {
      try {
        // تحويل searchCode (YYYY-MM-DD) إلى تاريخ
        // searchCode format: YYYY-MM-DD
        const [year, month, day] = searchCode.split("-").map(Number);
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        const q = query(
          collection(db, "debtsPayments"),
          where("shop", "==", shop)
        );
        const snapshot = await getDocs(q);
        
        const payments = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((p) => {
            if (!p.date) return false;
            const paymentDate = p.date.toDate ? p.date.toDate() : new Date(p.date);
            // مقارنة التاريخ فقط (بدون الوقت)
            const paymentDateOnly = new Date(
              paymentDate.getFullYear(),
              paymentDate.getMonth(),
              paymentDate.getDate()
            );
            const searchDateOnly = new Date(
              startOfDay.getFullYear(),
              startOfDay.getMonth(),
              startOfDay.getDate()
            );
            return paymentDateOnly.getTime() === searchDateOnly.getTime();
          });

        setPaymentsByDate(payments);
      } catch (error) {
        console.error("خطأ أثناء جلب عمليات السداد/الزيادة:", error);
        setPaymentsByDate([]);
      }
    };

    fetchPaymentsByDate();
  }, [shop, searchCode]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.date) return false;

      // البحث بالاسم أو رقم الهاتف
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = 
          (c.name?.toLowerCase().includes(searchLower) || false) ||
          (c.phone?.includes(searchText) || false);
        if (!matchesSearch) return false;
      }

      // البحث بالتاريخ - البحث في عمليات السداد/الزيادة
      if (searchCode) {
        // البحث في عمليات السداد/الزيادة في التاريخ المحدد
        const hasPaymentOnDate = paymentsByDate.some(
          (p) => p.debtid === c.id
        );
        if (!hasPaymentOnDate) return false;
      } else {
        // بدون تاريخ، اعرض بس العملاء اللي عندهم دين > 0
        if (Number(c.debt || 0) <= 0) return false;
      }

      return true;
    });
  }, [customers, searchCode, searchText, paymentsByDate]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filteredCustomers]);

  const handleAddProduct = async () => {
    if (!form.name || !form.phone || !form.debt) {
      showError("يرجى ملء كل الحقول");
      return;
    }

    const debtAmount = Number(form.debt);
    if (debtAmount <= 0) {
      showError("المبلغ يجب أن يكون أكبر من صفر");
      return;
    }

    const paymentAmountNum = Number(form.paymentAmount || 0);
    const remainingDebt = debtAmount - paymentAmountNum;

    try {
      // إنشاء مستند الدين
      const newDebtDoc = await addDoc(collection(db, "debts"), {
        name: form.name,
        phone: form.phone,
        debt: remainingDebt > 0 ? remainingDebt : 0,
        debtType: form.debtType,
        debtDirection: form.debtDirection,
        dateInput: form.dateInput,
        date: new Date(),
        shop: shop,
        aslDebt: form.debt,
      });

      // ===== تسجيل السداد إذا موجود
      if (paymentAmountNum > 0) {
        const paymentDoc = await addDoc(collection(db, "debtsPayments"), {
          name: form.name,
          phone: form.phone,
          paidAmount: paymentAmountNum,
          previousDebt: debtAmount,
          remainingDebt: remainingDebt > 0 ? remainingDebt : 0,
          date: new Date(),
          shop: shop,
          source: form.paymentSource || "درج",
          debtid: newDebtDoc.id,
        });

        if (form.paymentSource === "خزنة") {
          const now = new Date();
          await addDoc(collection(db, "dailyProfit"), {
            createdAt: now,
            date: `${String(now.getDate()).padStart(2, "0")}/${String(
              now.getMonth() + 1
            ).padStart(2, "0")}/${now.getFullYear()}`,
            shop: shop,
            totalSales: paymentAmountNum,
            type: "سداد",
            debtPaymentId: paymentDoc.id,
          });
        }
      }

      success("تم إضافة العميل بنجاح");
      setForm({
        name: "",
        phone: "",
        debt: "",
        debtType: "",
        debtDirection: "",
        dateInput: "",
        paymentAmount: "",
        paymentSource: "درج",
      });
      setActive(false);
      setDetailsPayments([]);
      setDetailsAslDebt(0);
    } catch (error) {
      console.error("خطأ أثناء الإضافة:", error);
      showError("حدث خطأ أثناء إضافة العميل");
    }
  };

  const handleDeleteSingle = (id) => {
    setSelectedIds(new Set([id]));
    setShowDeleteConfirm(true);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      showError("يرجى تحديد عميل واحد على الأقل للحذف");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const selectedArray = Array.from(selectedIds);
      const batch = writeBatch(db);

      for (const id of selectedArray) {
        const customer = customers.find((c) => c.id === id);
        if (!customer) continue;

        // جلب كل السدادات الخاصة بالعميل
        const paymentsQuery = query(
          collection(db, "debtsPayments"),
          where("phone", "==", customer.phone),
          where("shop", "==", shop)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);

        // حذف كل السدادات مع تحديث dailyProfit إذا السداد من الخزنة
        for (const docSnap of paymentsSnapshot.docs) {
          const paymentData = docSnap.data();

          if (paymentData.source === "خزنة") {
            const profitQuery = query(
              collection(db, "dailyProfit"),
              where("debtPaymentId", "==", docSnap.id)
            );
            const profitSnapshot = await getDocs(profitQuery);
            profitSnapshot.docs.forEach((pDoc) => {
              batch.delete(pDoc.ref);
            });
          }

          batch.delete(docSnap.ref);
        }

        // حذف الدين نفسه
        batch.delete(doc(db, "debts", id));
      }

      await batch.commit();
      success(
        selectedArray.length === 1
          ? "تم حذف العميل وكل السدادات المرتبطة به بنجاح"
          : `تم حذف ${selectedArray.length} عميل وكل السدادات المرتبطة بهم بنجاح`
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      showError("حدث خطأ أثناء الحذف");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredCustomers.length;

  // ===== Open payment modal
  const openPaymentModal = (customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount("");
    setPaymentSource("درج");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentCustomer(null);
    setPaymentAmount("");
    setPaymentSource("درج");
    setProcessingPayment(false);
  };

  // ===== Open increase modal
  const openIncreaseModal = (customer) => {
    setIncreaseCustomer(customer);
    setIncreaseAmount("");
    setShowIncreaseModal(true);
  };

  const closeIncreaseModal = () => {
    setShowIncreaseModal(false);
    setIncreaseCustomer(null);
    setIncreaseAmount("");
    setProcessingIncrease(false);
  };

  // ===== Confirm increase
  const handleConfirmIncrease = async () => {
    if (!increaseCustomer) return;
    const amount = Number(increaseAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      showError("الرجاء إدخال مبلغ صالح أكبر من صفر");
      return;
    }

    setProcessingIncrease(true);

    try {
      const debtRef = doc(db, "debts", increaseCustomer.id);
      const debtSnap = await getDoc(debtRef);

      if (!debtSnap.exists()) {
        showError("لم يتم العثور على بيانات الدين — ربما حُذف بالفعل.");
        closeIncreaseModal();
        return;
      }

      const debtData = debtSnap.data();
      const currentDebt = Number(debtData.debt || 0);
      const newDebt = currentDebt + amount;

      // تحديث الدين في Firestore
      await updateDoc(debtRef, { debt: newDebt });

      // تحديث aslDebt إذا لم يكن موجودًا
      if (!debtData.aslDebt) {
        await updateDoc(debtRef, { aslDebt: currentDebt });
      }

      // ===== تسجيل عملية الزيادة في debtsPayments =====
      await addDoc(collection(db, "debtsPayments"), {
        name: debtData.name || increaseCustomer.name || "",
        phone: debtData.phone || increaseCustomer.phone || "",
        paidAmount: amount, // المبلغ المضاف
        previousDebt: currentDebt,
        remainingDebt: newDebt,
        debtid: increaseCustomer.id,
        date: new Date(),
        userName: localStorage.getItem("userName"),
        shop: shop,
        source: "زيادة", // نوع العملية
        type: "زيادة", // حقل إضافي لتحديد نوع العملية
      });

      success(`تم زيادة الدين بنجاح. الدين الجديد: ${newDebt} EGP`);
      closeIncreaseModal();
    } catch (err) {
      console.error("خطأ أثناء زيادة الدين:", err);
      showError("حدث خطأ أثناء زيادة الدين، حاول مرة أخرى");
      setProcessingIncrease(false);
    }
  };

  // ===== Confirm payment
  const handleConfirmPayment = async () => {
    if (!paymentCustomer) return;
    const paid = Number(paymentAmount);
    if (!paid || paid <= 0 || isNaN(paid)) {
      showError("الرجاء إدخال مبلغ سداد صالح أكبر من صفر");
      return;
    }

    setProcessingPayment(true);

    try {
      // ===== فحص رصيد الخزنة =====
      if (paymentSource === "خزنة") {
        const treasuryBalance = await getTreasuryBalance();
        if (paid > treasuryBalance) {
          showError(
            `رصيد الخزنة الحالي (${treasuryBalance} EGP) أقل من المبلغ المطلوب سداده (${paid} EGP).`
          );
          setProcessingPayment(false);
          return;
        }
      }

      const debtRef = doc(db, "debts", paymentCustomer.id);
      const debtSnap = await getDoc(debtRef);

      if (!debtSnap.exists()) {
        showError("لم يتم العثور على بيانات الدين — ربما حُذف بالفعل.");
        setProcessingPayment(false);
        closePaymentModal();
        return;
      }

      const debtData = debtSnap.data();
      const previousDebt = Number(debtData.debt || 0);
      if (paid > previousDebt) {
        showError(`المبلغ أكبر من الدين الحالي (${previousDebt} EGP).`);
        setProcessingPayment(false);
        return;
      }

      const remainingDebt = previousDebt - paid;

      // ===== تحديث الدين في Firestore =====
      await updateDoc(debtRef, { debt: remainingDebt });

      // ===== تسجيل السداد في debtsPayments =====
      const paymentDoc = await addDoc(collection(db, "debtsPayments"), {
        name: debtData.name || paymentCustomer.name || "",
        phone: debtData.phone || paymentCustomer.phone || "",
        paidAmount: paid,
        previousDebt: previousDebt,
        remainingDebt: remainingDebt,
        debtid: paymentCustomer.id,
        date: new Date(),
        userName: localStorage.getItem("userName"),
        shop: shop,
        source: paymentSource,
      });

      // ===== إذا مصدر السداد خزنة، نسجل المبلغ في dailyProfit =====
      if (paymentSource === "خزنة") {
        const now = new Date();
        await addDoc(collection(db, "dailyProfit"), {
          createdAt: now,
          date: `${String(now.getDate()).padStart(2, "0")}/${String(
            now.getMonth() + 1
          ).padStart(2, "0")}/${now.getFullYear()}`,
          shop: shop,
          totalSales: paid,
          type: "سداد",
          debtPaymentId: paymentDoc.id,
        });
      }

      success("✅ تم تسجيل السداد بنجاح");
      closePaymentModal();
    } catch (err) {
      console.error("خطأ أثناء معالجة السداد:", err);
      showError("❌ حدث خطأ أثناء معالجة السداد، حاول مرة أخرى");
      setProcessingPayment(false);
    }
  };

  // ===== Open details popup
  const openDetailsPopup = async (customer) => {
    if (!customer) return;

    setDetailsPayments([]);
    setDetailsAslDebt(0);

    setDetailsAslDebt(customer.aslDebt || customer.debt || 0);

    const q = query(
      collection(db, "debtsPayments"),
      where("shop", "==", shop),
      where("debtid", "==", customer.id)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setDetailsPayments(data);
    setShowDetailsPopup(true);
  };

  const closeDetailsPopup = () => {
    setDetailsPayments([]);
    setShowDetailsPopup(false);
  };

  // حساب الإحصائيات
  const totalDebts = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + Number(c.debt || 0), 0);
  }, [filteredCustomers]);

  const totalPayments = useMemo(() => {
    return detailsPayments.reduce((acc, p) => acc + Number(p.paidAmount || 0), 0);
  }, [detailsPayments]);

  const totalCustomers = filteredCustomers.length;

  if (loading) return <Loader />;
  if (!auth) return null;

  return (
    <div className={styles.debts}>
      <SideBar />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>فواتير البضاعة</h2>
          <div className={styles.headerActions}>
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className={styles.deleteSelectedBtn}
                disabled={isDeleting}
              >
                <FaRegTrashAlt />
                حذف المحدد ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => {
                setActive(!active);
                setForm({
                  name: "",
                  phone: "",
                  debt: "",
                  debtType: "",
                  debtDirection: "",
                  dateInput: "",
                  paymentAmount: "",
                  paymentSource: "درج",
                });
              }}
              className={styles.addBtn}
            >
              {active ? "إلغاء" : "+ إضافة عميل"}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>إجمالي العملاء</span>
            <span className={styles.summaryValue}>{totalCustomers}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>إجمالي الديون</span>
            <span className={styles.summaryValue}>
              {totalDebts.toFixed(2)} EGP
            </span>
          </div>
        </div>

        {/* Search Box */}
        {!active && (
          <div className={styles.searchBox}>
            <div className={styles.searchContainer}>
              <CiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.dateContainer}>
              <input
                type="date"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>
        )}

        {/* Form for adding new customer */}
        {active && (
          <div className={styles.addContainer}>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label>
                  <MdDriveFileRenameOutline />
                </label>
                <input
                  type="text"
                  placeholder="اسم العميل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.inputBox}>
              <div className="inputContainer">
                <label>
                  <CiPhone />
                </label>
                <input
                  type="text"
                  placeholder="رقم الهاتف"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="inputContainer">
                <label>
                  <GiMoneyStack />
                </label>
                <input
                  type="number"
                  placeholder="الدين"
                  value={form.debt}
                  onChange={(e) => setForm({ ...form, debt: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.inputBox}>
              <div className="inputContainer">
                <input
                  type="date"
                  value={form.dateInput}
                  onChange={(e) =>
                    setForm({ ...form, dateInput: e.target.value })
                  }
                />
              </div>

              <div className="inputContainer">
                <label>
                  <GiMoneyStack />
                </label>
                <select
                  value={form.debtDirection}
                  onChange={(e) =>
                    setForm({ ...form, debtDirection: e.target.value })
                  }
                >
                  <option value="">اختر نوع الدين</option>
                  <option value="ليك">ليك فلوس</option>
                  <option value="بضاعة اجل">بضاعة اجل</option>
                  <option value="بضاعة كاش">بضاعة كاش</option>
                </select>
              </div>
            </div>
            <div className={styles.inputBox}>
              <div className="inputContainer">
                <input
                  type="number"
                  placeholder="مبلغ السداد (اختياري)"
                  value={form.paymentAmount || ""}
                  onChange={(e) =>
                    setForm({ ...form, paymentAmount: e.target.value })
                  }
                />
              </div>

              <div className="inputContainer">
                <label>
                  <GiMoneyStack />
                </label>
                <select
                  value={form.paymentSource || "درج"}
                  onChange={(e) =>
                    setForm({ ...form, paymentSource: e.target.value })
                  }
                >
                  <option value="خزنة">خزنة</option>
                  <option value="درج">درج</option>
                </select>
              </div>
            </div>
            <div className={styles.actionButtonsContainer}>
              <button className={styles.addBtn} onClick={handleAddProduct}>
                إضافة العميل
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  setActive(false);
                  setForm({
                    name: "",
                    phone: "",
                    debt: "",
                    debtType: "",
                    debtDirection: "",
                    dateInput: "",
                    paymentAmount: "",
                    paymentSource: "درج",
                  });
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {!active && (
          <div className={styles.tableWrapper}>
            <table className={styles.debtsTable}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className={styles.checkbox}
                    />
                  </th>
                  <th>الاسم</th>
                  <th>رقم الهاتف</th>
                  <th>الدين</th>
                  <th>الدين لمين</th>
                  <th>تاريخ الدين</th>
                  <th>تاريخ الإضافة</th>
                  <th>خيارات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyCell}>
                      <div className={styles.emptyState}>
                        <p>❌ لا توجد عملاء</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={selectedIds.has(customer.id) ? styles.selectedRow : ""}
                    >
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(customer.id)}
                          onChange={(e) => handleSelectItem(customer.id, e.target.checked)}
                          className={styles.checkbox}
                        />
                      </td>
                      <td className={styles.nameCell}>{customer.name}</td>
                      <td className={styles.phoneCell}>{customer.phone}</td>
                      <td className={styles.debtCell}>
                        {customer.debt} EGP
                      </td>
                      <td className={styles.directionCell}>{customer.debtDirection || "-"}</td>
                      <td className={styles.dateInputCell}>{customer.dateInput || "-"}</td>
                      <td className={styles.dateCell}>
                        {customer.date?.toDate
                          ? customer.date.toDate().toLocaleDateString("ar-EG")
                          : "-"}
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.payBtn}
                            onClick={() => openPaymentModal(customer)}
                            title="سداد"
                          >
                            سداد
                          </button>
                          <button
                            className={styles.increaseBtn}
                            onClick={() => openIncreaseModal(customer)}
                            title="زيادة"
                          >
                            <FaPlus />
                          </button>
                          <button
                            className={styles.detailsBtn}
                            onClick={() => openDetailsPopup(customer)}
                            title="عرض التفاصيل"
                          >
                            <FaEye />
                          </button>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteSingle(customer.id)}
                            disabled={isDeleting}
                            title="حذف"
                          >
                            <FaRegTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentCustomer && (
        <div className={styles.modalOverlay} onClick={closePaymentModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>سداد دين — {paymentCustomer.name}</h3>
              <button className={styles.closeBtn} onClick={closePaymentModal}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalInfo}>
                <p>
                  <strong>الدين الحالي:</strong> {paymentCustomer.debt} EGP
                </p>
              </div>
              <div className={styles.inputBox}>
                <div className="inputContainer">
                  <label>
                    <GiMoneyStack />
                  </label>
                  <input
                    type="number"
                    placeholder="المبلغ الذي سُدِّد"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              <div className={styles.inputBox}>
                <div className="inputContainer">
                  <label>
                    <GiMoneyStack />
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                  >
                    <option value="درج">درج</option>
                    <option value="خزنة">خزنة</option>
                  </select>
                </div>
              </div>
              {paymentAmount && (
                <div className={styles.preview}>
                  <p>
                    المبلغ المتبقي بعد السداد:{" "}
                    <strong>
                      {Math.max(0, Number(paymentCustomer.debt || 0) - Number(paymentAmount || 0))} EGP
                    </strong>
                  </p>
                </div>
              )}
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={closePaymentModal}>
                  إلغاء
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={handleConfirmPayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? "جاري الحفظ..." : "تأكيد السداد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Increase Debt Modal */}
      {showIncreaseModal && increaseCustomer && (
        <div className={styles.modalOverlay} onClick={closeIncreaseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>زيادة دين — {increaseCustomer.name}</h3>
              <button className={styles.closeBtn} onClick={closeIncreaseModal}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalInfo}>
                <p>
                  <strong>الدين الحالي:</strong> {increaseCustomer.debt} EGP
                </p>
              </div>
              <div className={styles.inputBox}>
                <div className="inputContainer">
                  <label>
                    <FaPlus />
                  </label>
                  <input
                    type="number"
                    placeholder="المبلغ المراد إضافته"
                    value={increaseAmount}
                    onChange={(e) => setIncreaseAmount(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              {increaseAmount && (
                <div className={styles.preview}>
                  <p>
                    الدين الجديد:{" "}
                    <strong>
                      {Number(increaseCustomer.debt || 0) + Number(increaseAmount || 0)} EGP
                    </strong>
                  </p>
                </div>
              )}
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={closeIncreaseModal}>
                  إلغاء
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={handleConfirmIncrease}
                  disabled={processingIncrease}
                >
                  {processingIncrease ? "جاري الحفظ..." : "تأكيد الزيادة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Popup */}
      {showDetailsPopup && (
        <div className={styles.modalOverlay} onClick={closeDetailsPopup}>
          <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>تفاصيل السداد والزيادة</h3>
              <button className={styles.closeBtn} onClick={closeDetailsPopup}>
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalInfo}>
                <p>
                  <strong>أصل الدين:</strong> {detailsAslDebt} EGP
                </p>
              </div>
              {detailsPayments.length === 0 ? (
                <p className={styles.emptyText}>لا توجد عمليات سداد أو زيادة لهذا العميل.</p>
              ) : (
                <div className={styles.detailsTableWrapper}>
                  <table className={styles.detailsTable}>
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>المبلغ</th>
                        <th>المتبقي</th>
                        <th>التاريخ</th>
                        <th>نوع العملية</th>
                        <th>مصدر السداد</th>
                        <th>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsPayments.map((p) => {
                        const isIncrease = p.type === "زيادة" || p.source === "زيادة";
                        return (
                          <tr key={p.id}>
                            <td>{p.userName || "-"}</td>
                            <td>{p.paidAmount} EGP</td>
                            <td>{p.remainingDebt} EGP</td>
                            <td>
                              {p.date?.toDate
                                ? p.date.toDate().toLocaleDateString("ar-EG")
                                : new Date(p.date).toLocaleDateString("ar-EG")}
                            </td>
                            <td>
                              <span style={{ 
                                color: isIncrease ? "#ff9800" : "#2e7d32",
                                fontWeight: 600 
                              }}>
                                {isIncrease ? "زيادة" : "سداد"}
                              </span>
                            </td>
                            <td>{isIncrease ? "-" : (p.source || "-")}</td>
                            <td>
                              <button
                                className={styles.deletePaymentBtn}
                                onClick={async () => {
                                  try {
                                    const paymentRef = doc(db, "debtsPayments", p.id);
                                    const paymentSnap = await getDoc(paymentRef);
                                    if (!paymentSnap.exists()) {
                                      showError("العملية غير موجودة");
                                      return;
                                    }
                                    const paymentData = paymentSnap.data();
                                    const isIncreaseOperation = paymentData.type === "زيادة" || paymentData.source === "زيادة";

                                    await deleteDoc(paymentRef);

                                    const debtRef = doc(db, "debts", paymentData.debtid);
                                    const debtSnap = await getDoc(debtRef);

                                    if (debtSnap.exists()) {
                                      const currentDebt = Number(debtSnap.data().debt || 0);
                                      const amount = Number(paymentData.paidAmount || 0);
                                      
                                      // إذا كانت عملية زيادة، نخصم المبلغ من الدين
                                      // إذا كانت عملية سداد، نضيف المبلغ للدين
                                      const newDebt = isIncreaseOperation 
                                        ? currentDebt - amount 
                                        : currentDebt + amount;
                                      
                                      await updateDoc(debtRef, {
                                        debt: Math.max(0, newDebt), // التأكد من أن الدين لا يكون سالب
                                      });
                                    } else {
                                      showError("❌ الدين الأصلي غير موجود");
                                      return;
                                    }

                                    // حذف من dailyProfit فقط إذا كانت عملية سداد من الخزنة
                                    if (paymentData.source === "خزنة" && !isIncreaseOperation) {
                                      const profitQuery = query(
                                        collection(db, "dailyProfit"),
                                        where("debtPaymentId", "==", p.id)
                                      );
                                      const profitSnapshot = await getDocs(profitQuery);
                                      const deleteProfitPromises = profitSnapshot.docs.map((docSnap) =>
                                        deleteDoc(docSnap.ref)
                                      );
                                      await Promise.all(deleteProfitPromises);
                                    }

                                    setDetailsPayments((prev) =>
                                      prev.filter((item) => item.id !== p.id)
                                    );

                                    success(
                                      isIncreaseOperation
                                        ? "✅ تم حذف عملية الزيادة وخصم المبلغ من الدين بنجاح"
                                        : "✅ تم حذف السداد وإرجاع المبلغ للدين بنجاح"
                                    );
                                  } catch (err) {
                                    console.error(err);
                                    showError("❌ حدث خطأ أثناء الحذف");
                                  }
                                }}
                              >
                                <FaRegTrashAlt />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          if (selectedIds.size === 1) {
            setSelectedIds(new Set());
          }
        }}
        title="تأكيد الحذف"
        message={
          selectedIds.size === 1
            ? "هل تريد حذف سجل هذا العميل وكل السدادات الخاصة به؟"
            : `هل تريد حذف ${selectedIds.size} عميل وكل السدادات الخاصة بهم؟`
        }
        onConfirm={confirmDelete}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

export default function Debts() {
  return (
    <NotificationProvider>
      <DebtsContent />
    </NotificationProvider>
  );
}
