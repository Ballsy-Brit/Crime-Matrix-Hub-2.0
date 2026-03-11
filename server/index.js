const express = require("express");
const cors = require("cors");
const { User, CrimeReport, sequelize } = require("./models");
const { Op } = require('sequelize');

const app = express();

app.use(cors());
app.use(express.json());

// Authenticate and sync database
sequelize.authenticate()
  .then(() => {
    console.log("✓ Database authenticated successfully");
    return sequelize.sync();
  })
  .then(() => {
    console.log("✓ Database synced successfully");
  })
  .catch((err) => {
    console.error("✗ Database error:", err.message);
    process.exit(1);
  });

// GET user by username
app.get("/api/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name, 
      email: user.email,
      phone: user.phone,
      region: user.region,
      photoUrl: user.photoUrl,
      isAdmin: user.isAdmin,
      adminId: user.adminId,
      adminSignupDate: user.adminSignupDate
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// GET user history (reports submitted or verified by the user)
app.get('/api/users/:username/history', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reports = await CrimeReport.findAll({
      where: {
        [Op.or]: [
          { reportedById: user.id },
          { verifiedById: user.id }
        ]
      },
      include: [
        { model: User, as: 'reportedByUser', attributes: ['id', 'username', 'name'] },
        { model: User, as: 'verifiedByOfficer', attributes: ['id', 'username', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role }, reports });
  } catch (error) {
    console.error('Error fetching user history:', error.message);
    res.status(500).json({ error: 'Failed to fetch user history', details: error.message });
  }
});

// PUT update user profile (simple editable fields)
app.put('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { name, email, phone, region, photoUrl } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If email is changing, ensure uniqueness
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.region = region || user.region;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;

    await user.save();
    res.json({ message: 'Profile updated', user: { id: user.id, username: user.username, name: user.name, email: user.email, phone: user.phone, region: user.region, photoUrl: user.photoUrl } });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// POST register new user
app.post("/api/users/register", async (req, res) => {
  try {
    const { name, email, phone, region, role, username, password, isAdmin } = req.body;

    console.log("New registration:", { name, email, phone, region, role, username, isAdmin });

    // Validate input
    if (!name || !email || !phone || !region || !role || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Fix database schema if needed for admin role
    if (isAdmin) {
      try {
        await sequelize.query(`ALTER TABLE Users MODIFY role ENUM('Officer', 'Citizen', 'Admin') NOT NULL DEFAULT 'Citizen'`);
      } catch (altError) {
        // Ignore if already altered
        console.log("Role ENUM already updated or error:", altError.message);
      }
    }

    // Check if admin already exists
    if (isAdmin) {
      const existingAdmin = await User.findOne({ where: { isAdmin: true } });
      if (existingAdmin) {
        return res.status(403).json({ error: "Admin already exists. Only one admin allowed." });
      }
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate unique ID
    let prefix, uniqueId;
    let adminId = null;
    let adminSignupDate = null;

    if (isAdmin) {
      prefix = 'admin';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      adminId = `${prefix}-${timestamp}-${random}`;
      adminSignupDate = new Date();
      uniqueId = adminId;
    } else {
      prefix = role === 'Officer' ? 'officer' : 'citizen';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      uniqueId = `${prefix}-${timestamp}-${random}`;
    }

    // Create user
    const user = await User.create({
      id: uniqueId,
      username,
      password, // In production, hash with bcrypt
      email,
      name,
      phone,
      region: region || (isAdmin ? 'All' : region),
      role: isAdmin ? 'Admin' : role,
      isAdmin: isAdmin || false,
      adminId: adminId,
      adminSignupDate: adminSignupDate,
    });

    console.log("User created:", uniqueId);

    res.status(201).json({
      message: "Account created successfully",
      userId: uniqueId,
      username: user.username,
      role: user.role,
      isAdmin: user.isAdmin,
      adminId: user.adminId,
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    res.status(500).json({ error: "Failed to create account", details: error.message });
  }
});

// GET all verified crime reports (for home page display)
app.get("/api/crime-reports", async (req, res) => {
  try {
    console.log("Fetching verified crimes...");
    const crimes = await CrimeReport.findAll({
      where: { status: ['Verified', 'Closed'] },
      attributes: ["id", "title", "description", "region", "crimeType", "status", "createdAt", "officerInCharge"],
      include: [
        { model: User, as: 'reportedByUser', attributes: ['id', 'username', 'name', 'phone'], required: false },
        { model: User, as: 'verifiedByOfficer', attributes: ['id', 'username', 'name'], required: false },
        { model: User, as: 'officerAssigned', attributes: ['id', 'username', 'name'], required: false }
      ],
      order: [["createdAt", "DESC"]],
    });
    console.log("Found", crimes.length, "verified crimes");
    res.json(crimes);
  } catch (error) {
    console.error("Error fetching crime reports:", error.message);
    res.status(500).json({ error: "Failed to fetch crime reports", details: error.message });
  }
});

// PATCH close crime report (officer closes a verified/ongoing case)
app.patch('/api/crime-reports/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { closedByUsername } = req.body;

    const officer = await User.findOne({ where: { username: closedByUsername, role: 'Officer' } });
    if (!officer) return res.status(404).json({ error: 'Officer not found' });

    const crimeReport = await CrimeReport.findByPk(id);
    if (!crimeReport) return res.status(404).json({ error: 'Crime report not found' });

    if (crimeReport.status === 'Closed') {
      return res.status(400).json({ error: 'Crime report already closed' });
    }

    // Only allow closing if report has been verified or not pending
    crimeReport.status = 'Closed';
    crimeReport.verifiedById = officer.id;
    await crimeReport.save();

    res.json({ message: 'Crime report closed', crimeReport });
  } catch (error) {
    console.error('Error closing crime report:', error.message);
    res.status(500).json({ error: 'Failed to close crime report', details: error.message });
  }
});

// POST new crime report (citizen submits report)
app.post("/api/crime-reports", async (req, res) => {
  try {
    const { title, description, region, crimeType, phone, reportedByUsername } = req.body;

    console.log("Crime report submission:", { title, region, crimeType, reportedByUsername });

    // Validate input
    if (!title || !description || !region || !crimeType || !reportedByUsername) {
      console.log("Missing fields:", { title, description, region, crimeType, reportedByUsername });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the user by username
    console.log("Looking for user:", reportedByUsername);
    const user = await User.findOne({ where: { username: reportedByUsername } });
    if (!user) {
      console.log("User not found:", reportedByUsername);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Found user:", user.id, user.username);

    // Create crime report
    const crimeReport = await CrimeReport.create({
      title,
      description,
      region,
      crimeType,
      reportedById: user.id,
      status: "Pending",
    });

    console.log("Crime report created:", crimeReport.id);
    res.status(201).json({
      message: "Crime report submitted successfully",
      crimeReport,
    });
  } catch (error) {
    console.error("Error creating crime report:", error.message);
    res.status(500).json({ error: "Failed to create crime report", details: error.message });
  }
});

// PATCH verify crime report (officer verifies report)
app.patch("/api/crime-reports/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedByUsername } = req.body;

    // Find the officer
    const officer = await User.findOne({ where: { username: verifiedByUsername, role: "Officer" } });
    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    // Get crime report
    const crimeReport = await CrimeReport.findByPk(id);
    if (!crimeReport) {
      return res.status(404).json({ error: "Crime report not found" });
    }

    // Validate region match
    if (crimeReport.region !== officer.region) {
      return res.status(403).json({ 
        error: `Officers can only verify crimes in their region. Crime is in ${crimeReport.region}, but you are assigned to ${officer.region}` 
      });
    }

    // Update crime report status to Verified
    crimeReport.status = "Verified";
    crimeReport.verifiedById = officer.id;
    await crimeReport.save();

    console.log("Crime verified:", id, "by", verifiedByUsername);
    res.json({ message: "Crime report verified successfully", crimeReport });
  } catch (error) {
    console.error("Error verifying crime report:", error.message);
    res.status(500).json({ error: "Failed to verify crime report", details: error.message });
  }
});

// GET pending reports (for officer dashboard)
app.get("/api/crime-reports/pending", async (req, res) => {
  try {
    const crimes = await CrimeReport.findAll({
      where: { status: "Pending" },
      include: [
        {
          model: User,
          as: "reportedByUser",
          attributes: ["username", "name", "email"],
          required: false,
        },
        {
          model: User,
          as: "officerAssigned",
          attributes: ["id", "username", "name"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(crimes);
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    res.status(500).json({ error: "Failed to fetch pending reports" });
  }
});

// GET all officers (admin only)
app.get("/api/admin/officers", async (req, res) => {
  try {
    const { adminUsername } = req.query;

    // Verify admin
    const admin = await User.findOne({ where: { username: adminUsername, isAdmin: true } });
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const officers = await User.findAll({
      where: { role: 'Officer' },
      attributes: ['id', 'username', 'name', 'email', 'phone', 'region', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json(officers);
  } catch (error) {
    console.error('Error fetching officers:', error.message);
    res.status(500).json({ error: 'Failed to fetch officers', details: error.message });
  }
});

// GET all users (admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const { adminUsername } = req.query;

    // Verify admin
    const admin = await User.findOne({ where: { username: adminUsername, isAdmin: true } });
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const users = await User.findAll({
      where: { isAdmin: false },
      attributes: ['id', 'username', 'name', 'email', 'phone', 'region', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// POST appoint officer to case (admin only)
app.post("/api/admin/appoint-officer", async (req, res) => {
  try {
    const { adminUsername, crimeReportId, officerId } = req.body;

    // Verify admin
    const admin = await User.findOne({ where: { username: adminUsername, isAdmin: true } });
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get crime report
    const crimeReport = await CrimeReport.findByPk(crimeReportId);
    if (!crimeReport) {
      return res.status(404).json({ error: 'Crime report not found' });
    }

    // Get officer
    const officer = await User.findByPk(officerId);
    if (!officer || officer.role !== 'Officer') {
      return res.status(404).json({ error: 'Officer not found' });
    }

    // Check if officer region matches crime region
    if (officer.region !== crimeReport.region) {
      return res.status(400).json({ 
        error: `Officer is assigned to ${officer.region} but crime is in ${crimeReport.region}` 
      });
    }

    // Assign officer to case
    crimeReport.officerInCharge = officer.id;
    await crimeReport.save();

    console.log(`Officer ${officer.username} assigned to case ${crimeReportId}`);
    res.json({ message: 'Officer assigned to case successfully', crimeReport });
  } catch (error) {
    console.error('Error appointing officer:', error.message);
    res.status(500).json({ error: 'Failed to appoint officer', details: error.message });
  }
});

// DELETE remove user (admin only)
app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminUsername } = req.query;

    // Verify admin
    const admin = await User.findOne({ where: { username: adminUsername, isAdmin: true } });
    if (!admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Cannot delete admin
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }

    await user.destroy();
    console.log(`User ${user.username} deleted by admin`);
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Error removing user:', error.message);
    res.status(500).json({ error: 'Failed to remove user', details: error.message });
  }
});

// GET admin info
app.get("/api/admin/info", async (req, res) => {
  try {
    const { adminUsername } = req.query;

    const admin = await User.findOne({ where: { username: adminUsername, isAdmin: true } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      adminId: admin.adminId,
      adminSignupDate: admin.adminSignupDate,
      isAdmin: admin.isAdmin,
    });
  } catch (error) {
    console.error('Error fetching admin info:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin info', details: error.message });
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});