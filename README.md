# Todo Frontend Jira (Educational Pet Project)

A web-based task and project management app inspired by Jira, built with Next.js (React), and designed as a **learning project**.  
This project demonstrates how to build a modern, collaborative Kanban-style todo application with user, project, and task management.

---

## ⚠️ Disclaimer

> **This is an educational pet project.**
> - The codebase and architecture are for learning and demo purposes only.
> - If you want to use this system in a real environment, you must refactor and significantly improve it, especially regarding security, error handling, and database design.
> - The backend is assumed to run locally (see API URLs in code), and uses simple authentication and storage mechanisms.

---

## Features

- **User Authentication** (integrated with Firebase)
- **Project Management**
  - Create, edit, and delete projects
  - Invite users to projects (owner/member model)
- **Kanban-style Boards**
  - Each project has columns (statuses) and tasks (cards)
  - Add, edit, move, and delete columns and tasks
- **Task Assignment & Collaboration**
  - Assign tasks to users, track status and completion
  - See overdue, completed, and active tasks
- **User Dashboard ("My Cabinet")**
  - Visualize activity, completed tasks, and participation across projects
- **Project Analytics**
  - Project details with metrics, charts, and member statistics
- **Search & Filter**
  - Search tasks within projects
  - Filter tasks by status, assignee, and due date
- **Responsive UI**
  - Built with Tailwind CSS and React, mobile-friendly layout

---

## Tech Stack

- **Frontend:** Next.js (App Router, TypeScript, React)
- **State Management:** React state/hooks
- **Styling:** Tailwind CSS, custom components
- **Authentication:** Firebase Auth
- **API Integration:** Fetches data from a local backend (REST API, see code)
- **Charting:** Chart.js (for analytics and metrics)

---

## Getting Started

### Prerequisites

- Node.js (18+ recommended)
- Backend API running locally at `http://localhost:8000` (see API endpoints in the code)
- Firebase project for authentication (configure `.env` with your Firebase keys)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Sagynbekov/todo-frontend-jira.git
   cd todo-frontend-jira
   ```

2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in your Firebase credentials.

4. Start the development server:
   ```sh
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

- `src/app/home/` – Main dashboard and project list
- `src/app/project-details/[id]/` – Project analytics, metrics, and team management
- `src/app/myCabinet/` – User dashboard and stats
- `src/components/` – React UI components (Kanban board, modals, charts, etc.)

---

## Example Usage

- **Login/Signup** (Firebase Auth)
- **Create a new project** from the dashboard
- **Add columns** (statuses) and **tasks** (cards) to your project board
- **Invite users** to collaborate on a project
- **Assign tasks** and track progress
- **View project analytics**, overdue tasks, and member contributions

---

## Screenshots

_Add screenshots of the dashboard, project board, and analytics views here._

---

## Future Improvements

- Real-time collaboration (WebSockets)
- Better error handling and notifications
- Improved access control and permissions
- Move from local mock API to a production-ready backend with a real database
- Unit and integration testing
- Enhanced UI/UX

---

## License

MIT License

---

**Author:** Sagynbekov

_This project is for educational and demonstration purposes only. For production use, please refactor the code, implement a secure backend, and follow best practices for authentication, authorization, and data storage._
