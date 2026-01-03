"use client";
import styles from "./styles.module.css";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import SideBar from "@/components/SideBar/page";
import { db } from "@/app/firebase";
import {
  NotificationProvider,
  useNotification,
} from "@/contexts/NotificationContext";
import ConfirmModal from "@/components/Main/Modals/ConfirmModal";
import Loader from "@/components/Loader/Loader";
import { MdPersonAddAlt1 } from "react-icons/md";
import { FaRegTrashAlt } from "react-icons/fa";
import { TbReportSearch } from "react-icons/tb";
import { IoMdSearch } from "react-icons/io";

function EmployeeReportsContent() {
  const { id } = useParams();
  const { success, error: showError } = useNotification();
  const [employee, setEmployee] = useState(null);
  const [salary, setSalary] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [adjustments, setAdjustments] = useState([]);
  const [hoursRecords, setHoursRecords] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showDeleteSalesConfirm, setShowDeleteSalesConfirm] = useState(false);
  const [showDeleteRecordConfirm, setShowDeleteRecordConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showHourModal, setShowHourModal] = useState(false);

  // Form states
  const [hourDate, setHourDate] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adjustType, setAdjustType] = useState("bonus");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const shop =
    typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  // جلب بيانات الموظف
  useEffect(() => {
    if (!id) return;
    const empRef = doc(db, "employees", id);
    const unsubscribe = onSnapshot(empRef, (snapshot) => {
      if (snapshot.exists()) {
        const empData = snapshot.data();
        setEmployee(empData);
        setSalary(parseFloat(empData.salary) || 0);
        setPercentage(parseFloat(empData.percentage) || 0);
      }
    });
    return () => unsubscribe();
  }, [id]);

  // جلب المبيعات
  useEffect(() => {
    if (!employee?.name || !shop) return;
    const q = query(
      collection(db, "reports"),
      where("shop", "==", shop),
      where("employee", "==", employee.name)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // ترتيب حسب التاريخ تنازليًا
      data.sort((a, b) => {
        const dateA = a.date?.toDate
          ? a.date.toDate().getTime()
          : a.date?.seconds
          ? a.date.seconds * 1000
          : 0;
        const dateB = b.date?.toDate
          ? b.date.toDate().getTime()
          : b.date?.seconds
          ? b.date.seconds * 1000
          : 0;
        return dateB - dateA;
      });
      setSales(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [employee, shop]);

  // جلب سجلات الساعات
  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "employeeHours"), where("employeeId", "==", id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
      setHoursRecords(data);
    });
    return () => unsubscribe();
  }, [id]);

  // جلب العلاوات/الخصومات
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "employeeAdjustments"),
      where("employeeId", "==", id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAdjustments(data);
    });
    return () => unsubscribe();
  }, [id]);

  // حساب قيمة الساعة
  const hourlyRate = useMemo(() => {
    const today = new Date();
    const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
    const daysThisMonth = daysInMonth(today.getFullYear(), today.getMonth() + 1);
    return salary / (daysThisMonth * 12);
  }, [salary]);

  const computeHoursBetween = useCallback((inTime, outTime) => {
    if (!inTime || !outTime) return 0;
    const [ih, im] = inTime.split(":").map(Number);
    const [oh, om] = outTime.split(":").map(Number);
    let start = ih * 60 + im;
    let end = oh * 60 + om;
    if (end < start) end += 24 * 60;
    return parseFloat(((end - start) / 60).toFixed(2));
  }, []);

  // حساب إجمالي المبيعات
  const totalSales = useMemo(() => {
    return sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  }, [sales]);

  // حساب العمولة
  const commission = useMemo(() => {
    return totalSales * (percentage / 100);
  }, [totalSales, percentage]);

  // حساب الراتب النهائي
  const finalSalary = useMemo(() => {
    const totalHours = hoursRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
    const hoursSalary = totalHours * hourlyRate;
    const totalBonuses = adjustments
      .filter((a) => a.type === "bonus")
      .reduce((sum, a) => sum + (a.value || 0), 0);
    const totalDeductions = adjustments
      .filter((a) => a.type === "deduction")
      .reduce((sum, a) => sum + (a.value || 0), 0);
    return salary + hoursSalary + commission + totalBonuses - totalDeductions;
  }, [salary, hoursRecords, hourlyRate, commission, adjustments]);

  // تصفية المبيعات حسب التاريخ
  const filteredSales = useMemo(() => {
    if (!searchDate) return sales;
    const selectedDate = new Date(searchDate).toLocaleDateString("ar-EG");
    return sales.filter((s) => {
      if (!s.date) return false;
      const saleDate = s.date?.toDate
        ? s.date.toDate().toLocaleDateString("ar-EG")
        : s.date?.seconds
        ? new Date(s.date.seconds * 1000).toLocaleDateString("ar-EG")
        : "";
      return saleDate === selectedDate;
    });
  }, [sales, searchDate]);

  // حساب الراتب التراكمي لكل يوم
  const dailySalary = useMemo(() => {
    const daily = {};
    sales.forEach((sale) => {
      if (!sale.date) return;
      const saleDate = sale.date?.toDate
        ? sale.date.toDate().toLocaleDateString("ar-EG")
        : sale.date?.seconds
        ? new Date(sale.date.seconds * 1000).toLocaleDateString("ar-EG")
        : "";
      if (!saleDate) return;

      if (!daily[saleDate]) {
        daily[saleDate] = {
          date: saleDate,
          sales: 0,
          commission: 0,
          hours: 0,
          hoursSalary: 0,
          bonuses: 0,
          deductions: 0,
          total: salary,
        };
      }

      const saleTotal = parseFloat(sale.total) || 0;
      daily[saleDate].sales += saleTotal;
      daily[saleDate].commission = daily[saleDate].sales * (percentage / 100);
    });

    // إضافة الساعات
    hoursRecords.forEach((hr) => {
      const hrDate = hr.date || "";
      if (!hrDate) return;
      if (!daily[hrDate]) {
        daily[hrDate] = {
          date: hrDate,
          sales: 0,
          commission: 0,
          hours: 0,
          hoursSalary: 0,
          bonuses: 0,
          deductions: 0,
          total: salary,
        };
      }
      daily[hrDate].hours += hr.hours || 0;
      daily[hrDate].hoursSalary = daily[hrDate].hours * hourlyRate;
    });

    // إضافة العلاوات والخصومات
    adjustments.forEach((adj) => {
      const adjDate = adj.date?.toDate
        ? adj.date.toDate().toLocaleDateString("ar-EG")
        : adj.date?.seconds
        ? new Date(adj.date.seconds * 1000).toLocaleDateString("ar-EG")
        : "";
      if (!adjDate) return;
      if (!daily[adjDate]) {
        daily[adjDate] = {
          date: adjDate,
          sales: 0,
          commission: 0,
          hours: 0,
          hoursSalary: 0,
          bonuses: 0,
          deductions: 0,
          total: salary,
        };
      }
      if (adj.type === "bonus") {
        daily[adjDate].bonuses += adj.value || 0;
      } else {
        daily[adjDate].deductions += adj.value || 0;
      }
    });

    // حساب الإجمالي لكل يوم
    Object.keys(daily).forEach((date) => {
      daily[date].total =
        salary +
        daily[date].hoursSalary +
        daily[date].commission +
        daily[date].bonuses -
        daily[date].deductions;
    });

    return Object.values(daily).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [sales, hoursRecords, adjustments, salary, percentage, hourlyRate]);

  // حفظ سجل ساعات
  const handleSaveHourRecord = useCallback(async () => {
    if (!hourDate || !checkIn || !checkOut) {
      showError("من فضلك أكمل جميع الحقول");
      return;
    }
    const hours = computeHoursBetween(checkIn, checkOut);
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "employeeHours"), {
        employeeId: id,
        dateISO: hourDate,
        date: `${hourDate.split("-")[2]}/${hourDate.split("-")[1]}/${hourDate.split("-")[0]}`,
        checkIn,
        checkOut,
        hours,
        createdAt: Timestamp.now(),
      });
      success("✅ تم حفظ سجل الساعات بنجاح");
      setHourDate("");
      setCheckIn("");
      setCheckOut("");
      setShowHourModal(false);
    } catch (err) {
      console.error(err);
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setIsProcessing(false);
    }
  }, [hourDate, checkIn, checkOut, id, computeHoursBetween, success, showError]);

  // حفظ خصم/علاوة
  const handleSaveAdjustment = useCallback(async () => {
    if (!adjustValue || isNaN(adjustValue)) {
      showError("من فضلك أدخل قيمة صحيحة");
      return;
    }
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "employeeAdjustments"), {
        employeeId: id,
        type: adjustType,
        value: parseFloat(adjustValue),
        note: adjustNote,
        date: Timestamp.now(),
      });
      success("✅ تمت العملية بنجاح");
      setAdjustValue("");
      setAdjustNote("");
      setShowAdjustmentModal(false);
    } catch (err) {
      console.error(err);
      showError("حدث خطأ أثناء الحفظ");
    } finally {
      setIsProcessing(false);
    }
  }, [adjustValue, adjustType, adjustNote, id, success, showError]);

  // حذف سجل
  const handleDeleteRecord = useCallback((record, type) => {
    setRecordToDelete({ ...record, type });
    setShowDeleteRecordConfirm(true);
  }, []);

  const handleConfirmDeleteRecord = useCallback(async () => {
    if (!recordToDelete) return;
    setIsProcessing(true);
    try {
      if (recordToDelete.type === "hours") {
        await deleteDoc(doc(db, "employeeHours", recordToDelete.id));
      } else {
        await deleteDoc(doc(db, "employeeAdjustments", recordToDelete.id));
      }
      success("✅ تم الحذف بنجاح");
      setRecordToDelete(null);
    } catch (err) {
      console.error(err);
      showError("حدث خطأ أثناء الحذف");
    } finally {
      setIsProcessing(false);
      setShowDeleteRecordConfirm(false);
    }
  }, [recordToDelete, success, showError]);

  // حذف المبيعات
  const handleDeleteSales = useCallback(() => {
    setShowDeleteSalesConfirm(true);
  }, []);

  const handleConfirmDeleteSales = useCallback(async () => {
    if (filteredSales.length === 0) {
      showError("لا توجد مبيعات للحذف");
      return;
    }
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      filteredSales.forEach((sale) => {
        batch.delete(doc(db, "reports", sale.id));
      });
      await batch.commit();
      success(`✅ تم حذف ${filteredSales.length} عملية بيع بنجاح`);
      setSearchDate("");
    } catch (err) {
      console.error(err);
      showError("حدث خطأ أثناء حذف المبيعات");
    } finally {
      setIsProcessing(false);
      setShowDeleteSalesConfirm(false);
    }
  }, [filteredSales, success, showError]);

  // دمج البيانات للعرض
  const combinedRecords = useMemo(() => {
    return [
      ...hoursRecords.map((r) => ({
        id: r.id,
        date: r.date,
        type: "hours",
        hours: r.hours,
        value: (r.hours * hourlyRate).toFixed(2),
        note: `حضور ${r.checkIn} - انصراف ${r.checkOut}`,
      })),
      ...adjustments.map((a) => ({
        id: a.id,
        date: a.date?.toDate
          ? a.date.toDate().toLocaleDateString("ar-EG")
          : a.date?.seconds
          ? new Date(a.date.seconds * 1000).toLocaleDateString("ar-EG")
          : "-",
        type: a.type,
        hours: "-",
        value: a.value,
        note: a.note || "-",
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [hoursRecords, adjustments, hourlyRate]);

  if (loading) return <Loader />;

  return (
    <div className={styles.employeeReport}>
      <SideBar />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>تقرير الموظف: {employee?.name || ""}</h2>
          <div className={styles.headerActions}>
            <button
              onClick={() => setShowSalesModal(true)}
              className={styles.viewSalesBtn}
            >
              <TbReportSearch />
              عرض جميع المبيعات
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className={styles.searchBox}>
          <div className={styles.inputContainer}>
            <label className={styles.searchLabel}>البحث بالتاريخ:</label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className={styles.searchInput}
              placeholder="اختر التاريخ"
            />
          </div>
          {searchDate && (
            <button
              onClick={() => setSearchDate("")}
              className={styles.clearSearchBtn}
            >
              مسح البحث
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className={styles.cardContainer}>
          <div className={styles.card}>
            <h3>الراتب الأساسي</h3>
            <p>{salary.toFixed(2)} جنيه</p>
          </div>
          <div className={styles.card}>
            <h3>إجمالي المبيعات</h3>
            <p>{totalSales.toFixed(2)} جنيه</p>
          </div>
          <div className={styles.card}>
            <h3>العمولة ({percentage}%)</h3>
            <p>{commission.toFixed(2)} جنيه</p>
          </div>
          <div className={styles.card}>
            <h3>الراتب النهائي</h3>
            <p>{finalSalary.toFixed(2)} جنيه</p>
          </div>
        </div>

        {/* Daily Salary Table */}
        {searchDate && (
          <div className={styles.tableWrapper}>
            <h3 className={styles.sectionTitle}>الراتب التراكمي حسب التاريخ</h3>
            <table className={styles.employeeTable}>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المبيعات</th>
                  <th>العمولة</th>
                  <th>الساعات</th>
                  <th>راتب الساعات</th>
                  <th>علاوات</th>
                  <th>خصومات</th>
                  <th>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {dailySalary
                  .filter((d) => d.date === new Date(searchDate).toLocaleDateString("ar-EG"))
                  .map((day, idx) => (
                    <tr key={idx}>
                      <td>{day.date}</td>
                      <td>{day.sales.toFixed(2)} جنيه</td>
                      <td>{day.commission.toFixed(2)} جنيه</td>
                      <td>{day.hours.toFixed(2)}</td>
                      <td>{day.hoursSalary.toFixed(2)} جنيه</td>
                      <td>{day.bonuses.toFixed(2)} جنيه</td>
                      <td>{day.deductions.toFixed(2)} جنيه</td>
                      <td className={styles.totalCell}>
                        {day.total.toFixed(2)} جنيه
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actionsSection}>
          <button
            onClick={() => setShowHourModal(true)}
            className={styles.actionBtn}
          >
            <MdPersonAddAlt1 />
            إضافة سجل ساعة
          </button>
          <button
            onClick={() => {
              setAdjustType("bonus");
              setShowAdjustmentModal(true);
            }}
            className={styles.actionBtn}
          >
            إضافة علاوة
          </button>
          <button
            onClick={() => {
              setAdjustType("deduction");
              setShowAdjustmentModal(true);
            }}
            className={styles.actionBtn}
          >
            إضافة خصم
          </button>
          {searchDate && filteredSales.length > 0 && (
            <button
              onClick={handleDeleteSales}
              className={styles.deleteSalesBtn}
              disabled={isProcessing}
            >
              <FaRegTrashAlt />
              حذف مبيعات هذا التاريخ
            </button>
          )}
        </div>

        {/* Records Table */}
        <div className={styles.tableWrapper}>
          <h3 className={styles.sectionTitle}>سجلات الموظف</h3>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>الساعات</th>
                <th>القيمة</th>
                <th>ملاحظة</th>
                <th>التحكم</th>
              </tr>
            </thead>
            <tbody>
              {combinedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      لا توجد بيانات بعد
                    </div>
                  </td>
                </tr>
              ) : (
                combinedRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      {r.type === "hours"
                        ? "ساعات"
                        : r.type === "bonus"
                        ? "علاوة"
                        : "خصم"}
                    </td>
                    <td>{r.hours}</td>
                    <td>{r.value} جنيه</td>
                    <td>{r.note}</td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={() => handleDeleteRecord(r, r.type)}
                        className={styles.deleteBtn}
                        disabled={isProcessing}
                        title="حذف"
                      >
                        <FaRegTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Modal */}
      {showSalesModal && (
        <div className={styles.popupOverlay} onClick={() => setShowSalesModal(false)}>
          <div
            className={styles.popupBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>جميع المبيعات - {employee?.name}</h3>
            <div className={styles.modalTableWrapper}>
              <table className={styles.employeeTable}>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>رقم الفاتورة</th>
                    <th>العميل</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={styles.emptyCell}>
                        لا توجد مبيعات
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>
                          {sale.date?.toDate
                            ? sale.date.toDate().toLocaleDateString("ar-EG")
                            : sale.date?.seconds
                            ? new Date(sale.date.seconds * 1000).toLocaleDateString("ar-EG")
                            : "-"}
                        </td>
                        <td>{sale.invoiceNumber || "-"}</td>
                        <td>{sale.clientName || "بدون اسم"}</td>
                        <td>{parseFloat(sale.total || 0).toFixed(2)} جنيه</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className={styles.popupBtns}>
              <button
                onClick={() => setShowSalesModal(false)}
                className={styles.cancelBtn}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hour Modal */}
      {showHourModal && (
        <div
          className={styles.popupOverlay}
          onClick={() => setShowHourModal(false)}
        >
          <div
            className={styles.popupBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>إضافة سجل ساعة</h3>
            <div className={styles.modalContent}>
              <div className="inputContainer">
                <label>التاريخ:</label>
                <input
                  type="date"
                  value={hourDate}
                  onChange={(e) => setHourDate(e.target.value)}
                />
              </div>
              <div className="inputContainer">
                <label>حضور:</label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="inputContainer">
                <label>انصراف:</label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.popupBtns}>
              <button
                onClick={() => {
                  setShowHourModal(false);
                  setHourDate("");
                  setCheckIn("");
                  setCheckOut("");
                }}
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveHourRecord}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div
          className={styles.popupOverlay}
          onClick={() => setShowAdjustmentModal(false)}
        >
          <div
            className={styles.popupBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {adjustType === "bonus" ? "إضافة علاوة" : "إضافة خصم"}
            </h3>
            <div className={styles.modalContent}>
              <div className="inputContainer">
                <label>القيمة:</label>
                <input
                  type="number"
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(e.target.value)}
                  placeholder="أدخل القيمة"
                  min="0"
                />
              </div>
              <div className="inputContainer">
                <label>ملاحظة:</label>
                <textarea
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="أدخل ملاحظة (اختياري)"
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.popupBtns}>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setAdjustValue("");
                  setAdjustNote("");
                }}
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveAdjustment}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirm */}
      <ConfirmModal
        isOpen={showDeleteRecordConfirm}
        onClose={() => {
          setShowDeleteRecordConfirm(false);
          setRecordToDelete(null);
        }}
        title="تأكيد الحذف"
        message="هل أنت متأكد أنك تريد حذف هذا السجل؟"
        onConfirm={handleConfirmDeleteRecord}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />

      {/* Delete Sales Confirm */}
      <ConfirmModal
        isOpen={showDeleteSalesConfirm}
        onClose={() => setShowDeleteSalesConfirm(false)}
        title="تأكيد الحذف"
        message={`هل أنت متأكد أنك تريد حذف ${filteredSales.length} عملية بيع؟`}
        onConfirm={handleConfirmDeleteSales}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

export default function EmployeeReports() {
  return (
    <NotificationProvider>
      <EmployeeReportsContent />
    </NotificationProvider>
  );
}
