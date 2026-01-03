// Configuration constants
export const CONFIG = {
  ADMIN_EMAILS: ['momen'],
  DISCOUNT_PASSWORDS: {
    FULL_ACCESS: '351992',
    LIMITED_ACCESS: '2298605522',
    LIMITED_DISCOUNT_AMOUNT: 200
  },
  MAX_DISCOUNT_PERCENTAGE: 200,
  SEARCH_DEBOUNCE: 400,
  NOTIFICATION_DURATION: 3000
};

export const PERMISSIONS = {
  VIEW_PROFIT: (userName) => CONFIG.ADMIN_EMAILS.includes(userName),
  RETURN_PRODUCTS: (userName) => CONFIG.ADMIN_EMAILS.includes(userName),
  EDIT_PRICES: (userName) => CONFIG.ADMIN_EMAILS.includes(userName)
};




