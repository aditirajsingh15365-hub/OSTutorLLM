import axios from 'axios';

const api = axios.create({
    baseURL: 'https://ostutorllm.onrender.com/api'
});

export const checkHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const sendChatMessage = async (session_id, message, learning_mode, conversation_history = []) => {
    const response = await api.post('/chat', {
        session_id,
        message,
        learning_mode,
        conversation_history
    });
    return response.data;
};
