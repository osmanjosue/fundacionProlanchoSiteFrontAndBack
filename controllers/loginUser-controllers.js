const { response } = require('express');
const User = require('../models/user-model');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { getMenuFrontEnd } = require('../helpers/menu-frontEnd');
const { sendOk, sendError } = require('../helpers/responses');

const loginUser = async (req, res = response) => {
    const { name, password } = req.body;

    const userDB = await User.findOne({ name });
    if (!userDB) {
        return sendError(res, 404, 'Uno de los campos es invalido');
    }

    const validPassword = bcrypt.compareSync(password, userDB.password);
    if (!validPassword) {
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
