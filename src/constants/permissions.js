// Role → Menu map — aligned with verified backend permission matrix
export const ROLE_MENU = {
  ADMIN:       ['Dashboard','Organizations','Users','EPCR','QA Forms','QA Reviews','Workflows','Deployments','Reports','Audit Logs','Feedback','Notifications'],
  MANAGER:     ['Dashboard','Organizations','Users','QA Forms','QA Reviews','Workflows','Reports','Feedback','Notifications'],
  PARAMEDIC:   ['Dashboard','EPCR','Feedback','Notifications'],
  PHYSICIAN:   ['Dashboard','EPCR','QA Reviews','Reports','Feedback','Notifications'],
  QA_REVIEWER: ['Dashboard','EPCR','QA Reviews','Reports','Feedback','Notifications'],
  VIEWER:      ['Dashboard','Feedback','Notifications'],
};

// Menu item → route path
export const ROUTE_MAP = {
  Dashboard:      '/dashboard',
  Organizations:  '/organizations',
  Users:          '/users',
  EPCR:           '/epcr',
  'QA Forms':     '/qa/forms',
  'QA Reviews':   '/qa/reviews',
  Workflows:      '/workflows',
  Deployments:    '/deployments',
  Reports:        '/reports',
  'Audit Logs':   '/audit-logs',
  Feedback:       '/feedback',
  Notifications:  '/notifications',
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
