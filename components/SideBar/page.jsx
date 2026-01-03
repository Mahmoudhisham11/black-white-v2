'use client';
import styles from "./styles.module.css";
import Link from "next/link";
import { IoHomeOutline } from "react-icons/io5";
import { TbMoneybag } from "react-icons/tb";
import { HiOutlineWallet } from "react-icons/hi2";
import { GoGear } from "react-icons/go";
import { BiLogOutCircle } from "react-icons/bi";
import { TbReportSearch } from "react-icons/tb";
import { TbReportMoney } from "react-icons/tb";
import { IoPersonOutline } from "react-icons/io5";
import { IoIosCloseCircle } from "react-icons/io";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

function SideBar({openSideBar, setOpenSideBar}) {
    const [currentUser, setCurrentUser] = useState(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentUser(localStorage.getItem("userName"));
        }
    }, []);

    const handleLogout = () => {
        if(typeof window !== 'undefined') {
            localStorage.clear()
            window.location.reload()
        }
    }
    return(
        <div className={openSideBar ? `${styles.sideBar} ${styles.active}` : `${styles.sideBar}`}>
            <div className={styles.title}>
                <div className={styles.imageContainer}>
                    <h2>Devoria</h2>
                </div>
                <button className={styles.closeBtn} onClick={() => setOpenSideBar(false)}><IoIosCloseCircle/></button>
            </div>
            <div className={styles.themeToggle}>
                <button onClick={toggleTheme} className={styles.themeBtn} title={theme === "light" ? "التبديل للوضع الداكن" : "التبديل للوضع الفاتح"}>
                    {theme === "light" ? <MdDarkMode /> : <MdLightMode />}
                    <span>{theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}</span>
                </button>
            </div>
            <div className={styles.actions}>
                <Link href={'/'} className={styles.actionLinks}>
                    <span><IoHomeOutline/></span>
                    <span>الصفحة الرئيسية</span>
                </Link>
                <Link href={'/products'} className={styles.actionLinks}>
                    <span><HiOutlineWallet/></span>
                    <span>المنتجات</span>
                </Link>
                <Link href={'/wared'} className={styles.actionLinks}>
                    <span><HiOutlineWallet/></span>
                    <span>الوارد</span>
                </Link>
                <Link href={'/masrofat'} className={styles.actionLinks}>
                    <span><TbMoneybag/></span>
                    <span>المصاريف</span>
                </Link>
                <Link href={'/employees'} className={styles.actionLinks}>
                    <span><IoPersonOutline/></span>
                    <span>الموظفين</span>
                </Link>
                <Link href={'/debts'} className={styles.actionLinks}>
                    <span><TbReportMoney/></span>
                    <span>فواتير البضاعة</span>
                </Link>
                <Link href={'/dailyReports'} className={styles.actionLinks}>
                    <span><TbReportMoney/></span>
                    <span>جرد يومي</span>
                </Link>
                <Link href={'/reports'} className={styles.actionLinks}>
                    <span><TbReportSearch/></span>
                    <span>المرتجعات</span>
                </Link>
                <Link href={'/closeDay'} className={styles.actionLinks}>
                    <span><TbReportSearch/></span>
                    <span>تقفيلة اليوم</span>
                </Link>
                {currentUser === "mostafabeso10@gmail.com" && 
                  <Link href={'/profit'} className={styles.actionLinks}>
                    <span><TbReportSearch/></span>
                    <span>الارباح</span>
                </Link>  
                }
            </div>
            <div className={styles.logout}>
                {currentUser === "mostafabeso10@gmail.com" && 
                  <Link href={'/settings'} className={styles.actionLinks}>
                    <span><GoGear/></span>
                    <span>الاعدادات</span>
                </Link>  
                }
                <Link href={'/'} className={styles.actionLinks} onClick={handleLogout}>
                    <span><BiLogOutCircle/></span>
                    <span>تسجيل الخروج</span>
                </Link>
            </div>
        </div>
    )
}

export default SideBar;