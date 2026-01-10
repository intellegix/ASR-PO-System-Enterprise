# Master Plan - Task Management API

> Last Updated: 2024-01-15 14:30:00
> Current Phase: Phase 2 - Core API Development
> Status: Active

## 1. Project Overview
- **Purpose**: RESTful API for task management with user authentication, project organization, and real-time collaboration
- **Goals**: Create scalable backend service supporting web and mobile clients with sub-200ms response times
- **Target Users**: Development teams, project managers, and individual users managing personal/team tasks
- **Success Criteria**:
  - Handle 1000+ concurrent users
  - 99.9% uptime
  - Complete CRUD operations for tasks, projects, and users
  - Real-time updates via WebSocket connections

## 2. Architecture & Systems

### 2.1 System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     API Gateway           │
                    │  (Rate Limiting & Auth)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │     FastAPI Backend       │
                    │   (Business Logic)        │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
    ┌─────┴─────┐         ┌─────┴─────┐         ┌─────┴─────┐
    │PostgreSQL │         │   Redis   │         │WebSocket  │
    │(Main Data)│         │  (Cache)  │         │ Service   │
    └───────────┘         └───────────┘         └───────────┘
```

**Core Components:**
- **API Gateway**: Authentication, rate limiting, request routing
- **FastAPI Backend**: Business logic, data validation, API endpoints
- **PostgreSQL**: Primary data storage for users, projects, tasks
- **Redis**: Session management, caching, pub/sub for real-time features
- **WebSocket Service**: Real-time task updates and collaboration

**Data Flow:**
- Client requests → API Gateway (auth check) → FastAPI (business logic) → Database
- Real-time updates: Database changes → Redis pub/sub → WebSocket → Clients

### 2.2 Technology Stack
**Languages & Frameworks:**
- Primary: Python 3.11 with FastAPI
- Database: PostgreSQL 15 with SQLAlchemy ORM
- Caching: Redis 7.0

**External Services & APIs:**
- SendGrid: Email notifications for task assignments
- Pusher: Backup real-time service for WebSocket failover
- AWS S3: File attachments storage

**Development Tools:**
- pytest: Unit and integration testing
- Alembic: Database migrations
- Docker: Containerization and local development
- GitHub Actions: CI/CD pipeline

### 2.3 Directory Structure
```
project_root/
├── app/                        # Main application code
│   ├── api/                    # API route handlers
│   │   ├── v1/                 # API version 1
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── projects.py     # Project CRUD operations
│   │   │   └── tasks.py        # Task CRUD operations
│   │   └── dependencies.py     # Shared dependencies
│   ├── core/                   # Core configuration and utilities
│   │   ├── config.py           # Application settings
│   │   ├── database.py         # Database connection
│   │   └── security.py         # Authentication utilities
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py             # User data model
│   │   ├── project.py          # Project data model
│   │   └── task.py             # Task data model
│   └── services/               # Business logic services
│       ├── auth_service.py     # Authentication business logic
│       ├── project_service.py  # Project management logic
│       └── task_service.py     # Task management logic
├── tests/                      # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── conftest.py             # Test configuration
├── migrations/                 # Database migration files
├── docker/                     # Docker configuration
└── docs/                       # API documentation
```

**Key Conventions:**
- File naming: snake_case for Python files, kebab-case for config files
- Module organization: Separation of concerns (API routes, business logic, data models)

## 3. Features & Functionality

### 3.1 Implemented ✅
- **User Registration & Login**: JWT-based authentication with password hashing - 2024-01-10
- **Basic CRUD for Tasks**: Create, read, update, delete tasks with validation - 2024-01-12
- **Database Setup**: PostgreSQL with SQLAlchemy models and migrations - 2024-01-08

### 3.2 In Progress 🔄
- **Project Management**: Create/organize tasks into projects - 75% complete - Need UI integration
- **User Roles & Permissions**: Role-based access control for team features - 40% complete - Backend models done, API endpoints remaining

### 3.3 Planned 📋
- **Real-time Updates**: WebSocket integration for live task updates - High Priority - Depends on Redis setup
- **File Attachments**: Upload/download files for tasks - Medium Priority - Requires AWS S3 integration
- **Email Notifications**: Notify users of task assignments and updates - Medium Priority - SendGrid integration needed
- **Search & Filtering**: Advanced search across tasks and projects - Low Priority - Elasticsearch consideration
- **API Rate Limiting**: Prevent abuse and ensure fair usage - High Priority - No dependencies
- **Admin Dashboard**: Administrative interface for user/project management - Low Priority - Depends on user roles

## 4. Systems & Logic

### 4.1 Core Business Logic
- **Authentication System**: JWT tokens with refresh mechanism, 24-hour access token expiry
- **Task Management**: Tasks belong to projects, support status tracking (todo/in-progress/done), priority levels
- **Permission System**: Project owners can invite members, members can create/edit tasks, viewers have read-only access
- **Notification System**: Event-driven notifications for task assignments, status changes, due dates

### 4.2 Data Models
```
User:
  - id: UUID (primary key)
  - email: string (unique) - User login identifier
  - username: string (unique) - Display name
  - password_hash: string - Bcrypt hashed password
  - created_at: timestamp
  - is_active: boolean - Account status

Project:
  - id: UUID (primary key)
  - name: string - Project display name
  - description: text - Project details
  - owner_id: UUID - Foreign key to User
  - created_at: timestamp
  - updated_at: timestamp

Task:
  - id: UUID (primary key)
  - title: string - Task name
  - description: text - Task details
  - status: enum (todo, in_progress, done)
  - priority: enum (low, medium, high, urgent)
  - project_id: UUID - Foreign key to Project
  - assignee_id: UUID - Foreign key to User (optional)
  - due_date: timestamp (optional)
  - created_at: timestamp
  - updated_at: timestamp

ProjectMembership:
  - project_id: UUID - Foreign key to Project
  - user_id: UUID - Foreign key to User
  - role: enum (owner, member, viewer)
  - joined_at: timestamp
```

### 4.3 Integration Points
- **SendGrid Email API**: Task notification emails, weekly digest emails - Planned
- **Redis Pub/Sub**: Real-time task updates across connected clients - In Progress
- **AWS S3**: File attachment storage with presigned URLs for security - Planned

## 5. Activity Log

### Recent Sessions
| Date | Work Completed | Files Changed | Notes |
|------|----------------|---------------|-------|
| 2024-01-15 | Added user roles and project membership models | models/project.py, models/user.py, alembic migration | Implemented role-based permissions foundation |
| 2024-01-14 | Created project CRUD API endpoints | api/v1/projects.py, services/project_service.py | Basic project operations working |
| 2024-01-12 | Implemented task management API | api/v1/tasks.py, models/task.py, services/task_service.py | Full CRUD with validation and filtering |
| 2024-01-10 | Set up JWT authentication system | api/v1/auth.py, core/security.py, models/user.py | Registration, login, token refresh working |
| 2024-01-08 | Initial project setup and database config | core/database.py, core/config.py, Docker setup | PostgreSQL connection and basic structure |

### Decisions Made
- **2024-01-15**: Chose role-based permissions over ACL - Simpler implementation, easier to understand for users
- **2024-01-12**: Used SQLAlchemy ORM instead of raw SQL - Better maintainability and type safety with Pydantic integration
- **2024-01-10**: JWT tokens over session cookies - Better for mobile app integration and stateless scaling
- **2024-01-08**: PostgreSQL over MongoDB - ACID compliance needed for task dependencies and user management

## 6. Project Phases & Milestones

### Phase 1: Foundation - Complete ✅
**Goal**: Basic project structure and core authentication
- [x] Project setup with FastAPI and PostgreSQL - 2024-01-08
- [x] User registration and authentication - 2024-01-10
- [x] Basic task CRUD operations - 2024-01-12
- [x] Database models and migrations - 2024-01-12

### Phase 2: Core API Development - In Progress 🔄
**Goal**: Complete task and project management functionality
- [x] Project creation and management - 2024-01-14
- [x] User roles and permissions model - 2024-01-15
- [ ] Role-based API access control - 60% complete
- [ ] Task assignment and project membership - Pending API endpoints
- [ ] Input validation and error handling - Partial implementation

### Phase 3: Real-time Features - Not Started 📋
**Goal**: Live collaboration and notifications
- [ ] WebSocket integration for real-time updates
- [ ] Redis pub/sub system
- [ ] Email notification system
- [ ] Push notifications for mobile

### Phase 4: Advanced Features - Not Started 📋
**Goal**: Enhanced user experience and administration
- [ ] File attachment system
- [ ] Advanced search and filtering
- [ ] API rate limiting and monitoring
- [ ] Admin dashboard and user management
- [ ] Performance optimization and caching

## 7. Technical Debt & Known Issues

### High Priority 🔴
- [ ] **Missing API Input Validation**: Some endpoints lack comprehensive Pydantic validation - Users can send invalid data - 4 hours
- [ ] **No Rate Limiting**: APIs vulnerable to abuse and DoS attacks - Security risk - 6 hours
- [ ] **Incomplete Error Handling**: Inconsistent error responses across endpoints - Poor developer experience - 3 hours

### Medium Priority 🟡
- [ ] **Missing Integration Tests**: Only unit tests exist, no end-to-end testing - Deployment confidence issues - 8 hours
- [ ] **Hardcoded Configuration**: Some config values not externalized to environment variables - Deployment flexibility - 2 hours
- [ ] **Database Connection Pooling**: Using default connection settings - Performance issues under load - 3 hours

### Low Priority 🟢
- [ ] **API Documentation**: Auto-generated docs need examples and better descriptions - Developer onboarding - 4 hours
- [ ] **Logging Strategy**: Inconsistent logging levels and formats - Debugging difficulties - 2 hours

## 8. Next Actions Queue

**Priority-ordered list of next steps:**

### Immediate (This Session)
1. **Complete role-based API access control** - Finish API endpoints for project membership management
2. **Add comprehensive input validation** - Use Pydantic models for all API endpoints to prevent invalid data

### Short-term (Next 1-3 sessions)
3. **Implement API rate limiting** - Add Redis-based rate limiting to prevent abuse
4. **Create integration test suite** - End-to-end tests for critical user flows
5. **Set up Redis for caching and real-time features** - Foundation for WebSocket implementation

### Medium-term (Future phases)
6. **WebSocket real-time updates** - Live task updates for collaboration
7. **Email notification system** - SendGrid integration for task assignments
8. **File attachment functionality** - AWS S3 integration for task files