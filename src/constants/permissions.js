// Role → Menu map — aligned with verified backend permission matrix
export const ROLE_MENU = {
  ADMIN:       ['Dashboard','Organizations','Users','Tickets','EPCR','QA Forms','QA Reviews','QA Rules','Rules Engine','Form Templates','Workflows','Deployments','Reports','Audit Logs','Feedback','Notifications','HIPAA Consent','HIPAA Disclosure','Patient Portal','Patient History','Break-Glass','Business Associates','De-Identification','Critical Follow-Ups','User Guide'],
  MANAGER:     ['Dashboard','Organizations','Users','Tickets','QA Forms','QA Reviews','QA Rules','Rules Engine','Form Templates','Workflows','Reports','Feedback','Notifications','HIPAA Consent','HIPAA Disclosure','Patient Portal','Patient History','Business Associates','User Guide'],
  PARAMEDIC:   ['Dashboard','EPCR','Tickets','Feedback','Notifications','Patient History','Rules Engine','Critical Follow-Ups','User Guide'],
  PHYSICIAN:   ['Dashboard','EPCR','Tickets','QA Reviews','Reports','Feedback','Notifications','Patient History','Critical Follow-Ups','User Guide'],
  QA_REVIEWER: ['Dashboard','EPCR','Tickets','QA Reviews','QA Rules','Rules Engine','Reports','Feedback','Notifications','User Guide'],
  VIEWER:      ['Dashboard','Tickets','Feedback','Notifications','User Guide'],
  PATIENT:     ['Patient Portal', 'Notifications', 'User Guide']
};

// Menu item → route path
export const ROUTE_MAP = {
  Dashboard:           '/dashboard',
  Organizations:       '/organizations',
  Users:               '/users',
  Tickets:             '/tickets',
  EPCR:                '/epcr',
  'QA Forms':          '/qa/forms',
  'QA Reviews':        '/qa/reviews',
  'QA Rules':          '/qa/rules',
  'Rules Engine':      '/rules-engine',
  'Form Templates':    '/form-templates',
  Workflows:           '/workflows',
  Deployments:         '/deployments',
  Reports:             '/reports',
  'Audit Logs':        '/audit-logs',
  Feedback:            '/feedback',
  Notifications:       '/notifications',
  'HIPAA Consent':     '/hipaa/consent',
  'HIPAA Disclosure':  '/hipaa/disclosure',
  'Patient Portal':    '/patient-portal',
  'Patient History':   '/patient-history',
  'Break-Glass':       '/break-glass',
  'Business Associates': '/hipaa/baa',
  'De-Identification': '/hipaa/deid',
  'Critical Follow-Ups': '/critical-follow-ups',
  'User Guide':        '/user-guide',
};

export const hasMenuAccess = (role, menuItem) =>
  ROLE_MENU[role]?.includes(menuItem) ?? false;

export const canAccess = (role, ...items) =>
  items.every(item => hasMenuAccess(role, item));

export const ROLES = {
  ADMIN:       'ADMIN',
  MANAGER:     'MANAGER',
  PARAMEDIC:   'PARAMEDIC',
  PHYSICIAN:   'PHYSICIAN',
  QA_REVIEWER: 'QA_REVIEWER',
  VIEWER:      'VIEWER',
  PATIENT:     'PATIENT',
};

// Demo credentials — only available in development builds (stripped from production by Vite)
export const DEMO_CREDENTIALS = import.meta.env.DEV ? [
  { role: 'ADMIN',       email: 'admin@metroems.com',        password: 'Password@123' },
  { role: 'MANAGER',     email: 'manager@metroems.com',      password: 'Password@123' },
  { role: 'PARAMEDIC',   email: 'john.smith@metroems.com',    password: 'Password@123' },
  { role: 'PARAMEDIC',   email: 'emily.davis@metroems.com',   password: 'Password@123' },
  { role: 'PARAMEDIC',   email: 'robert.wilson@metroems.com', password: 'Password@123' },
  { role: 'PARAMEDIC',   email: 'jessica.brown@metroems.com', password: 'Password@123' },
  { role: 'PHYSICIAN',   email: 'dr.kumar@metroems.com',     password: 'Password@123' },
  { role: 'QA_REVIEWER', email: 'qa.reviewer1@metroems.com', password: 'Password@123' },
  { role: 'QA_REVIEWER', email: 'qa.reviewer2@metroems.com', password: 'Password@123' },
  { role: 'VIEWER',      email: 'viewer@metroems.com',       password: 'Password@123' },
  { role: 'VIEWER',      email: 'viewer2@metroems.com',      password: 'Password@123' },
] : [];
