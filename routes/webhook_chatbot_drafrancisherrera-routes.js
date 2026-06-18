const { Router } = require('express');
const { forwardToN8n } = require('../controllers/webhook_chatbot_drafrancisherrera.controllers');

const router = Router();

// Endpoint público: el widget de chat llama aquí sin credenciales.
// La autenticación hacia n8n la agrega el controller con N8N_API_KEY.
router.post('/', forwardToN8n);

module.exports = router;
