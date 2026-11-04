export const money = {
  format: (amount, minimumFractionDigits = 2) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-IN", {
      minimumFractionDigits,
      maximumFractionDigits: 2,
    });
  },
};
