function detectRisks(context) {
  const risks = [];

  if (context.参数错误) {
    risks.push(context.参数错误);
  }

  if (context.金额 !== null && context.发票金额 !== null && context.金额 !== context.发票金额) {
    risks.push("报销金额与发票金额不一致");
  }

  if (context.金额候选.length > 1) {
    risks.push("文本中存在多个金额，需人工复核");
  }

  if (!context.存在明确大类 && context.候选报销类型.length > 1) {
    risks.push("文本中存在多个报销类型候选，需人工复核");
  }

  if (context.报销类型 === null) {
    risks.push("报销类型无法从文本中明确判断");
  }

  if (context.金额 === null) {
    risks.push("金额无法从文本中明确判断");
  }

  if (context.日期 === null) {
    risks.push("日期无法从文本中明确判断");
  }

  if (context.报销金额明显异常) {
    risks.push("报销金额明显异常，需人工复核");
  }

  if (context.发票金额明显异常) {
    risks.push("发票金额明显异常，需人工复核");
  }

  if (context.输入内容无效) {
    risks.push("输入内容不是有效的报销描述");
  }

  return [...new Set(risks)];
}

module.exports = {
  detectRisks
};
