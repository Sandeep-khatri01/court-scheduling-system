# 🚀 AI Court Case Scheduling & Legal Knowledge Chatbot

## 🏛️ Overview
AI Court Case Scheduling & Legal Knowledge Chatbot is a smart judicial assistance platform designed to reduce court case backlog, automate scheduling, and provide legal awareness using an AI-powered chatbot integrated with OpenAI APIs.

The system helps court staff, lawyers, and citizens by automating case scheduling, tracking case progress, and providing instant law explanations through a conversational interface.

---

## 🎯 Problem Statement
Court case scheduling in many judicial systems is manual and inefficient, leading to:

- Case backlog  
- Poor scheduling optimization  
- Lack of availability tracking (judges, lawyers, courtrooms)  
- No centralized law awareness system for citizens  
- Poor case priority handling  

---

## 💡 Solution
This project provides:

✅ Smart Case Scheduling Engine  
✅ Legal Knowledge Chatbot (Law Explanation System)  
✅ Court Resource Availability Tracking  
✅ Case Priority Management  
✅ Notification Ready Architecture  
✅ Modern Glassmorphism UI Dashboard  

---

## 🧠 Core Features

### 📅 Smart Case Scheduling
- Priority-based scheduling  
- Case age tracking  
- Adjournment history tracking  
- Judge & Lawyer availability check  
- Courtroom resource management  

---

### 🤖 AI Legal Chatbot
- Natural language court queries  
- Law explanation (Helmet law, IPC sections, etc.)  
- Case status queries  
- Legal information (Non-advisory)  

---

### 📚 Legal Knowledge Database
- Stores laws and sections  
- Penalty information  
- Law explanation retrieval  
- RAG-ready future architecture  

---

### 🔔 Notification System (Architecture Ready)
- Hearing reminders  
- Rescheduling alerts  
- Email / SMS ready design  

---

## 🏗️ System Architecture

### Frontend
- React / Next.js  
- Tailwind CSS  
- Glassmorphism UI  
- Dashboard Analytics  
- Chat Interface  

### Backend
- FastAPI (Python)  
- REST API Architecture  
- JWT Authentication  
- Role Based Access Control  

### Database
- PostgreSQL (Primary Data Storage)  
- Redis (Caching & Fast Lookup)  

### AI Integration
- OpenAI API (Chatbot Intelligence Layer Only)  

---

## 🧩 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Next.js, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Cache | Redis |
| AI | OpenAI API |
| Auth | JWT |
| Dev Tools | Docker (Optional), GitHub |

---

## 🔐 Security Features
- JWT Authentication  
- Role Based Access (Admin, Judge, Clerk, Lawyer)  
- Audit Log Ready Design  
- Secure API Layer  

---

## 📂 Project Structure

court-ai-system/
│
├ frontend/
│ ├ components/
│ ├ pages/
│ ├ services/
│ └ styles/
│
├ backend/
│ ├ app/
│ │ ├ api/
│ │ ├ models/
│ │ ├ services/
│ │ ├ chatbot/
│ │ └ core/
│ │
│ ├ requirements.txt
│ └ main.py
│
├ docs/
└ README.md

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository
git clone https://github.com/YOUR_USERNAME/court-ai-system.git
cd court-ai-system


---

### 2️⃣ Backend Setup
cd backend
pip install -r requirements.txt


---

### 3️⃣ Setup Environment Variables
Create `.env` file:

DATABASE_URL=postgresql://user:password@localhost/dbname
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_api_key_here
JWT_SECRET=your_secret_key


---

### 4️⃣ Run Backend
uvicorn app.main:app --reload


Visit:
http://localhost:8000/docs


---

### 5️⃣ Frontend Setup
cd frontend
npm install
npm run dev


---

## 🤖 Chatbot Usage Example

**User Query**
What is helmet law?


**Bot Response**
Helmet law is defined under Motor Vehicles Act Section 129.
It mandates helmet use for rider and pillion rider.
Penalty: Fine + possible license suspension.


---

## ⚠️ Disclaimer
This chatbot provides legal information only and does not provide legal advice.

---

## 🚀 Future Scope
- Vector Database (RAG Law Search)  
- Court Document AI Summary  
- Voice Law Assistant  
- Predictive Case Duration AI  
- Multi-language Support  
- Real Court Database Integration  

---

## 🏆 Hackathon Value
- Real-world judicial problem solving  
- AI + Government Tech Integration  
- Scalable Production-Ready Architecture  
- Citizen Legal Awareness  

---
