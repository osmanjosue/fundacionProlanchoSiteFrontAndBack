const validarN8nApiKey = (req, res, next) => {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
        return res.status(401).json({
            ok: false,
            msg: 'No hay API key en la peticion'
        });
    }

    if (apiKey !== process.env.N8N_API_KEY) {
        return res.status(403).json({
            ok: false,
            msg: 'API key no valida'
        });
    }

    next();
};

module.exports = { validarN8nApiKey };
