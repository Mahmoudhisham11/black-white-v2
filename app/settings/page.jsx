"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import SideBar from "@/components/SideBar/page";
import styles from "./styles.module.css";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { VscPercentage } from "react-icons/vsc";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader/Loader";
import {
  NotificationProvider,
  useNotification,
} from "@/contexts/NotificationContext";

function SettingsContent() {
  const router = useRouter();
  const { success, error: showError } = useNotification();
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("usersPermissions");
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [permissions, setPermissions] = useState({
    phones: false,
    products: false,
    masrofat: false,
    employees: false,
    debts: false,
    reports: false,
    settings: false,
  });
  const [employeePercentage, setEmployeePercentage] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // التحقق من الصلاحيات
  useEffect(() => {
    const checkLock = async () => {
      try {
        const userName = localStorage.getItem("userName");
        if (!userName) {
          router.push("/");
          return;
        }
        setCurrentUserName(userName);

        const q = query(
          collection(db, "users"),
          where("userName", "==", userName)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const user = querySnapshot.docs[0].data();
          // إذا كان settings === true يعني محظور (ليس لديه صلاحية)
          if (user.permissions?.settings === true) {
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

  // جلب المستخدمين بدون المستخدم الحالي - باستخدام onSnapshot
  useEffect(() => {
    if (!currentUserName) return;

    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const allUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // استبعاد المستخدم الحالي
        const filteredUsers = allUsers.filter(
          (u) => u.userName !== currentUserName
        );

        setUsers(filteredUsers);
      },
      (error) => {
        console.error("Error fetching users:", error);
        showError("حدث خطأ أثناء جلب المستخدمين");
      }
    );

    return () => unsub();
  }, [currentUserName, showError]);

  // جلب الموظفين - باستخدام onSnapshot
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const empData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEmployees(empData);
      },
      (error) => {
        console.error("Error fetching employees:", error);
        showError("حدث خطأ أثناء جلب الموظفين");
      }
    );

    return () => unsub();
  }, [showError]);

  // إعادة تعيين selectedUser عند تغيير التبويب
  useEffect(() => {
    setSelectedUser("");
    setPermissions({
      phones: false,
      products: false,
      masrofat: false,
      employees: false,
      debts: false,
      reports: false,
      settings: false,
    });
    setEmployeePercentage("");
  }, [activeTab]);

  // تحميل الصلاحيات عند اختيار مستخدم
  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedUser) {
        setPermissions({
          phones: false,
          products: false,
          masrofat: false,
          employees: false,
          debts: false,
          reports: false,
          settings: false,
        });
        return;
      }

      try {
        const userRef = doc(db, "users", selectedUser);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();

          setPermissions(
            userData.permissions || {
              phones: false,
              products: false,
              masrofat: false,
              employees: false,
              debts: false,
              reports: false,
              settings: false,
            }
          );
        }
      } catch (err) {
        console.error("Error loading user permissions: ", err);
        showError("حدث خطأ أثناء تحميل الصلاحيات");
      }
    };

    loadPermissions();
  }, [selectedUser, showError]);

  // جلب نسبة الموظف
  const fetchEmployeePercentage = useCallback(
    async (employeeId) => {
      if (!employeeId) {
        setEmployeePercentage("");
        return;
      }
      try {
        const empRef = doc(db, "employees", employeeId);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          const data = empSnap.data();
          setEmployeePercentage(data.percentage?.toString() || "");
        } else {
          setEmployeePercentage("");
        }
      } catch (error) {
        console.error("Error fetching employee percentage:", error);
        showError("حدث خطأ أثناء جلب نسبة الموظف");
      }
    },
    [showError]
  );

  useEffect(() => {
    if (activeTab === "percentage" && selectedUser) {
      fetchEmployeePercentage(selectedUser);
    }
  }, [selectedUser, activeTab, fetchEmployeePercentage]);

  const handlePermissionChange = useCallback((key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSavePermissions = useCallback(async () => {
    if (!selectedUser) {
      showError("يرجى اختيار مستخدم أولًا");
      return;
    }

    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", selectedUser);
      await updateDoc(userRef, { permissions });
      success("✅ تم حفظ الصلاحيات بنجاح");
    } catch (error) {
      console.error("Error saving permissions: ", error);
      showError("حدث خطأ أثناء الحفظ ❌");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedUser, permissions, success, showError]);

  const handleSaveEmployeePercentage = useCallback(async () => {
    if (!selectedUser) {
      showError("يرجى اختيار الموظف أولًا");
      return;
    }

    const percentage = Number(employeePercentage);
    if (
      employeePercentage === "" ||
      isNaN(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      showError("يرجى إدخال نسبة صحيحة بين 0 و 100");
      return;
    }

    setIsProcessing(true);
    try {
      const empRef = doc(db, "employees", selectedUser);
      await updateDoc(empRef, { percentage });
      success("✅ تم حفظ نسبة الموظف بنجاح");
      setEmployeePercentage(percentage.toString());
    } catch (error) {
      console.error("Error saving employee percentage:", error);
      showError("حدث خطأ أثناء حفظ النسبة ❌");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedUser, employeePercentage, success, showError]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedUser);
  }, [employees, selectedUser]);

  if (loading) return <Loader />;
  if (!auth) return null;

  return (
    <div className={styles.settings}>
      <SideBar />
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>الإعدادات</h2>
        </div>

        <div className={styles.tabs}>
          <button
            className={
              activeTab === "usersPermissions" ? styles.activeTab : ""
            }
            onClick={() => handleTabChange("usersPermissions")}
          >
            صلاحيات المستخدمين
          </button>
          <button
            className={activeTab === "percentage" ? styles.activeTab : ""}
            onClick={() => handleTabChange("percentage")}
          >
            نسبة الموظفين
          </button>
        </div>

        {/* صلاحيات المستخدمين */}
        {activeTab === "usersPermissions" && (
          <div className={styles.container}>
            <div className={styles.contentContainer}>
                <div className={styles.inputContainer}>
                  <label className={styles.inputLabel}>اسم المستخدم</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="">-- اختر المستخدم --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.userName || "مستخدم بدون اسم"}
                      </option>
                    ))}
                  </select>
                </div>

              <div className={styles.checkContent}>
                {[
                  { key: "products", label: "صفحة المنتجات" },
                  { key: "masrofat", label: "صفحة المصاريف" },
                  { key: "employees", label: "صفحة الموظفين" },
                  { key: "debts", label: "صفحة فواتير البضاعة" },
                  { key: "reports", label: "صفحة المرتجعات" },
                  { key: "settings", label: "صفحة الإعدادات" },
                ].map((item) => (
                  <label key={item.key} className={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      checked={permissions[item.key] || false}
                      onChange={() => handlePermissionChange(item.key)}
                    />
                    <span className={styles.checkmark}></span>
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                className={styles.saveBtn}
                onClick={handleSavePermissions}
                disabled={isProcessing}
              >
                {isProcessing ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        )}

        {/* نسبة الموظفين */}
        {activeTab === "percentage" && (
          <div className={styles.container}>
            <div className={styles.contentContainer}>
              <h3 className={styles.percentageTitle}>
                نسبة الموظف
                {selectedUser && selectedEmployee && (
                  <span className={styles.percentageValue}>
                    {employeePercentage !== ""
                      ? `: ${employeePercentage}%`
                      : ": لا توجد نسبة محفوظة"}
                  </span>
                )}
              </h3>

              <div className={styles.inputContainer}>
                <label className={styles.inputLabel}>الموظف</label>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    fetchEmployeePercentage(e.target.value);
                  }}
                  className={styles.selectInput}
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name || "موظف بدون اسم"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="inputContainer">
                  <label>
                    <VscPercentage />
                  </label>
                  <input
                    type="number"
                    placeholder="نسبة الموظف (0-100)"
                    value={employeePercentage}
                    onChange={(e) => setEmployeePercentage(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <button
                className={styles.saveBtn}
                onClick={handleSaveEmployeePercentage}
                disabled={isProcessing || !selectedUser}
              >
                {isProcessing ? "جاري الحفظ..." : "حفظ نسبة الموظف"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <NotificationProvider>
      <SettingsContent />
    </NotificationProvider>
  );
}
