const express = require("express");
const { extractReimbursement } = require("../controllers/reimbursementController");

const router = express.Router();

router.post("/extract-reimbursement", extractReimbursement);

module.exports = router;
