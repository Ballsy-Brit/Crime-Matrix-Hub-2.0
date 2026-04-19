const express = require("express");
const cors = require("cors");
const dataService = require("./data");

const app = express();
const isDemoMode = dataService.mode === "memory";

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (isDemoMode) {
    res.setHeader("X-Demo-Mode", "true");
  }
  next();
});

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
  return dataService.getUserByUsername(username);
}

async function requireAdmin(adminUsername) {
  return dataService.requireAdmin(adminUsername);
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

    const rows = await dataService.getUserHistoryRows(user.id);

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
      const existingUser = await dataService.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const updatedName = name || user.name;
    const updatedEmail = email || user.email;
    const updatedPhone = phone || user.phone;
    const updatedRegion = region || user.region;
    const updatedPhotoUrl = photoUrl === undefined ? user.photoUrl : photoUrl;

    await dataService.updateUserProfileById(user.id, {
      name: updatedName,
      email: updatedEmail,
      phone: updatedPhone,
      region: updatedRegion,
      photoUrl: updatedPhotoUrl,
    });

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
      const existingAdminCount = await dataService.countAdmins();
      if (existingAdminCount > 0) {
        return res.status(403).json({ error: "Admin already exists. Only one admin allowed." });
      }
    }

    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const existingEmail = await dataService.findUserByEmail(email);
    if (existingEmail) {
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

    await dataService.createUser({
      id: uniqueId,
      username,
      password,
      email,
      name,
      phone,
      region: finalRegion,
      role: finalRole,
      isAdmin: Boolean(isAdmin),
      adminId,
      adminSignupDate,
    });

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
    const rows = await dataService.getVerifiedOrClosedCrimeRows();

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

    const officer = await dataService.getOfficerByUsername(closedByUsername);

    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    const crimeReport = await dataService.getCrimeById(id);

    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    if (crimeReport.status === "Closed") {
      return res.status(400).json({ error: "Crime report already closed" });
    }

    await dataService.closeCrimeById(id, officer.id);

    const updatedRow = await dataService.getCrimeById(id);
    return res.json({ message: "Crime report closed", crimeReport: updatedRow });
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

    await dataService.createCrimeReport({
      id: crimeId,
      title,
      description,
      region,
      crimeType,
      reportedById: user.id,
    });

    const createdRow = await dataService.getCrimeById(crimeId);

    return res.status(201).json({
      message: "Crime report submitted successfully",
      crimeReport: createdRow,
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

    const officer = await dataService.getOfficerByUsername(verifiedByUsername);

    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    const crimeReport = await dataService.getCrimeById(id);

    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    if (crimeReport.region !== officer.region) {
      return res.status(403).json({
        error: `Officers can only verify crimes in their region. Crime is in ${crimeReport.region}, but you are assigned to ${officer.region}`,
      });
    }

    await dataService.verifyCrimeById(id, officer.id);

    const updatedRow = await dataService.getCrimeById(id);
    return res.json({ message: "Crime report verified successfully", crimeReport: updatedRow });
  } catch (error) {
    console.error("Error verifying crime report:", error.message);
    return res.status(500).json({ error: "Failed to verify crime report", details: error.message });
  }
});

// GET pending reports (for officer dashboard)
app.get("/api/crime-reports/pending", async (_req, res) => {
  try {
    const rows = await dataService.getPendingCrimeRows();

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

    const officers = await dataService.getOfficersList();

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

    const users = await dataService.getNonAdminUsers();

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

    const crimeReport = await dataService.getCrimeById(crimeReportId);
    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    const officer = await dataService.getOfficerById(officerId);
    if (!officer || officer.role !== "Officer") {
      return res.status(404).json({ error: "Officer not found" });
    }

    if (officer.region !== crimeReport.region) {
      return res.status(400).json({
        error: `Officer is assigned to ${officer.region} but crime is in ${crimeReport.region}`,
      });
    }

    await dataService.assignOfficerToCrime(crimeReportId, officer.id);

    const updatedRow = await dataService.getCrimeById(crimeReportId);
    return res.json({ message: "Officer assigned to case successfully", crimeReport: updatedRow });
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

    const user = await dataService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Boolean(user.isAdmin)) {
      return res.status(400).json({ error: "Cannot delete admin user" });
    }

    await dataService.deleteUserById(userId);

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

    const admin = await dataService.getAdminInfoByUsername(adminUsername);
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
    await dataService.init();
    console.log(`Data service initialized (${dataService.mode})`);

    app.listen(3001, () => {
      console.log("Server is running on port 3001");
      if (isDemoMode) {
        console.log("Demo mode enabled: using in-memory data store");
      }
    });
  } catch (error) {
    console.error("Database error:", error.message);
    process.exit(1);
  }
}

startServer();
