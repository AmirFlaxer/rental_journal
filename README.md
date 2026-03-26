# Rental Journal - Property Rental Management System

A comprehensive SaaS application for managing rental properties, tenants, leases, expenses, and financial reports.

## Overview

This is a Next.js-based web application built for property managers and landlords to efficiently manage multiple rental properties. The system includes:

- **Property Management**: Store and manage detailed information about your rental properties
- **Tenant Management**: Keep track of tenant information, contact details, and documentation
- **Lease Management**: Create and manage lease agreements with automatic reminders
- **Payment Tracking**: Monitor rent payments, deposits, and other financial transactions
- **Expense Management**: Track maintenance costs, insurance, taxes, and other expenses
- **Financial Reporting**: Generate profit/loss and cash flow reports
- **Task Management**: Set reminders for lease renewals, insurance, and maintenance
- **Multi-User Support**: Each user manages their own properties in a secure environment

## Tech Stack

- **Frontend**: Next.js 15+ with React & TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Forms**: React Hook Form
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or use Prisma Cloud for hosted Postgres)

## Installation

1. **Navigate to project directory**
   ```bash
   cd c:\Projects\new_project
   ```

2. **Install dependencies** (already done)
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env.local
   ```

   Update `.env.local` with your database connection and NextAuth secret:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/rental_management"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-random-secret-at-least-32-chars"
   ```

   To generate a secret on Windows:
   ```bash
   # Using npm package
   npm install -g uuid && node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **Create database and run migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Quick Start

1. **Home Page**: Visit localhost:3000 and choose to Sign In or Sign Up
2. **Create Account**: Sign up with your email and password
3. **Dashboard**: You'll be automatically logged in and redirected to your dashboard
4. **Add Property**: Click "Add Property" to start managing your rental properties
5. **Manage**: Add tenants, create leases, track payments and expenses

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   └── properties/   # Property management endpoints
│   ├── auth/             # Sign in and Sign up pages
│   ├── dashboard/        # Protected dashboard pages
│   ├── page.tsx          # Home/landing page
│   └── layout.tsx        # Root layout with SessionProvider
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   └── validations.ts    # Zod schemas for all models
├── auth.ts               # NextAuth.js configuration
└── components/           # Reusable React components (to be created)
prisma/
├── schema.prisma         # Database schema (post, comment, user models)
└── migrations/           # Database migrations
```

## Database Schema

### Tables Created:

1. **users**: User accounts with authentication
2. **properties**: Rental property information
3. **tenants**: Tenant/renter information
4. **leases**: Lease agreements
5. **payments**: Payment records (rent, deposits)
6. **expenses**: Property expenses (maintenance, insurance, etc.)
7. **tasks**: Reminders and task management

## API Endpoints (Implemented)

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/[...nextauth]` - NextAuth endpoints
- `GET /api/auth/signin` - Sign in page (form)
- `GET /api/auth/signout` - Sign out

### Properties
- `GET /api/properties` - Get all user's properties
- `POST /api/properties` - Create new property
- `GET /api/properties/[id]` - Get property details (to implement)
- `PATCH /api/properties/[id]` - Update property (to implement)
- `DELETE /api/properties/[id]` - Delete property (to implement)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Prisma Studio (Database GUI)
npx prisma studio

# Generate Prisma types after schema changes
npx prisma generate

# View database migrations
npx prisma migration show
```

## Testing the Application

1. **Home Page**: http://localhost:3000 (shows welcome page with Sign In/Up options)
2. **Create Account**: 
   - Click "Sign Up"
   - Enter name, email, password
   - Submit form
3. **Sign In**:
   - Use the credentials you just created
   - Click "Sign In"
4. **Dashboard**:
   - See overview stats
   - View your properties (initially empty)
   - Click "Add Property" to create your first property

## Database Setup Options

### Option 1: Prisma Cloud (Recommended for Quick Start)
```bash
npx create-db
# Follow the prompts to create a hosted PostgreSQL database
```

### Option 2: Local PostgreSQL

**Windows with PostgreSQL Installer:**
1. Download from https://www.postgresql.org/download/windows/
2. Install PostgreSQL (default port 5432)
3. Create database:
   ```bash
   createdb rental_management
   ```
4. Update DATABASE_URL in .env.local:
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/rental_management"
   ```

**Windows with PostgreSQL via Chocolatey:**
```bash
choco install postgresql
```

**Using Docker (all platforms):**
```bash
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
# Then use: postgresql://postgres:password@localhost:5432/rental_management
```

### Option 3: Other Cloud Databases
- Railway - `railway link`
- Vercel Postgres (during deployment)
- AWS RDS
- Azure Database for PostgreSQL

## Troubleshooting

### Issue: Port 3000 already in use
**Windows (PowerShell):**
```bash
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Windows (Command Prompt):**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Database connection fails
```bash
# Test connection
npx prisma db push

# View logs
npx prisma generate --release
```

### Issue: Authentication not working
- Clear browser cookies (Ctrl+Shift+Delete)
- Check NEXTAUTH_SECRET is set (min 32 chars)
- Check NEXTAUTH_URL matches your environment
- Ensure .env.local file exists in root directory

### Issue: Prisma schema issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually:
npx prisma db push --force-rewrite
```

## Features to Implement Next

- [ ] Complete property CRUD operations
- [ ] Tenant management interface
- [ ] Lease creation and renewal tracking
- [ ] Payment tracking and reminders
- [ ] Expense categorization and reporting
- [ ] Financial dashboard with charts
- [ ] Document upload functionality
- [ ] Email notifications
- [ ] Export reports (PDF/Excel)
- [ ] Admin panel
- [ ] Dark mode support
- [ ] Mobile optimization

## Security Notes

- ✅ Passwords are hashed with bcrypt
- ✅ Authentication uses NextAuth.js with JWT
- ✅ API routes check user authentication
- ✅ Each user can only see their own data
- ✅ Environment variables store sensitive data
- ⚠️ Production: Always use HTTPS
- ⚠️ Production: Set strong NEXTAUTH_SECRET
- ⚠️ Production: Configure NEXTAUTH_URL correctly

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables:
   - `DATABASE_URL` (e.g., Vercel Postgres endpoint)
   - `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your deployed URL)
4. Click Deploy

### Deploy to Other Platforms

**Railway:**
```bash
npm install -g railway
railway link
railway up
```

**Docker:**
```bash
docker build -t rental-manager .
docker run -p 3000:3000 -e DATABASE_URL=... rental-manager
```

## Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)

## License

MIT - Feel free to use for your project

## Support

For issues or questions:
1. Check troubleshooting section
2. Review Next.js documentation
3. Check Prisma documentation
4. Create an issue in your repository

