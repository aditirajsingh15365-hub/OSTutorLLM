# OSTutorLLM 🧠💻

OSTutorLLM is an academic Operating Systems AI tutor designed to behave like a real university professor rather than a generic chatbot. It emphasizes pedagogical learning—explaining concepts, checking understanding with targeted follow-up questions, and guiding students through structured learning paths.

**🌍 Live Deployment:** [Click here to view the live site](https://os-tutor-llm.vercel.app)

## 🎯 Core Philosophy
- **Teaching over Telling:** Instead of dumping information, the tutor actively checks your understanding.
- **Pedagogical Progression:** The AI is strictly instructed to explain, simplify if you are confused, ask follow-up questions, and recommend related topics.
- **Academic Focus:** Tailored specifically for undergraduate Operating Systems concepts (Processes, Deadlocks, CPU Scheduling, Memory Management, etc.).

## ✨ Key Features (Phase 1)
- **Interactive UI:** A custom React frontend featuring a polished, distraction-free chat interface.
- **Structured Rendering:** Markdown support with syntax highlighting for code, alongside distinct interactive UI cards for "Check your understanding" and "Recommended next topics".
- **Learning Modes:** Instantly switch the tutor's behavior (Beginner, Detailed, Exam 5-mark, Exam 10-mark, Viva, Example-Based, Code/Practical).
- **Tutor Controller:** A custom FastAPI orchestration layer that forces the LLM to separate raw text explanations from follow-up questions.
- **Mock Mode:** Develop and test the UI natively without spending LLM API credits.

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS v4, `react-markdown`
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **AI Integration:** Google Gemini (`google-genai` SDK) utilizing strict JSON Schema structured outputs.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Backend Setup
Open a terminal in the root directory and navigate to the backend:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Configure Environment Variables:**
1. Copy the example `.env` file:
   ```powershell
   copy .env.example .env
   ```
2. Open `backend/.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   LLM_MODE=gemini
   ```
   *(Note: You can set `LLM_MODE=mock` to test the app without an API key).*

**Run the Backend Server:**
```powershell
$env:PYTHONPATH = (Get-Location).Path
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
The API will be available at `http://127.0.0.1:8000`.

### 2. Frontend Setup
Open a **new** terminal in the root directory and navigate to the frontend:
```powershell
cd frontend
npm install
npm run dev
```
The UI will be available at `http://localhost:5173`.

---

## 📂 Project Architecture

```text
OSTutorLLM/
├── backend/
│   ├── core/              # Configuration and environment management
│   ├── routers/           # FastAPI route definitions (e.g., /api/chat)
│   ├── schemas/           # Pydantic models for strict API contracts
│   ├── services/          # Business logic (LLM integration, Tutor controller)
│   ├── data/              # Local topic mappings and reference data
│   └── main.py            # FastAPI application entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # Modular React components (chat cards, layout)
│   │   ├── services/      # API communication layer (Axios)
│   │   ├── App.jsx        # Main application state and rendering
│   │   └── index.css      # Tailwind v4 configuration
│   └── vite.config.js
└── AGENTS.md              # Persistent LLM development rules and roadmap
```

## 🗺️ Roadmap (Future Phases)
- **Phase 2 (RAG Integration):** Grounding the AI's answers in verified university course materials and PDFs using a local Vector Database (ChromaDB).
- **Phase 3 (Algorithm Engine):** Deterministic Python implementations of OS algorithms (e.g., Round Robin scheduling, Banker's Algorithm) to ensure flawless numerical accuracy for exam prep.
- **Phase 4 (Persistence):** PostgreSQL database to track student learning state and history.
