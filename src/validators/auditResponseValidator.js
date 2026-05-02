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

function validateAuditResponse(result) {
  const risks = normalizeStringList(result.风险点);

  return {
    报销类型: normalizeNullableString(result.报销类型),
    金额: normalizeNullableNumber(result.金额),
    日期: normalizeNullableString(result.日期),
    风险点: risks,
    制度依据: normalizeStringList(result.制度依据),
    是否需要人工复核: typeof result.是否需要人工复核 === "boolean" ? result.是否需要人工复核 : risks.length > 0
  };
}

module.exports = {
  validateAuditResponse
};
