#  Orbital CLI

**Orbital CLI** is an **AI-powered developer assistant** that runs
directly in your terminal.\
Chat with AI, perform smart searches, generate mini-projects, and launch
developer tools --- all without leaving the command line.

Built with **Node.js, Express, Commander.js, Next.js**, and **Google
Gemini AI**.

------------------------------------------------------------------------

## ⚡ Installation

Install globally using npm:

    npm install -g @dubeyvishal/orbital-cli

Start Orbital:

    orbital

------------------------------------------------------------------------

## 📸 Project Screenshots

### 🔐 Orbital Login Screen
![Orbital Login Screen](https://res.cloudinary.com/damw21f39/image/upload/v1773569580/pic1_u0wu0y.png)

### 🛠️ Orbital Wakeup – Tools Loaded
![Orbital Wakeup](https://res.cloudinary.com/damw21f39/image/upload/v1773569581/pic2_mvnpiu.png)

### 🤖 Agentic Mode
![Agentic Mode](https://res.cloudinary.com/damw21f39/image/upload/v1773569581/pic3_bvidmp.png)

------------------------------------------------------------------------



## 🔐 Authentication

Login once to enable AI features:

    orbital login

Orbital uses **secure OAuth Device Authorization**.



------------------------------------------------------------------------

## 🔑 Set Your AI API Key

To use AI features (chat, tools, agent mode), set your own API key:
    
    orbital set-key <your_api_key>

The API key is stored securely in your **OS Credential Manager** (Windows Credential Manager / macOS Keychain / Linux Secret Service).

Orbital will **never store your key in plain text files**.

Once set, you won't need to enter it again.

------------------------------------------------------------------------


## 💬 AI Chat Mode

Start chatting with AI directly in your terminal:

    orbital wakeup

**Features**

-   Real-time streaming responses
-   Markdown rendering in terminal
-   Intelligent context handling

------------------------------------------------------------------------

## 🧠 Tool Calling

Orbital automatically selects tools when needed.

**Examples** - 🌐 Web search\
- 🔗 URL summarization\
- 📄 Content extraction\
- 🧰 Context-aware tool routing

Example prompts:

    summarize https://react.dev
    latest news about AI agents

Orbital decides which tool to use automatically.

------------------------------------------------------------------------

## 🤖 Agentic Mode (Autonomous Project Generator)

Orbital can generate **complete mini-projects from a single prompt**.

Example:

    create a node express todo api

Orbital will:

-   Create folders and files
-   Generate working code
-   Provide install and run commands
-   Save everything in your current directory

Perfect for:

-   Rapid prototyping
-   Boilerplate generation
-   Quick development setups

------------------------------------------------------------------------

## 🚀 Launch Developer Tools

Open commonly used developer platforms instantly.

    orbital launch github
    orbital launch linkedin
    orbital launch leetcode
    orbital launch youtube

No need to open the browser manually.

------------------------------------------------------------------------

## 🔎 Instant YouTube Search

Search YouTube directly from the terminal.

    orbital search "react server components"

Orbital will open the results instantly.


------------------------------------------------------------------------

## 🧱 Tech Stack

-   **Node.js**
-   **Express.js**
-   **Commander.js**
-   **Next.js**
-   **Prisma**
-   **Neon PostgreSQL**
-   **Google Gemini AI**

------------------------------------------------------------------------

## 🌐 Deployed Services

**Frontend**\
https://smart-cli-based-agent-t7x4.vercel.app

**Backend**\
https://smart-cli-based-agent.onrender.com

------------------------------------------------------------------------

## 📦 npm Package

https://www.npmjs.com/package/@dubeyvishal/orbital-cli

------------------------------------------------------------------------

## 📄 License

**MIT License**

------------------------------------------------------------------------

## 👨‍💻 Developed and Maintained By

**Vishal Dubey**

If you find Orbital CLI useful, consider giving the repository a ⭐ on GitHub.
