# 📚 StudyTrack - Smart Study & Task Management Web Application

StudyTrack is a full-stack web application designed to help students track subjects, syllabus topics, study sessions, and daily tasks with visual analytics and progress metrics.

---

## 🚀 Tech Stack

- **Frontend:** React 19, Vite, Chart.js, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs
- **Deployment Ready:** Vercel (Serverless API & Static Frontend)

---

## 📁 Project Structure

```
StudyTrack/
├── api/                    # Vercel Serverless Function entry point
├── backend/                # Express.js REST API
│   ├── config/             # DB & seeding configurations
│   ├── controllers/        # Route controllers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API routes
│   ├── .env.example        # Environment variables template
│   └── server.js           # Express app setup
├── StudyTrack/
│   └── frontend/           # Vite React application
│       ├── src/            # Components, pages, contexts, & assets
│       └── package.json    # Frontend dependencies
├── vercel.json             # Vercel deployment configuration
├── package.json            # Root dependencies & build script
└── README.md               # Project documentation
```

---

## ⚙️ Getting Started (Local Setup)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account or local MongoDB instance

---

### 2. Environment Configuration
Navigate to the `backend` folder and create a `.env` file:
```bash
cd backend
cp .env.example .env
```
Update `.env` with your credentials:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/studytrack?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
```

---

### 3. Install Dependencies

#### Backend:
```bash
cd backend
npm install
```

#### Frontend:
```bash
cd StudyTrack/frontend
npm install
```

---

### 4. Running the Application Locally

#### Start the Backend Server:
```bash
cd backend
npm run dev
# Server will run on http://localhost:5000
```

#### Start the Frontend Client:
In a separate terminal window:
```bash
cd StudyTrack/frontend
npm run dev
# Frontend will run on http://localhost:5173
```

---

## 🌐 Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Add the following **Environment Variables** in Vercel project settings:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random secret key
   - `NODE_ENV`: `production`
4. Click **Deploy**. Vercel will automatically build the frontend and serve backend API endpoints.

---

## 📄 License
This project is proprietary and delivered directly for client use.
