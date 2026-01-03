// Helper functions for cart operations

/**
 * Calculate cart subtotal
 */
export const calculateSubtotal = (cart) => {
  return cart.reduce(
    (sum, item) => sum + (item.sellPrice || 0) * (item.quantity || 1),
    0
  );
};

/**
 * Calculate cart profit
 */
export const calculateProfit = (cart) => {
  return cart.reduce((sum, item) => {
    const buy = Number(item.buyPrice || 0);
    const sell = Number(item.sellPrice || 0);
    const qty = Number(item.quantity || 1);
    return sum + (sell - buy) * qty;
  }, 0);
};

/**
 * Calculate final total with discount
 */
export const calculateFinalTotal = (subtotal, discount = 0) => {
  return Math.max(0, subtotal - discount);
};

/**
 * Prepare cart item data
 */
export const prepareCartItem = (product, options = {}) => {
  return {
    name: product.name,
    sellPrice: Number(options.price ?? product.sellPrice ?? 0),
    productPrice: product.sellPrice,
    quantity: Number(options.quantity || 1),
    type: product.type || 'product',
    total: (Number(options.price ?? product.sellPrice ?? 0)) * (Number(options.quantity || 1)),
    date: new Date(),
    color: options.color || '',
    size: options.size || '',
    originalProductId: product.id,
    code: product.code || '',
    buyPrice: product.buyPrice || 0,
    finalPrice: product.finalPrice || 0,
    section: product.section || '',
    merchantName: product.merchantName || '',
  };
};
