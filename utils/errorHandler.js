// Error handling utilities

export const handleError = (error, context = '') => {
  console.error(`[${context}]`, error);
  
  // You can add error logging service here
  // logError(error, context);
  
  return getErrorMessage(error);
};

const getErrorMessage = (error) => {
  if (!error) return 'حدث خطأ غير متوقع';
  
  // Firebase errors
  if (error.code === 'permission-denied') {
    return 'ليس لديك الصلاحية للقيام بهذه العملية';
  }
  if (error.code === 'unavailable') {
    return 'الخدمة غير متاحة حالياً، يرجى المحاولة لاحقاً';
  }
  if (error.code === 'not-found') {
    return 'العنصر المطلوب غير موجود';
  }
  
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return 'مشكلة في الاتصال بالإنترنت، يرجى التحقق من الاتصال';
  }
  
  // Default
  return error.message || 'حدث خطأ غير متوقع';
};




