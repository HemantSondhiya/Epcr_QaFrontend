# Healthcare EPCR Frontend - API Integration Report

## Overview
This report analyzes the OpenAPI specification (v1) against the actual implementation in the React frontend to identify which endpoints are used and which are not yet integrated.

---

## Summary Statistics

✅ **Used Endpoints**: 35+  
⚠️ **Partially Used Endpoints**: 5  
❌ **Unused Endpoints**: 40+  

---

## Endpoint Integration Status

### ✅ FULLY IMPLEMENTED

#### Authentication
- ✅ `POST /api/auth/login` — User login
- ✅ `POST /api/auth/register` — User registration
- ❌ `POST /api/auth/logout` — NOT USED (token cleared client-side)

#### ePCR Records (Patient Care Records)
- ✅ `GET /api/epcr/records` — List all records (paginated)
- ✅ `POST /api/epcr/records` — Create new record
- ✅ `PUT /api/epcr/records/{id}` — Update record
- ✅ `DELETE /api/epcr/records/{id}` — Delete record
- ✅ `POST /api/epcr/records/{id}/submit` — Submit record for QA
- ✅ `GET /api/epcr/records/paramedic/{paramedicsId}` — Get records by paramedic
- ⚠️ `GET /api/epcr/records/{id}` — Get single record (not explicitly used)
- ⚠️ `GET /api/epcr/records/status/{status}` — Filter by status (not used)
- ⚠️ `GET /api/epcr/records/qa/pending` — Pending QA approval (not used)
- ⚠️ `GET /api/epcr/records/organization/{organizationId}` — Org records (not used)

#### QA Reviews
- ✅ `GET /api/qa/reviews` — List all reviews (paginated)
- ✅ `POST /api/qa/reviews` — Create review
- ✅ `PUT /api/qa/reviews/{id}/complete` — Complete review
- ✅ `GET /api/qa/reviews/pending` — Get pending reviews
- ✅ `GET /api/qa/reviews/reviewer/{reviewerId}` — Get reviewer's reviews (paginated)
- ⚠️ `GET /api/qa/reviews/{id}` — Get single review (used but not explicitly shown)
- ❌ `DELETE /api/qa/reviews/{id}` — Delete review (not used)
- ❌ `GET /api/qa/reviews/record/{patientCareRecordId}` — Get reviews by record (not used)

#### QA Forms
- ✅ `GET /api/qa/forms/organization/{organizationId}` — Get forms by org
- ✅ `POST /api/qa/forms` — Create form
- ✅ `GET /api/qa/forms/{id}` — Get single form
- ❌ `PUT /api/qa/forms/{id}` — Update form (not used)

#### Organizations
- ✅ `GET /api/organizations` — List all organizations (paginated)
- ✅ `GET /api/organizations/active` — Get active organizations
- ✅ `POST /api/organizations` — Create organization
- ✅ `PUT /api/organizations/{id}` — Update organization
- ✅ `DELETE /api/organizations/{id}` — Delete organization
- ✅ `GET /api/organizations/{id}` — Get single organization
- ❌ `GET /api/organizations/code/{code}` — Get by code (not used)

#### Workflows
- ✅ `GET /api/workflows` — List all workflows
- ✅ `GET /api/workflows/organization/{organizationId}` — Get org workflows
- ✅ `GET /api/workflows/active` — Get active workflows
- ✅ `POST /api/workflows` — Create workflow
- ✅ `PUT /api/workflows/{id}` — Update workflow
- ✅ `DELETE /api/workflows/{id}` — Delete workflow
- ⚠️ `GET /api/workflows/{id}` — Get single workflow (not explicitly used)

#### Notifications
- ✅ `GET /api/notifications/me` — Get user notifications (paginated)
- ✅ `GET /api/notifications/me/unread` — Get unread notifications
- ✅ `PUT /api/notifications/{id}/mark-as-read` — Mark as read
- ✅ `PUT /api/notifications/me/mark-all-as-read` — Mark all as read
- ❌ `GET /api/notifications` — Get all notifications (not used)
- ❌ `POST /api/notifications` — Create notification (not used)
- ❌ `GET /api/notifications/{id}` — Get single notification (not used)
- ❌ `DELETE /api/notifications/{id}` — Delete notification (used but not in consistent pattern)
- ❌ `GET /api/notifications/recipient/{recipientId}` — Get recipient notifications (not used)
- ❌ `GET /api/notifications/recipient/{recipientId}/unread` — Get recipient unread (not used)
- ❌ `PUT /api/notifications/recipient/{recipientId}/mark-all-as-read` — Mark recipient all read (not used)

#### Feedback Threads
- ✅ `GET /api/feedback/threads` — Get all threads
- ✅ `GET /api/feedback/threads/open` — Get open threads
- ✅ `GET /api/feedback/threads/user/{userId}` — Get user's threads
- ✅ `POST /api/feedback/threads` — Create thread
- ✅ `POST /api/feedback/threads/{id}/messages` — Add message
- ✅ `PUT /api/feedback/threads/{id}/status` — Update status
- ✅ `DELETE /api/feedback/threads/{id}` — Delete thread
- ❌ `GET /api/feedback/threads/{id}` — Get single thread (not used)
- ❌ `GET /api/feedback/threads/record/{patientCareRecordId}` — Get threads by record (not used)

#### Reports
- ✅ `GET /api/reports/statistics` — Dashboard statistics
- ✅ `GET /api/reports/qa-performance` — QA performance metrics
- ✅ `GET /api/reports/records-by-status` — Records by status
- ✅ `GET /api/reports/custom` — Custom report with date range
- ✅ `GET /api/reports/dashboard-metrics` — Dashboard metrics
- ❌ `GET /api/reports/query` — Query records (not used)

#### Audit Logs
- ✅ `GET /api/audit/logs` — Get audit logs (paginated)

---

### ⚠️ NOT YET IMPLEMENTED

#### Users
- ❌ `GET /api/users` — List all users (partially used in AuditLogs)
- ❌ `GET /api/users/{id}` — Get user by ID
- ❌ `POST /api/users` — Create user
- ❌ `PUT /api/users/{id}` — Update user
- ❌ `DELETE /api/users/{id}` — Delete user
- ❌ `GET /api/users/email/{email}` — Get user by email
- ❌ `GET /api/users/organization/{organizationId}` — Get org users

#### QA Auto-Flag Rules
- ❌ `GET /api/qa/rules` — Get rules by organization
- ❌ `POST /api/qa/rules` — Create rule

#### Form Engine / Templates
- ❌ `GET /api/formengine/templates` — Get templates by org & type
- ❌ `POST /api/formengine/templates` — Create template
- ❌ `GET /api/formengine/templates/latest` — Get latest template
- ❌ `POST /api/formengine/templates/{templateId}/submissions` — Submit form
- ❌ `GET /api/formengine/submissions` — Get submissions

#### Config Deployments
- ⚠️ `GET /api/workflows/deployments` — List deployments (used but path confusion with workflows)
- ⚠️ `POST /api/workflows/deployments` — Deploy config

---

## Recommendations

### High Priority (Critical Features)
1. **User Management** — Implement full CRUD for users (Create, Read, Update, Delete)
2. **Form Engine** — Integrate dynamic form templates for flexible ePCR creation
3. **QA Auto-Flag Rules** — Implement automatic flagging rules for quality assurance

### Medium Priority (Nice to Have)
1. **Record Filtering** — Implement record filtering by status and organization
2. **User Search** — Add user lookup by email functionality
3. **Feedback Thread Details** — Get individual thread information
4. **QA Review Details** — Get individual review details

### Low Priority (Future Enhancement)
1. **Advanced Reporting** — Implement query-based reporting
2. **Recipients Notifications** — Implement recipient-level notification management
3. **Batch Operations** — Support bulk user/organization management

---

## API Client Configuration

**Base URL**: `http://localhost:9091`  
**Authentication**: Bearer Token (JWT)  
**Client**: Axios with interceptors for auth & error handling  
**Location**: `src/api/client.js`

---

## Usage Patterns Found

### Page-wise API Usage:

| Page | Primary Endpoints Used |
|------|------------------------|
| `AuditLogs.jsx` | GET /api/users, GET /api/audit/logs |
| `CreateRecord.jsx` | GET /api/workflows/*, POST /api/epcr/records |
| `Dashboard.jsx` | GET /api/reports/dashboard-metrics |
| `Deployments.jsx` | GET /api/workflows/deployments |
| `FeedbackThreads.jsx` | GET /api/feedback/threads/*, POST /api/feedback/threads/* |
| `Login.jsx` | POST /api/auth/login |
| `Notifications.jsx` | GET /api/notifications/me/*, PUT /api/notifications/* |
| `Organizations.jsx` | GET /api/organizations*, POST/PUT/DELETE /api/organizations/* |
| `QaForms.jsx` | GET /api/qa/forms/*, POST /api/qa/forms |
| `QaReviews.jsx` | GET /api/qa/reviews*, POST /api/qa/reviews |
| `RecordsList.jsx` | GET /api/epcr/records*, PUT/DELETE/POST /api/epcr/records/* |
| `Register.jsx` | POST /api/auth/register, GET /api/organizations |
| `Reports.jsx` | GET /api/reports/* |
| `Workflows.jsx` | GET /api/workflows*, POST/PUT/DELETE /api/workflows/* |

### Redux Store Integration:

| Slice | Endpoints |
|-------|-----------|
| `authSlice.js` | Login, Register, Logout |
| `epcrSlice.js` | CRUD operations on patient records |
| `qaSlice.js` | QA forms and reviews |
| `notificationSlice.js` | Notification retrieval and management |
| `workflowSlice.js` | Workflow and deployment management |
| `uiSlice.js` | UI state (toasts) |

---

## Generated on: May 3, 2026
