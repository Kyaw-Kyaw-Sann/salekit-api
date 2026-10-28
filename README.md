# SaleKit API

SaleKit React frontend အတွက် တည်ဆောက်ထားသော Express + TypeScript REST API ဖြစ်ပါတယ်။ Email OTP authentication၊ HttpOnly cookie JWT၊ user-specific product CRUD နှင့် အခြေခံ admin access ပါဝင်ပါတယ်။

## Features

- Signup နှင့် email OTP verification
- Login/logout နှင့် HttpOnly JWT cookie
- Forgot/reset password with email OTP
- Authenticated user profile (`/api/auth/me`)
- Ownership-aware product CRUD
- `user` / `admin` role-based access
- Admin users list နှင့် summary stats
- Authentication endpoint rate limiting

## Requirements

- Node.js
- MySQL
- Gmail account with an App Password (OTP email ပို့ရန်)

## Setup

```bash
git clone <repository-url>
cd salekit-api
npm install
```

`.env.example` ကို `.env` အဖြစ် copy လုပ်ပြီး မိမိ configuration ဖြည့်ပါ။

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=salekit_db

JWT_SECRET=your_long_random_jwt_secret
OTP_SECRET=your_separate_long_random_otp_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_google_app_password
SMTP_FROM=your_email@gmail.com
```

Real secrets ပါသော `.env` ကို Git ထဲ commit မလုပ်ပါနှင့်။ `JWT_SECRET` နှင့် `OTP_SECRET` ကို မတူညီသော strong random values သုံးပါ။

## Database

MySQL မှာ database နှင့် tables ကို အောက်ပါအစဉ်အတိုင်း ဖန်တီးပါ။

```sql
CREATE DATABASE salekit_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE salekit_db;

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  verification_otp_hash CHAR(64) NULL,
  verification_otp_expires_at DATETIME NULL,
  reset_otp_hash CHAR(64) NULL,
  reset_otp_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY,
  user_id CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) UNSIGNED NOT NULL,
  category VARCHAR(50) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_products_user_id (user_id),
  CONSTRAINT fk_products_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;
```

Signup လုပ်ထားပြီး email verify ဖြစ်သော test user ကို admin ပြောင်းလိုပါက email ကို ပြင်ပြီး run ပါ။

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'user@example.com'
  AND is_verified = TRUE;
```

## Run

Development server:

```bash
npm run dev
```

TypeScript build နှင့် production start:

```bash
npm run build
npm start
```

Health check:

```text
GET http://localhost:3000/api/health
```

## API routes

### Authentication

```text
POST /api/auth/signup
POST /api/auth/verify-email
POST /api/auth/resend-verification-otp
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Products (login required)

```text
GET    /api/products
GET    /api/products/:productId
POST   /api/products
PUT    /api/products/:productId
DELETE /api/products/:productId
```

Product ownership ကို server က authenticated user ဖြင့် သတ်မှတ်သောကြောင့် request body ထဲ `user_id` မပို့ရပါ။

### Admin (admin role required)

```text
GET /api/admin/users
GET /api/admin/stats
```

## Authentication note

Login အောင်မြင်လျှင် JWT ကို `access_token` HttpOnly cookie အဖြစ် server က ပို့ပါတယ်။ Browser frontend မှ authenticated requests ခေါ်ရာတွင် `credentials: "include"` သုံးရပါမယ်။ Frontend JavaScript သို့မဟုတ် localStorage ထဲ JWT ကို မသိမ်းပါနှင့်။

## Main scripts

```text
npm run dev    Start development server with watch mode
npm run build  Compile TypeScript into dist
npm start      Run the compiled server
```
