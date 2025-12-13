import api from '../config/api';

const getNotes = async (pageNumber = 1, keyword = '') => {
    const response = await api.get(`/notes?pageNumber=${pageNumber}&keyword=${keyword}`);
    return response.data;
};

const createNote = async (noteData) => {
    const response = await api.post('/notes', noteData);
    return response.data;
};

const updateNote = async (id, noteData) => {
    const response = await api.put(`/notes/${id}`, noteData);
    return response.data;
};

const deleteNote = async (id) => {
    const response = await api.delete(`/notes/${id}`);
    return response.data;
};

const noteService = {
    getNotes,
    createNote,
    updateNote,
    deleteNote,
};

export default noteService;
