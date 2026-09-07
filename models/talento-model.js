const { Schema, model } = require('mongoose');
const { NIVELES_EDUCATIVOS, AREAS_INTERES } = require('../config/talento-listas');

const TalentoSchema = new Schema({
    nombreCompleto: {
        type: String,
        required: true,
        minlength: 3,
        trim: true,
    },
    numeroDocumento: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    telefono: {
        type: String,
        required: true,
        trim: true,
    },
    ciudad: {
        type: String,
        required: true,
        trim: true,
    },
    nivelEducativo: {
        type: String,
        required: true,
        enum: NIVELES_EDUCATIVOS,
    },
    tituloProfesional: {
        type: String,
    },
    anosExperiencia: {
        type: Number,
    },
    linkedinUrl: {
        type: String,
    },
    presentacion: {
        type: String,
        maxlength: 1000,
    },
    aceptaTratamientoDatos: {
        type: Boolean,
        required: true,
    },
    nombreArchivoCV: {
        type: String,
        required: true,
    },
    urlCV: {
        type: String,
        required: true,
    },
    estado: {
        type: String,
        enum: ['nuevo', 'revisado', 'descartado'],
        default: 'nuevo',
    },
    areasInteres: [{
        area: {
            type: String,
            required: true,
            enum: AREAS_INTERES,
        },
        fecha: {
            type: Date,
            required: true,
        },
    }],
}, {
    timestamps: true,
});

TalentoSchema.method('toJSON', function () {
    const { __v, ...object } = this.toObject();
    return object;
})

module.exports = model('Talento', TalentoSchema);