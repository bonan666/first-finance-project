const { buildReimbursementPromptV2 } = require("../../prompts/reimbursementPromptV2");

function parseLlmJson(content) {
  if (typeof content !== "string") {
    throw new Error("LLM response content must be a string.");
  }

  return JSON.parse(content);
}

async function extractWithLlm(text, llmClient) {
  if (!llmClient || typeof llmClient.createChatCompletion !== "function") {
    throw new Error("LLM client with createChatCompletion(messages) is required.");
  }

  const messages = buildReimbursementPromptV2(text);
  const content = await llmClient.createChatCompletion(messages);

  return parseLlmJson(content);
}

module.exports = {
  extractWithLlm,
  buildReimbursementPromptV2,
  parseLlmJson
};
