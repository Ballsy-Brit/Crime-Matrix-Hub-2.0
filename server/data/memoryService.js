const users = [];
const crimeReports = [];

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function seedDemoData() {
  if (users.length > 0 || crimeReports.length > 0) {
    return;
  }

  users.push(
    {
      id: 'admin-demo-001',
      username: 'demoadmin',
      password: 'demo123',
      email: 'admin@crimematrix.test',
      name: 'Demo Admin',
      phone: '01700000001',
      photoUrl: null,
      region: 'All',
      role: 'Admin',
      isAdmin: true,
      adminId: 'admin-100001',
      adminSignupDate: daysAgo(40),
      createdAt: daysAgo(40),
      updatedAt: daysAgo(2),
    },
    {
      id: 'officer-demo-001',
      username: 'officer.rana',
      password: 'demo123',
      email: 'rana@police.test',
      name: 'Rana Hossain',
      phone: '01700000002',
      photoUrl: null,
      region: 'Dhanmondi',
      role: 'Officer',
      isAdmin: false,
      adminId: null,
      adminSignupDate: null,
      createdAt: daysAgo(32),
      updatedAt: daysAgo(1),
    },
    {
      id: 'officer-demo-002',
      username: 'officer.tasnim',
      password: 'demo123',
      email: 'tasnim@police.test',
      name: 'Tasnim Akter',
      phone: '01700000003',
      photoUrl: null,
      region: 'Uttara',
      role: 'Officer',
      isAdmin: false,
      adminId: null,
      adminSignupDate: null,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(1),
    },
    {
      id: 'citizen-demo-001',
      username: 'asma.citizen',
      password: 'demo123',
      email: 'asma@test.com',
      name: 'Asma Begum',
      phone: '01800000001',
      photoUrl: null,
      region: 'Mirpur',
      role: 'Citizen',
      isAdmin: false,
      adminId: null,
      adminSignupDate: null,
      createdAt: daysAgo(24),
      updatedAt: daysAgo(2),
    },
    {
      id: 'citizen-demo-002',
      username: 'sabbir.citizen',
      password: 'demo123',
      email: 'sabbir@test.com',
      name: 'Sabbir Rahman',
      phone: '01800000002',
      photoUrl: null,
      region: 'Gulshan',
      role: 'Citizen',
      isAdmin: false,
      adminId: null,
      adminSignupDate: null,
      createdAt: daysAgo(22),
      updatedAt: daysAgo(2),
    },
    {
      id: 'citizen-demo-003',
      username: 'nusrat.citizen',
      password: 'demo123',
      email: 'nusrat@test.com',
      name: 'Nusrat Jahan',
      phone: '01800000003',
      photoUrl: null,
      region: 'Motijheel',
      role: 'Citizen',
      isAdmin: false,
      adminId: null,
      adminSignupDate: null,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(2),
    }
  );

  crimeReports.push(
    {
      id: 'crime-demo-001',
      title: 'Phone snatching near Kazi Parade',
      description: 'A commuter reported a quick snatching incident near the market road during evening rush hour.',
      region: 'Mirpur',
      crimeType: 'Theft',
      status: 'Pending',
      reportedById: 'citizen-demo-001',
      verifiedById: null,
      officerInCharge: null,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: 'crime-demo-002',
      title: 'Suspicious withdrawal fraud complaint',
      description: 'A resident found unauthorized mobile banking withdrawals linked to a fake support call.',
      region: 'Gulshan',
      crimeType: 'Fraud',
      status: 'Pending',
      reportedById: 'citizen-demo-002',
      verifiedById: null,
      officerInCharge: null,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: 'crime-demo-003',
      title: 'Apartment lobby assault review',
      description: 'Security footage confirmed a physical altercation in a residential lobby after a dispute.',
      region: 'Dhanmondi',
      crimeType: 'Assault',
      status: 'Verified',
      reportedById: 'citizen-demo-003',
      verifiedById: 'officer-demo-001',
      officerInCharge: 'officer-demo-001',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(1),
    },
    {
      id: 'crime-demo-004',
      title: 'Recovered motorcycle theft case',
      description: 'A stolen bike was recovered after the local patrol identified the suspect route.',
      region: 'Uttara',
      crimeType: 'Vehicle Theft',
      status: 'Verified',
      reportedById: 'citizen-demo-001',
      verifiedById: 'officer-demo-002',
      officerInCharge: 'officer-demo-002',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
    },
    {
      id: 'crime-demo-005',
      title: 'Warehouse arson investigation',
      description: 'A warehouse fire was linked to deliberate ignition points and the report has been closed.',
      region: 'Tejgaon',
      crimeType: 'Arson',
      status: 'Closed',
      reportedById: 'citizen-demo-002',
      verifiedById: 'officer-demo-001',
      officerInCharge: 'officer-demo-001',
      createdAt: daysAgo(12),
      updatedAt: daysAgo(4),
    },
    {
      id: 'crime-demo-006',
      title: 'Commercial burglary closure',
      description: 'A shop burglary in Motijheel was resolved after the suspect was identified and the case closed.',
      region: 'Motijheel',
      crimeType: 'Burglary',
      status: 'Closed',
      reportedById: 'citizen-demo-003',
      verifiedById: 'officer-demo-002',
      officerInCharge: 'officer-demo-002',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(3),
    }
  );
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value || Date.now());
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCrimeJoinedRow(crime) {
  const reported = users.find((u) => u.id === crime.reportedById) || null;
  const verified = users.find((u) => u.id === crime.verifiedById) || null;
  const officer = users.find((u) => u.id === crime.officerInCharge) || null;

  return {
    id: crime.id,
    title: crime.title,
    description: crime.description,
    region: crime.region,
    crimeType: crime.crimeType,
    status: crime.status,
    reportedById: crime.reportedById,
    verifiedById: crime.verifiedById,
    officerInCharge: crime.officerInCharge,
    createdAt: crime.createdAt,
    updatedAt: crime.updatedAt,
    reportedByUserId: reported ? reported.id : null,
    reportedByUsername: reported ? reported.username : null,
    reportedByName: reported ? reported.name : null,
    reportedByPhone: reported ? reported.phone : null,
    verifiedByOfficerId: verified ? verified.id : null,
    verifiedByOfficerUsername: verified ? verified.username : null,
    verifiedByOfficerName: verified ? verified.name : null,
    officerAssignedId: officer ? officer.id : null,
    officerAssignedUsername: officer ? officer.username : null,
    officerAssignedName: officer ? officer.name : null,
  };
}

module.exports = {
  mode: "memory",

  async init() {
    seedDemoData();
  },

  async getUserByUsername(username) {
    const row = users.find((u) => u.username === username);
    return row ? clone(row) : null;
  },

  async requireAdmin(adminUsername) {
    const row = users.find((u) => u.username === adminUsername && Boolean(u.isAdmin));
    if (!row) return null;
    return { id: row.id, username: row.username, isAdmin: Boolean(row.isAdmin) };
  },

  async findUserByEmail(email) {
    const row = users.find((u) => u.email === email);
    return row ? { id: row.id, email: row.email } : null;
  },

  async countAdmins() {
    return users.filter((u) => Boolean(u.isAdmin)).length;
  },

  async createUser(userRow) {
    users.push({
      ...clone(userRow),
      createdAt: new Date(),
      updatedAt: new Date(),
      adminSignupDate: userRow.adminSignupDate ? toDate(userRow.adminSignupDate) : null,
      photoUrl: userRow.photoUrl || null,
    });
  },

  async updateUserProfileById(userId, updated) {
    const idx = users.findIndex((u) => u.id === userId);
    if (idx < 0) return;
    users[idx] = {
      ...users[idx],
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      region: updated.region,
      photoUrl: updated.photoUrl,
      updatedAt: new Date(),
    };
  },

  async getUserHistoryRows(userId) {
    return clone(
      crimeReports
        .filter((c) => c.reportedById === userId || c.verifiedById === userId)
        .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
        .map(buildCrimeJoinedRow)
    );
  },

  async getVerifiedOrClosedCrimeRows() {
    return clone(
      crimeReports
        .filter((c) => c.status === "Verified" || c.status === "Closed")
        .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
        .map(buildCrimeJoinedRow)
    );
  },

  async getPendingCrimeRows() {
    return clone(
      crimeReports
        .filter((c) => c.status === "Pending")
        .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
        .map(buildCrimeJoinedRow)
    );
  },

  async getOfficerByUsername(username) {
    const row = users.find((u) => u.username === username && u.role === "Officer");
    if (!row) return null;
    return { id: row.id, username: row.username, role: row.role, region: row.region };
  },

  async getCrimeById(id) {
    const row = crimeReports.find((c) => c.id === id);
    return row ? clone(row) : null;
  },

  async closeCrimeById(id, officerId) {
    const idx = crimeReports.findIndex((c) => c.id === id);
    if (idx < 0) return;
    crimeReports[idx] = {
      ...crimeReports[idx],
      status: "Closed",
      verifiedById: officerId,
      updatedAt: new Date(),
    };
  },

  async createCrimeReport(report) {
    crimeReports.push({
      id: report.id,
      title: report.title,
      description: report.description,
      region: report.region,
      crimeType: report.crimeType,
      status: "Pending",
      reportedById: report.reportedById,
      verifiedById: null,
      officerInCharge: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async verifyCrimeById(id, officerId) {
    const idx = crimeReports.findIndex((c) => c.id === id);
    if (idx < 0) return;
    crimeReports[idx] = {
      ...crimeReports[idx],
      status: "Verified",
      verifiedById: officerId,
      updatedAt: new Date(),
    };
  },

  async getOfficersList() {
    return clone(
      users
        .filter((u) => u.role === "Officer")
        .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          phone: u.phone,
          region: u.region,
          createdAt: u.createdAt,
        }))
    );
  },

  async getNonAdminUsers() {
    return clone(
      users
        .filter((u) => !Boolean(u.isAdmin))
        .sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt))
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          email: u.email,
          phone: u.phone,
          region: u.region,
          role: u.role,
          createdAt: u.createdAt,
        }))
    );
  },

  async getOfficerById(id) {
    const row = users.find((u) => u.id === id && u.role === "Officer");
    if (!row) return null;
    return { id: row.id, username: row.username, role: row.role, region: row.region };
  },

  async assignOfficerToCrime(crimeReportId, officerId) {
    const idx = crimeReports.findIndex((c) => c.id === crimeReportId);
    if (idx < 0) return;
    crimeReports[idx] = {
      ...crimeReports[idx],
      officerInCharge: officerId,
      updatedAt: new Date(),
    };
  },

  async getUserById(id) {
    const row = users.find((u) => u.id === id);
    if (!row) return null;
    return { id: row.id, username: row.username, isAdmin: Boolean(row.isAdmin) };
  },

  async deleteUserById(id) {
    const idx = users.findIndex((u) => u.id === id);
    if (idx >= 0) users.splice(idx, 1);
  },

  async getAdminInfoByUsername(username) {
    const row = users.find((u) => u.username === username && Boolean(u.isAdmin));
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      phone: row.phone,
      adminId: row.adminId,
      adminSignupDate: row.adminSignupDate,
      isAdmin: Boolean(row.isAdmin),
    };
  },
};
