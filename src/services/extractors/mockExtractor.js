const { normalizeAmount } = require("../normalizers/amountNormalizer");
const { normalizeDate } = require("../normalizers/dateNormalizer");
const { detectRisks } = require("../../utils/riskRules");

const TRAVEL_PATTERN = /差旅|出差|출장/;
const REIMBURSEMENT_INTENT_PATTERN = /报销|费用|发票|申请|付款|支付|采购|购买|出差|差旅|住宿|交通|餐饮|餐费|办公|通讯|출장/;

const TYPE_PATTERNS = [
  { type: "住宿费", pattern: /住宿|酒店|宾馆|旅馆|房费/ },
  { type: "交通费", pattern: /交通|打车|出租车|火车|高铁|机票|航班|地铁|公交/ },
  { type: "餐饮费", pattern: /餐饮|吃饭|用餐|餐费|餐补|接待用餐/ },
  { type: "办公费", pattern: /办公|办公用品|文具|打印|打印纸|文件夹|签字笔|耗材/ },
  { type: "通讯费", pattern: /通讯|话费|电话费|流量/ }
];

function createEmptyResult(extraRisks = []) {
  return {
    报销类型: null,
    候选报销类型: [],
    金额: null,
    日期: null,
    风险点: detectRisks({
      text: "",
      报销类型: null,
      候选报销类型: [],
      金额: null,
      日期: null,
      发票金额: null,
      存在明确大类: false,
      金额候选: [],
      参数错误: extraRisks[0],
      输入内容无效: extraRisks.includes("输入内容不是有效的报销描述"),
      报销金额明显异常: false,
      发票金额明显异常: false
    })
  };
}

function extractTypeInfo(text) {
  const candidateTypes = TYPE_PATTERNS
    .filter((candidate) => candidate.pattern.test(text))
    .map((candidate) => candidate.type);
  const hasExplicitTravelType = TRAVEL_PATTERN.test(text);

  if (hasExplicitTravelType) {
    return {
      primaryType: "差旅费",
      candidateTypes,
      hasExplicitTravelType
    };
  }

  if (candidateTypes.length === 1) {
    return {
      primaryType: candidateTypes[0],
      candidateTypes,
      hasExplicitTravelType
    };
  }

  return {
    primaryType: null,
    candidateTypes,
    hasExplicitTravelType
  };
}

function extractInvoiceAmount(text) {
  const match = text.match(/发票(?:金额)?(?:是|为)?\s*(\d+(?:\.\d+)?)/);
  return match ? normalizeAmount(match[1]) : null;
}

function extractExpenseAmount(text) {
  const prioritizedPatterns = [
    /(?:报销金额|报销|一共报销|共报销|合计报销)\s*(\d+(?:\.\d+)?)/,
    /(?:金额|合计|总计|一共)\s*(\d+(?:\.\d+)?)(?:元)?/
  ];

  for (const pattern of prioritizedPatterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeAmount(match[1]);
    }
  }

  return null;
}

function extractDateValue(text) {
  const fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (fullDateMatch) {
    return normalizeDate({
      year: Number(fullDateMatch[1]),
      month: Number(fullDateMatch[2]),
      day: Number(fullDateMatch[3])
    });
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch) {
    return normalizeDate({
      year: new Date().getFullYear(),
      month: Number(monthDayMatch[1]),
      day: Number(monthDayMatch[2])
    });
  }

  return null;
}

function extractAllAmounts(text) {
  return Array.from(text.matchAll(/(\d+(?:\.\d+)?)元/g), (match) => normalizeAmount(match[1]))
    .filter((value) => value !== null);
}

function isInvalidDescription(text, typeInfo, amount, date) {
  return (
    !REIMBURSEMENT_INTENT_PATTERN.test(text) ||
    (typeInfo.primaryType === null && typeInfo.candidateTypes.length === 0 && amount === null && date === null)
  );
}

function isReimbursementAmountObviouslyAbnormal(text, typeInfo, amount) {
  if (amount === null) {
    return false;
  }

  const mentionsLowValueOfficeItem = /一支|1支|一盒|1盒|一个|1个|签字笔|文件夹|打印纸/.test(text);
  const isOfficeExpense = typeInfo.primaryType === "办公费" || typeInfo.candidateTypes.includes("办公费");

  return isOfficeExpense && mentionsLowValueOfficeItem && amount >= 10000;
}

function isInvoiceAmountObviouslyAbnormal(invoiceAmount) {
  if (invoiceAmount === null) {
    return false;
  }

  return invoiceAmount >= 1000000;
}

function extractWithMockRules(text) {
  if (typeof text !== "string") {
    return createEmptyResult(["输入参数类型错误，应为字符串"]);
  }

  if (!text.trim()) {
    return createEmptyResult(["输入文本为空"]);
  }

  const normalizedText = text.trim();
  const typeInfo = extractTypeInfo(normalizedText);
  const amount = extractExpenseAmount(normalizedText);
  const invoiceAmount = extractInvoiceAmount(normalizedText);
  const date = extractDateValue(normalizedText);
  const allAmounts = extractAllAmounts(normalizedText);
  const invalidDescription = isInvalidDescription(normalizedText, typeInfo, amount, date);
  const reimbursementAmountObviouslyAbnormal = isReimbursementAmountObviouslyAbnormal(normalizedText, typeInfo, amount);
  const invoiceAmountObviouslyAbnormal = isInvoiceAmountObviouslyAbnormal(invoiceAmount);

  return {
    报销类型: typeInfo.primaryType,
    候选报销类型: typeInfo.candidateTypes,
    金额: amount,
    日期: date,
    风险点: detectRisks({
      text: normalizedText,
      报销类型: typeInfo.primaryType,
      候选报销类型: typeInfo.candidateTypes,
      金额: amount,
      日期: date,
      发票金额: invoiceAmount,
      存在明确大类: typeInfo.hasExplicitTravelType,
      金额候选: allAmounts,
      输入内容无效: invalidDescription,
      报销金额明显异常: reimbursementAmountObviouslyAbnormal,
      发票金额明显异常: invoiceAmountObviouslyAbnormal
    })
  };
}

module.exports = {
  extractWithMockRules
};
