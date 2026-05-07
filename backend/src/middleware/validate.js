const formatValidationIssues = (issues) =>
  issues
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(', ');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: formatValidationIssues(result.error.issues || []),
    });
  }

  // For 'query' and 'params' Express 5 makes these read-only getters.
  // For now (Express 4) reassignment is fine; guarded for future safety.
  try {
    req[source] = result.data;
  } catch {
    /* req.query/params readonly in Express 5 — values still validated */
  }
  next();
};

validate.formatValidationIssues = formatValidationIssues;

module.exports = validate;