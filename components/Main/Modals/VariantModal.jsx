"use client";
import styles from "../styles.module.css";
import { useState, useEffect } from "react";
import { getAvailableQuantity } from "@/utils/productHelpers";
import { CONFIG } from "@/constants/config";
import { useNotification } from "@/contexts/NotificationContext";
import PasswordModal from "./PasswordModal";

export default function VariantModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
  db,
  doc,
  getDoc,
}) {
  const { error: showError } = useNotification();
  const [selectedColor, setSelectedColor] = useState("");
  const [sizeMap, setSizeMap] = useState({});
  const [price, setPrice] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingPrice, setPendingPrice] = useState(null);

  useEffect(() => {
    if (product) {
      setPrice(product.sellPrice ?? product.finalPrice ?? 0);
      const firstColor =
        product.colors && product.colors.length
          ? product.colors[0].color
          : "";
      setSelectedColor(firstColor);

      const initMap = {};
      if (product.colors && product.colors.length && firstColor) {
        const colorObj = product.colors.find((c) => c.color === firstColor);
        if (colorObj && Array.isArray(colorObj.sizes)) {
          colorObj.sizes.forEach((sz) => (initMap[sz.size] = 0));
        }
      } else if (product.sizes && product.sizes.length) {
        product.sizes.forEach((sz) => (initMap[sz.size] = 0));
      }
      setSizeMap(initMap);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const map = {};
    const colorObj = product.colors?.find((c) => c.color === color);
    if (colorObj && Array.isArray(colorObj.sizes)) {
      colorObj.sizes.forEach((s) => (map[s.size] = 0));
    }
    setSizeMap(map);
  };

  const handlePasswordConfirm = (password) => {
    setShowPasswordModal(false);
    const priceNum = Number(pendingPrice);
    const finalPrice = Number(product.finalPrice);

    if (password === CONFIG.DISCOUNT_PASSWORDS.LIMITED_ACCESS) {
      const minAllowed = finalPrice - CONFIG.DISCOUNT_PASSWORDS.LIMITED_DISCOUNT_AMOUNT;
      if (priceNum < minAllowed) {
        showError(`مسموح تنزل حتى ${minAllowed} فقط`);
        setPendingPrice(null);
        return;
      }
    } else if (password !== CONFIG.DISCOUNT_PASSWORDS.FULL_ACCESS) {
      showError("الباسورد غير صحيح");
      setPendingPrice(null);
      return;
    }

    // Password is correct, proceed with adding to cart
    proceedWithAdd(priceNum);
  };

  const proceedWithAdd = async (priceNum) => {
    const sellPrice = Number(product.sellPrice);

    if (priceNum > sellPrice) {
      showError(`السعر أكبر من السعر الافتراضي: ${sellPrice}`);
      setPendingPrice(null);
      return;
    }

    const entries = Object.entries(sizeMap)
      .map(([size, qty]) => ({ size, qty: Number(qty || 0) }))
      .filter((e) => e.qty > 0);

    if (!entries.length) {
      showError("اختر كمية على الأقل لمقاس واحد");
      setPendingPrice(null);
      return;
    }

    for (const e of entries) {
      const prodRef = doc(db, "lacosteProducts", product.id);
      const prodSnap = await getDoc(prodRef);
      const prodData = prodSnap.exists() ? prodSnap.data() : product;
      const available = getAvailableQuantity(prodData, selectedColor, e.size);

      if (e.qty > available) {
        showError(
          `⚠️ الكمية المطلوبة للمقاس ${e.size} (${e.qty}) أكبر من المتاح\nالكمية المتاحة: ${available}`
        );
        continue;
      }

      await onAddToCart(product, {
        color: selectedColor,
        size: e.size,
        quantity: e.qty,
        price: priceNum,
      });
    }

    setPendingPrice(null);
    onClose();
  };

  const handleAdd = async () => {
    if (!price) {
      showError("من فضلك أدخل السعر");
      return;
    }

    const priceNum = Number(price);
    const finalPrice = Number(product.finalPrice);
    const sellPrice = Number(product.sellPrice);

    if (priceNum < finalPrice) {
      setPendingPrice(price);
      setShowPasswordModal(true);
      return;
    }

    if (priceNum > sellPrice) {
      showError(`السعر أكبر من السعر الافتراضي: ${sellPrice}`);
      return;
    }

    await proceedWithAdd(priceNum);
  };


  const sizesArr = selectedColor
    ? (() => {
        const colorObj = product.colors?.find((c) => c.color === selectedColor);
        return colorObj && Array.isArray(colorObj.sizes) && colorObj.sizes.length
          ? colorObj.sizes
          : product.sizes || [];
      })()
    : [];

  return (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
        <h3>اختر اللون والمقاسات — {product.name}</h3>

        {product.colors && product.colors.length > 0 && (
          <>
            <label>الألوان المتاحة:</label>
            <div className={styles.colorButtons}>
              {product.colors.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => handleColorSelect(c.color)}
                  className={`${styles.colorBtn} ${
                    selectedColor === c.color ? styles.active : ""
                  }`}
                >
                  {c.color} (
                  {Array.isArray(c.sizes)
                    ? c.sizes.reduce(
                        (s, it) => s + Number(it.qty || it.quantity || 0),
                        0
                      )
                    : c.quantity || 0}
                  )
                </button>
              ))}
            </div>
          </>
        )}

        <div>
          <label>المقاسات للون: {selectedColor || "—"}</label>
          <div className={styles.sizesContainer}>
            {sizesArr.length === 0 ? (
              <div className={styles.emptyMessage}>
                {selectedColor
                  ? "لا توجد مقاسات لهذا اللون"
                  : "اختر لونًا أولًا"}
              </div>
            ) : (
              sizesArr.map((s, si) => {
                const available = getAvailableQuantity(
                  product,
                  selectedColor,
                  s.size
                );
                const current = Number(sizeMap[s.size] || 0);

                return (
                  <div key={si} className={styles.sizeRow}>
                    <div className={styles.sizeName}>{s.size}</div>
                    <div className={styles.sizeControls}>
                      <span className={styles.available}>
                        متاح: {available}
                      </span>
                      <div className={styles.qtyControls}>
                        <button
                          onClick={() =>
                            setSizeMap((prev) => ({
                              ...prev,
                              [s.size]: Math.max(0, Number(prev[s.size] || 0) - 1),
                            }))
                          }
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={current}
                          onChange={(e) => {
                            const v = Math.max(0, Number(e.target.value || 0));
                            setSizeMap((prev) => ({ ...prev, [s.size]: v }));
                          }}
                          min="0"
                          max={available}
                        />
                        <button
                          onClick={() =>
                            setSizeMap((prev) => {
                              const newVal = Math.min(
                                available,
                                Number(prev[s.size] || 0) + 1
                              );
                              return { ...prev, [s.size]: newVal };
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.priceInput}>
          <label>السعر:</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`أدخل سعر ≥ ${product.finalPrice}`}
          />
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelBtn}>
            إلغاء
          </button>
          <button onClick={handleAdd} className={styles.addBtn}>
            أضف للسلة
          </button>
        </div>
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingPrice(null);
        }}
        onConfirm={handlePasswordConfirm}
        finalPrice={product?.finalPrice}
        title="إدخال كلمة المرور"
        message="أدخل كلمة المرور للسماح بالخصم"
      />
    </div>
  );
}


