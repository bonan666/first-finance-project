const fs = require("node:fs/promises");
const path = require("node:path");

const POLICY_PATH = path.resolve(__dirname, "../../../knowledge/reimbursement-policy.md");

async function readReimbursementPolicy() {
  return fs.readFile(POLICY_PATH, "utf8");
}

module.exports = {
  POLICY_PATH,
  readReimbursementPolicy
};
