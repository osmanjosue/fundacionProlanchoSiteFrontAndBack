const { response } = require('express');
const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId;
const path = require('path');

const Article = require('../models/articles-model')
const { uploadSingle } = require('../helpers/uploadFile');
const { Error } = require('mongoose');
const { error } = require('console');
const { cloudinaryDelete } = require('../helpers/cloudinary');


const uploadImage = async (req, res = response) => {

    const type = req.params.type;
    const id = req.params.id;
    const validTypes = ['articulos'];
    const validExt = ['png', 'jpg', 'jpeg', 'gif'];

    /* console.log(ObjectId.isValid(id));
    const regex = new RegExp(/^[0-9a-fA-F]{24}$/)
    console.log(regex.test(id)); */

    if (!validTypes.includes(type) || !ObjectId.isValid(id)) {
        return res.status(400).json({
            ok: false,
            msg: 'No es un tipo o MongoId valido',
        })
    }


    try {

        //----------------================+++++++++++++++++++++ Helper ----------------================+++++++++++++++++++++

        const subidaArchivos = async () => {
            const article = await Article.findById(id); //TODO: esto ya se evaluo en uploadFile.js
            if (!article) throw new Error('No es un id de articulo valido');

            const files = req.body.files;
            if (files.length + article.images.length <= 10) {
                const fileNames = await Promise.all(
                    files.map(file => uploadSingle(file, type, validExt, article))
                ) //! POR AQUI VAS
                return fileNames;
            } else {
                throw new Error('son un maximo de 10 archivos');
            }

        }

        //----------------================+++++++++++++++++++++ Helper ----------------================+++++++++++++++++++++



        const fileNames = await subidaArchivos();

        res.json({
            ok: true,
            msg: 'Subida Exitosa',
            fileNames,
            fileName: fileNames[0] // <--- Añadimos esto para que tu frontend viejo lo encuentre en singular
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({
            ok: false,
            msg: 'Error al subir las imagenes'
        })
    }
}

const showImage = (req, res = response) => {

    const type = req.params.type;
    const img = req.params.img;

    /* importado al inicio --const path = require('path');-- */

    const pathImg = path.join(__dirname, `../uploads/${type}/${img}`);
    /* const pathImg = `https://res.cloudinary.com/dnmiw6q44/image/upload/v1705031852/uploads/${img}`; */

    res.sendFile(pathImg);

    /* res.send(pathImg); Este me funciono mas o menos con el url*/

    /* Estamos en clase 141*/

    //FALTA MOSTRAR LA IMAGEN PREDETERMINADA EN CASO QUE NO HAYA UNA
}

const deleteCloudinaryImage = async (req, res = response) => {

    const photoId = req.params.img;
    const articleId = req.params.id;
    /* podes mandar en el body el array actualizado de las imagenes y seria como para borrado multiple,
     pero en este caso solo estamos tomando valores de los params, recibe data pero no la usa */
    try {

        if (ObjectId.isValid(articleId)) {
            const articleDb = await Article.findById(articleId);
            if (!articleDb) {
                return res.status(404).json({
                    ok: false,
                    mgs: 'No existe un articulo por ese id'
                })
            } else if (articleDb.images.includes(photoId)) {
                const imgIndex = articleDb.images.indexOf(photoId);
                articleDb.images.splice(imgIndex, 1);
                const rest = articleDb.images;
                await Article.findByIdAndUpdate(articleId, { images: rest }, { new: true })
                const path = `uploads/${photoId.split('.').at(0)}`;
                cloudinaryDelete(path).then(resp => console.log(resp)) //! el split para quitar el jpg, solo se puede borrar sin la extension

                return res.status(200).json({
                    ok: true,
                    mgs: 'foto eliminada de cloudinary y de el array',
                    images: rest,
                })

            } else {
                return res.status(404).json({
                    ok: false,
                    mgs: 'La foto no existe'
                })
            }
        } else {
            return res.status(400).json({
                ok: true,
                msg: 'No es un MongoId valido',
            });
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({
            ok: false,
            msg: 'no se pudo borrar la imagen'
        })
    }
}

module.exports = {
    uploadImage,
    showImage,
    deleteCloudinaryImage
}