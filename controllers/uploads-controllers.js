const { response } = require('express');
const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId;
const path = require('path');

const Article = require('../models/articles-model')
const { uploadSingle } = require('../helpers/uploadFile');
const { Error } = require('mongoose');
const { error } = require('console');
const { cloudinaryDelete } = require('../helpers/cloudinary');

// Function to handle image upload
const uploadImage = async (req, res = response) => {
    const type = req.params.type;
    const id = req.params.id;
    const validTypes = ['articulos'];
    const validExt = ['png', 'jpg', 'jpeg', 'gif'];

    if (!validTypes.includes(type) || !ObjectId.isValid(id)) {
        return res.status(400).json({
            ok: false,
            msg: 'No es un tipo o MongoId valido',
        });
    }

    try {
        const subidaArchivos = async () => {
            const article = await Article.findById(id);
            if (!article) throw new Error('No es un id de articulo valido');

            const files = req.body.files;
            if (files.length + article.images.length <= 10) {
                const fileNames = await Promise.all(
                    files.map(file => uploadSingle(file, type, validExt, article))
                );
                return fileNames;
            } else {
                throw new Error('son un maximo de 10 archivos');
            }
        };

        const fileNames = await subidaArchivos();

        res.json({
            ok: true,
            msg: 'Subida Exitosa',
            fileNames,
            fileName: fileNames[0]
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            ok: false,
            msg: 'Error al subir las imagenes'
        });
    }
};

// Function to show an image
const showImage = (req, res = response) => {
    const type = req.params.type;
    const img = req.params.img;

    const pathImg = path.join(__dirname, `../uploads/${type}/${img}`);
    res.sendFile(pathImg);
};

// Function to delete a cloudinary image
const deleteCloudinaryImage = async (req, res = response) => {
    const photoId = req.params.img;
    const articleId = req.params.id;
    try {
        if (ObjectId.isValid(articleId)) {
            const articleDb = await Article.findById(articleId);
            if (!articleDb) {
                return res.status(404).json({
                    ok: false,
                    mgs: 'No existe un articulo por ese id'
                });
            } else if (articleDb.images.includes(photoId)) {
                const imgIndex = articleDb.images.indexOf(photoId);
                articleDb.images.splice(imgIndex, 1);
                const rest = articleDb.images;
                await Article.findByIdAndUpdate(articleId, { images: rest }, { new: true });
                const path = `uploads/${photoId.split('.').at(0)}`;
                cloudinaryDelete(path).then(resp => console.log(resp));
                return res.status(200).json({
                    ok: true,
                    mgs: 'foto eliminada de cloudinary y de el array',
                    images: rest,
                });
            } else {
                return res.status(404).json({
                    ok: false,
                    mgs: 'La foto no existe'
                });
            }
        } else {
            return res.status(400).json({
                ok: true,
                msg: 'No es un MongoId valido',
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'no se pudo borrar la imagen'
        });
    }
};
module.exports = {
    uploadImage,
    showImage,
    deleteCloudinaryImage
};
