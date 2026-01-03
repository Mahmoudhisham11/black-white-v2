// Service for closing day operations
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase";

export const closeDayService = {
  async closeDay(shop, userName) {
    try {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      const todayStr = `${day}/${month}/${year}`;

      // Get sales
      const salesQuery = query(
        collection(db, "dailySales"),
        where("shop", "==", shop)
      );
      const salesSnapshot = await getDocs(salesQuery);

      if (salesSnapshot.empty) {
        return { success: false, message: "لا يوجد عمليات لتقفيلها اليوم" };
      }

      // Get expenses
      const masrofatQuery = query(
        collection(db, "masrofat"),
        where("shop", "==", shop)
      );
      const masrofatSnapshot = await getDocs(masrofatQuery);

      // Calculate totals
      let totalSales = 0;
      const allSales = [];

      salesSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allSales.push({ id: docSnap.id, ...data });
        totalSales += data.total || 0;
      });

      let totalMasrofat = 0;
      let returnedProfit = 0;
      let netMasrof = 0;
      const allMasrofat = [];

      masrofatSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allMasrofat.push({ id: docSnap.id, ...data });
        netMasrof += data.masrof || 0;

        if (data.date === todayStr) {
          if (data.reason === "فاتورة مرتجع") {
            returnedProfit += data.profit || 0;
          } else {
            totalMasrofat += data.masrof || 0;
          }
        }
      });

      // Batch operations
      const batch = writeBatch(db);

      // Move dailySales to reports
      for (const docSnap of salesSnapshot.docs) {
        const data = docSnap.data();
        const reportRef = doc(collection(db, "reports"));
        batch.set(reportRef, {
          ...data,
          closedBy: userName,
        });
        batch.delete(docSnap.ref);
      }

      // Save daily profit
      const profitData = {
        shop,
        date: todayStr,
        totalSales,
        totalMasrofat: Number(netMasrof),
        returnedProfit,
        createdAt: Timestamp.now(),
        closedBy: userName,
      };
      const profitRef = doc(collection(db, "dailyProfit"));
      batch.set(profitRef, profitData);

      // Delete today's expenses
      masrofatSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.date === todayStr) {
          batch.delete(docSnap.ref);
        }
      });

      // Create close day history
      const closeRef = doc(collection(db, "closeDayHistory"));
      batch.set(closeRef, {
        shop,
        closedBy: userName,
        closedAt: todayStr,
        closedAtTimestamp: Timestamp.now(),
        sales: allSales,
        masrofat: allMasrofat,
      });

      await batch.commit();

      return { success: true, message: "تم تقفيل اليوم بنجاح" };
    } catch (error) {
      console.error("Error closing day:", error);
      return { success: false, error };
    }
  },
};
