"use client";
import styles from "./styles.module.css";
import { useMemo } from "react";
import { CONFIG, PERMISSIONS } from "@/constants/config";

export default function StatsCards({ 
  invoices, 
  totalMasrofat, 
  isHidden, 
  userName,
  onTopEmployeeClick
}) {
  const stats = useMemo(() => {
    const totalSales = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    
    const finalProfit = invoices.reduce((sum, i) => {
      if (typeof i.profit === "number") return sum + i.profit;
      const calculatedProfit = (i.cart || []).reduce(
        (p, item) =>
          p +
          ((item.sellPrice || 0) - (item.buyPrice || 0)) * (item.quantity || 0),
        0
      );
      return sum + calculatedProfit;
    }, 0);

    const finallyTotal = Number(totalSales) - Number(totalMasrofat);
    
    const employeeSales = {};
    invoices.forEach((invoice) => {
      if (invoice.employee && invoice.employee !== "غير محدد") {
        employeeSales[invoice.employee] =
          (employeeSales[invoice.employee] || 0) + invoice.total;
      }
    });
    
    const topEmployee =
      Object.entries(employeeSales).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "لا يوجد موظفين";

    return {
      totalSales,
      finalProfit,
      finallyTotal,
      topEmployee,
      netProfit: Number(finalProfit) - Number(totalMasrofat)
    };
  }, [invoices, totalMasrofat]);

  const canViewProfit = PERMISSIONS.VIEW_PROFIT(userName);

  return (
    <div className={styles.summaryCards}>
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>عدد الفواتير</span>
        <span className={styles.summaryValue}>{isHidden ? "****" : invoices.length}</span>
      </div>
      
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>المبيعات</span>
        <span className={styles.summaryValue}>
          {isHidden ? "****" : `${stats.totalSales} جنيه`}
        </span>
      </div>
      
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>المصاريف</span>
        <span className={styles.summaryValue}>{isHidden ? "****" : `${totalMasrofat} جنيه`}</span>
      </div>
      
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>صافي المبيع</span>
        <span className={styles.summaryValue}>
          {isHidden ? "****" : `${stats.finallyTotal} جنيه`}
        </span>
      </div>
      
      {canViewProfit && (
        <>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>الربح</span>
            <span className={styles.summaryValue}>
              {isHidden ? "****" : `${stats.finalProfit} جنيه`}
            </span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>صافي الربح</span>
            <span className={styles.summaryValue}>
              {isHidden ? "****" : `${stats.netProfit} جنيه`}
            </span>
          </div>
        </>
      )}
      
      <div 
        className={styles.summaryCard}
        style={{ cursor: stats.topEmployee !== "لا يوجد موظفين" ? "pointer" : "default" }}
        onClick={() => {
          if (stats.topEmployee !== "لا يوجد موظفين" && onTopEmployeeClick) {
            onTopEmployeeClick(stats.topEmployee);
          }
        }}
      >
        <span className={styles.summaryLabel}>أنشط موظف</span>
        <span className={styles.summaryValue}>{isHidden ? "****" : stats.topEmployee}</span>
      </div>
    </div>
  );
}



