# 🎓 ShikshaBridge

**Bridging learning gaps for every student in India's classrooms.**

A production-style MERN stack application built for India's government and low-fee private school system (Classes 6–10). ShikshaBridge helps teachers run diagnostic quizzes, detect concept-wise weaknesses, and assign personalised remedial tasks using a rule-based recommendation engine.

---

## 📸 Features at a Glance

| Role      | Key Features |
|-----------|-------------|
| **Admin** | Manage schools, teachers, students · District/platform analytics · Subject & concept curriculum builder |
| **Teacher** | Create & publish quizzes · Class-wide performance view · Weak-concept heatmap · Per-student detail |
| **Student** | Attempt quizzes with timer · Instant concept-wise results · Smart task recommendations · Badges & streaks |

---

## 🏗️ Architecture

```
shiksha-bridge/
├── backend/                 # Node.js + Express API
│   ├── config/
│   │   └── db.js            # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js          # JWT verification
│   │   ├── role.js          # Role-based access
│   │   └── errorHandler.js  # Centralized error handling + asyncHandler
│   ├── models/
│   │   ├── User.js          # User (Admin/Teacher/Student) with streak & badges
│   │   ├── School.js        # School with UDISE code
│   │   ├── ClassSubjectConcept.js  # Class, Subject, Concept schemas
│   │   ├── QuizQuestion.js  # Quiz & Question schemas
│   │   └── AttemptRecommendation.js # Attempt, Recommendation, ProgressReport
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── teacherController.js
│   │   └── studentController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── teacher.js
│   │   └── student.js
│   ├── services/
│   │   └── recommendationEngine.js  # Rule-based engine
│   ├── utils/
│   │   └── pagination.js
│   └── server.js
│
├── frontend/                # React 18 SPA
│   ├── src/
│   │   ├── api/axios.js     # Axios instance + interceptors
│   │   ├── context/AuthContext.jsx
│   │   ├── components/common/
│   │   │   ├── Layout.jsx   # Sidebar + topbar
│   │   │   └── UI.jsx       # Reusable components
│   │   └── pages/
│   │       ├── admin/       # Dashboard, Schools, Users, Subjects, Analytics
│   │       ├── teacher/     # Dashboard, Quizzes, QuizBuilder, ClassView, StudentDetail
│   │       └── student/     # Dashboard, Quizzes, Attempt, Result, Progress
│   └── public/index.html
│
├── sample-data.json         # API-based data import guide (no seed.js)
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)

### 1. Clone & Install

```bash
# Install all dependencies
cd shiksha-bridge
npm run install:all
# or manually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env:
#   MONGO_URI=mongodb://localhost:27017/shiksha_bridge
#   JWT_SECRET=your_super_secret_key_min_32_chars_here
#   PORT=5000
```

### 3. Create First Admin (One-Time)

Open `mongosh` and run:

```js
use shiksha_bridge
db.users.insertOne({
  name: "Platform Admin",
  email: "admin@shiksha.edu",
  password: "$2a$12$LIxNGVe7hN1U4gHrJmVvJuOfbSTsNiGdNYlhDSTWwSoSwcWS.v1h2",
  // password = "Admin@123"
  role: "admin",
  isActive: true,
  createdAt: new Date()
})
```

### 4. Start Development Servers

```bash
# Terminal 1 – Backend (port 5000)
cd backend && npm run dev

# Terminal 2 – Frontend (port 3000)
cd frontend && npm start
```

Open **http://localhost:3000**

---

## 🔑 Demo Login Credentials

| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Admin   | admin@shiksha.edu          | Admin@123    |
| Teacher | priya.sharma@shiksha.edu   | Teacher@123  |
| Student | arjun.patil@shiksha.edu    | Student@123  |

> **See `sample-data.json`** for the complete API workflow to populate demo data.

---

## 🧠 Recommendation Engine

Located in `backend/services/recommendationEngine.js`.

**Rule-based logic (per concept, per attempt):**

| Score       | Action                   | Task Type        |
|-------------|--------------------------|------------------|
| < 40%       | Assign remedial drill    | `remedial_drill` |
| 40% – 70%   | Assign concept practice  | `concept_practice`|
| > 70%       | Move to next concept     | `next_concept`   |

**Mastery Levels:** `weak` → `developing` → `proficient` → `mastered`

---

## 🔐 Security Features

- JWT authentication with expiry
- bcrypt password hashing (12 rounds)
- Role-based access control (admin/teacher/student)
- express-mongo-sanitize (NoSQL injection prevention)
- Helmet.js (HTTP security headers)
- express-rate-limit (200 req/15 min; 20 login/15 min)
- Input validation via express-validator
- Centralized error handling (no stack traces in production)
- Request body size limit (10kb)

---

## 📡 REST API Reference

### Auth
| Method | Endpoint               | Access       |
|--------|------------------------|--------------|
| POST   | /api/auth/login        | Public       |
| POST   | /api/auth/register     | Admin only   |
| GET    | /api/auth/me           | Protected    |
| PUT    | /api/auth/profile      | Protected    |
| PUT    | /api/auth/change-password | Protected |

### Admin
| Method | Endpoint                          |
|--------|-----------------------------------|
| POST/GET | /api/admin/schools              |
| GET    | /api/admin/schools/:id/analytics  |
| GET    | /api/admin/users                  |
| PATCH  | /api/admin/users/:id/toggle-status|
| POST/GET | /api/admin/subjects             |
| POST/GET | /api/admin/concepts             |
| POST/GET | /api/admin/classes              |
| GET    | /api/admin/analytics              |

### Teacher
| Method | Endpoint                               |
|--------|----------------------------------------|
| POST/GET | /api/teacher/quizzes                 |
| PATCH  | /api/teacher/quizzes/:id/publish       |
| POST   | /api/teacher/questions/bulk            |
| GET    | /api/teacher/classes/:id/performance   |
| GET    | /api/teacher/classes/:id/weak-concepts |
| GET    | /api/teacher/students/:id/detail       |

### Student
| Method | Endpoint                         |
|--------|----------------------------------|
| GET    | /api/student/dashboard           |
| GET    | /api/student/quizzes             |
| POST   | /api/student/attempts/start      |
| POST   | /api/student/attempts/submit     |
| GET    | /api/student/recommendations     |
| GET    | /api/student/progress            |

---

## 🌐 India-First Design

- **Mobile-first** responsive UI (works on low-end Android phones)
- **Low-bandwidth** approach: minimal assets, no autoplay media
- **Multilingual-ready**: Hindi text fields on all question & concept models (`textHindi`, `nameHindi`). Language preference stored per user: `en | hi | mr | ta | te | kn | bn`
- **India-specific data**: UDISE school code, state/district/block fields, academic year 2024-25
- **Offline-friendly structure**: API-driven so a PWA wrapper + service worker can be added
- **Saffron & Green** colour palette inspired by the Indian flag

---

## 🗃️ Database Schemas

| Model          | Key Fields |
|----------------|------------|
| User           | name, email, role, school, class, streak, badges, totalPoints |
| School         | name, udiseCode, district, state, type, medium, board |
| Class          | name, grade, section, school, academicYear |
| Subject        | name, code, grade, icon, color, language |
| Concept        | name, nameHindi, subject, grade, chapter, difficulty, prerequisites |
| Quiz           | title, type, subject, concepts, questions[], duration, assignedClass |
| Question       | text, textHindi, type, options[], concept, difficulty, explanation |
| Attempt        | student, quiz, answers[], conceptScores[], percentage, status |
| Recommendation | student, concept, type, rule, message, task{}, status |
| ProgressReport | student, subject, conceptMastery[], weakConcepts, strongConcepts |

---

## 🛠️ Tech Stack

| Layer      | Technology |
| Backend    | Node.js 18+, Express 4, Mongoose 8 |
| Database   | MongoDB (local or Atlas) |
| Auth       | JWT + bcryptjs |
| Security   | Helmet, mongo-sanitize, express-rate-limit |
| Fonts      | Baloo 2, Noto Sans, Noto Sans Devanagari |

---

## 🏆 Hackathon Highlights

1. **Complete MVC backend** with service layer for the recommendation engine

## Running locally

Install dependencies for all packages:

```bash
npm run install:all
```

Start frontend and backend together (single command):

```bash
npm run dev
```

`npm run dev` uses `concurrently` to start the backend and frontend at the same time.
2. **9 MongoDB schemas** reflecting a real Indian school curriculum system
3. **Rule-based AI** engine with per-concept mastery tracking
4. **Gamification** — streaks, points, and badges to motivate students
5. **Multilingual architecture** — Hindi + regional language support built into every model
6. **Production security** — rate limiting, sanitization, helmet, role guards
7. **Zero seed files** — all data flows through protected Admin APIs
8. **India-first UX** — UDISE codes, state boards (CBSE/ICSE/State), Hindi text fields

---

## 📄 License

MIT — Built for Hackathon. Open for educational use.
