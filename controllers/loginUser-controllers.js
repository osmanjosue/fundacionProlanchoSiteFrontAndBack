const { response } = require('express');
const User = require('../models/user-model');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { getMenuFrontEnd } = require('../helpers/menu-frontEnd');
const { sendOk, sendError } = require('../helpers/responses');

/**
 * Hash de descarte con el que se compara cuando el usuario no existe. Sin esto,
 * un login con nombre inexistente responde sin pasar por bcrypt y lo hace en una
 * fracción del tiempo: la diferencia basta para averiguar qué nombres existen.
 * Es el hash de una cadena cualquiera; nunca podrá coincidir con la contraseña.
 */
const HASH_DESCARTE = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const loginUser = async (req, res = response) => {
    const { name, password } = req.body;

    const userDB = await User.findOne({ name });

    // Mismo estado y mismo mensaje para "no existe" y "contraseña incorrecta":
    // responder 404 en un caso y 400 en el otro revela si el nombre está registrado.
    const validPassword = bcrypt.compareSync(password, userDB?.password ?? HASH_DESCARTE);
    if (!userDB || !validPassword) {
        return sendError(res, 400, 'Uno de los campos es invalido');
    }

    const token = await generarJWT(userDB._id);

    sendOk(res, {
        token,
        menu: getMenuFrontEnd(),
    });
};

const renewToken = async (req, res = response) => {
    const uid = req.uid;
    const token = await generarJWT(uid);

    sendOk(res, {
        token,
        menu: getMenuFrontEnd(),
    });
};

module.exports = {
    loginUser,
    renewToken,
};
