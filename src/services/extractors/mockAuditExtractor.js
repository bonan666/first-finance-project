const { extractReimbursementInfo } = require("../reimbursementExtractor");

const POLICY_BASIS_BY_RISK = new Map([
  ["报销金额与发票金额不一致", "制度要求报销金额应与发票金额一致；如不一致，需要人工复核。"],
  ["文本中存在多个金额，需人工复核", "制度要求文本中出现多个金额且影响判断时，需要人工复核。"],
  ["文本中存在多个报销类型候选，需人工复核", "制度要求报销类型必须明确，多个类型候选无法确认时需要人工复核。"],
  ["报销类型无法从文本中明确判断", "制度要求报销申请必须包含可判断的报销类型。"],
  ["金额无法从文本中明确判断", "制度要求报销申请必须包含明确金额。"],
  ["日期无法从文本中明确判断", "制度要求报销申请必须包含可判断的日期。"],
  ["报销金额明显异常，需人工复核", "制度要求报销金额明显超出正常业务场景时，需要人工复核。"],
  ["发票金额明显异常，需人工复核", "制度要求发票金额达到百万元或更高时，需要人工复核。"],
  ["输入内容不是有效的报销描述", "制度要求报销事项、金额、日期或业务背景应完整清晰。"]
]);

function buildPolicyBasis(risks) {
  return risks.map((risk) => POLICY_BASIS_BY_RISK.get(risk)).filter(Boolean);
}

function extractWithMockAudit(text) {
  const extracted = extractReimbursementInfo(text);

  return {
    报销类型: extracted.报销类型,
    金额: extracted.金额,
    日期: extracted.日期,
    风险点: extracted.风险点,
    制度依据: buildPolicyBasis(extracted.风险点),
    是否需要人工复核: extracted.风险点.length > 0
  };
}

module.exports = {
  extractWithMockAudit
};
