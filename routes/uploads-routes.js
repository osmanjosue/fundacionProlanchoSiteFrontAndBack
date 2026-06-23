/* ruta: api/upload/articulo/:id */

const { Router } = require('express');
const fileUpload = require('express-fileupload');

const { validarJWT } = require('../middlewares/validar-jwt');
const { uploadImage, showImage, deleteCloudinaryImage } = require('../controllers/uploads-controllers');
const { fileUploadMiddleware } = require('../middlewares/file-upload.middleware')
const { asyncHandler } = require('../middlewares/async-handler');

const router = Router();

router.use(fileUpload()); //para que se habilite el req.files

router.put(
    '/:type/:id',
    [
    validarJWT,
    fileUploadMiddleware
    ],
    asyncHandler(uploadImage));

router.get(
    '/:type/:img',
    [
    ],
    showImage);

router.put(
    '/updateImagesArray/:id/:img',
    [
        validarJWT,
    ],
    asyncHandler(deleteCloudinaryImage)
);

module.exports = router;