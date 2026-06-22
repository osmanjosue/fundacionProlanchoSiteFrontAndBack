const { createN8nForwarder } = require('../helpers/n8n-forwarder');

const forwardBookingToN8n = createN8nForwarder('N8N_BOOKING_WEBHOOK_URL');

module.exports = { forwardBookingToN8n };
