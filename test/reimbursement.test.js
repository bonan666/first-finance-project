const test = require("node:test");
const assert = require("node:assert/strict");
const { auditReimbursementController } = require("../src/controllers/auditController");
const { extractReimbursementInfo } = require("../src/services/reimbursementExtractor");
const { auditReimbursement } = require("../src/services/reimbursementAuditor");
const { readReimbursementPolicy } = require("../src/services/knowledge/policyReader");
const {
  extractWithLlm,
  buildReimbursementPromptV2,
  buildReimbursementPromptV3
} = require("../src/services/extractors/llmExtractor");
const { buildGeminiReimbursementPromptV3 } = require("../src/prompts/reimbursementPromptV3");
const { validateExtractRequest } = require("../src/validators/requestValidator");
const { extractByLLM, parseJsonContent } = require("../src/llm");

test("extracts reimbursement info from the sample text", () => {
  const result = extractReimbursementInfo(
    "我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是1200元。"
  );

  assert.deepEqual(result, {
    报销类型: "差旅费",
    候选报销类型: ["住宿费", "交通费"],
    金额: 1280,
    日期: `${new Date().getFullYear()}-05-01`,
    风险点: ["报销金额与发票金额不一致", "文本中存在多个金额，需人工复核"]
  });
});

test("returns null type and amount when the text is too vague", () => {
  const result = extractReimbursementInfo("今天提交了一笔费用申请。");

  assert.deepEqual(result, {
    报销类型: null,
    候选报销类型: [],
    金额: null,
    日期: null,
    风险点: [
      "报销类型无法从文本中明确判断",
      "金额无法从文本中明确判断",
      "日期无法从文本中明确判断",
      "输入内容不是有效的报销描述"
    ]
  });
});

test("supports explicit full date normalization", () => {
  const result = extractReimbursementInfo("2026年4月30日交通报销300元。");

  assert.deepEqual(result, {
    报销类型: "交通费",
    候选报销类型: ["交通费"],
    金额: 300,
    日期: "2026-04-30",
    风险点: []
  });
});

test("returns null primary type when multiple detailed types appear without a major type", () => {
  const result = extractReimbursementInfo("住宿和交通一共报销500元。");

  assert.deepEqual(result, {
    报销类型: null,
    候选报销类型: ["住宿费", "交通费"],
    金额: 500,
    日期: null,
    风险点: [
      "文本中存在多个报销类型候选，需人工复核",
      "报销类型无法从文本中明确判断",
      "日期无法从文本中明确判断"
    ]
  });
});

test("returns a single detailed type when only one candidate is matched", () => {
  const result = extractReimbursementInfo("酒店住宿报销600元。");

  assert.deepEqual(result, {
    报销类型: "住宿费",
    候选报销类型: ["住宿费"],
    金额: 600,
    日期: null,
    风险点: ["日期无法从文本中明确判断"]
  });
});

test("supports Korean travel keyword matching", () => {
  const result = extractReimbursementInfo("출장期间交通报销200元。");

  assert.deepEqual(result, {
    报销类型: "差旅费",
    候选报销类型: ["交通费"],
    金额: 200,
    日期: null,
    风险点: ["日期无法从文本中明确判断"]
  });
});

test("extracts dining reimbursement info", () => {
  const result = extractReimbursementInfo("2026年3月12日部门客户接待用餐，餐费报销860元。");

  assert.deepEqual(result, {
    报销类型: "餐饮费",
    候选报销类型: ["餐饮费"],
    金额: 860,
    日期: "2026-03-12",
    风险点: []
  });
});

test("extracts office supplies as office expense", () => {
  const result = extractReimbursementInfo("2026年2月5日购买打印纸、文件夹和签字笔等办公用品，合计报销342.5元。");

  assert.deepEqual(result, {
    报销类型: "办公费",
    候选报销类型: ["办公费"],
    金额: 342.5,
    日期: "2026-02-05",
    风险点: []
  });
});

test("flags missing date when only relative date appears", () => {
  const result = extractReimbursementInfo("酒店住宿报销600元，用于上周去深圳参加项目会议。");

  assert.deepEqual(result, {
    报销类型: "住宿费",
    候选报销类型: ["住宿费"],
    金额: 600,
    日期: null,
    风险点: ["日期无法从文本中明确判断"]
  });
});

test("flags missing amount", () => {
  const result = extractReimbursementInfo("2026年1月20日购买办公耗材，准备走报销流程。");

  assert.deepEqual(result, {
    报销类型: "办公费",
    候选报销类型: ["办公费"],
    金额: null,
    日期: "2026-01-20",
    风险点: ["金额无法从文本中明确判断"]
  });
});

test("flags insufficient reimbursement text", () => {
  const result = extractReimbursementInfo("麻烦帮我提交一下这笔费用。");

  assert.deepEqual(result, {
    报销类型: null,
    候选报销类型: [],
    金额: null,
    日期: null,
    风险点: [
      "报销类型无法从文本中明确判断",
      "金额无法从文本中明确判断",
      "日期无法从文本中明确判断",
      "输入内容不是有效的报销描述"
    ]
  });
});

test("flags obviously abnormal reimbursement amount", () => {
  const result = extractReimbursementInfo("2026年4月1日购买一支签字笔，办公用品报销50000元。");

  assert.deepEqual(result, {
    报销类型: "办公费",
    候选报销类型: ["办公费"],
    金额: 50000,
    日期: "2026-04-01",
    风险点: ["报销金额明显异常，需人工复核"]
  });
});

test("flags obviously abnormal invoice amount", () => {
  const result = extractReimbursementInfo(
    "我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是25000000000000元。"
  );

  assert.deepEqual(result, {
    报销类型: "差旅费",
    候选报销类型: ["住宿费", "交通费"],
    金额: 1280,
    日期: `${new Date().getFullYear()}-05-01`,
    风险点: [
      "报销金额与发票金额不一致",
      "文本中存在多个金额，需人工复核",
      "发票金额明显异常，需人工复核"
    ]
  });
});

test("points out obvious parameter errors in extraction result", () => {
  assert.deepEqual(extractReimbursementInfo("   "), {
    报销类型: null,
    候选报销类型: [],
    金额: null,
    日期: null,
    风险点: [
      "输入文本为空",
      "报销类型无法从文本中明确判断",
      "金额无法从文本中明确判断",
      "日期无法从文本中明确判断"
    ]
  });

  assert.deepEqual(extractReimbursementInfo(123), {
    报销类型: null,
    候选报销类型: [],
    金额: null,
    日期: null,
    风险点: [
      "输入参数类型错误，应为字符串",
      "报销类型无法从文本中明确判断",
      "金额无法从文本中明确判断",
      "日期无法从文本中明确判断"
    ]
  });
});

test("rejects invalid requests", () => {
  assert.deepEqual(validateExtractRequest({}), {
    ok: false,
    error: "Field 'text' must be a string."
  });

  assert.deepEqual(validateExtractRequest({ text: "   " }), {
    ok: false,
    error: "Field 'text' must not be empty."
  });
});

test("extractByLLM uses local mock when GEMINI_API_KEY is missing", async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const result = await extractByLLM("2026年4月30日交通报销300元。");

    assert.deepEqual(result, {
      报销类型: "交通费",
      候选报销类型: ["交通费"],
      金额: 300,
      日期: "2026-04-30",
      风险点: []
    });
  } finally {
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  }
});

test("parseJsonContent rejects invalid JSON", () => {
  assert.throws(() => parseJsonContent("不是 JSON"), SyntaxError);
});

test("builds the second version prompt for LLM extraction", () => {
  const messages = buildReimbursementPromptV2("2026年4月30日交通报销300元。");

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /报销抽取|财务报销信息抽取助手/);
  assert.match(messages[0].content, /日期无法从文本中明确判断/);
  assert.match(messages[0].content, /输入内容不是有效的报销描述/);
  assert.deepEqual(messages[1], {
    role: "user",
    content: "输入：\n2026年4月30日交通报销300元。"
  });
});

test("builds the third version prompt with strict Gemini constraints", () => {
  const messages = buildReimbursementPromptV3("2026年3月3日住宿和交通一共报销500元。");
  const systemPrompt = messages[0].content;

  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "system");
  assert.match(systemPrompt, /候选报销类型[\s\S]*只能从以下明细类型中选择/);
  assert.match(systemPrompt, /禁止把 "差旅费" 放入 "候选报销类型"/);
  assert.match(systemPrompt, /报销类型[\s\S]*"差旅费"[\s\S]*"办公费"[\s\S]*null/);
  assert.match(systemPrompt, /风险点[\s\S]*只能从以下固定枚举中选择/);
  assert.match(systemPrompt, /金额" 为 null[\s\S]*"金额无法从文本中明确判断"/);
  assert.match(systemPrompt, /日期" 为 null[\s\S]*"日期无法从文本中明确判断"/);
  assert.match(systemPrompt, /报销类型" 为 null[\s\S]*"报销类型无法从文本中明确判断"/);
  assert.match(systemPrompt, /住宿和交通[\s\S]*没有 "出差"、"差旅"、"출장"[\s\S]*"文本中存在多个报销类型候选，需人工复核"/);
  assert.match(systemPrompt, /帮我提交一下这笔费用[\s\S]*"输入内容不是有效的报销描述"/);
  assert.match(systemPrompt, /酒店住宿报销600元[\s\S]*"候选报销类型": \["住宿费"\][\s\S]*"日期无法从文本中明确判断"/);
  assert.deepEqual(messages[1], {
    role: "user",
    content: "输入：\n2026年3月3日住宿和交通一共报销500元。"
  });
});

test("builds Gemini prompt content from prompt v3", () => {
  const prompt = buildGeminiReimbursementPromptV3("麻烦帮我提交一下这笔费用。");

  assert.match(prompt, /严格使用固定枚举原文/);
  assert.match(prompt, /## 用户输入\n麻烦帮我提交一下这笔费用。/);
});

test("extractWithLlm uses prompt v3 messages", async () => {
  let capturedMessages = null;
  const llmClient = {
    async createChatCompletion(messages) {
      capturedMessages = messages;
      return JSON.stringify({
        报销类型: "交通费",
        候选报销类型: ["交通费"],
        金额: 300,
        日期: "2026-04-30",
        风险点: []
      });
    }
  };

  const result = await extractWithLlm("2026年4月30日交通报销300元。", llmClient);

  assert.equal(capturedMessages[0].role, "system");
  assert.match(capturedMessages[0].content, /Prompt|任务|强制枚举/);
  assert.match(capturedMessages[0].content, /禁止把 "差旅费" 放入 "候选报销类型"/);
  assert.deepEqual(result, {
    报销类型: "交通费",
    候选报销类型: ["交通费"],
    金额: 300,
    日期: "2026-04-30",
    风险点: []
  });
});

test("reads local reimbursement policy", async () => {
  const policy = await readReimbursementPolicy();

  assert.match(policy, /财务报销审核制度/);
  assert.match(policy, /发票金额达到百万元或更高/);
});

test("audits reimbursement with mock result when OPENAI_API_KEY is missing", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const result = await auditReimbursement(
      "我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是25000000000000元。"
    );

    assert.deepEqual(result, {
      报销类型: "差旅费",
      金额: 1280,
      日期: `${new Date().getFullYear()}-05-01`,
      风险点: [
        "报销金额与发票金额不一致",
        "文本中存在多个金额，需人工复核",
        "发票金额明显异常，需人工复核"
      ],
      制度依据: [
        "制度要求报销金额应与发票金额一致；如不一致，需要人工复核。",
        "制度要求文本中出现多个金额且影响判断时，需要人工复核。",
        "制度要求发票金额达到百万元或更高时，需要人工复核。"
      ],
      是否需要人工复核: true
    });
  } finally {
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});

test("audit reimbursement controller returns fixed audit JSON", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  let statusCode = 200;
  let responseBody = null;

  try {
    await auditReimbursementController(
      { body: { text: "2026年4月30日交通报销300元。" } },
      {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        }
      },
      (error) => {
        throw error;
      }
    );

    assert.equal(statusCode, 200);
    assert.deepEqual(responseBody, {
      报销类型: "交通费",
      金额: 300,
      日期: "2026-04-30",
      风险点: [],
      制度依据: [],
      是否需要人工复核: false
    });
  } finally {
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
});
