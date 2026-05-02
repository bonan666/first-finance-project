const { buildReimbursementAuditPrompt } = require("../../prompts/reimbursementAuditPrompt");

function parseAuditJson(content) {
  if (typeof content !== "string") {
    throw new Error("LLM response content must be a string.");
  }

  return JSON.parse(content);
}

async function createOpenAIChatCompletion(messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
}

async function extractWithLlmAudit(text, policy, llmClient = { createChatCompletion: createOpenAIChatCompletion }) {
  const messages = buildReimbursementAuditPrompt(policy, text);
  const content = await llmClient.createChatCompletion(messages);

  return parseAuditJson(content);
}

module.exports = {
  createOpenAIChatCompletion,
  extractWithLlmAudit,
  parseAuditJson
};
