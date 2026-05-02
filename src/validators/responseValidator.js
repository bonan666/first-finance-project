function normalizeNullableString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeNullableNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => typeof item === "string" && item.trim()))];
}

function normalizeRiskList(value) {
  return normalizeStringList(value);
}

function validateExtractResponse(result) {
  return {
    报销类型: normalizeNullableString(result.报销类型),
    候选报销类型: normalizeStringList(result.候选报销类型),
    金额: normalizeNullableNumber(result.金额),
    日期: normalizeNullableString(result.日期),
    风险点: normalizeRiskList(result.风险点)
  };
}

module.exports = {
  validateExtractResponse
};
