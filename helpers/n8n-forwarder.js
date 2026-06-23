const { response } = require('express');
const { sendError } = require('./responses');

const createN8nForwarder = (webhookEnvVar) => {
    return async (req, res = response) => {
        try {
            const result = await fetch(process.env[webhookEnvVar], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.N8N_API_KEY,
                },
                body: JSON.stringify(req.body),
            });

            const data = await result.json();

            if (!result.ok) {
                return sendError(res, 502, 'El servicio externo no está disponible.');
            }

            // Se reenvía la respuesta de n8n tal cual (contrato definido por n8n).
            res.json(data);
        } catch (error) {
            console.log(error);
            sendError(res, 500, 'Error al contactar el servicio.');
        }
    };
};

module.exports = { createN8nForwarder };
