// Role → Menu map — aligned with verified backend permission matrix
export const ROLE_MENU = {
  ADMIN:       ['Dashboard','Organizations','Users','EPCR','QA Forms','QA Reviews','Workflows','Deployments','Reports','Feedback','Notifications'],
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
  Deployments:    '/workflows/deployments',
  Reports:        '/reports',
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
  { role: 'ADMIN',       email: 'ornge.admin@demo.local',      password: 'DemoPass123!' },
  { role: 'MANAGER',     email: 'ornge.manager@demo.local',    password: 'DemoPass123!' },
  { role: 'PARAMEDIC',   email: 'provider.paramedic@demo.local', password: 'DemoPass123!' },
  { role: 'PHYSICIAN',   email: 'ornge.physician@demo.local',  password: 'DemoPass123!' },
  { role: 'QA_REVIEWER', email: 'provider.reviewer@demo.local',  password: 'DemoPass123!' },
  { role: 'VIEWER',      email: 'provider.viewer@demo.local',    password: 'DemoPass123!' },
  { role: 'MANAGER (NorthStar)',     email: 'northstar.manager@demo.local',    password: 'DemoPass123!' },
  { role: 'QA_REVIEWER (NorthStar)', email: 'northstar.reviewer@demo.local', password: 'DemoPass123!' },
  { role: 'PARAMEDIC (NorthStar)',   email: 'northstar.paramedic@demo.local',  password: 'DemoPass123!' },
  { role: 'PHYSICIAN (NorthStar)',   email: 'northstar.physician@demo.local',  password: 'DemoPass123!' },
  { role: 'VIEWER (NorthStar)',      email: 'northstar.viewer@demo.local',     password: 'DemoPass123!' },
];
