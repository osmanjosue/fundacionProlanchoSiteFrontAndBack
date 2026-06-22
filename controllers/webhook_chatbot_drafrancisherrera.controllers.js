const { createN8nForwarder } = require('../helpers/n8n-forwarder');

const forwardToN8n = createN8nForwarder('N8N_WEBHOOK_URL');

module.exports = { forwardToN8n };
