// utils/pricing.js

const calculateCustomerPrice = (vendorPrice, markupPercentage) => {
  const markup = markupPercentage / 100;
  const customerPrice = vendorPrice * (1 + markup);
  // Round up to nearest cent
  return Math.ceil(customerPrice * 100) / 100;
};

const calculateAdminMarkup = (vendorPrice, customerPrice) => {
  return customerPrice - vendorPrice;
};

export { calculateCustomerPrice, calculateAdminMarkup };