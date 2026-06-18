const { response } = require('express');

const forwardToN8n = async (req, res = response) => {
    try {
        const result = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.N8N_API_KEY
            },
            body: JSON.stringify(req.body)
        });

        const data = await result.json();

        res.json(data);

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al contactar el webhook de n8n'
        });
    }
};

module.exports = { forwardToN8n };
