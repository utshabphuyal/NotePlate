# 📚 NotePlate

> A platform where students borrow, lend, and donate books — completely free.

---

## 🗂 Project Structure

```
NotePlate/
├── backend/                    # Django REST + Channels
│   ├── NotePlate_project/     # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── asgi.py             # WebSocket entry point
│   ├── apps/
│   │   ├── users/              # Auth, profiles, ratings, reports
│   │   ├── books/              # Listings, search, map, QR codes
│   │   ├── chat/               # Real-time chat (WebSocket)
│   │   ├── borrowing/          # Borrow lifecycle management
│   │   ├── notifications/      # In-app + WebSocket notifications
│   │   ├── library/            # Library accounts & reservations
│   │   └── admin_panel/        # Admin analytics & moderation
│   ├── utils/                  # Permissions, pagination, middleware
│   └── requirements.txt
├── frontend/                   # React 18 app
│   └── src/
│       ├── components/         # Shared UI components
│       ├── pages/              # Route-level pages
│       ├── services/           # API + WebSocket clients
│       ├── context/            # Zustand global store
│       └── styles/             # Design system tokens
├── docker/                     # Docker configs
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start — Docker (Recommended)

### Prerequisites
- Docker 24+ and Docker Compose v2

```bash
# 1. Clone and enter the project
git clone https://github.com/yourorg/NotePlate.git
cd NotePlate

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 3. Start all services
docker compose up --build

# 4. The app is now running:
#    Frontend  → http://localhost:3000
#    Backend   → http://localhost:8000
#    API Docs  → http://localhost:8000/api/docs/
```

---

## 🛠 Local Development Setup

### Backend (Django)

**Prerequisites:** Python 3.11+, MongoDB 7, Redis 7

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate     # Linux/Mac
venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp ../.env.example .env
# Edit .env with your local config

# Create logs directory
mkdir -p logs

# Run migrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Start development server (with WebSocket support)
daphne -b 0.0.0.0 -p 8000 NotePlate_project.asgi:application

# OR use Django dev server (no WebSocket support)
python manage.py runserver

# Start Celery worker (in separate terminal)
celery -A NotePlate_project worker -l info

# Start Celery beat scheduler (in separate terminal)
celery -A NotePlate_project beat -l info
```

### Frontend (React)

**Prerequisites:** Node 20+

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp ../.env.example .env.local
# Set REACT_APP_API_URL=http://localhost:8000/api/v1
# Set REACT_APP_WS_URL=ws://localhost:8000

# Start development server
npm start

# App runs at http://localhost:3000
```

---

## 🌐 API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/` | Create account |
| POST | `/api/v1/auth/login/` | Login → JWT tokens |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| POST | `/api/v1/auth/logout/` | Blacklist refresh token |
| POST | `/api/v1/auth/verify-email/` | Verify email with token |
| POST | `/api/v1/auth/forgot-password/` | Send reset email |
| POST | `/api/v1/auth/reset-password/` | Reset with token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/v1/users/me/` | My profile |
| POST | `/api/v1/users/upload_avatar/` | Upload avatar |
| GET | `/api/v1/users/{id}/` | Public profile |
| POST | `/api/v1/users/{id}/rate/` | Rate a user |
| POST | `/api/v1/users/{id}/block/` | Block/unblock |
| POST | `/api/v1/users/{id}/report/` | Report a user |

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/books/` | List with search + filters |
| POST | `/api/v1/books/` | Create listing |
| GET | `/api/v1/books/{id}/` | Book details |
| PATCH | `/api/v1/books/{id}/` | Update listing |
| DELETE | `/api/v1/books/{id}/` | Delete listing |
| GET | `/api/v1/books/nearby/` | Geo-search books |
| GET | `/api/v1/books/map_data/` | Optimized map markers |
| GET | `/api/v1/books/recommended/` | Personalized feed |
| POST | `/api/v1/books/{id}/save_book/` | Save/unsave |
| GET | `/api/v1/books/saved/` | My saved books |
| GET | `/api/v1/books/{id}/qr_code/` | Get QR code |

### Borrowing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/borrowing/` | My borrow requests |
| POST | `/api/v1/borrowing/` | Create request |
| POST | `/api/v1/borrowing/{id}/accept/` | Lender accepts |
| POST | `/api/v1/borrowing/{id}/reject/` | Lender rejects |
| POST | `/api/v1/borrowing/{id}/confirm_handover/` | Borrower confirms pickup |
| POST | `/api/v1/borrowing/{id}/confirm_return/` | Lender confirms return |
| POST | `/api/v1/borrowing/{id}/cancel/` | Cancel pending request |
| POST | `/api/v1/borrowing/{id}/request_extension/` | Request more time |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/chat/rooms/` | My chat rooms |
| POST | `/api/v1/chat/rooms/start/` | Start/get a chat |
| GET | `/api/v1/chat/rooms/{id}/messages/` | Room messages |

### WebSocket Endpoints
| URL | Description |
|-----|-------------|
| `ws://host/ws/chat/{room_id}/?token=JWT` | Real-time chat |
| `ws://host/ws/notifications/?token=JWT` | Real-time notifications |

---

## 🗃 MongoDB Schema Overview

### Users Collection
```json
{
  "_id": "UUID",
  "email": "string (unique)",
  "username": "string (unique)",
  "full_name": "string",
  "role": "student | library | admin",
  "avatar": "string (path)",
  "bio": "string",
  "school_college": "string",
  "latitude": "float",
  "longitude": "float",
  "city": "string",
  "interests": ["string"],
  "subjects": ["string"],
  "reputation_score": "integer",
  "average_rating": "float",
  "total_lent": "integer",
  "total_borrowed": "integer",
  "is_banned": "boolean",
  "email_verified": "boolean"
}
```

### Books Collection
```json
{
  "_id": "UUID",
  "owner_id": "UUID",
  "title": "string",
  "author": "string",
  "isbn": "string",
  "subject": "string",
  "material_type": "book | notes | pdf | textbook | other",
  "availability_type": "borrow | donate | exchange",
  "condition": "new | like_new | good | fair | poor",
  "status": "active | borrowed | reserved | donated | removed",
  "latitude": "float",
  "longitude": "float",
  "city": "string",
  "max_borrow_days": "integer",
  "tags": ["string"],
  "view_count": "integer"
}
```

### BorrowRequests Collection
```json
{
  "_id": "UUID",
  "book_id": "UUID",
  "borrower_id": "UUID",
  "lender_id": "UUID",
  "status": "pending | accepted | rejected | active | returned | overdue | cancelled",
  "requested_at": "datetime",
  "due_date": "date",
  "handover_code": "string",
  "return_code": "string",
  "is_overdue": "boolean"
}
```

### Messages Collection
```json
{
  "_id": "UUID",
  "room_id": "UUID",
  "sender_id": "UUID",
  "content": "string",
  "message_type": "text | image | file | system",
  "status": "sent | delivered | read",
  "is_read": "boolean",
  "created_at": "datetime"
}
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Django secret key (50+ chars) |
| `DEBUG` | ✅ | `True` for dev, `False` for prod |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `MONGO_DB_NAME` | ✅ | Database name |
| `REDIS_URL` | ✅ | Redis connection string |
| `EMAIL_HOST_USER` | ⚡ | Gmail/SMTP username |
| `EMAIL_HOST_PASSWORD` | ⚡ | Gmail app password |
| `GOOGLE_MAPS_API_KEY` | ⚡ | For directions integration |
| `MAPBOX_ACCESS_TOKEN` | ⚡ | Alternative to Google Maps |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                       │
│          Reverse proxy + static file serving            │
└───────────┬─────────────────────────┬───────────────────┘
            │                         │
    ┌───────▼───────┐         ┌───────▼───────┐
    │  React App    │         │  Django ASGI  │
    │  (Port 3000)  │         │  (Port 8000)  │
    └───────────────┘         └───┬───────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
             ┌──────▼──┐  ┌──────▼──┐   ┌───────▼──┐
             │ MongoDB │  │  Redis  │   │  Celery  │
             │  (Data) │  │(Cache/  │   │ (Tasks)  │
             │         │  │ Broker/ │   │          │
             └─────────┘  │Channels)│   └──────────┘
                          └─────────┘
```

---

## ✨ Features Implemented

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ |
| Email Verification | ✅ |
| Password Reset | ✅ |
| User Roles (Student/Library/Admin) | ✅ |
| User Profiles + Avatars | ✅ |
| Reputation Score System | ✅ |
| Book Listings (CRUD) | ✅ |
| Image Upload (multi-image) | ✅ |
| Tag System | ✅ |
| Full-text Search + Filters | ✅ |
| Map-based Discovery | ✅ |
| Geo-radius Search | ✅ |
| AI Recommendation Engine | ✅ |
| Real-time Chat (WebSocket) | ✅ |
| Message Status (sent/delivered/read) | ✅ |
| Typing Indicators | ✅ |
| Rate Limiting on Chat | ✅ |
| Borrow Request Flow | ✅ |
| Handover Code Verification | ✅ |
| Return Code Verification | ✅ |
| Borrow Extension System | ✅ |
| Overdue Tracking | ✅ |
| In-app Notifications (WebSocket) | ✅ |
| Block Users | ✅ |
| Report Users + Books | ✅ |
| Admin Dashboard + Analytics | ✅ |
| Admin User Management | ✅ |
| QR Code Generation | ✅ |
| Save/Bookmark Books | ✅ |
| Library Integration | ✅ |
| Library Reservations | ✅ |
| Dark/Light Mode | ✅ |
| Mobile Responsive UI | ✅ |
| Docker Deployment | ✅ |
| API Documentation (Swagger) | ✅ |

---

## 📱 Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing homepage |
| Login | `/login` | Sign in |
| Register | `/register` | Create account |
| Verify Email | `/verify-email` | Email confirmation |
| Dashboard | `/dashboard` | Personal feed + stats |
| Map | `/map` | Interactive book discovery map |
| Browse Books | `/books` | Search + filter listings |
| Book Detail | `/books/:id` | Full listing + borrow action |
| Create Listing | `/books/new` | Add a book |
| Chat | `/chat/:roomId` | Real-time messaging |
| Profile | `/profile` | User profile |
| Borrowings | `/borrowings` | Manage borrow lifecycle |
| Saved Books | `/saved` | Bookmarked listings |
| Library | `/library` | Browse library inventory |
| Admin Dashboard | `/admin` | Analytics |
| Admin Users | `/admin/users` | User management |
| Admin Reports | `/admin/reports` | Moderation queue |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest --cov=apps --cov-report=html

# Frontend tests
cd frontend
npm test
```

---

## 📦 Production Deployment Checklist

- [ ] Set `DEBUG=False`
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure real MongoDB Atlas or self-hosted MongoDB with auth
- [ ] Set up Redis with password
- [ ] Configure real SMTP email service
- [ ] Set `ALLOWED_HOSTS` to your domain
- [ ] Configure SSL/TLS in nginx
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain
- [ ] Use environment secrets (not `.env` files) in production
- [ ] Set up MongoDB backups
- [ ] Configure log aggregation
- [ ] Set up monitoring (Sentry, Datadog, etc.)

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
