const { response } = require('express');
const User = require('../models/user-model');
const bcrypt = require('bcryptjs');
const { generarJWT } = require('../helpers/jwt');
const { sendOk } = require('../helpers/responses');

const getUsers = async (req, res = response) => {
    const user = await User.find({}, 'name role');

    sendOk(res, {
        user,
        uid: req.uid,
    });
};

const createUser = async (req, res = response) => {
    // La autorización de admin la garantiza el middleware validarAdmin en la ruta.
    const user = new User(req.body);

    // Encriptar contraseña
    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(user.password, salt);

    await user.save();

    const token = await generarJWT(user._id);

    sendOk(res, { user, token });
};

module.exports = {
    getUsers,
    createUser,
};
