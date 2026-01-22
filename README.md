#  Orbital CLI

**Orbital CLI** is an AI-powered developer CLI that lets you **chat with AI**, run **smart tool-assisted searches**, and even enter **Agent Mode** where it can generate **mini-projects directly inside your directory** — in minutes — from just a single text prompt.

Built with **Next.js**, **Node.js**, **Express**, and **Commander.js**, with secure auth powered by **Better Auth (OAuth + Device Authorization)**.

---

## ✨ Features

###  AI Chat Mode
- Chat with AI directly in your terminal
- Streaming responses (real-time)
- Supports markdown rendering in terminal output

### 🧠 Autonomous Tool Selection
Orbital intelligently selects tools when needed:
- 🔍 Web Search
- 🔗 URL Search / Page Summarization
- 🧰 Context-based tool routing (AI decides when to use tools)

### 🤖 Agent Mode (Autonomous App Generator)
The most powerful mode:
- Generates **mini-projects** from a single prompt
- Creates **folders + files automatically**
- Writes production-ready code
- Generates setup commands
- Output saved neatly into your working directory
- Designed to build a runnable project in **a few minutes**

### 🔐 Secure Authentication
- OAuth using **Better Auth**
- **Device Authorization flow**
- Session + token handling

---

## 🧱 Tech Stack
- **Next.js** (Dashboard / Web UI)
- **Node.js**
- **Express.js**
- **Commander.js** (CLI framework)
- **Better Auth** (OAuth + Device Flow)
- **Prisma** (Database ORM)
- **Neon PostgreSQL** (recommended)
- **AI SDK (Google Gemini)**

---

## 📦 Installation

## Deployed URLs

- Frontend (Vercel): https://smart-cli-based-agent-t7x4.vercel.app/sign-in
- Backend (Render): https://smart-cli-based-agent.onrender.com

Clone the repo:

```bash
git clone https://github.com/<your-username>/orbital-cli.git
cd orbital-cli

```

Environment Setup

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
GOOGLE_GEMINI_API_KEY="your_api_key"
ORBITAL_MODEL="gemini-2.5-flash"

# Deployed URLs
BETTER_AUTH_BASE_URL="https://smart-cli-based-agent.onrender.com"
FRONTEND_URL="https://smart-cli-based-agent-t7x4.vercel.app"

Then generate Prisma client + sync schema:

cd server
npx prisma generate
npx prisma db push

Run Orbital CLI:
orbital

Orbital uses secure OAuth + Device Authorization:
orbital login

Chat with AI
orbital wakeup
Output
When agent generation succeeds, Orbital shows:

App folder name
Total files created
Location on disk
Setup commands (install, run)
