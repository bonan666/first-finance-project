const { validateExtractRequest } = require("../validators/requestValidator");
const { auditReimbursement } = require("../services/reimbursementAuditor");
const { validateAuditResponse } = require("../validators/auditResponseValidator");

async function auditReimbursementController(req, res, next) {
  try {
    const validation = validateExtractRequest(req.body);

    if (!validation.ok) {
      return res.status(400).json(validateAuditResponse({
        报销类型: null,
        金额: null,
        日期: null,
        风险点: [validation.error],
        制度依据: ["制度要求报销申请必须包含可审核的文本内容。"],
        是否需要人工复核: true
      }));
    }

    const result = await auditReimbursement(validation.value.text);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  auditReimbursementController
};
