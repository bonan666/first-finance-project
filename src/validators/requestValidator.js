function validateExtractRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (typeof body.text !== "string") {
    return { ok: false, error: "Field 'text' must be a string." };
  }

  if (!body.text.trim()) {
    return { ok: false, error: "Field 'text' must not be empty." };
  }

  return {
    ok: true,
    value: {
      text: body.text.trim()
    }
  };
}

module.exports = {
  validateExtractRequest
};
