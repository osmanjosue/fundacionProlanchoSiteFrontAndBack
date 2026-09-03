const Talento = require('../models/talento-model');
const { uploadCurriculo } = require('../helpers/uploadCurriculo');
const { sendOk, sendError } = require('../helpers/responses');

const actualizarTalento = async (talento, datosPersonales, area, fileName, url) => {
    Object.assign(talento, datosPersonales);
    talento.nombreArchivoCV = fileName;
    talento.urlCV = url;
    talento.areasInteres.push({ area, fecha: new Date() });
    talento.estado = 'nuevo';
    await talento.save();
    return talento;
};

const registrarTalento = async (datosPersonales, numeroDocumento, area, fileName, url) => {
    const nuevo = new Talento({
        ...datosPersonales,
        numeroDocumento,
        nombreArchivoCV: fileName,
        urlCV: url,
        areasInteres: [{ area, fecha: new Date() }],
    });
    await nuevo.save();
    return nuevo;
};

const crearPostulacion = async (req, res) => {
    const { nombreCompleto, numeroDocumento, email, telefono, ciudad,
        nivelEducativo, tituloProfesional, anosExperiencia,
        linkedinUrl, presentacion, aceptaTratamientoDatos, area, } = req.body;

    const datosPersonales = {
        nombreCompleto, email, telefono, ciudad,
        nivelEducativo, tituloProfesional, anosExperiencia,
        linkedinUrl, presentacion, aceptaTratamientoDatos,
    };
    const { fileName, url } = await uploadCurriculo(req.body.files);
    const existente = await Talento.findOne({ numeroDocumento });

    const talento = existente
        ? await actualizarTalento(existente, datosPersonales, area, fileName, url)
        : await registrarTalento(datosPersonales, numeroDocumento, area, fileName, url);

    // crearPostulacion
    return sendOk(res, { talento }, existente ? 200 : 201);
};

const listarPostulaciones = async (req, res) => {
    const pagina = parseInt(req.query.page) || 1;
    const limite = parseInt(req.query.limit) || 10;
    const skip = (pagina - 1) * limite;

    const [postulaciones, total] = await Promise.all([
        Talento.find().skip(skip).limit(limite),
        Talento.countDocuments(),
    ]);

    return sendOk(res, {
        postulaciones,
        paginacion: {
            total,
            pagina,
            totalPaginas: Math.ceil(total / limite),
        },
    }, 200);
};

const verPostulacion = async (req, res) => {
    const { id } = req.params;

    const talento = await Talento.findById(id);

    if (!talento) {
        return sendError(res, 404, 'Postulación no encontrada');
    }

    return sendOk(res, { talento }, 200);
};

module.exports = {
    crearPostulacion,
    listarPostulaciones,
    verPostulacion,
};