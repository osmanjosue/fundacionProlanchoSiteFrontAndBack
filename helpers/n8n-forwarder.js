const { response } = require('express');

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
                return res.status(502).json({
                    ok: false,
                    msg: 'El servicio externo no está disponible.',
                });
            }

            res.json(data);
        } catch (error) {
            console.log(error);
            res.status(500).json({
                ok: false,
                msg: 'Error al contactar el servicio.',
            });
        }
    };
};

module.exports = { createN8nForwarder };
