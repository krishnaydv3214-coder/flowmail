# FlowMail AI 🚀

### Your Inbox. Your Calendar. One Intelligent Workspace.

FlowMail AI is an AI-powered email and productivity dashboard that brings Gmail and Google Calendar together in one unified workspace. Built during a hackathon under the **Corsair Integration Track**, it aims to eliminate application switching and simplify everyday communication and scheduling through intelligent automation.

Instead of jumping between multiple applications, users can manage emails, meetings, priorities, and productivity workflows from a single keyboard-first interface.

## ✨ Key Features

### 📩 AI Priority Inbox
- Automatically classifies incoming emails into four priority levels: Critical, Important, Normal, and Low.
- Provides AI-generated explanations for email prioritization.
- Extracts actionable tasks and important information from emails.

### 📅 Interactive Calendar & RSVP
- Integrates Google Calendar for centralized meeting management.
- Displays interactive invitation cards with meeting information.
- Provides details about guests, organizers, and meeting status.
- Supports Google Meet integration.

### 🤖 MCP-Powered AI Agent
- Enables natural language interaction with email and calendar workflows.
- Supports meeting scheduling through conversational commands.
- Facilitates email thread replies and calendar event management.
- Uses Model Context Protocol (MCP) to connect AI capabilities with external tools.

### ⌨️ Unified Command Palette
- Keyboard-first navigation for faster interactions.
- Provides quick access to application features and workflows.
- Reduces repetitive clicks and improves productivity.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS, Shadcn UI |
| UI & Animations | Framer Motion |
| Data Fetching | React Query |
| Backend | Next.js Server Actions, API Routes |
| Database | Neon PostgreSQL, pgvector |
| AI Engine | OpenAI GPT-4o-mini |
| Authentication | Clerk |
| Integrations | Corsair, Gmail API, Google Calendar API |
| AI Communication | Model Context Protocol (MCP) |
| Webhooks & Tunneling | Ngrok |

## 🏗️ Architecture Overview

FlowMail AI connects the frontend, backend, database, AI engine, and external productivity services into a unified application.

- **Frontend:** Next.js and React provide the interactive productivity dashboard.
- **Backend:** Server Actions and API Routes handle application logic and service communication.
- **AI Layer:** OpenAI GPT-4o-mini powers email classification, meeting detection, and conversational agent workflows.
- **Integration Layer:** Corsair integrations connect Gmail and Google Calendar, while MCP enables tool-based AI interactions.
- **Database:** Neon PostgreSQL stores application data, with pgvector supporting semantic search indexing.
- **Authentication:** Clerk manages user authentication.

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Google account with the required Gmail and Google Calendar access
- Required API credentials and integration configurations

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/flowmail.git
```

**2. Navigate to the project directory**

```bash
cd flowmail
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Create a `.env.local` file in the root directory and configure the credentials required by the application.

Refer to the environment variables used in the source code and the integration documentation. Never commit actual API keys or secrets.

**5. Start the development server**

```bash
npm run dev
```

**6. Open the application**

```text
http://localhost:3000
```

## 📸 Application Screenshots

Add actual screenshots of the working application in this section.

```text
public/
└── screenshots/
    ├── dashboard.png
    ├── priority-inbox.png
    ├── calendar-integration.png
    └── ai-agent.png
```

Once screenshots are added, display them below:

### Dashboard
![FlowMail Dashboard](public/screenshots/dashboard.png)

### AI Priority Inbox
![AI Priority Inbox](public/screenshots/priority-inbox.png)

### Calendar Integration
![Calendar Integration](public/screenshots/calendar-integration.png)

### AI Agent
![AI Agent](public/screenshots/ai-agent.png)

## 🏆 Hackathon

**Track:** Corsair Integration Track

**Challenge:** Build a unified, AI-powered email and productivity dashboard integrating Gmail and Google Calendar using Corsair integrations and MCP servers.

FlowMail AI was developed to demonstrate how AI-driven automation and productivity integrations can simplify communication, task management, and meeting scheduling.

## 🔮 Future Improvements

- Advanced semantic email search.
- More intelligent task extraction and prioritization.
- Expanded AI agent capabilities.
- Improved workflow automation.
- Enhanced calendar and productivity analytics.

## 👨‍💻 Contributors

Developed collaboratively as a hackathon project.

---

**FlowMail AI — Work smarter. Communicate faster. Stay organized.**