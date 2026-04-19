const { initDatabase, query } = require("../db");

const crimeJoinSelect = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.region,
    c.crimeType,
    c.status,
    c.reportedById,
    c.verifiedById,
    c.officerInCharge,
    c.createdAt,
    c.updatedAt,
    r.id AS reportedByUserId,
    r.username AS reportedByUsername,
    r.name AS reportedByName,
    r.phone AS reportedByPhone,
    v.id AS verifiedByOfficerId,
    v.username AS verifiedByOfficerUsername,
    v.name AS verifiedByOfficerName,
    o.id AS officerAssignedId,
    o.username AS officerAssignedUsername,
    o.name AS officerAssignedName
  FROM CrimeReports c
  LEFT JOIN Users r ON r.id = c.reportedById
  LEFT JOIN Users v ON v.id = c.verifiedById
  LEFT JOIN Users o ON o.id = c.officerInCharge
`;

module.exports = {
  mode: "mysql",

  async init() {
    await initDatabase();
  },

  async getUserByUsername(username) {
    const rows = await query("SELECT * FROM Users WHERE username = ? LIMIT 1", [username]);
    return rows[0] || null;
  },

  async requireAdmin(adminUsername) {
    const rows = await query(
      "SELECT id, username, isAdmin FROM Users WHERE username = ? AND isAdmin = 1 LIMIT 1",
      [adminUsername]
    );
    return rows[0] || null;
  },

  async findUserByEmail(email) {
    const rows = await query("SELECT id, email FROM Users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  },

  async countAdmins() {
    const rows = await query("SELECT id FROM Users WHERE isAdmin = 1 LIMIT 1");
    return rows.length;
  },

  async createUser(userRow) {
    await query(
      `
      INSERT INTO Users (id, username, password, email, name, phone, region, role, isAdmin, adminId, adminSignupDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userRow.id,
        userRow.username,
        userRow.password,
        userRow.email,
        userRow.name,
        userRow.phone,
        userRow.region,
        userRow.role,
        Boolean(userRow.isAdmin),
        userRow.adminId,
        userRow.adminSignupDate,
      ]
    );
  },

  async updateUserProfileById(userId, updated) {
    await query(
      `
      UPDATE Users
      SET name = ?, email = ?, phone = ?, region = ?, photoUrl = ?
      WHERE id = ?
      `,
      [updated.name, updated.email, updated.phone, updated.region, updated.photoUrl, userId]
    );
  },

  async getUserHistoryRows(userId) {
    return query(
      `${crimeJoinSelect}
      WHERE c.reportedById = ? OR c.verifiedById = ?
      ORDER BY c.createdAt DESC
      `,
      [userId, userId]
    );
  },

  async getVerifiedOrClosedCrimeRows() {
    return query(
      `${crimeJoinSelect}
      WHERE c.status IN ('Verified', 'Closed')
      ORDER BY c.createdAt DESC
      `
    );
  },

  async getPendingCrimeRows() {
    return query(
      `${crimeJoinSelect}
      WHERE c.status = 'Pending'
      ORDER BY c.createdAt DESC
      `
    );
  },

  async getOfficerByUsername(username) {
    const rows = await query(
      "SELECT id, username, role, region FROM Users WHERE username = ? AND role = 'Officer' LIMIT 1",
      [username]
    );
    return rows[0] || null;
  },

  async getCrimeById(id) {
    const rows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  },

  async closeCrimeById(id, officerId) {
    await query("UPDATE CrimeReports SET status = 'Closed', verifiedById = ? WHERE id = ?", [officerId, id]);
  },

  async createCrimeReport(report) {
    await query(
      `
      INSERT INTO CrimeReports (id, title, description, region, crimeType, reportedById, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [report.id, report.title, report.description, report.region, report.crimeType, report.reportedById]
    );
  },

  async verifyCrimeById(id, officerId) {
    await query("UPDATE CrimeReports SET status = 'Verified', verifiedById = ? WHERE id = ?", [officerId, id]);
  },

  async getOfficersList() {
    return query(
      `
      SELECT id, username, name, email, phone, region, createdAt
      FROM Users
      WHERE role = 'Officer'
      ORDER BY createdAt DESC
      `
    );
  },

  async getNonAdminUsers() {
    return query(
      `
      SELECT id, username, name, email, phone, region, role, createdAt
      FROM Users
      WHERE isAdmin = 0
      ORDER BY createdAt DESC
      `
    );
  },

  async getOfficerById(id) {
    const rows = await query("SELECT id, username, role, region FROM Users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  },

  async assignOfficerToCrime(crimeReportId, officerId) {
    await query("UPDATE CrimeReports SET officerInCharge = ? WHERE id = ?", [officerId, crimeReportId]);
  },

  async getUserById(id) {
    const rows = await query("SELECT id, username, isAdmin FROM Users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  },

  async deleteUserById(id) {
    await query("DELETE FROM Users WHERE id = ?", [id]);
  },

  async getAdminInfoByUsername(username) {
    const rows = await query(
      `
      SELECT id, username, name, email, phone, adminId, adminSignupDate, isAdmin
      FROM Users
      WHERE username = ? AND isAdmin = 1
      LIMIT 1
      `,
      [username]
    );
    return rows[0] || null;
  },
};
