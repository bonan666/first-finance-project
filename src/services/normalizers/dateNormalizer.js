function pad(value) {
  return String(value).padStart(2, "0");
}

function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function normalizeDate({ year, month, day }) {
  if (!isValidDate(year, month, day)) {
    return null;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

module.exports = {
  normalizeDate
};
