/*
users
 ruta: '/api/users' 
 */
const { Router }= require( 'express' );
const {check} = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos')

const {getUsers, createUser} = require('../controllers/users-controllers');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.get('/',validarJWT, getUsers );

router.post('/',
[
    check('name', 'hace falta el nombre del usuario').notEmpty(),
    check('password', 'Es necesaria una contraseña').notEmpty(),
    // check('role', 'No sabemos si es admin o user').notEmpty(),  //quitamos esta validacion porque en el modelo viene un valor default: "USER_ROLE"
    validarJWT,
    validarCampos,

]
 ,createUser);

 TODO: /* add the validarJWT middleware to update (put) and delete user */


module.exports = router;