# 📦 SquadLab - Stock & Project Management Platform

![SquadLab Banner](https://via.placeholder.com/1200x300/1e40af/ffffff?text=SquadLab+-+University+Stock+Management)

**SquadLab** is a full-stack, role-based web application designed to manage electronic component inventory, student projects, and equipment discharge sheets across university laboratories. 

It was built to handle complex workflows like component reservations, dynamic stock tracking, cross-lab borrowing, and multi-tier project approvals (Admin → Supervisor → Student).

---

## ✨ Key Features

### 🏢 Cross-Laboratory Support
- Manages multiple distinct laboratories (e.g., LAB1, LAB3).
- Strict separation of inventory and projects by default.
- "Cross-Lab View" allows admins to safely borrow/transfer components between labs without corrupting local stock.

### 👥 Role-Based Dashboards & Access
- **Administrateur (LAB_ADMIN):** Full control over the lab's stock, user approvals, project finalization, and global statistics.
- **Encadrant (SUPERVISOR):** Proposes projects, assigns students (Chef de Groupe & Members), and requests specific components for their projects.
- **Étudiant (STUDENT):** Read-only dashboard restricted purely to their assigned project, showing only their approved discharge sheets and component statuses.

### 🔄 Advanced Project Workflow
1. **Creation:** Supervisor proposes a project and requests components.
2. **Reservation:** Stock is instantly reserved but not physically removed.
3. **Approval:** Admin prints the official "Fiche de Décharge" (Discharge Sheet) and hands the components to the student.
4. **Execution (EN COURS):** Project runs. If components break, students can request "Refresh Sheets" to get replacements without altering the original sheet.
5. **Closure (EXPOSÉ):** Admin logs the final state of each component (Returned, Damaged, or Lost), updating global stock perfectly and locking the project permanently.

### 🛡️ Secure Atomic Transactions
- The backend relies heavily on **Prisma `$transaction` blocks**.
- Guarantees that stock increments/decrements and project status changes either succeed completely or fail safely, preventing database corruption during concurrent operations.

---

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- Tailwind CSS (Custom color systems and modern UI/UX)
- React Router DOM
- Context API (Auth & Lab contexts)
- Lucide React (Icons)

**Backend:**
- Node.js & Express.js
- Prisma ORM
- SQLite (Configured for easy local setup, easily swappable to PostgreSQL)
- JWT (JSON Web Tokens) for secure API authentication

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- NPM or Yarn

### 1. Database & Backend Setup
Navigate to the server directory:
```bash
cd squadlab/server
```

Install dependencies:
```bash
npm install
```

Set up your `.env` file based on `.env.example`, then push the schema to the database:
```bash
npx prisma db push
npx prisma db seed
```
*(The seed script automatically creates Admin, Supervisor, and Student accounts with default passwords).*

Start the backend API (runs on port 3001 by default):
```bash
npm run dev
```

### 2. Frontend Setup
Open a new terminal window and navigate to the client directory:
```bash
cd squadlab/client
```

Install dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

### 3. Usage
- Access the frontend at `http://localhost:5173`.
- Choose your laboratory portal (`/lab1/login` or `/lab3/login`).
- Login with the seeded accounts to explore the different dashboards.

---

## 🔑 Default Seeded Accounts (Development)

| Role | Email | Password | Lab |
|---|---|---|---|
| **Admin** | `admin@lab1.dz` | `admin123` | LAB1 |
| **Admin** | `admin@lab3.dz` | `admin123` | LAB3 |
| **Supervisor** | `hamid.berber@lab1.dz` | `super123` | LAB1 |
| **Student** | `ali.meziane@lab1.dz` | `student123` | LAB1 |

---

*Developed for the Stock Management Hackathon 2026.*
