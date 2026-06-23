const { response } = require('express');
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;

const Article = require('../models/articles-model');
const { borrarImagenCarpetaLocal } = require('../helpers/updateOrDeleteFiles');
const { cloudinaryDelete } = require('../helpers/cloudinary');
const { sendOk, sendError } = require('../helpers/responses');

const getArticles = async (req, res = response) => {
    const from = (+req.query.from) || 0;
    const limit = (+req.query.limit) || 0;

    const [article, total] = await Promise.all([
        Article
            .find({ published: true }, 'userId title content images dateCreated dateAssigned published project category')
            .sort({ dateAssigned: -1 })
            .skip(from)
            .limit(limit),
        Article.countDocuments({ published: true }),
    ]);

    sendOk(res, { article, total });
};

const createArticle = async (req, res = response) => {
    // req.uid viene del middleware validar-jwt.js
    const article = new Article({
        userId: req.uid,
        ...req.body,
    });

    await article.save();
    sendOk(res, { article });
};

const actualizarArticulo = async (req, res = response) => {
    const articleId = req.params.id;

    if (!ObjectId.isValid(articleId)) {
        return sendError(res, 400, 'No es un MongoId valido');
    }

    const articleDb = await Article.findById(articleId);
    if (!articleDb) {
        return sendError(res, 404, 'No existe un articulo por ese id');
    }

    // Solo se permite actualizar estos campos (se excluyen los inmutables).
    const { userId, dateCreated, project, category, ...campos } = req.body;
    await Article.findByIdAndUpdate(articleId, campos, { new: true });

    sendOk(res, { msg: 'Articulo Actualizado Correctamente' });
};

const deleteArticle = async (req, res = response) => {
    const articleId = req.params.id;

    if (!ObjectId.isValid(articleId)) {
        return sendError(res, 400, 'No es un MongoId valido');
    }

    const articleDb = await Article.findById(articleId);
    if (!articleDb) {
        return sendError(res, 404, 'No existe un articulo por ese id');
    }

    await Article.findByIdAndDelete(articleId);

    articleDb.images.forEach((file) => {
        const cloudinaryFile = file.split('.').at(0);
        borrarImagenCarpetaLocal(`uploads/articulos/${file}`);
        cloudinaryDelete(`uploads/${cloudinaryFile}`);
    });

    sendOk(res, { msg: 'Articulo Eliminado Correctamente' });
};

module.exports = {
    getArticles,
    createArticle,
    actualizarArticulo,
    deleteArticle,
};
