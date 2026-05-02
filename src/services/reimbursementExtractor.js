const { extractWithMockRules } = require("./extractors/mockExtractor");
const { validateExtractResponse } = require("../validators/responseValidator");

function extractReimbursementInfo(text) {
  const extracted = extractWithMockRules(text);
  return validateExtractResponse(extracted);
}

module.exports = {
  extractReimbursementInfo
};
