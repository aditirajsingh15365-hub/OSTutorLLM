# OSTutorLLM Persistent Development Rules

## PROJECT
OSTutorLLM

## PURPOSE
Build an academic Operating Systems AI tutor that behaves like a teacher rather than a generic chatbot.

## CORE PRINCIPLES
1. Correctness is more important than speed.
2. Do not invent implementation status.
3. Never claim a feature is implemented unless it actually works.
4. Do not expose API keys or secrets.
5. Never commit .env files.
6. Never commit node_modules, Python virtual environments, caches, build artifacts, or secrets.
7. Never force-push.
8. Never delete existing work without explicit permission.
9. Prefer modular architecture.
10. Avoid unnecessary complexity.
11. Keep frontend and backend responsibilities separate.
12. Keep deterministic OS calculations outside the LLM.
13. Use the LLM for natural-language explanation and tutoring.
14. Use RAG for grounding answers in course material.
15. Use a Tutor Controller/Teaching Engine for pedagogical behavior.
16. Do not turn every response into a fixed template.
17. Follow-up questions should be meaningful and context-dependent.
18. Suggestions should be relevant to the student's current understanding.
19. Numerical OS problems should use deterministic Python algorithms whenever possible.
20. Maintain clear API contracts between frontend and backend.
21. Write tests for important backend functionality.
22. Update README/documentation whenever setup or architecture changes.
23. Before committing, inspect git diff and git status.
24. Never commit unless explicitly instructed.
25. Never push unless explicitly instructed.
26. When uncertain about an architectural decision, explain the tradeoff before making a major change.

## ACADEMIC REQUIREMENTS
The project must demonstrate that it is more than a simple ChatGPT wrapper.

The architecture must clearly separate:
- LLM Service
- RAG Service
- Tutor Controller
- OS Algorithm Engine
- Student/Learning State
- Frontend
- Backend API

The final system should behave like an Operating Systems teacher.

It should be able to:
- explain concepts
- ask relevant follow-up questions
- check understanding
- simplify explanations
- provide hints
- deepen explanations
- recommend what to learn next
- generate practice questions
- eventually personalize learning

## TECHNICAL PRINCIPLES

### Frontend
React + Vite + Tailwind CSS

### Backend
Python + FastAPI + Pydantic

### LLM
Provider abstraction so the LLM provider can be changed later.

### RAG
Embeddings + vector database.

### Database
PostgreSQL/Supabase will be introduced later.

### OS algorithms
Python deterministic implementations.

### Development
Use incremental phases. Do not implement future features prematurely.
