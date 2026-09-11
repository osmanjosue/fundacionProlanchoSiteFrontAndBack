const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
    const token = req.header('x-token');

    if( !token ) {
        return res.status(401).json({
            ok: false,
            msg: 'No hay token en la peticion'
        });
    }

    try {

        const payload = jwt.verify( token, process.env.JWT_SECRET);
        
        // Evitar que tokens especiales (como los magic links) se usen como sesión
        if (payload.type) {
            throw new Error('Token de tipo incorrecto para esta ruta');
        }

        req.uid = payload.uid;
        next();

    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: 'token no valido'
        })
    }
    
}
module.exports = {
    validarJWT,
}