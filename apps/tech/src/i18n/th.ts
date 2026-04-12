export const th = {
  common: {
    loading: 'กำลังโหลด...',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    back: 'กลับ',
    or: 'หรือ',
  },
  auth: {
    appName: 'Toptier Tech',
    tagline: 'สำหรับทีมติดตั้ง + บริการ',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    login: 'เข้าสู่ระบบ',
    loggingIn: 'กำลังเข้าสู่ระบบ...',
    loginFailed: 'เข้าสู่ระบบไม่สำเร็จ',
    onlyTechs: 'แอปนี้สำหรับช่างติดตั้ง / บริการเท่านั้น',
    logout: 'ออกจากระบบ',
  },
  home: {
    appName: 'Toptier Tech',
    gpsOn: 'ON',
    gpsOff: 'OFF',
    gpsError: 'error',
    gpsStarting: 'starting...',
    gpsAgo: 'ping {{seconds}}s ago',
    gps: 'GPS',
    noTickets: 'ไม่มีงานค้าง',
  },
  ticket: {
    priority: {
      URGENT: 'เร่งด่วน',
      NORMAL: 'ปกติ',
      LOW: 'ไม่เร่ง',
    },
    problem: {
      BELT: 'สายพาน',
      NOISE: 'เสียงดัง',
      CONSOLE: 'Console',
      MOTOR: 'มอเตอร์',
      POWER: 'ไฟ/ไม่เปิดติด',
      PM: 'PM / บำรุงรักษา',
      OTHER: 'อื่นๆ',
    },
    nextStage: {
      EN_ROUTE: 'เริ่มเดินทาง',
      ARRIVED: 'ถึงหน้างานแล้ว',
      REPAIRING: 'เริ่มซ่อม',
      CLOSED: 'ปิดงาน',
    },
    closed: '✓ ปิดงานแล้ว',
    navigate: 'นำทาง',
    callCustomer: 'โทรหาลูกค้า',
  },
  status: {
    up: 'ระบบทำงานปกติ',
    degraded: 'ระบบทำงานช้า',
    down: 'ระบบขัดข้อง',
    checking: 'กำลังตรวจสอบ...',
    unreachable: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
  },
};

export type Dict = typeof th;
