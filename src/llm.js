require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { buildGeminiReimbursementPromptV3 } = require("./prompts/reimbursementPromptV3");
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
    contents: buildGeminiReimbursementPromptV3(text),
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
