// Helper functions for product operations

/**
 * Get available quantity for a product variant
 */
export const getAvailableQuantity = (product, color, size) => {
  if (!product) return 0;

  // If color is specified
  if (color) {
    const colorObj = Array.isArray(product.colors)
      ? product.colors.find((c) => c.color === color)
      : null;
    
    if (!colorObj) return 0;

    // If color has sizes array
    if (Array.isArray(colorObj.sizes) && colorObj.sizes.length) {
      if (size) {
        const sizeObj = colorObj.sizes.find((s) => s.size === size);
        return sizeObj ? Number(sizeObj.qty || sizeObj.quantity || 0) : 0;
      } else {
        // Sum all sizes under color
        return colorObj.sizes.reduce(
          (sum, s) => sum + Number(s.qty || s.quantity || 0),
          0
        );
      }
    }
    
    // Fallback to colorObj.quantity
    return Number(colorObj.quantity || 0);
  }

  // If size is specified at product root
  if (size) {
    const sizeObj = Array.isArray(product.sizes)
      ? product.sizes.find((s) => s.size === size)
      : null;
    return sizeObj ? Number(sizeObj.qty || sizeObj.quantity || 0) : 0;
  }

  // Fallback to total quantity
  return Number(product.quantity || 0);
};

/**
 * Calculate total quantity from colors array
 */
export const sumColorsQty = (colors = []) => {
  return colors.reduce((sum, c) => {
    if (Array.isArray(c.sizes)) {
      return sum + c.sizes.reduce(
        (s, it) => s + Number(it.qty || it.quantity || 0),
        0
      );
    }
    return sum + Number(c.quantity || 0);
  }, 0);
};

/**
 * Calculate total quantity from sizes array
 */
export const sumSizesQty = (sizes = []) => {
  return sizes.reduce((sum, s) => sum + Number(s.qty || s.quantity || 0), 0);
};

/**
 * Compute new total quantity after updating colors/sizes
 */
export const computeNewTotalQuantity = (colors, sizes, fallbackOldQuantity = 0) => {
  const cSum = Array.isArray(colors) ? sumColorsQty(colors) : 0;
  const sSum = Array.isArray(sizes) ? sumSizesQty(sizes) : 0;
  
  if (cSum > 0 && sSum > 0) {
    return Math.max(cSum, sSum);
  }
  if (cSum > 0) return cSum;
  if (sSum > 0) return sSum;
  return fallbackOldQuantity;
};

import { CONFIG } from '@/constants/config';

/**
 * Validate price against product constraints
 */
export const validatePrice = (price, product, password = null) => {
  const finalPrice = Number(product.finalPrice || 0);
  const sellPrice = Number(product.sellPrice || 0);
  const inputPrice = Number(price || 0);

  if (inputPrice <= 0) {
    return { valid: false, message: 'السعر يجب أن يكون أكبر من صفر' };
  }

  if (inputPrice < finalPrice) {
    if (!password) {
      return { 
        valid: false, 
        message: `السعر أقل من السعر النهائي (${finalPrice})`,
        requiresPassword: true
      };
    }

    // Check password
    if (password === CONFIG.DISCOUNT_PASSWORDS.LIMITED_ACCESS) {
      const minAllowed = finalPrice - CONFIG.DISCOUNT_PASSWORDS.LIMITED_DISCOUNT_AMOUNT;
      if (inputPrice < minAllowed) {
        return {
          valid: false,
          message: `مسموح تنزل حتى ${minAllowed} فقط (فرق 50 جنيه عن السعر النهائي)`
        };
      }
    } else if (password !== CONFIG.DISCOUNT_PASSWORDS.FULL_ACCESS) {
      return {
        valid: false,
        message: 'الباسورد غير صحيح — لا يمكنك إدخال سعر أقل من السعر النهائي'
      };
    }
  }

  if (inputPrice > sellPrice) {
    return {
      valid: false,
      message: `السعر الذي أدخلته أكبر من السعر الافتراضي: ${sellPrice}`
    };
  }

  return { valid: true };
};

