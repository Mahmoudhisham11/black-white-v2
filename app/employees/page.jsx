"use client";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import { MdPersonAddAlt1 } from "react-icons/md";
import { FaRegTrashAlt } from "react-icons/fa";
import { TbReportSearch } from "react-icons/tb";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader/Loader";
import {
  NotificationProvider,
  useNotification,
} from "@/contexts/NotificationContext";
import ConfirmModal from "@/components/Main/Modals/ConfirmModal";

function EmployeesContent() {
  const router = useRouter();
  const { success, error: showError } = useNotification();
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEmployee, setNewEmployee] = useState("");
  const [salary, setSalary] = useState("");
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const shop =
    typeof window !== "undefined" ? localStorage.getItem("shop") : "";

  // التحقق من الصلاحيات
  useEffect(() => {
    const checkLock = async () => {
      try {
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
          // إذا كان employees === true يعني محظور (ليس لديه صلاحية)
          if (user.permissions?.employees === true) {
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
      } catch (error) {
        console.error("Error checking permissions:", error);
        showError("حدث خطأ أثناء التحقق من الصلاحيات");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    checkLock();
  }, [router, showError]);

  // جلب بيانات الموظفين من Collection employees
  useEffect(() => {
    if (!shop) return;
    const q = query(collection(db, "employees"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
    });

    return () => unsubscribe();
  }, [shop]);

  // تصفية الموظفين حسب البحث
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const filtered = employees.filter((emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  // إضافة موظف جديد
  const handleAddEmployee = useCallback(async () => {
    if (!newEmployee.trim() || !salary.trim()) {
      showError("من فضلك أدخل اسم الموظف والراتب");
      return;
    }

    const salaryNum = Number(salary.trim());
    if (isNaN(salaryNum) || salaryNum < 0) {
      showError("يرجى إدخال راتب صحيح");
      return;
    }

    setIsProcessing(true);
    try {
      await addDoc(collection(db, "employees"), {
        name: newEmployee.trim(),
        salary: salaryNum,
        createdAt: new Date(),
        userName: shop,
        shop,
      });
      success("✅ تمت إضافة الموظف بنجاح");
      setNewEmployee("");
      setSalary("");
      setShowAddModal(false);
    } catch (error) {
      console.error("خطأ أثناء إضافة الموظف:", error);
      showError("حدث خطأ أثناء إضافة الموظف");
    } finally {
      setIsProcessing(false);
    }
  }, [newEmployee, salary, shop, success, showError]);

  // حذف موظف
  const handleDeleteClick = useCallback((id) => {
    setEmployeeToDelete(id);
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!employeeToDelete) return;

    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "employees", employeeToDelete));
      success("✅ تم حذف الموظف بنجاح");
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("خطأ أثناء حذف الموظف:", error);
      showError("حدث خطأ أثناء حذف الموظف");
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  }, [employeeToDelete, success, showError]);

  const handleOpenAddModal = useCallback(() => {
    setNewEmployee("");
    setSalary("");
    setShowAddModal(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewEmployee("");
    setSalary("");
  }, []);

  if (loading) return <Loader />;
  if (!auth) return null;

  return (
    <div className={styles.employees}>
      <SideBar />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>الموظفين</h2>
          <div className={styles.headerActions}>
            <button
              onClick={handleOpenAddModal}
              className={styles.addBtn}
              disabled={isProcessing}
            >
              <MdPersonAddAlt1 />
              اضف موظف جديد
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className={styles.searchBox}>
          <div className={styles.inputContainer}>
            <label className={styles.searchLabel}>البحث بالاسم:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              placeholder="ابحث عن موظف..."
            />
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.employeeTable}>
            <thead>
              <tr>
                <th>اسم الموظف</th>
                <th>الراتب</th>
                <th>خيارات</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    <div className={styles.emptyState}>
                      {searchTerm
                        ? "❌ لا توجد نتائج للبحث"
                        : "❌ لا يوجد موظفين"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td className={styles.nameCell}>{emp.name ?? "-"}</td>
                    <td className={styles.salaryCell}>
                      {emp.salary ? `${emp.salary} جنيه` : "-"}
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        onClick={() => handleDeleteClick(emp.id)}
                        className={styles.deleteBtn}
                        disabled={isProcessing}
                        title="حذف"
                      >
                        <FaRegTrashAlt />
                      </button>
                      <Link
                        className={styles.reportBtn}
                        href={`/employeeReport/${emp.id}`}
                        title="التقرير"
                      >
                        <TbReportSearch />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className={styles.popupOverlay} onClick={handleCloseAddModal}>
          <div
            className={styles.popupBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>اضف موظف جديد</h3>
            <div className={styles.modalContent}>
              <div className="inputContainer">
                <label>
                  <MdPersonAddAlt1 />
                </label>
                <input
                  type="text"
                  value={newEmployee}
                  onChange={(e) => setNewEmployee(e.target.value)}
                  placeholder="اسم الموظف"
                />
              </div>
              <div className="inputContainer">
                <label>
                  <MdPersonAddAlt1 />
                </label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="الراتب"
                  min="0"
                />
              </div>
            </div>
            <div className={styles.popupBtns}>
              <button
                onClick={handleCloseAddModal}
                className={styles.cancelBtn}
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={handleAddEmployee}
                className={styles.confirmBtn}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري الإضافة..." : "اضف الموظف"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEmployeeToDelete(null);
        }}
        title="تأكيد الحذف"
        message="هل أنت متأكد أنك تريد حذف هذا الموظف؟"
        onConfirm={handleConfirmDelete}
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />
    </div>
  );
}

export default function Employees() {
  return (
    <NotificationProvider>
      <EmployeesContent />
    </NotificationProvider>
  );
}
