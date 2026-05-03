# API Integration Implementation Guide

## Overview
This document describes the newly implemented API integrations and Redux slices for the Healthcare EPCR Frontend.

---

## New Redux Slices Created

### 1. **User Management Slice** (`userSlice.js`)
Handles all user CRUD operations and filtering.

**Actions:**
- `fetchUsers()` - Get paginated users with sorting
- `fetchUsersByOrganization(orgId, page, size)` - Get users by org
- `fetchUserById(userId)` - Get single user
- `fetchUserByEmail(email)` - Find user by email
- `createUser(userData)` - Create new user
- `updateUser({id, data})` - Update user
- `deleteUser(userId)` - Delete user

**Redux State:**
```javascript
state.users = {
  users: [],          // Array of user objects
  selectedUser: null, // Currently selected user
  total: 0,           // Total count
  loading: false,     // Loading state
  error: null,        // Error message
  currentPage: 0,     // Current page number
  pageSize: 20,       // Items per page
}
```

**Usage in Components:**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, createUser, updateUser, deleteUser } from '../store/slices/userSlice';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { users, loading } = useSelector(state => state.users);

  // Fetch users
  useEffect(() => {
    dispatch(fetchUsers({ page: 0, size: 20 }));
  }, []);

  // Create user
  const handleCreate = async (userData) => {
    try {
      await dispatch(createUser(userData)).unwrap();
      // Success
    } catch (err) {
      // Error handling
    }
  };
};
```

---

### 2. **Organization Management Slice** (`orgSlice.js`)
Handles all organization CRUD operations.

**Actions:**
- `fetchOrganizations()` - Get all organizations with pagination
- `fetchActiveOrganizations()` - Get only active organizations
- `fetchOrganizationById(orgId)` - Get single organization
- `fetchOrganizationByCode(code)` - Find org by code
- `createOrganization(data)` - Create organization
- `updateOrganization({id, data})` - Update organization
- `deleteOrganization(orgId)` - Delete organization

**Redux State:**
```javascript
state.org = {
  organizations: [],  // Array of organization objects
  selectedOrg: null,  // Currently selected org
  total: 0,           // Total count
  loading: false,     // Loading state
  error: null,        // Error message
  currentPage: 0,     // Current page
  pageSize: 20,       // Items per page
}
```

---

### 3. **QA Rules Slice** (`qaRulesSlice.js`)
Handles QA auto-flag rules for quality assurance.

**Actions:**
- `fetchQARules(orgId)` - Get rules for organization
- `createQARule(ruleData)` - Create new rule
- `updateQARule({id, data})` - Update rule
- `deleteQARule(ruleId)` - Delete rule

**Redux State:**
```javascript
state.qaRules = {
  rules: [],         // Array of rule objects
  selectedRule: null, // Currently selected rule
  loading: false,     // Loading state
  error: null,        // Error message
}
```

**Usage:**
```javascript
const { rules, loading, error } = useSelector(state => state.qaRules);

useEffect(() => {
  dispatch(fetchQARules(organizationId));
}, [organizationId]);
```

---

### 4. **Form Templates Slice** (`formTemplateSlice.js`)
Handles dynamic form templates and submissions.

**Actions:**
- `fetchFormTemplates({orgId, templateType})` - Get templates
- `fetchLatestTemplate({orgId, templateType})` - Get latest version
- `createFormTemplate(templateData)` - Create template
- `submitFormSubmission({templateId, submission})` - Submit form
- `fetchFormSubmissions(orgId)` - Get submissions

**Redux State:**
```javascript
state.formTemplate = {
  templates: [],      // Available templates
  latestTemplate: null, // Latest template version
  submissions: [],    // Form submissions
  selectedTemplate: null, // Currently working template
  loading: false,     // Loading state
  submitting: false,  // Submission state
  error: null,        // Error message
}
```

---

## Utility Functions

### **Record Filtering Utilities** (`utils/recordFilters.js`)
Comprehensive filtering and sorting functions for ePCR records.

**Available Functions:**

```javascript
import {
  filterRecordsByStatus,
  filterRecordsByOrganization,
  filterRecordsByParamedic,
  filterRecordsByQAApproval,
  searchRecords,
  filterRecordsByDateRange,
  sortRecords,
  paginateRecords,
  applyRecordFilters,
  buildFilterQueryString
} from '../utils/recordFilters';

// Example 1: Filter by status
const pendingRecords = filterRecordsByStatus(records, 'PENDING');

// Example 2: Search records
const results = searchRecords(records, 'patient name');

// Example 3: Apply multiple filters at once
const filtered = applyRecordFilters(records, {
  status: 'SUBMITTED',
  organizationId: 'org123',
  searchTerm: 'John',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-05-03'),
  sortBy: 'createdAt',
  direction: 'DESC',
  page: 0,
  size: 20,
});

// Example 4: Build query string for API
const queryStr = buildFilterQueryString({
  status: 'SUBMITTED',
  organizationId: 'org123'
});
// Returns: ?status=SUBMITTED&organizationId=org123
```

---

## Updated Pages

### **Users Page** (`pages/Users.jsx`)
- ✅ Now uses Redux (`userSlice`)
- ✅ Integrated with Organization slice
- ✅ Full CRUD operations
- ✅ Search and filtering
- ✅ Pagination support

**Key Changes:**
- Replaced `useState` for users with Redux selector
- Dispatch `fetchUsers()` on component mount
- Use `createUser()`, `updateUser()`, `deleteUser()` thunks
- Organizations loaded from `orgSlice`

---

## API Endpoints Integrated

### User Management
- `GET /api/users` - List all users (paginated)
- `GET /api/users/{id}` - Get single user
- `GET /api/users/email/{email}` - Find user by email
- `GET /api/users/organization/{orgId}` - Get org users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Organization Management
- `GET /api/organizations` - List organizations
- `GET /api/organizations/active` - Get active orgs
- `GET /api/organizations/{id}` - Get single org
- `GET /api/organizations/code/{code}` - Find by code
- `POST /api/organizations` - Create org
- `PUT /api/organizations/{id}` - Update org
- `DELETE /api/organizations/{id}` - Delete org

### QA Rules
- `GET /api/qa/rules?organizationId=X` - Get org rules
- `POST /api/qa/rules` - Create rule
- `POST /api/qa/rules/{id}` - Update rule (or PUT if available)
- `DELETE /api/qa/rules/{id}` - Delete rule

### Form Templates
- `GET /api/formengine/templates` - List templates
- `GET /api/formengine/templates/latest` - Get latest
- `POST /api/formengine/templates` - Create template
- `POST /api/formengine/templates/{id}/submissions` - Submit form
- `GET /api/formengine/submissions` - Get submissions

---

## Store Configuration

The Redux store now includes:

```javascript
// src/store/index.js
const store = configureStore({
  reducer: {
    auth:          authReducer,
    ui:            uiReducer,
    epcr:          epcrReducer,
    qa:            qaReducer,
    workflows:     workflowReducer,
    notifications: notificationReducer,
    users:         userReducer,       // ✨ NEW
    qaRules:       qaRulesReducer,    // ✨ NEW
    formTemplate:  formTemplateReducer, // ✨ NEW
    org:           orgReducer,        // ✨ NEW
  },
});
```

---

## Implementation Checklist

- ✅ User Management API integration
- ✅ Organization Management API integration
- ✅ QA Auto-Flag Rules setup
- ✅ Form Templates structure
- ✅ Record filtering utilities
- ✅ Redux slices created
- ✅ Store updated with new slices
- ✅ Users page updated to use Redux
- ⚠️ QA Rules page needs component implementation
- ⚠️ Form Templates page needs component implementation
- ⚠️ Advanced record filtering UI component needed

---

## Next Steps

### High Priority
1. Create QA Rules management page component
2. Add form template creation/management interface
3. Implement advanced record filtering UI in RecordsList
4. Add user/org bulk operations support

### Medium Priority
1. Add email verification flow for new users
2. Implement role-based API access control
3. Add audit logging for user actions
4. Create template versioning UI

### Low Priority
1. Add export/import functionality
2. Create data migration tools
3. Add advanced analytics dashboard
4. Implement API rate limiting UI

---

## Error Handling

All slices include proper error handling:

```javascript
// In components
try {
  await dispatch(createUser(formData)).unwrap();
  dispatch(addToast({ type: 'success', message: 'User created' }));
} catch (err) {
  dispatch(addToast({ type: 'error', message: err }));
}
```

---

## Testing Notes

When testing new integrations:

1. **User Creation**: Ensure password meets requirements (8+ chars, uppercase, lowercase, number, special char)
2. **Phone Numbers**: Must be 10+ digits (format: +1234567890 or 1234567890)
3. **Email**: Valid email format required
4. **Organizations**: Code must be unique and 2-20 characters
5. **Record Filtering**: Date range uses ISO format

---

## File Structure

```
src/
├── store/
│   └── slices/
│       ├── userSlice.js           ✨ NEW
│       ├── orgSlice.js             ✨ NEW
│       ├── qaRulesSlice.js         ✨ NEW
│       ├── formTemplateSlice.js    ✨ NEW
│       └── ... (existing slices)
├── pages/
│   ├── Users.jsx                  ✏️ UPDATED
│   └── ... (other pages)
├── utils/
│   ├── recordFilters.js           ✨ NEW
│   └── ... (other utilities)
└── api/
    └── client.js                  (existing)
```

---

## Environment Setup

Ensure your `.env` file has:
```
VITE_API_BASE_URL=http://localhost:9091
```

All API calls use the configured base URL with Bearer token authentication.

---

**Last Updated**: May 3, 2026  
**Version**: 1.0
