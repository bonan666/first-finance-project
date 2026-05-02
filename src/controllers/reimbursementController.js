const { validateExtractRequest } = require("../validators/requestValidator");
const { extractReimbursementInfo } = require("../services/reimbursementExtractor");
const { extractByLLM } = require("../llm");

async function extractReimbursement(req, res) {
  const validation = validateExtractRequest(req.body);

  if (!validation.ok) {
    const text = req.body && Object.prototype.hasOwnProperty.call(req.body, "text") ? req.body.text : undefined;
    return res.status(400).json(extractReimbursementInfo(text));
  }

  const result = await extractByLLM(validation.value.text);
  return res.json(result);
}

module.exports = {
  extractReimbursement
};
