"use client";
import { useState, useEffect } from "react";
import { CONFIG } from "@/constants/config";

export function useProductSearch(products, cart, onOpenVariant, onAddToCart) {
  const [searchCode, setSearchCode] = useState("");

  useEffect(() => {
    if (!searchCode) return;

    const timer = setTimeout(() => {
      const foundProduct = products.find(
        (p) => p.code?.toString() === searchCode.trim()
      );
      
      if (!foundProduct) {
        setSearchCode("");
        return;
      }

      const hasVariants =
        (foundProduct.colors && foundProduct.colors.length > 0) ||
        (foundProduct.sizes && foundProduct.sizes.length > 0);

      if (hasVariants) {
        onOpenVariant(foundProduct);
      } else {
        const alreadyInCart = cart.some(
          (item) =>
            item.originalProductId === foundProduct.id &&
            !item.color &&
            !item.size
        );
        if (!alreadyInCart) {
          onAddToCart(foundProduct, { quantity: 1 });
        }
      }

      setSearchCode("");
    }, CONFIG.SEARCH_DEBOUNCE);

    return () => clearTimeout(timer);
  }, [searchCode, products, cart, onOpenVariant, onAddToCart]);

  return { searchCode, setSearchCode };
}
