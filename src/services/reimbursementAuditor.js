const { readReimbursementPolicy } = require("./knowledge/policyReader");
const { extractWithMockAudit } = require("./extractors/mockAuditExtractor");
const { extractWithLlmAudit } = require("./extractors/llmAuditExtractor");
const { validateAuditResponse } = require("../validators/auditResponseValidator");

async function auditReimbursement(text) {
  const policy = await readReimbursementPolicy();
  const result = process.env.OPENAI_API_KEY
    ? await extractWithLlmAudit(text, policy)
    : extractWithMockAudit(text);

  return validateAuditResponse(result);
}

module.exports = {
  auditReimbursement
};
