const express = require("express");
const reimbursementRoute = require("./routes/reimbursement");
const auditRoute = require("./routes/audit");

const app = express();

app.use(express.json());
app.use("/", reimbursementRoute);
app.use("/", auditRoute);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Request body must be valid JSON."
    });
  }

  return next(err);
});

module.exports = app;
