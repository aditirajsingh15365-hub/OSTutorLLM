import axios from 'axios';

// Where the backend lives:
//  - VITE_API_URL, if set (Vercel: Project Settings -> Environment Variables; it is
//    read at build time, so redeploy after changing it)
//  - otherwise the local FastAPI server during `npm run dev`
//  - otherwise the deployed Render backend in production builds
const DEPLOYED_API_URL = 'https://ostutorllm.onrender.com/api';
const LOCAL_API_URL = 'http://127.0.0.1:8000/api';

const baseURL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? LOCAL_API_URL : DEPLOYED_API_URL)
).replace(/\/+$/, '');

const api = axios.create({
    baseURL,
    // Render's free tier sleeps when idle and can take about a minute to wake up.
    timeout: 90000,
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
