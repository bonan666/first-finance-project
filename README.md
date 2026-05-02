# AI Finance Demo

一个用于练习 Prompt 工程和财务报销信息抽取的 Node.js + Express 示例项目。`/extract-reimbursement` 会优先调用 Gemini 抽取；没有配置 `GEMINI_API_KEY` 时会自动使用本地 mock 逻辑，方便本地测试。

项目已加入最小 RAG 审核版本：第一阶段不使用向量数据库，程序会读取本地制度文档 `knowledge/reimbursement-policy.md`，再把制度内容和报销文本一起交给模型审核。没有 `OPENAI_API_KEY` 时会自动使用 mock 返回，方便本地测试。

## 项目用途

- 提供 `POST /extract-reimbursement` 接口
- 提供 `POST /audit-reimbursement` 接口
- 从自然语言报销描述中抽取报销类型、候选报销类型、金额、日期和风险点
- 基于本地制度文档审核报销文本，并输出制度依据和是否需要人工复核
- 第一版遵循“无法明确判断就返回 `null`，不要胡编”的原则

## 启动方式

```bash
npm install
npm start
```

默认监听 `3000` 端口。

如果需要让 `/extract-reimbursement` 调用 Gemini，创建 `.env` 文件或设置环境变量：

```bash
GEMINI_API_KEY=your_gemini_api_key
```

可选指定 Gemini 模型：

```bash
GEMINI_MODEL=gemini-2.5-flash
```

不设置 `GEMINI_API_KEY` 时，`/extract-reimbursement` 会走本地 mock 抽取。设置了 `GEMINI_API_KEY` 但 Gemini 调用失败或返回非合法 JSON 时，接口会自动回退到本地 mock，并在 `风险点` 中追加：

```json
[
  "Gemini 失效，已调用本地 mock 返回数据"
]
```

如果是模型返回内容无法解析为 JSON，还会追加：

```json
[
  "模型返回的内容不是合法 JSON"
]
```

如果需要调用模型审核，设置环境变量：

```bash
export OPENAI_API_KEY=your_api_key
```

可选指定模型：

```bash
export OPENAI_MODEL=gpt-4o-mini
```

不设置 `OPENAI_API_KEY` 时，`/audit-reimbursement` 会走本地 mock 审核。

开发模式：

```bash
npm run dev
```

## 测试方式

```bash
npm test
```

## 接口说明

### POST /extract-reimbursement

优先使用 Gemini 抽取。没有 `GEMINI_API_KEY`，或 Gemini 调用失败时，会自动使用本地 mock 逻辑返回同样结构的 JSON。

#### 请求

- 方法：`POST`
- 路径：`/extract-reimbursement`
- `Content-Type: application/json`

请求示例：

```json
{
  "text": "我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是1200元。"
}
```

#### 响应

响应结构：

```json
{
  "报销类型": "差旅费",
  "候选报销类型": ["住宿费", "交通费"],
  "金额": 1280,
  "日期": "2026-05-01",
  "风险点": ["报销金额与发票金额不一致", "文本中存在多个金额，需人工复核"]
}
```

字段说明：

- `报销类型`: `string | null`
- `候选报销类型`: `string[]`
- `金额`: `number | null`
- `日期`: `string | null`
- `风险点`: `string[]`

## 当前识别规则

- 如果文本明确出现 `差旅`、`出差`、`출장`，`报销类型` 返回 `差旅费`
- 如果没有明确大类，但只识别到一个细分类，例如 `住宿`，则返回 `住宿费`
- 如果没有明确大类，同时识别到多个细分类，例如 `住宿和交通`，则 `报销类型` 返回 `null`，并在 `候选报销类型` 中返回命中的细分类
- 日期优先标准化为 `YYYY-MM-DD`
- 对无法确认的字段返回 `null`
- 风险点用于提示金额冲突、多金额文本、多类型候选等需要人工复核的情况

## 调用示例

```bash
curl -X POST http://127.0.0.1:3000/extract-reimbursement \
  -H 'Content-Type: application/json' \
  -d '{"text":"2026年4月30日交通报销300元。"}'
```

本地使用 `.env` 测试 Gemini：

```bash
cat > .env <<'EOF'
GEMINI_API_KEY=your_gemini_api_key
EOF

npm start
```

### POST /audit-reimbursement

基于本地制度文档进行报销审核。当前第一阶段会直接读取整份 `knowledge/reimbursement-policy.md`，不做切片、embedding 或向量检索。

#### 请求

- 方法：`POST`
- 路径：`/audit-reimbursement`
- `Content-Type: application/json`

请求示例：

```json
{
  "text": "我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是25000000000000元。"
}
```

#### 响应

响应结构固定为：

```json
{
  "报销类型": "差旅费",
  "金额": 1280,
  "日期": "2026-05-01",
  "风险点": [
    "报销金额与发票金额不一致",
    "文本中存在多个金额，需人工复核",
    "发票金额明显异常，需人工复核"
  ],
  "制度依据": [
    "制度要求报销金额应与发票金额一致；如不一致，需要人工复核。",
    "制度要求文本中出现多个金额且影响判断时，需要人工复核。",
    "制度要求发票金额达到百万元或更高时，需要人工复核。"
  ],
  "是否需要人工复核": true
}
```

字段说明：

- `报销类型`: `string | null`
- `金额`: `number | null`
- `日期`: `string | null`
- `风险点`: `string[]`
- `制度依据`: `string[]`
- `是否需要人工复核`: `boolean`

调用示例：

```bash
curl -X POST http://127.0.0.1:3000/audit-reimbursement \
  -H 'Content-Type: application/json' \
  -d '{"text":"我5月1日去上海出差，住宿和交通一共报销1280元，但发票金额是25000000000000元。"}'
```
