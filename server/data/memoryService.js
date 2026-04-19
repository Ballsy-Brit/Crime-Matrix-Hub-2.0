const users = [];
const crimeReports = [];

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
    return;
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
