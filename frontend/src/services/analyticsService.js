import api from '../config/api';

const getAnalytics = async () => {
    const response = await api.get('/analytics');
    return response.data;
};

const analyticsService = {
    getAnalytics,
};

export default analyticsService;
