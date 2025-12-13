import api from '../config/api';

const getQuizHistory = async () => {
    const response = await api.get('/quizzes/history');
    return response.data;
};

const saveQuizResult = async (resultData) => {
    const response = await api.post('/quizzes/save', resultData);
    return response.data;
};

const quizService = {
    getQuizHistory,
    saveQuizResult,
};

export default quizService;
