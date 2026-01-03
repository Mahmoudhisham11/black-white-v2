"use client";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { db } from "@/app/firebase";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import Loader from "@/components/Loader/Loader";
import {
  NotificationProvider,
  useNotification,
} from "@/contexts/NotificationContext";
import ConfirmModal from "@/components/Main/Modals/ConfirmModal";

function ProfitContent() {
  const { success, error: showError, warning } = useNotification();
  const [shop, setShop] = useState("");
  const [resetAt, setResetAt] = useState(null);
  const [reports, setReports] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [dailyProfitData, setDailyProfitData] = useState([]);
  const [masrofat, setMasrofat] = useState([]);
  const [cashTotal, setCashTotal] = useState(0);
  const [profit, setProfit] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [mostafaBalance, setMostafaBalance] = useState(0);
  const [midoBalance, setMidoBalance] = useState(0);
  const [doubleMBalance, setDoubleMBalance] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isHidden, setIsHidden] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [withdrawPerson, setWithdrawPerson] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [showPayPopup, setShowPayPopup] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payPerson, setPayPerson] = useState("");
  const [payWithdrawId, setPayWithdrawId] = useState(null);
  const [showAddCashPopup, setShowAddCashPopup] = useState(false);
  const [addCashAmount, setAddCashAmount] = useState("");
  const [addCashNotes, setAddCashNotes] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get shop and hidden state
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShop(localStorage.getItem("shop") || "");
      const savedHiddenState = localStorage.getItem("hideFinance");
      if (savedHiddenState !== null) setIsHidden(savedHiddenState === "true");
      const savedReset = localStorage.getItem("resetAt");
      if (savedReset) setResetAt(new Date(savedReset));
    }
  }, []);

  // Helper functions
  const arabicToEnglishNumbers = useCallback((str) => {
    if (!str) return str;
    const map = {
      "٠": "0",
      "١": "1",
      "٢": "2",
      "٣": "3",
      "٤": "4",
      "٥": "5",
      "٦": "6",
      "٧": "7",
      "٨": "8",
      "٩": "9",
    };
    return str.replace(/[٠-٩]/g, (d) => map[d]);
  }, []);

  const parseDate = useCallback(
    (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (val?.toDate) return val.toDate();
      if (val?.seconds) return new Date(val.seconds * 1000);

      if (typeof val === "string") {
        const normalized = arabicToEnglishNumbers(val.trim());
        const dmyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
          const [, d, m, y] = dmyMatch;
          return new Date(Number(y), Number(m) - 1, Number(d));
        }
        const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
          const [, y, m, d] = isoMatch;
          return new Date(Number(y), Number(m) - 1, Number(d));
        }
        const tryDate = new Date(normalized);
        if (!isNaN(tryDate.getTime())) return tryDate;
      }
      return null;
    },
    [arabicToEnglishNumbers]
  );

  const formatDate = useCallback((date) => {
    if (!date) return "—";
    const d = date.getDate().toString().padStart(2, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }, []);

  // Fetch reset data
  const fetchReset = useCallback(async () => {
    if (!shop) return;

    try {
      const resetSnap = await getDocs(
        query(collection(db, "reset"), where("shop", "==", shop))
      );
      const resets = resetSnap.docs.map((doc) => doc.data());

      if (resets.length > 0) {
        const latestReset = resets.reduce((prev, curr) => {
          const prevTs = prev.resetAt?.seconds
            ? prev.resetAt.seconds
            : new Date(prev.resetAt).getTime() / 1000;
          const currTs = curr.resetAt?.seconds
            ? curr.resetAt.seconds
            : new Date(curr.resetAt).getTime() / 1000;
          return prevTs > currTs ? prev : curr;
        });
        const val = latestReset.resetAt;
        setResetAt(val?.toDate ? val.toDate() : new Date(val));
      }
    } catch (error) {
      console.error("Error fetching reset:", error);
      showError("حدث خطأ أثناء جلب بيانات التصفير");
    }
  }, [shop, showError]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!shop) return;

    try {
      setLoading(true);

      // Fetch reports
      const reportsSnap = await getDocs(
        query(collection(db, "reports"), where("shop", "==", shop))
      );
      setReports(
        reportsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Fetch withdraws
      const withdrawsSnap = await getDocs(
        query(collection(db, "withdraws"), where("shop", "==", shop))
      );
      setWithdraws(
        withdrawsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Fetch daily profit
      const dailyProfitSnap = await getDocs(
        query(collection(db, "dailyProfit"), where("shop", "==", shop))
      );
      setDailyProfitData(
        dailyProfitSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );

      // Fetch masrofat (expenses)
      const masrofatSnap = await getDocs(
        query(collection(db, "masrofat"), where("shop", "==", shop))
      );
      setMasrofat(
        masrofatSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [shop, showError]);

  // Initial fetch
  useEffect(() => {
    if (!shop) return;
    fetchData();
    fetchReset();
  }, [shop, fetchData, fetchReset]);

  // Real-time updates
  useEffect(() => {
    if (!shop) return;

    const unsubscribeReports = onSnapshot(
      query(collection(db, "reports"), where("shop", "==", shop)),
      (snapshot) => {
        setReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Error in reports subscription:", error);
        showError("حدث خطأ أثناء تحديث التقارير");
      }
    );

    const unsubscribeWithdraws = onSnapshot(
      query(collection(db, "withdraws"), where("shop", "==", shop)),
      (snapshot) => {
        setWithdraws(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        console.error("Error in withdraws subscription:", error);
        showError("حدث خطأ أثناء تحديث السحوبات");
      }
    );

    const unsubscribeDailyProfit = onSnapshot(
      query(collection(db, "dailyProfit"), where("shop", "==", shop)),
      (snapshot) => {
        setDailyProfitData(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        console.error("Error in dailyProfit subscription:", error);
        showError("حدث خطأ أثناء تحديث الأرباح اليومية");
      }
    );

    const unsubscribeMasrofat = onSnapshot(
      query(collection(db, "masrofat"), where("shop", "==", shop)),
      (snapshot) => {
        setMasrofat(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      },
      (error) => {
        console.error("Error in masrofat subscription:", error);
        showError("حدث خطأ أثناء تحديث المصروفات");
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeWithdraws();
      unsubscribeDailyProfit();
      unsubscribeMasrofat();
    };
  }, [shop, showError]);

  // Calculate totals with useMemo
  const calculatedTotals = useMemo(() => {
    if (!shop)
      return { 
        cashTotal: 0, 
        profit: 0, 
        grossProfit: 0,
        netProfit: 0,
        mostafa: 0, 
        mido: 0, 
        doubleM: 0 
      };

    const from = dateFrom
      ? new Date(dateFrom + "T00:00:00")
      : new Date("1970-01-01");
    const to = dateTo ? new Date(dateTo + "T23:59:59") : new Date();

    const isUsingDateFilter = Boolean(dateFrom || dateTo);
    const effectiveFrom = isUsingDateFilter ? from : resetAt || from;

    const dailyForCash = dailyProfitData.filter((d) => {
      const dDate = parseDate(d.date) || parseDate(d.createdAt);
      return dDate && dDate >= from && dDate <= to;
    });

    const filteredDaily = dailyProfitData.filter((d) => {
      const dDate = parseDate(d.date) || parseDate(d.createdAt);
      return dDate && dDate >= effectiveFrom && dDate <= to;
    });

    const filteredReports = reports.filter((r) => {
      const rDate = parseDate(r.date) || parseDate(r.createdAt);
      return rDate && rDate >= effectiveFrom && rDate <= to;
    });

    const filteredWithdraws = withdraws.filter((w) => {
      const wDate = parseDate(w.date) || parseDate(w.createdAt);
      return wDate && wDate >= effectiveFrom && wDate <= to;
    });

    // تصفية المصروفات حسب التاريخ
    const filteredMasrofat = masrofat.filter((m) => {
      const mDate = parseDate(m.date) || parseDate(m.createdAt);
      return mDate && mDate >= effectiveFrom && mDate <= to;
    });

    const totalMasrofat = dailyForCash.reduce(
      (sum, d) => sum + (d.totalMasrofat || 0),
      0
    );
    const totalCash = dailyForCash.reduce((sum, d) => {
      const sales = Number(d.totalSales || 0);
      if (d.type === "سداد") {
        return sum - sales;
      }
      return sum + sales;
    }, 0);

    let remainingCash = totalCash - totalMasrofat;

    filteredWithdraws.forEach((w) => {
      const remaining = Number(w.amount || 0) - Number(w.paid || 0);
      if (w.person === "الخزنة") {
        remainingCash += remaining;
      } else {
        remainingCash -= remaining;
      }
    });

    // حساب الربح الإجمالي = إجمالي بيع الفواتير (total sales)
    let grossProfitValue = 0;
    filteredReports.forEach((r) => {
      // استخدام total من الفاتورة مباشرة
      const reportTotal = Number(r.total || 0);
      grossProfitValue += reportTotal;
    });

    // حساب الربح = مجموع أرباح كل فاتورة من reports
    let profitValue = 0;
    filteredReports.forEach((r) => {
      // استخدام profit من الفاتورة مباشرة
      const reportProfit = Number(r.profit || 0);
      profitValue += reportProfit;
    });

    // حساب المصروفات بدون "فاتورة مرتجع"
    const totalMasrofatWithoutReturn = filteredMasrofat.reduce((sum, m) => {
      // استبعاد المصروفات التي سببها "فاتورة مرتجع"
      if (m.reason === "فاتورة مرتجع") {
        return sum;
      }
      return sum + Number(m.masrof || 0);
    }, 0);

    // حساب صافي الربح = مجموع أرباح كل فاتورة - المصروفات (بدون فاتورة مرتجع)
    const netProfitValue = profitValue - totalMasrofatWithoutReturn;

    let remainingProfit = profitValue;
    const totalMasrofatT = filteredDaily.reduce(
      (sum, d) => sum + Number(d.totalMasrofat || 0),
      0
    );
    remainingProfit -= totalMasrofatT;

    let mostafaSum = 0,
      midoSum = 0,
      doubleMSum = 0;
    filteredWithdraws.forEach((w) => {
      const remaining = Number(w.amount || 0) - Number(w.paid || 0);
      if (w.person !== "الخزنة") {
        remainingProfit -= remaining;
      }
      if (w.person === "مصطفى") mostafaSum += remaining;
      if (w.person === "ميدو") midoSum += remaining;
      if (w.person === "دبل M") doubleMSum += remaining;
    });

    const returnedProfit = filteredDaily.reduce(
      (sum, d) => sum + Number(d.returnedProfit || 0),
      0
    );
    remainingProfit -= returnedProfit;

    return {
      cashTotal: remainingCash < 0 ? 0 : remainingCash,
      profit: profitValue, // الربح = مجموع أرباح كل فاتورة
      grossProfit: grossProfitValue,
      netProfit: netProfitValue < 0 ? 0 : netProfitValue, // صافي الربح = مجموع أرباح الفواتير - المصروفات (بدون فاتورة مرتجع)
      mostafa: mostafaSum < 0 ? 0 : mostafaSum,
      mido: midoSum < 0 ? 0 : midoSum,
      doubleM: doubleMSum < 0 ? 0 : doubleMSum,
    };
  }, [
    dateFrom,
    dateTo,
    dailyProfitData,
    reports,
    withdraws,
    masrofat,
    shop,
    resetAt,
    parseDate,
  ]);

  useEffect(() => {
    setCashTotal(calculatedTotals.cashTotal);
    setProfit(calculatedTotals.profit);
    setGrossProfit(calculatedTotals.grossProfit);
    setNetProfit(calculatedTotals.netProfit);
    setMostafaBalance(calculatedTotals.mostafa);
    setMidoBalance(calculatedTotals.mido);
    setDoubleMBalance(calculatedTotals.doubleM);
  }, [calculatedTotals]);

  const toggleHidden = useCallback(() => {
    setIsHidden((prev) => {
      const newState = !prev;
      localStorage.setItem("hideFinance", String(newState));
      return newState;
    });
  }, []);

  const handleWithdraw = useCallback(async () => {
    if (!withdrawPerson || !withdrawAmount) {
      showError("اختر الشخص واكتب المبلغ");
      return;
    }
    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      showError("المبلغ غير صالح");
      return;
    }
    if (amount > cashTotal) {
      showError("رصيد الخزنة غير كافي");
      return;
    }

    setIsProcessing(true);
    try {
      const newDate = new Date();
      await addDoc(collection(db, "withdraws"), {
        shop,
        person: withdrawPerson,
        amount,
        notes: withdrawNotes,
        date: formatDate(newDate),
        createdAt: Timestamp.fromDate(newDate),
        paid: 0,
      });

      success("✅ تم إضافة السحب بنجاح");
      setWithdrawPerson("");
      setWithdrawAmount("");
      setWithdrawNotes("");
      setShowPopup(false);
    } catch (error) {
      console.error("Error adding withdraw:", error);
      showError("حدث خطأ أثناء إضافة السحب");
    } finally {
      setIsProcessing(false);
    }
  }, [
    withdrawPerson,
    withdrawAmount,
    withdrawNotes,
    cashTotal,
    shop,
    formatDate,
    success,
    showError,
  ]);

  const handleAddCash = useCallback(async () => {
    const amount = Number(addCashAmount);
    if (!amount || amount <= 0) {
      showError("ادخل مبلغ صالح");
      return;
    }

    setIsProcessing(true);
    try {
      const newDate = new Date();
      await addDoc(collection(db, "withdraws"), {
        shop,
        person: "الخزنة",
        amount,
        paid: 0,
        notes: addCashNotes,
        date: formatDate(newDate),
        createdAt: Timestamp.fromDate(newDate),
      });

      success("✅ تم إضافة المبلغ للخزنة بنجاح");
      setAddCashAmount("");
      setAddCashNotes("");
      setShowAddCashPopup(false);
    } catch (error) {
      console.error("Error adding cash:", error);
      showError("حدث خطأ أثناء إضافة المبلغ");
    } finally {
      setIsProcessing(false);
    }
  }, [addCashAmount, addCashNotes, shop, formatDate, success, showError]);

  const handleResetProfit = useCallback(async () => {
    setIsProcessing(true);
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "reset"), {
        shop,
        resetAt: now,
      });

      const nowDate = new Date();
      localStorage.setItem("resetAt", nowDate.toISOString());
      setResetAt(nowDate);
      success("✅ تم تصفير الأرباح والأرصدة بنجاح");
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Error resetting profit:", error);
      showError("حدث خطأ أثناء تصفير الأرباح");
    } finally {
      setIsProcessing(false);
    }
  }, [shop, success, showError]);

  const handleDeleteWithdraw = useCallback(
    async (id) => {
      if (!id) return;

      setIsProcessing(true);
      try {
        await deleteDoc(doc(db, "withdraws", id));
        success("✅ تم حذف السحب بنجاح");
      } catch (error) {
        console.error("Error deleting withdraw:", error);
        showError("حدث خطأ أثناء حذف السحب");
      } finally {
        setIsProcessing(false);
      }
    },
    [success, showError]
  );

  const handleOpenPay = useCallback((withdraw) => {
    setPayWithdrawId(withdraw.id);
    setPayPerson(withdraw.person);
    setPayAmount("");
    setShowPayPopup(true);
  }, []);

  const handlePay = useCallback(async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      showError("ادخل مبلغ صالح");
      return;
    }

    const withdraw = withdraws.find((w) => w.id === payWithdrawId);
    if (!withdraw) {
      showError("حدث خطأ");
      return;
    }

    const remainingDebt = withdraw.amount - (withdraw.paid || 0);
    if (amount > remainingDebt) {
      showError(`المبلغ أكبر من المبلغ المستحق: ${remainingDebt}`);
      return;
    }

    setIsProcessing(true);
    try {
      const withdrawRef = doc(db, "withdraws", payWithdrawId);
      await updateDoc(withdrawRef, { paid: (withdraw.paid || 0) + amount });
      success("✅ تم السداد بنجاح");
      setShowPayPopup(false);
    } catch (error) {
      console.error("Error paying withdraw:", error);
      showError("حدث خطأ أثناء السداد");
    } finally {
      setIsProcessing(false);
    }
  }, [payAmount, payWithdrawId, withdraws, success, showError]);

  const filteredWithdraws = useMemo(() => {
    const filtered = withdraws.filter((w) => {
      if (!dateFrom && !dateTo) return true;
      const wDate = parseDate(w.date) || parseDate(w.createdAt);
      if (!wDate) return false;
      const from = dateFrom
        ? new Date(dateFrom + "T00:00:00")
        : new Date("1970-01-01");
      const to = dateTo ? new Date(dateTo + "T23:59:59") : new Date();
      return wDate >= from && wDate <= to;
    });

    // ترتيب حسب التاريخ (الأحدث أولاً)
    return filtered.sort((a, b) => {
      const dateA = parseDate(a.date) || parseDate(a.createdAt);
      const dateB = parseDate(b.date) || parseDate(b.createdAt);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime(); // ترتيب تنازلي (الأحدث أولاً)
    });
  }, [withdraws, dateFrom, dateTo, parseDate]);

  if (loading && reports.length === 0 && withdraws.length === 0) {
    return <Loader />;
  }

  return (
    <div className={styles.profit}>
      <SideBar />

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>الأرباح</h2>
          <div className={styles.headerActions}>
            <button onClick={toggleHidden} className={styles.toggleBtn}>
              {isHidden ? "إظهار الأرقام" : "إخفاء الأرقام"}
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className={styles.resetBtn}
            >
              تصفير الأرباح
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className={styles.searchBox}>
          <div className={styles.inputContainer}>
            <label className={styles.dateLabel}>من تاريخ:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.inputContainer}>
            <label className={styles.dateLabel}>إلى تاريخ:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>الخزنة</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : cashTotal.toFixed(2)} EGP
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>الربح</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : profit.toFixed(2)} EGP
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>صافي الربح</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : netProfit.toFixed(2)} EGP
            </span>
          </div>
        </div>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>مصطفى</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : mostafaBalance.toFixed(2)} EGP
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>ميدو</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : midoBalance.toFixed(2)} EGP
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>دبل M</span>
            <span className={styles.summaryValue}>
              {isHidden ? "*****" : doubleMBalance.toFixed(2)} EGP
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={() => setShowPopup(true)}
            className={styles.withdrawBtn}
          >
            سحب
          </button>
          <button
            onClick={() => setShowAddCashPopup(true)}
            className={styles.addCashBtn}
          >
            إضافة للخزنة
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.profitTable}>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>المبلغ</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>التاريخ</th>
                <th>ملاحظات</th>
                <th>حذف</th>
                <th>سداد</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdraws.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      <p>❌ لا توجد سحوبات في الفترة المحددة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWithdraws.map((w) => {
                  const remaining = w.amount - (w.paid || 0);
                  return (
                    <tr key={w.id}>
                      <td className={styles.nameCell}>{w.person}</td>
                      <td className={styles.amountCell}>
                        {isHidden ? "*****" : w.amount.toFixed(2)} EGP
                      </td>
                      <td className={styles.paidCell}>
                        {isHidden ? "*****" : (w.paid || 0).toFixed(2)} EGP
                      </td>
                      <td className={styles.remainingCell}>
                        {isHidden ? "*****" : remaining.toFixed(2)} EGP
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(
                          parseDate(w.date) || parseDate(w.createdAt)
                        )}
                      </td>
                      <td className={styles.notesCell}>{w.notes || "-"}</td>
                      <td className={styles.actionsCell}>
                        {remaining > 0 && (
                          <button
                            className={styles.delBtn}
                            onClick={() => handleDeleteWithdraw(w.id)}
                            disabled={isProcessing}
                          >
                            حذف
                          </button>
                        )}
                      </td>
                      <td className={styles.actionsCell}>
                        {remaining > 0 && (
                          <button
                            className={styles.payBtn}
                            onClick={() => handleOpenPay(w)}
                            disabled={isProcessing}
                          >
                            سداد
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showPopup && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPopup(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>عملية سحب</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.inputContainer}>
                <label>اختر الشخص:</label>
                <select
                  value={withdrawPerson}
                  onChange={(e) => setWithdrawPerson(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="">اختر الشخص</option>
                  <option value="مصطفى">مصطفى</option>
                  <option value="ميدو">ميدو</option>
                  <option value="دبل M">دبل M</option>
                </select>
              </div>
              <div className={styles.inputContainer}>
                <label>المبلغ:</label>
                <input
                  type="number"
                  placeholder="المبلغ"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.inputContainer}>
                <label>ملاحظات:</label>
                <input
                  type="text"
                  placeholder="ملاحظات"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className={styles.modalInput}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleWithdraw}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري المعالجة..." : "تأكيد"}
              </button>
              <button
                onClick={() => setShowPopup(false)}
                className={styles.cancelBtn}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Cash Modal */}
      {showAddCashPopup && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddCashPopup(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>إضافة مبلغ للخزنة</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowAddCashPopup(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.inputContainer}>
                <label>المبلغ:</label>
                <input
                  type="number"
                  placeholder="المبلغ"
                  value={addCashAmount}
                  onChange={(e) => setAddCashAmount(e.target.value)}
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.inputContainer}>
                <label>ملاحظات:</label>
                <input
                  type="text"
                  placeholder="ملاحظات"
                  value={addCashNotes}
                  onChange={(e) => setAddCashNotes(e.target.value)}
                  className={styles.modalInput}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleAddCash}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري المعالجة..." : "تأكيد"}
              </button>
              <button
                onClick={() => setShowAddCashPopup(false)}
                className={styles.cancelBtn}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayPopup && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowPayPopup(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>سداد مبلغ</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowPayPopup(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.editInfo}>
                <p>
                  <strong>الشخص:</strong> {payPerson}
                </p>
              </div>
              <div className={styles.inputContainer}>
                <label>المبلغ:</label>
                <input
                  type="number"
                  placeholder="المبلغ"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className={styles.modalInput}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handlePay}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري المعالجة..." : "تأكيد"}
              </button>
              <button
                onClick={() => setShowPayPopup(false)}
                className={styles.cancelBtn}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirm Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="تأكيد التصفير"
        message="هل أنت متأكد من تصفير الأرباح والأرصدة؟"
        onConfirm={handleResetProfit}
        confirmText="تأكيد التصفير"
        cancelText="إلغاء"
        type="warning"
      />
    </div>
  );
}

export default function Profit() {
  return (
    <NotificationProvider>
      <ProfitContent />
    </NotificationProvider>
  );
}
