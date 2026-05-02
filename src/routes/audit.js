const express = require("express");
const { auditReimbursementController } = require("../controllers/auditController");

const router = express.Router();

router.post("/audit-reimbursement", auditReimbursementController);

module.exports = router;
