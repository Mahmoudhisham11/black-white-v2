// Offline Queue System - يحفظ العمليات المعلقة عند عدم وجود إنترنت
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase";

class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.syncing = false;
  }

  loadQueue() {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("offlineQueue");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading offline queue:", error);
      return [];
    }
  }

  saveQueue() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("offlineQueue", JSON.stringify(this.queue));
    } catch (error) {
      console.error("Error saving offline queue:", error);
    }
  }

  add(operation) {
    const queueItem = {
      ...operation,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0,
    };

    this.queue.push(queueItem);
    this.saveQueue();
    console.log("📝 Added to offline queue:", queueItem);
    return queueItem.id;
  }

  remove(queueId) {
    this.queue = this.queue.filter((item) => item.id !== queueId);
    this.saveQueue();
  }

  getPending() {
    return this.queue.filter((item) => !item.synced);
  }

  async sync() {
    if (this.syncing) {
      console.log("⏳ Sync already in progress");
      return;
    }

    if (!navigator.onLine) {
      console.log("📴 No internet connection, skipping sync");
      return;
    }

    const pending = this.getPending();
    if (pending.length === 0) {
      console.log("✅ No pending operations to sync");
      return;
    }

    this.syncing = true;
    console.log(`🔄 Syncing ${pending.length} pending operations...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const item of pending) {
      try {
        await this.executeOperation(item);
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        results.success++;
        console.log(`✅ Synced operation: ${item.id}`);
        
        // حذف الفواتير المحلية بعد المزامنة الناجحة
        if (item.collectionName === "dailySales" && item.action === "add" && item.data) {
          this.removeOfflineInvoice(item);
        }
      } catch (error) {
        item.retries = (item.retries || 0) + 1;
        results.failed++;
        results.errors.push({ id: item.id, error: error.message });
        console.error(`❌ Failed to sync operation ${item.id}:`, error);

        // إذا فشلت العملية أكثر من 5 مرات، نحذفها من القائمة
        if (item.retries >= 5) {
          console.warn(`⚠️ Removing failed operation after 5 retries: ${item.id}`);
          this.remove(item.id);
        }
      }
      this.saveQueue();
    }

    // حذف العمليات المكتملة
    this.queue = this.queue.filter((item) => item.synced || item.retries >= 5);
    this.saveQueue();

    // تنظيف نهائي لجميع الفواتير المزامنة من localStorage
    if (results.success > 0) {
      this.cleanupSyncedInvoices();
    }

    this.syncing = false;
    console.log(`✅ Sync completed: ${results.success} success, ${results.failed} failed`);

    return results;
  }

  async executeOperation(item) {
    const { collectionName, action, data, docId } = item;

    switch (action) {
      case "add":
        if (!data) {
          throw new Error("Data is required for add operation");
        }
        await addDoc(collection(db, collectionName), data);
        break;

      case "update":
        if (!docId || !data) {
          throw new Error("docId and data are required for update operation");
        }
        await updateDoc(doc(db, collectionName, docId), data);
        break;

      case "delete":
        if (!docId) {
          throw new Error("docId is required for delete operation");
        }
        await deleteDoc(doc(db, collectionName, docId));
        break;

      default:
        throw new Error(`Unknown operation: ${action}`);
    }
  }

  // حذف الفاتورة المحلية من localStorage بعد المزامنة الناجحة
  removeOfflineInvoice(queueItem) {
    if (typeof window === "undefined") return;
    
    try {
      const offlineInvoices = JSON.parse(
        localStorage.getItem("offlineInvoices") || "[]"
      );
      
      if (offlineInvoices.length === 0) {
        console.log("📝 No offline invoices to remove");
        return;
      }
      
      const invoiceData = queueItem.data;
      const queueId = queueItem.id;
      
      console.log(`🔍 Searching for invoice to remove:`, {
        queueId,
        invoiceNumber: invoiceData.invoiceNumber,
        total: invoiceData.total,
        shop: invoiceData.shop,
        offlineInvoicesCount: offlineInvoices.length
      });
      
      // البحث عن الفاتورة المحلية المطابقة
      let foundIndex = -1;
      
      // الطريقة الأولى: البحث عن طريق queueId (الأكثر دقة)
      foundIndex = offlineInvoices.findIndex(inv => inv.queueId === queueId);
      if (foundIndex !== -1) {
        console.log(`✅ Found invoice by queueId: ${queueId} at index ${foundIndex}`);
      } else {
        // الطريقة الثانية: البحث عن طريق invoiceNumber + total + shop
        // هذا للفواتير القديمة التي قد لا تحتوي على queueId
        foundIndex = offlineInvoices.findIndex(inv => {
          // مطابقة invoiceNumber و total و shop
          if (
            inv.invoiceNumber === invoiceData.invoiceNumber &&
            inv.total === invoiceData.total &&
            inv.shop === invoiceData.shop
          ) {
            // التحقق من التاريخ (معالجة جميع أنواع التاريخ)
            let invDate = null;
            if (inv.date instanceof Date) {
              invDate = inv.date.toISOString().split('T')[0];
            } else if (inv.date?.toDate) {
              invDate = inv.date.toDate().toISOString().split('T')[0];
            } else if (inv.date?.seconds) {
              invDate = new Date(inv.date.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof inv.date === "string") {
              invDate = new Date(inv.date).toISOString().split('T')[0];
            }
            
            let dataDate = null;
            if (invoiceData.date instanceof Date) {
              dataDate = invoiceData.date.toISOString().split('T')[0];
            } else if (invoiceData.date?.toDate) {
              dataDate = invoiceData.date.toDate().toISOString().split('T')[0];
            } else if (invoiceData.date?.seconds) {
              dataDate = new Date(invoiceData.date.seconds * 1000).toISOString().split('T')[0];
            } else if (typeof invoiceData.date === "string") {
              dataDate = new Date(invoiceData.date).toISOString().split('T')[0];
            }
            
            // إذا تطابق التاريخ أو لم يكن التاريخ متاحاً، نعتبره مطابقاً
            if (invDate && dataDate) {
              return invDate === dataDate;
            } else if (!invDate && !dataDate) {
              // إذا لم يكن هناك تاريخ في كليهما، نعتبره مطابقاً
              return true;
            }
            
            return false;
          }
          return false;
        });
        
        if (foundIndex !== -1) {
          console.log(`✅ Found invoice by invoiceNumber + total + shop: ${invoiceData.invoiceNumber} at index ${foundIndex}`);
        }
      }
      
      // إذا وجدنا الفاتورة، نحذفها
      if (foundIndex !== -1) {
        const removedInvoice = offlineInvoices[foundIndex];
        const filtered = offlineInvoices.filter((_, index) => index !== foundIndex);
        localStorage.setItem("offlineInvoices", JSON.stringify(filtered));
        console.log(`🗑️ Removed synced invoice from localStorage:`, {
          invoiceNumber: removedInvoice.invoiceNumber,
          total: removedInvoice.total,
          queueId: removedInvoice.queueId || "N/A"
        });
        
        // إرسال event لتحديث القائمة
        window.dispatchEvent(new Event("offlineInvoiceRemoved"));
      } else {
        console.warn(`⚠️ Could not find matching invoice to remove:`, {
          queueId,
          invoiceNumber: invoiceData.invoiceNumber,
          total: invoiceData.total,
          shop: invoiceData.shop,
          availableInvoices: offlineInvoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            total: inv.total,
            queueId: inv.queueId || "N/A"
          }))
        });
      }
    } catch (error) {
      console.error("❌ Error removing offline invoice:", error);
    }
  }

  // تنظيف نهائي لجميع الفواتير المزامنة من localStorage
  cleanupSyncedInvoices() {
    if (typeof window === "undefined") return;
    
    try {
      // جلب جميع الفواتير المحلية
      const offlineInvoices = JSON.parse(
        localStorage.getItem("offlineInvoices") || "[]"
      );
      
      if (offlineInvoices.length === 0) {
        return;
      }
      
      // جلب جميع العمليات المزامنة من dailySales
      const syncedDailySales = this.queue.filter(
        item => 
          item.synced && 
          item.collectionName === "dailySales" && 
          item.action === "add"
      );
      
      if (syncedDailySales.length === 0) {
        return;
      }
      
      // إنشاء Set من queueIds المزامنة
      const syncedQueueIds = new Set(syncedDailySales.map(item => item.id));
      
      // إنشاء Set من مفاتيح الفواتير المزامنة (invoiceNumber + total + shop)
      const syncedInvoiceKeys = new Set(
        syncedDailySales
          .filter(item => item.data)
          .map(item => {
            const data = item.data;
            return `${data.invoiceNumber}-${data.total}-${data.shop || ""}`;
          })
      );
      
      // تصفية الفواتير المحلية - إزالة المزامنة
      const cleanedInvoices = offlineInvoices.filter(inv => {
        // إذا كانت الفاتورة لها queueId مزامن، احذفها
        if (inv.queueId && syncedQueueIds.has(inv.queueId)) {
          console.log(`🧹 Removing synced invoice by queueId: ${inv.invoiceNumber}`);
          return false;
        }
        
        // إذا كانت الفاتورة تطابق فاتورة مزامنة (invoiceNumber + total + shop)، احذفها
        const invoiceKey = `${inv.invoiceNumber}-${inv.total}-${inv.shop || ""}`;
        if (syncedInvoiceKeys.has(invoiceKey)) {
          console.log(`🧹 Removing synced invoice by key: ${inv.invoiceNumber}`);
          return false;
        }
        
        return true; // الإبقاء على الفاتورة
      });
      
      // حفظ الفواتير المحدثة
      if (cleanedInvoices.length < offlineInvoices.length) {
        localStorage.setItem("offlineInvoices", JSON.stringify(cleanedInvoices));
        const removedCount = offlineInvoices.length - cleanedInvoices.length;
        console.log(`🧹 Cleaned ${removedCount} synced invoice(s) from localStorage (final cleanup)`);
        
        // إرسال event لتحديث القائمة
        window.dispatchEvent(new Event("offlineInvoiceRemoved"));
      }
    } catch (error) {
      console.error("❌ Error in final cleanup:", error);
    }
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }

  getQueueSize() {
    return this.queue.length;
  }

  getPendingCount() {
    return this.getPending().length;
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

