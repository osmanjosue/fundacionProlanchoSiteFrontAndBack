const { response } = require('express');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;
const path = require('path');

const Article = require('../models/articles-model');
const { uploadSingle } = require('../helpers/uploadFile');
const { cloudinaryDelete } = require('../helpers/cloudinary');
const { sendOk, sendError } = require('../helpers/responses');

// Sube una o varias imágenes a un artículo (máx. 10 en total).
const uploadImage = async (req, res = response) => {
    const { type, id } = req.params;
    const validTypes = ['articulos'];
    const validExt = ['png', 'jpg', 'jpeg', 'gif'];

    if (!validTypes.includes(type) || !ObjectId.isValid(id)) {
        return sendError(res, 400, 'No es un tipo o MongoId valido');
    }

    const article = await Article.findById(id);
    if (!article) {
        return sendError(res, 404, 'No es un id de articulo valido');
    }

    const files = req.body.files;
    if (files.length + article.images.length > 10) {
        return sendError(res, 400, 'son un maximo de 10 archivos');
    }

    const fileNames = await Promise.all(
        files.map((file) => uploadSingle(file, type, validExt, article))
    );

    sendOk(res, {
        msg: 'Subida Exitosa',
        fileNames,
        fileName: fileNames[0],
    });
};

// Devuelve el archivo físico de una imagen.
const showImage = (req, res = response) => {
    const { type, img } = req.params;
    const pathImg = path.join(__dirname, `../uploads/${type}/${img}`);
    res.sendFile(pathImg);
};

// Elimina una imagen de Cloudinary y del array de imágenes del artículo.
const deleteCloudinaryImage = async (req, res = response) => {
    const photoId = req.params.img;
    const articleId = req.params.id;

    if (!ObjectId.isValid(articleId)) {
        return sendError(res, 400, 'No es un MongoId valido');
    }

    const articleDb = await Article.findById(articleId);
    if (!articleDb) {
        return sendError(res, 404, 'No existe un articulo por ese id');
    }

    if (!articleDb.images.includes(photoId)) {
        return sendError(res, 404, 'La foto no existe');
    }

    const imgIndex = articleDb.images.indexOf(photoId);
    articleDb.images.splice(imgIndex, 1);
    const rest = articleDb.images;
    await Article.findByIdAndUpdate(articleId, { images: rest }, { new: true });

    const cloudinaryPath = `uploads/${photoId.split('.').at(0)}`;
    cloudinaryDelete(cloudinaryPath).then((resp) => console.log(resp));

    sendOk(res, {
        msg: 'foto eliminada de cloudinary y del array',
        images: rest,
    });
};

module.exports = {
    uploadImage,
    showImage,
    deleteCloudinaryImage,
};
