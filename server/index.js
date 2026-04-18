const express = require("express");
const cors = require("cors");
const { initDatabase, query } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

function generatePrefixedId(prefix) {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${timestamp}-${random}`;
}

function normalizeUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    name: row.name,
    email: row.email,
    phone: row.phone,
    region: row.region,
    photoUrl: row.photoUrl,
    isAdmin: Boolean(row.isAdmin),
    adminId: row.adminId,
    adminSignupDate: row.adminSignupDate,
  };
}

function mapCrimeRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    region: row.region,
    crimeType: row.crimeType,
    status: row.status,
    reportedById: row.reportedById,
    verifiedById: row.verifiedById,
    officerInCharge: row.officerInCharge,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reportedByUser: row.reportedByUserId
      ? {
          id: row.reportedByUserId,
          username: row.reportedByUsername,
          name: row.reportedByName,
          phone: row.reportedByPhone,
        }
      : null,
    verifiedByOfficer: row.verifiedByOfficerId
      ? {
          id: row.verifiedByOfficerId,
          username: row.verifiedByOfficerUsername,
          name: row.verifiedByOfficerName,
        }
      : null,
    officerAssigned: row.officerAssignedId
      ? {
          id: row.officerAssignedId,
          username: row.officerAssignedUsername,
          name: row.officerAssignedName,
        }
      : null,
  };
}

async function getUserByUsername(username) {
  const rows = await query("SELECT * FROM Users WHERE username = ? LIMIT 1", [username]);
  return rows[0] || null;
}

async function requireAdmin(adminUsername) {
  const rows = await query(
    "SELECT id, username, isAdmin FROM Users WHERE username = ? AND isAdmin = 1 LIMIT 1",
    [adminUsername]
  );
  return rows[0] || null;
}

// GET user by username
app.get("/api/users/:username", async (req, res) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(normalizeUser(user));
  } catch (error) {
    console.error("Error fetching user:", error.message);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

// GET user history (reports submitted or verified by the user)
app.get("/api/users/:username/history", async (req, res) => {
  try {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const rows = await query(
      `
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
      WHERE c.reportedById = ? OR c.verifiedById = ?
      ORDER BY c.createdAt DESC
      `,
      [user.id, user.id]
    );

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      reports: rows.map(mapCrimeRow),
    });
  } catch (error) {
    console.error("Error fetching user history:", error.message);
    return res.status(500).json({ error: "Failed to fetch user history", details: error.message });
  }
});

// PUT update user profile (simple editable fields)
app.put("/api/users/:username", async (req, res) => {
  try {
    const { name, email, phone, region, photoUrl } = req.body;
    const user = await getUserByUsername(req.params.username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email && email !== user.email) {
      const existingRows = await query("SELECT id FROM Users WHERE email = ? LIMIT 1", [email]);
      if (existingRows.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const updatedName = name || user.name;
    const updatedEmail = email || user.email;
    const updatedPhone = phone || user.phone;
    const updatedRegion = region || user.region;
    const updatedPhotoUrl = photoUrl === undefined ? user.photoUrl : photoUrl;

    await query(
      `
      UPDATE Users
      SET name = ?, email = ?, phone = ?, region = ?, photoUrl = ?
      WHERE id = ?
      `,
      [updatedName, updatedEmail, updatedPhone, updatedRegion, updatedPhotoUrl, user.id]
    );

    return res.json({
      message: "Profile updated",
      user: {
        id: user.id,
        username: user.username,
        name: updatedName,
        email: updatedEmail,
        phone: updatedPhone,
        region: updatedRegion,
        photoUrl: updatedPhotoUrl,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res.status(500).json({ error: "Failed to update user", details: error.message });
  }
});

// POST register new user
app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, phone, region, role, username, password, isAdmin } = req.body;

    if (!name || !email || !phone || !region || !role || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (isAdmin) {
      const existingAdmin = await query("SELECT id FROM Users WHERE isAdmin = 1 LIMIT 1");
      if (existingAdmin.length > 0) {
        return res.status(403).json({ error: "Admin already exists. Only one admin allowed." });
      }
    }

    const existingUser = await query("SELECT id FROM Users WHERE username = ? LIMIT 1", [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const existingEmail = await query("SELECT id FROM Users WHERE email = ? LIMIT 1", [email]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    let uniqueId;
    let adminId = null;
    let adminSignupDate = null;

    if (isAdmin) {
      adminId = generatePrefixedId("admin");
      adminSignupDate = new Date();
      uniqueId = adminId;
    } else {
      const prefix = role === "Officer" ? "officer" : "citizen";
      uniqueId = generatePrefixedId(prefix);
    }

    const finalRole = isAdmin ? "Admin" : role;
    const finalRegion = isAdmin ? "All" : region;

    await query(
      `
      INSERT INTO Users (id, username, password, email, name, phone, region, role, isAdmin, adminId, adminSignupDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        uniqueId,
        username,
        password,
        email,
        name,
        phone,
        finalRegion,
        finalRole,
        Boolean(isAdmin),
        adminId,
        adminSignupDate,
      ]
    );

    return res.status(201).json({
      message: "Account created successfully",
      userId: uniqueId,
      username,
      role: finalRole,
      isAdmin: Boolean(isAdmin),
      adminId,
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    return res.status(500).json({ error: "Failed to create account", details: error.message });
  }
});

// GET all verified crime reports (for home page display)
app.get("/api/crime-reports", async (_req, res) => {
  try {
    const rows = await query(
      `
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
      WHERE c.status IN ('Verified', 'Closed')
      ORDER BY c.createdAt DESC
      `
    );

    return res.json(rows.map(mapCrimeRow));
  } catch (error) {
    console.error("Error fetching crime reports:", error.message);
    return res.status(500).json({ error: "Failed to fetch crime reports", details: error.message });
  }
});

// PATCH close crime report (officer closes a verified/ongoing case)
app.patch("/api/crime-reports/:id/close", async (req, res) => {
  try {
    const { closedByUsername } = req.body;
    const { id } = req.params;

    const officers = await query(
      "SELECT id, username FROM Users WHERE username = ? AND role = 'Officer' LIMIT 1",
      [closedByUsername]
    );
    const officer = officers[0];

    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    const crimeRows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [id]);
    const crimeReport = crimeRows[0];

    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    if (crimeReport.status === "Closed") {
      return res.status(400).json({ error: "Crime report already closed" });
    }

    await query("UPDATE CrimeReports SET status = 'Closed', verifiedById = ? WHERE id = ?", [officer.id, id]);

    const updatedRows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [id]);
    return res.json({ message: "Crime report closed", crimeReport: updatedRows[0] });
  } catch (error) {
    console.error("Error closing crime report:", error.message);
    return res.status(500).json({ error: "Failed to close crime report", details: error.message });
  }
});

// POST new crime report (citizen submits report)
app.post("/api/crime-reports", async (req, res) => {
  try {
    const { title, description, region, crimeType, reportedByUsername } = req.body;

    if (!title || !description || !region || !crimeType || !reportedByUsername) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await getUserByUsername(reportedByUsername);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const crimeId = generatePrefixedId("crime");

    await query(
      `
      INSERT INTO CrimeReports (id, title, description, region, crimeType, reportedById, status)
      VALUES (?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [crimeId, title, description, region, crimeType, user.id]
    );

    const createdRows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [crimeId]);

    return res.status(201).json({
      message: "Crime report submitted successfully",
      crimeReport: createdRows[0],
    });
  } catch (error) {
    console.error("Error creating crime report:", error.message);
    return res.status(500).json({ error: "Failed to create crime report", details: error.message });
  }
});

// PATCH verify crime report (officer verifies report)
app.patch("/api/crime-reports/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedByUsername } = req.body;

    const officerRows = await query(
      "SELECT id, username, role, region FROM Users WHERE username = ? AND role = 'Officer' LIMIT 1",
      [verifiedByUsername]
    );
    const officer = officerRows[0];

    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    const crimeRows = await query("SELECT id, region FROM CrimeReports WHERE id = ? LIMIT 1", [id]);
    const crimeReport = crimeRows[0];

    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    if (crimeReport.region !== officer.region) {
      return res.status(403).json({
        error: `Officers can only verify crimes in their region. Crime is in ${crimeReport.region}, but you are assigned to ${officer.region}`,
      });
    }

    await query("UPDATE CrimeReports SET status = 'Verified', verifiedById = ? WHERE id = ?", [officer.id, id]);

    const updatedRows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [id]);
    return res.json({ message: "Crime report verified successfully", crimeReport: updatedRows[0] });
  } catch (error) {
    console.error("Error verifying crime report:", error.message);
    return res.status(500).json({ error: "Failed to verify crime report", details: error.message });
  }
});

// GET pending reports (for officer dashboard)
app.get("/api/crime-reports/pending", async (_req, res) => {
  try {
    const rows = await query(
      `
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
      WHERE c.status = 'Pending'
      ORDER BY c.createdAt DESC
      `
    );

    return res.json(rows.map(mapCrimeRow));
  } catch (error) {
    console.error("Error fetching pending reports:", error.message);
    return res.status(500).json({ error: "Failed to fetch pending reports" });
  }
});

// GET all officers (admin only)
app.get("/api/admin/officers", async (req, res) => {
  try {
    const { adminUsername } = req.query;
    const admin = await requireAdmin(adminUsername);

    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const officers = await query(
      `
      SELECT id, username, name, email, phone, region, createdAt
      FROM Users
      WHERE role = 'Officer'
      ORDER BY createdAt DESC
      `
    );

    return res.json(officers);
  } catch (error) {
    console.error("Error fetching officers:", error.message);
    return res.status(500).json({ error: "Failed to fetch officers", details: error.message });
  }
});

// GET all users (admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const { adminUsername } = req.query;
    const admin = await requireAdmin(adminUsername);

    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await query(
      `
      SELECT id, username, name, email, phone, region, role, createdAt
      FROM Users
      WHERE isAdmin = 0
      ORDER BY createdAt DESC
      `
    );

    return res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return res.status(500).json({ error: "Failed to fetch users", details: error.message });
  }
});

// POST appoint officer to case (admin only)
app.post("/api/admin/appoint-officer", async (req, res) => {
  try {
    const { adminUsername, crimeReportId, officerId } = req.body;

    const admin = await requireAdmin(adminUsername);
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const crimeRows = await query("SELECT id, region FROM CrimeReports WHERE id = ? LIMIT 1", [crimeReportId]);
    const crimeReport = crimeRows[0];
    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    const officerRows = await query("SELECT id, username, role, region FROM Users WHERE id = ? LIMIT 1", [officerId]);
    const officer = officerRows[0];
    if (!officer || officer.role !== "Officer") {
      return res.status(404).json({ error: "Officer not found" });
    }

    if (officer.region !== crimeReport.region) {
      return res.status(400).json({
        error: `Officer is assigned to ${officer.region} but crime is in ${crimeReport.region}`,
      });
    }

    await query("UPDATE CrimeReports SET officerInCharge = ? WHERE id = ?", [officer.id, crimeReportId]);

    const updatedRows = await query("SELECT * FROM CrimeReports WHERE id = ? LIMIT 1", [crimeReportId]);
    return res.json({ message: "Officer assigned to case successfully", crimeReport: updatedRows[0] });
  } catch (error) {
    console.error("Error appointing officer:", error.message);
    return res.status(500).json({ error: "Failed to appoint officer", details: error.message });
  }
});

// DELETE remove user (admin only)
app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminUsername } = req.query;

    const admin = await requireAdmin(adminUsername);
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const userRows = await query("SELECT id, username, isAdmin FROM Users WHERE id = ? LIMIT 1", [userId]);
    const user = userRows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Boolean(user.isAdmin)) {
      return res.status(400).json({ error: "Cannot delete admin user" });
    }

    await query("DELETE FROM Users WHERE id = ?", [userId]);

    return res.json({ message: "User removed successfully" });
  } catch (error) {
    console.error("Error removing user:", error.message);
    return res.status(500).json({ error: "Failed to remove user", details: error.message });
  }
});

// GET admin info
app.get("/api/admin/info", async (req, res) => {
  try {
    const { adminUsername } = req.query;

    const rows = await query(
      `
      SELECT id, username, name, email, phone, adminId, adminSignupDate, isAdmin
      FROM Users
      WHERE username = ? AND isAdmin = 1
      LIMIT 1
      `,
      [adminUsername]
    );

    const admin = rows[0];
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    return res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      adminId: admin.adminId,
      adminSignupDate: admin.adminSignupDate,
      isAdmin: Boolean(admin.isAdmin),
    });
  } catch (error) {
    console.error("Error fetching admin info:", error.message);
    return res.status(500).json({ error: "Failed to fetch admin info", details: error.message });
  }
});

async function startServer() {
  try {
    await initDatabase();
    console.log("Database initialized successfully");

    app.listen(3001, () => {
      console.log("Server is running on port 3001");
    });
  } catch (error) {
    console.error("Database error:", error.message);
    process.exit(1);
  }
}

startServer();
