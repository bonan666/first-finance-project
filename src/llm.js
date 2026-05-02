require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { extractWithMockRules } = require("./services/extractors/mockExtractor");
const { validateExtractResponse } = require("./validators/responseValidator");

const GEMINI_FALLBACK_RISK = "Gemini 失效，已调用本地 mock 返回数据";
const INVALID_JSON_RISK = "模型返回的内容不是合法 JSON";

function extractByMock(text, extraRisks = []) {
  const result = validateExtractResponse(extractWithMockRules(text));

  return {
    ...result,
    风险点: [...new Set([...result.风险点, ...extraRisks])]
  };
}

function buildPrompt(text) {
  return [
    "你是财务报销信息抽取助手。请从用户输入中抽取报销信息。",
    "只返回合法 JSON，不要返回 Markdown，不要返回解释。",
    "JSON 字段必须固定为：报销类型、候选报销类型、金额、日期、风险点。",
    "字段要求：",
    "- 报销类型：string 或 null；无法明确判断时返回 null。",
    "- 候选报销类型：string[]；可包含住宿费、交通费、餐饮费、办公费、通讯费、差旅费等。",
    "- 金额：number 或 null。",
    "- 日期：string 或 null；如果能判断，使用 YYYY-MM-DD。",
    "- 风险点：string[]；没有风险点时返回空数组。",
    "用户输入：",
    text
  ].join("\n");
}

function parseJsonContent(content) {
  if (typeof content !== "string") {
    throw new Error("Gemini response content must be a string.");
  }

  return JSON.parse(content);
}

async function callGemini(text) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: buildPrompt(text),
    config: {
      responseMimeType: "application/json",
      temperature: 0
    }
  });

  return response.text;
}

async function extractByLLM(text) {
  if (!process.env.GEMINI_API_KEY) {
    return extractByMock(text);
  }

  try {
    const content = await callGemini(text);
    return validateExtractResponse(parseJsonContent(content));
  } catch (error) {
    const risks = [GEMINI_FALLBACK_RISK];

    if (error instanceof SyntaxError) {
      risks.push(INVALID_JSON_RISK);
    }

    return extractByMock(text, risks);
  }
}

module.exports = {
  extractByLLM,
  parseJsonContent
};
