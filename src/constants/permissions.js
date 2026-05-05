// Role → Menu map — aligned with verified backend permission matrix
export const ROLE_MENU = {
  ADMIN:       ['Dashboard','Organizations','Users','EPCR','QA Forms','QA Reviews','QA Rules','Form Templates','Workflows','Deployments','Reports','Audit Logs','Feedback','Notifications','HIPAA Consent','HIPAA Disclosure','Patient Portal','Break-Glass','Business Associates','De-Identification'],
  MANAGER:     ['Dashboard','Organizations','Users','QA Forms','QA Reviews','QA Rules','Form Templates','Workflows','Reports','Feedback','Notifications','HIPAA Consent','HIPAA Disclosure','Patient Portal','Business Associates'],
  PARAMEDIC:   ['Dashboard','EPCR','Feedback','Notifications'],
  PHYSICIAN:   ['Dashboard','EPCR','QA Reviews','Reports','Feedback','Notifications'],
  QA_REVIEWER: ['Dashboard','EPCR','QA Reviews','QA Rules','Reports','Feedback','Notifications'],
  VIEWER:      ['Dashboard','Feedback','Notifications'],
  PATIENT:     ['Patient Portal']
};

// Menu item → route path
export const ROUTE_MAP = {
  Dashboard:           '/dashboard',
  Organizations:       '/organizations',
  Users:               '/users',
  EPCR:                '/epcr',
  'QA Forms':          '/qa/forms',
  'QA Reviews':        '/qa/reviews',
  'QA Rules':          '/qa/rules',
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
  'Break-Glass':       '/break-glass',
  'Business Associates': '/hipaa/baa',
  'De-Identification': '/hipaa/deid',
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

export const DEMO_CREDENTIALS = [
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
];
