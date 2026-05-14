// Safe number formatting
export const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return 'R0.00';
  return `R${num.toFixed(2)}`;
};

export const formatNumber = (value) => {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return num.toLocaleString();
};

export const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};