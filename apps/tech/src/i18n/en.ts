import type { Dict } from './th';

export const en: Dict = {
  common: {
    loading: 'Loading...',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
    or: 'or',
  },
  auth: {
    appName: 'Toptier Tech',
    tagline: 'For install & service teams',
    email: 'Email',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in...',
    loginFailed: 'Login failed',
    onlyTechs: 'This app is for install / service technicians only',
    logout: 'Logout',
  },
  home: {
    appName: 'Toptier Tech',
    gpsOn: 'ON',
    gpsOff: 'OFF',
    gpsError: 'error',
    gpsStarting: 'starting...',
    gpsAgo: 'ping {{seconds}}s ago',
    gps: 'GPS',
    noTickets: 'No pending jobs',
  },
  ticket: {
    priority: {
      URGENT: 'Urgent',
      NORMAL: 'Normal',
      LOW: 'Low',
    },
    problem: {
      BELT: 'Belt',
      NOISE: 'Noise',
      CONSOLE: 'Console',
      MOTOR: 'Motor',
      POWER: 'Power',
      PM: 'PM / Maintenance',
      OTHER: 'Other',
    },
    nextStage: {
      EN_ROUTE: 'Start route',
      ARRIVED: 'Arrived',
      REPAIRING: 'Start repair',
      CLOSED: 'Close job',
    },
    closed: '✓ Closed',
    navigate: 'Navigate',
    callCustomer: 'Call customer',
  },
  status: {
    up: 'All systems operational',
    degraded: 'Degraded performance',
    down: 'System down',
    checking: 'Checking...',
    unreachable: 'Cannot reach server',
  },
};
