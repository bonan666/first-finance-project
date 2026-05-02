function normalizeAmount(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(normalized) ? normalized : null;
}

module.exports = {
  normalizeAmount
};
