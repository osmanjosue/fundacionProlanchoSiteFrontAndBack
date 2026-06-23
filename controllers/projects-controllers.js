/*
    route: /api/projects
*/

const { response } = require('express');
const Project = require('../models/project-model');
const { sendOk, sendError } = require('../helpers/responses');

const getProjects = async (req, res = response) => {
    const projects = await Project.find({ published: true }, 'projectName userId published img');
    sendOk(res, { projects });
};

const createProject = async (req, res = response) => {
    const userId = req.uid;
    const project = new Project({ userId, ...req.body });

    if (project.projectName === ' ') { // se llama en modal-proyecto.component.ts (newProject())
        return sendError(res, 400, 'No se permiten campos vacios');
    }

    await project.save();
    sendOk(res, { project });
};

const editProject = async (req, res = response) => {
    const projectId = req.params.id;

    const projectDB = await Project.findById(projectId);
    if (!projectDB) {
        return sendError(res, 404, 'No se encontro el proyecto');
    }

    const updatedProject = await Project.findByIdAndUpdate(projectId, req.body, { new: true });

    sendOk(res, { proyecto: updatedProject });
};

const deleteProject = async (req, res = response) => {
    const projectId = req.params.id;

    const projectDB = await Project.findById(projectId);
    if (!projectDB) {
        return sendError(res, 404, 'No se encontro el proyecto');
    }

    await Project.findByIdAndDelete(projectId);

    sendOk(res, { msg: 'Proyecto Eliminado Correctamente' });
};

module.exports = {
    getProjects,
    createProject,
    editProject,
    deleteProject,
};
