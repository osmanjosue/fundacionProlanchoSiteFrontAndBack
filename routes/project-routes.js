/* 
    route: /api/projects
*/

const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { createProject, getProjects, editProject, deleteProject } = require('../controllers/projects-controllers');
const { validarJWT } = require('../middlewares/validar-jwt');
const { asyncHandler } = require('../middlewares/async-handler');

const router = Router();

router.get('/',
[],
asyncHandler(getProjects));

router.post('/',
    [
        validarJWT,
        check('projectName', 'Es necesario el nombre del proyecto').notEmpty(),
        validarCampos
    ],
    asyncHandler(createProject));

router.put(
    '/:id',
    [
        validarJWT,
        check('projectName', 'Es necesario el nombre del proyecto').notEmpty(),
        validarCampos
    ],
    asyncHandler(editProject),
);

router.delete(
    '/:id',
    [
        validarJWT,
        // check('projectName', 'Es necesario el nombre del proyecto').notEmpty(),
        validarCampos
    ],
    asyncHandler(deleteProject),
);

module.exports = router;