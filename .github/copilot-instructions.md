# AI Coding Agent Instructions for Estúdio de Unhas

## Project Overview
Full-stack appointment scheduling system for nail salons with React frontend and Node.js/Express backend. Supports both SQLite (development) and PostgreSQL (production) databases.

## Architecture
- **Backend**: Express.js with MVC structure (controllers/routes/middleware)
- **Frontend**: React with Vite, Tailwind CSS, React Router
- **Database**: Dual support - SQLite locally, PostgreSQL on Railway
- **Authentication**: JWT + Passport Google OAuth
- **Security**: Helmet, CORS, rate limiting, input sanitization

## Key Patterns & Conventions

### Database Queries
Use parameterized queries with conditional PostgreSQL/SQLite syntax:
```javascript
// In controllers
const conditions = [];
let paramIndex = 1;

if (status) {
  conditions.push(`status = ${usePG ? '$' + paramIndex++ : '?'}`);
  params.push(status);
}
```

### Authentication & Authorization
- `req.user` contains authenticated user info (id, type: 'admin'/'client')
- Admin routes check `req.user.type === 'admin'`
- Use `ProtectedRoute` component with `requireAdmin` prop in frontend

### Error Handling
- Controllers return JSON with `error` field for failures
- Frontend uses `react-hot-toast` for notifications
- Global error handler in server.js sanitizes production errors

### File Uploads
- Use `multer` middleware for file handling
- Store in `../uploads/` directory
- Serve static files via `/uploads` route

## Development Workflow

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure JWT_SECRET, EMAIL_*, etc.
npm run init-db      # Creates tables and default admin
npm run dev          # Starts with nodemon
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env  # Set VITE_API_URL
npm run dev          # Vite dev server on :3000
```

### Database Initialization
- `npm run init-db` creates all tables and default admin user
- Default admin: `admin@estudiodefrank.com` / `admin123`
- Supports both SQLite (dev) and PostgreSQL (prod via DATABASE_URL)

## Deployment
- **Backend**: Railway with PostgreSQL, auto-deploys from GitHub
- **Frontend**: Vercel/Netlify, set `VITE_API_URL` to Railway URL
- **Environment Variables**: Critical for security (JWT_SECRET, EMAIL_*, WHATSAPP_*)

## Integration Points
- **Email**: Nodemailer with Gmail SMTP or SendGrid
- **WhatsApp**: Meta Business API for automated notifications
- **Google OAuth**: Passport strategy for social login
- **Cron Jobs**: Automated reminders, recurring appointments, waitlist cleanup

## Common Tasks
- **Add new API endpoint**: Create controller method → add route in routes/ → update server.js
- **Add admin feature**: Create page in `pages/admin/`, add route in App.jsx with `requireAdmin`
- **Database migration**: Add SQL to `initDatabase.js`, handle both SQLite/PG syntax
- **Add notification**: Use `emailService.js` or `whatsappService.js`

## Code Style
- Portuguese comments and variable names
- Async/await throughout
- Consistent error responses: `{ error: "message" }`
- Frontend: Functional components with hooks, Tailwind classes

## Security Notes
- All inputs sanitized via `sanitize.js` middleware
- Rate limiting: 100 requests/15min per IP
- Passwords hashed with bcrypt
- JWT tokens for API auth
- CORS restricted to configured origins</content>
<parameter name="filePath">c:\Users\raphael johny\Desktop\estudio-unhas\.github\copilot-instructions.md