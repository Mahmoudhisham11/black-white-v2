"use client";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/app/firebase";
import { prepareCartItem, calculateSubtotal, calculateProfit } from "@/utils/cartHelpers";
import { getAvailableQuantity, computeNewTotalQuantity } from "@/utils/productHelpers";

export function useCart(shop) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shop) return;
    
    const q = query(collection(db, "cart"), where("shop", "==", shop));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCart(data);
        setError(null);
      },
      (error) => {
        console.error("Error fetching cart:", error);
        setError(error);
      }
    );

    return () => unsubscribe();
  }, [shop]);

  const addToCart = async (product, options = {}) => {
    if (!shop) return;
    
    try {
      setLoading(true);
      const cartData = prepareCartItem(product, options);
      cartData.shop = shop;
      
      await addDoc(collection(db, "cart"), cartData);
      return { success: true };
    } catch (err) {
      console.error("Error adding to cart:", err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItem, delta, allCartItems = []) => {
    try {
      setLoading(true);
      const newQty = cartItem.quantity + delta;
      
      if (newQty < 1) {
        return { success: false, message: "الكمية لا يمكن أن تكون أقل من 1" };
      }

      // Only check availability when increasing quantity (delta > 0)
      if (delta > 0 && cartItem.originalProductId) {
        const prodRef = doc(db, "lacosteProducts", cartItem.originalProductId);
        const prodSnap = await getDoc(prodRef);
        
        if (!prodSnap.exists()) {
          return { success: false, message: "المنتج غير موجود في المخزون" };
        }

        const prodData = prodSnap.data();
        const available = getAvailableQuantity(prodData, cartItem.color, cartItem.size);
        
        // Calculate total quantity needed in cart for this variant
        // Sum all quantities in cart for the same product variant
        const totalInCart = allCartItems
          .filter(item => 
            item.originalProductId === cartItem.originalProductId &&
            (item.color || "") === (cartItem.color || "") &&
            (item.size || "") === (cartItem.size || "")
          )
          .reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Calculate what the new total would be
        const currentInCart = totalInCart - cartItem.quantity; // Remove current item quantity
        const newTotalInCart = currentInCart + newQty; // Add new quantity
        
        // Check if new total exceeds available
        if (newTotalInCart > available) {
          const canAdd = available - currentInCart;
          return { 
            success: false, 
            message: `⚠️ لا توجد كمية كافية لزيادة العدد\nالكمية المتاحة في المخزون: ${available}\nالكمية الحالية في السلة: ${currentInCart}\nيمكن إضافة: ${canAdd > 0 ? canAdd : 0}` 
          };
        }
      }

      // Update cart item quantity (no stock deduction here - only when invoice is saved)
      const newTotal = newQty * cartItem.sellPrice;
      await updateDoc(doc(db, "cart", cartItem.id), {
        quantity: newQty,
        total: newTotal,
      });

      return { success: true };
    } catch (err) {
      console.error("Error updating quantity:", err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, "cart", cartItemId));
      return { success: true };
    } catch (err) {
      console.error("Error removing from cart:", err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "cart"), where("shop", "==", shop));
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return { success: true };
    } catch (err) {
      console.error("Error clearing cart:", err);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal(cart);
  const profit = calculateProfit(cart);

  return {
    cart,
    loading,
    error,
    subtotal,
    profit,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
