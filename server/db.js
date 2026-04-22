const mysql = require("mysql2/promise");
require("dotenv").config();

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "crimematrixhub2db";

let pool;

async function ensureIndex(tableName, indexName, columns) {
  const [rows] = await pool.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [indexName]);
  if (rows.length === 0) {
    await pool.query(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
}

function getConnectionConfig(includeDatabase) {
  return {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: includeDatabase ? DB_NAME : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

async function ensureNormalizedSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Region (
      region_id INT AUTO_INCREMENT PRIMARY KEY,
      region_name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`User\` (
      user_id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      password VARCHAR(255) NOT NULL,
      date_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS GeneralCitizen (
      user_id VARCHAR(64) PRIMARY KEY,
      CONSTRAINT fk_general_citizen_user FOREIGN KEY (user_id) REFERENCES \`User\`(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Admin (
      user_id VARCHAR(64) PRIMARY KEY,
      CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES \`User\`(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Officer (
      user_id VARCHAR(64) PRIMARY KEY,
      officer_no VARCHAR(100) NOT NULL UNIQUE,
      region_id INT NULL,
      CONSTRAINT fk_officer_user FOREIGN KEY (user_id) REFERENCES \`User\`(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_officer_region FOREIGN KEY (region_id) REFERENCES Region(region_id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Crime (
      case_id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled Crime',
      crime_type ENUM('Theft', 'Robbery', 'Burglary', 'Assault', 'Fraud', 'Vehicle Theft', 'Arson', 'Other') NOT NULL,
      description TEXT NOT NULL,
      crime_status ENUM('reviewing', 'verified', 'ongoing', 'closed') NOT NULL DEFAULT 'reviewing',
      reported_by VARCHAR(64) NULL,
      region_id INT NULL,
      verified_by VARCHAR(64) NULL,
      in_charge_officer VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_crime_reported_by_user FOREIGN KEY (reported_by) REFERENCES \`User\`(user_id) ON DELETE SET NULL,
      CONSTRAINT fk_crime_region FOREIGN KEY (region_id) REFERENCES Region(region_id) ON DELETE SET NULL,
      CONSTRAINT fk_crime_verified_by_officer FOREIGN KEY (verified_by) REFERENCES Officer(user_id) ON DELETE SET NULL,
      CONSTRAINT fk_crime_in_charge_officer FOREIGN KEY (in_charge_officer) REFERENCES Officer(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Assignment (
      officer_id VARCHAR(64) NOT NULL,
      case_id VARCHAR(64) NOT NULL,
      assigned_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(64) NULL,
      PRIMARY KEY (officer_id, case_id),
      CONSTRAINT fk_assignment_officer FOREIGN KEY (officer_id) REFERENCES Officer(user_id) ON DELETE CASCADE,
      CONSTRAINT fk_assignment_case FOREIGN KEY (case_id) REFERENCES Crime(case_id) ON DELETE CASCADE,
      CONSTRAINT fk_assignment_created_by_admin FOREIGN KEY (created_by) REFERENCES Admin(user_id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW CASE_HISTORY AS
    SELECT
      a.case_id,
      a.officer_id,
      a.assigned_date,
      a.created_by,
      c.crime_status,
      c.region_id
    FROM Assignment a
    JOIN Crime c ON c.case_id = a.case_id;
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW OCCURRENCE_COUNT AS
    SELECT
      r.region_id,
      r.region_name,
      COUNT(c.case_id) AS total_occurrences
    FROM Region r
    LEFT JOIN Crime c ON c.region_id = r.region_id
    GROUP BY r.region_id, r.region_name;
  `);
}

async function ensureCompatibilityTriggers() {
  await pool.query("DROP TRIGGER IF EXISTS trg_users_ai");
  await pool.query("DROP TRIGGER IF EXISTS trg_users_au");
  await pool.query("DROP TRIGGER IF EXISTS trg_users_ad");
  await pool.query("DROP TRIGGER IF EXISTS trg_crime_reports_ai");
  await pool.query("DROP TRIGGER IF EXISTS trg_crime_reports_au");
  await pool.query("DROP TRIGGER IF EXISTS trg_crime_reports_ad");

  await pool.query(`
    CREATE TRIGGER trg_users_ai
    AFTER INSERT ON Users
    FOR EACH ROW
    BEGIN
      INSERT INTO \`User\` (user_id, name, password, date_joined, status)
      VALUES (NEW.id, NEW.name, NEW.password, COALESCE(NEW.createdAt, NOW()), 'active')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        password = VALUES(password),
        date_joined = VALUES(date_joined),
        status = 'active';

      INSERT INTO Region (region_name)
      VALUES (NEW.region)
      ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);

      DELETE FROM Admin WHERE user_id = NEW.id;
      DELETE FROM Officer WHERE user_id = NEW.id;
      DELETE FROM GeneralCitizen WHERE user_id = NEW.id;

      IF NEW.isAdmin = 1 OR NEW.role = 'Admin' THEN
        INSERT IGNORE INTO Admin (user_id) VALUES (NEW.id);
      ELSEIF NEW.role = 'Officer' THEN
        INSERT INTO Officer (user_id, officer_no, region_id)
        VALUES (
          NEW.id,
          NEW.id,
          (SELECT region_id FROM Region WHERE region_name = NEW.region LIMIT 1)
        )
        ON DUPLICATE KEY UPDATE
          officer_no = VALUES(officer_no),
          region_id = VALUES(region_id);
      ELSE
        INSERT IGNORE INTO GeneralCitizen (user_id) VALUES (NEW.id);
      END IF;
    END
  `);

  await pool.query(`
    CREATE TRIGGER trg_users_au
    AFTER UPDATE ON Users
    FOR EACH ROW
    BEGIN
      INSERT INTO \`User\` (user_id, name, password, date_joined, status)
      VALUES (NEW.id, NEW.name, NEW.password, COALESCE(NEW.createdAt, NOW()), 'active')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        password = VALUES(password),
        date_joined = VALUES(date_joined),
        status = 'active';

      INSERT INTO Region (region_name)
      VALUES (NEW.region)
      ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);

      DELETE FROM Admin WHERE user_id = NEW.id;
      DELETE FROM Officer WHERE user_id = NEW.id;
      DELETE FROM GeneralCitizen WHERE user_id = NEW.id;

      IF NEW.isAdmin = 1 OR NEW.role = 'Admin' THEN
        INSERT IGNORE INTO Admin (user_id) VALUES (NEW.id);
      ELSEIF NEW.role = 'Officer' THEN
        INSERT INTO Officer (user_id, officer_no, region_id)
        VALUES (
          NEW.id,
          NEW.id,
          (SELECT region_id FROM Region WHERE region_name = NEW.region LIMIT 1)
        )
        ON DUPLICATE KEY UPDATE
          officer_no = VALUES(officer_no),
          region_id = VALUES(region_id);
      ELSE
        INSERT IGNORE INTO GeneralCitizen (user_id) VALUES (NEW.id);
      END IF;
    END
  `);

  await pool.query(`
    CREATE TRIGGER trg_users_ad
    AFTER DELETE ON Users
    FOR EACH ROW
    BEGIN
      DELETE FROM \`User\` WHERE user_id = OLD.id;
    END
  `);

  await pool.query(`
    CREATE TRIGGER trg_crime_reports_ai
    AFTER INSERT ON CrimeReports
    FOR EACH ROW
    BEGIN
      INSERT INTO Region (region_name)
      VALUES (NEW.region)
      ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);

      INSERT INTO Crime (
        case_id,
        title,
        crime_type,
        description,
        crime_status,
        reported_by,
        region_id,
        verified_by,
        in_charge_officer,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.title,
        NEW.crimeType,
        NEW.description,
        CASE NEW.status
          WHEN 'Pending' THEN 'reviewing'
          WHEN 'Verified' THEN 'verified'
          WHEN 'Closed' THEN 'closed'
          ELSE 'reviewing'
        END,
        NEW.reportedById,
        (SELECT region_id FROM Region WHERE region_name = NEW.region LIMIT 1),
        NEW.verifiedById,
        NEW.officerInCharge,
        COALESCE(NEW.createdAt, NOW()),
        COALESCE(NEW.updatedAt, NOW())
      )
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        crime_type = VALUES(crime_type),
        description = VALUES(description),
        crime_status = VALUES(crime_status),
        reported_by = VALUES(reported_by),
        region_id = VALUES(region_id),
        verified_by = VALUES(verified_by),
        in_charge_officer = VALUES(in_charge_officer),
        created_at = VALUES(created_at),
        updated_at = VALUES(updated_at);

      IF NEW.officerInCharge IS NOT NULL THEN
        INSERT INTO Assignment (officer_id, case_id, assigned_date, created_by)
        VALUES (NEW.officerInCharge, NEW.id, NOW(), NULL)
        ON DUPLICATE KEY UPDATE assigned_date = VALUES(assigned_date);
      ELSE
        DELETE FROM Assignment WHERE case_id = NEW.id;
      END IF;
    END
  `);

  await pool.query(`
    CREATE TRIGGER trg_crime_reports_au
    AFTER UPDATE ON CrimeReports
    FOR EACH ROW
    BEGIN
      INSERT INTO Region (region_name)
      VALUES (NEW.region)
      ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);

      INSERT INTO Crime (
        case_id,
        title,
        crime_type,
        description,
        crime_status,
        reported_by,
        region_id,
        verified_by,
        in_charge_officer,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.title,
        NEW.crimeType,
        NEW.description,
        CASE NEW.status
          WHEN 'Pending' THEN 'reviewing'
          WHEN 'Verified' THEN 'verified'
          WHEN 'Closed' THEN 'closed'
          ELSE 'reviewing'
        END,
        NEW.reportedById,
        (SELECT region_id FROM Region WHERE region_name = NEW.region LIMIT 1),
        NEW.verifiedById,
        NEW.officerInCharge,
        COALESCE(NEW.createdAt, NOW()),
        COALESCE(NEW.updatedAt, NOW())
      )
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        crime_type = VALUES(crime_type),
        description = VALUES(description),
        crime_status = VALUES(crime_status),
        reported_by = VALUES(reported_by),
        region_id = VALUES(region_id),
        verified_by = VALUES(verified_by),
        in_charge_officer = VALUES(in_charge_officer),
        created_at = VALUES(created_at),
        updated_at = VALUES(updated_at);

      IF NEW.officerInCharge IS NOT NULL THEN
        INSERT INTO Assignment (officer_id, case_id, assigned_date, created_by)
        VALUES (NEW.officerInCharge, NEW.id, NOW(), NULL)
        ON DUPLICATE KEY UPDATE assigned_date = VALUES(assigned_date);
      ELSE
        DELETE FROM Assignment WHERE case_id = NEW.id;
      END IF;
    END
  `);

  await pool.query(`
    CREATE TRIGGER trg_crime_reports_ad
    AFTER DELETE ON CrimeReports
    FOR EACH ROW
    BEGIN
      DELETE FROM Crime WHERE case_id = OLD.id;
    END
  `);
}

async function backfillNormalizedData() {
  await pool.query(`
    INSERT INTO Region (region_name)
    SELECT region_name FROM (
      SELECT DISTINCT region AS region_name FROM Users
      UNION
      SELECT DISTINCT region AS region_name FROM CrimeReports
    ) AS all_regions
    WHERE region_name IS NOT NULL AND region_name <> ''
    ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);
  `);

  await pool.query(`
    INSERT INTO \`User\` (user_id, name, password, date_joined, status)
    SELECT id, name, password, createdAt, 'active'
    FROM Users
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password = VALUES(password),
      date_joined = VALUES(date_joined),
      status = 'active';
  `);

  await pool.query(`DELETE FROM Admin`);
  await pool.query(`DELETE FROM Officer`);
  await pool.query(`DELETE FROM GeneralCitizen`);

  await pool.query(`
    INSERT IGNORE INTO Admin (user_id)
    SELECT id FROM Users WHERE isAdmin = 1 OR role = 'Admin';
  `);

  await pool.query(`
    INSERT INTO Officer (user_id, officer_no, region_id)
    SELECT
      u.id,
      u.id,
      (SELECT r.region_id FROM Region r WHERE r.region_name = u.region LIMIT 1)
    FROM Users u
    WHERE u.role = 'Officer'
    ON DUPLICATE KEY UPDATE
      officer_no = VALUES(officer_no),
      region_id = VALUES(region_id);
  `);

  await pool.query(`
    INSERT IGNORE INTO GeneralCitizen (user_id)
    SELECT id
    FROM Users
    WHERE (isAdmin = 0 OR isAdmin IS NULL)
      AND role <> 'Officer'
      AND role <> 'Admin';
  `);

  await pool.query(`
    INSERT INTO Crime (
      case_id,
      title,
      crime_type,
      description,
      crime_status,
      reported_by,
      region_id,
      verified_by,
      in_charge_officer,
      created_at,
      updated_at
    )
    SELECT
      c.id,
      c.title,
      c.crimeType,
      c.description,
      CASE c.status
        WHEN 'Pending' THEN 'reviewing'
        WHEN 'Verified' THEN 'verified'
        WHEN 'Closed' THEN 'closed'
        ELSE 'reviewing'
      END,
      c.reportedById,
      (SELECT r.region_id FROM Region r WHERE r.region_name = c.region LIMIT 1),
      c.verifiedById,
      c.officerInCharge,
      c.createdAt,
      c.updatedAt
    FROM CrimeReports c
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      crime_type = VALUES(crime_type),
      description = VALUES(description),
      crime_status = VALUES(crime_status),
      reported_by = VALUES(reported_by),
      region_id = VALUES(region_id),
      verified_by = VALUES(verified_by),
      in_charge_officer = VALUES(in_charge_officer),
      created_at = VALUES(created_at),
      updated_at = VALUES(updated_at);
  `);

  await pool.query(`
    INSERT INTO Assignment (officer_id, case_id, assigned_date, created_by)
    SELECT officerInCharge, id, updatedAt, NULL
    FROM CrimeReports
    WHERE officerInCharge IS NOT NULL
    ON DUPLICATE KEY UPDATE assigned_date = VALUES(assigned_date);
  `);
}

async function initDatabase() {
  const rootPool = mysql.createPool(getConnectionConfig(false));

  try {
    await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await rootPool.end();
  }

  pool = mysql.createPool(getConnectionConfig(true));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS Users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(30) NULL,
      photoUrl LONGTEXT NULL,
      region VARCHAR(100) NOT NULL,
      role ENUM('Officer', 'Citizen', 'Admin') NOT NULL DEFAULT 'Citizen',
      isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
      adminId VARCHAR(100) NULL UNIQUE,
      adminSignupDate DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS CrimeReports (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      region VARCHAR(100) NOT NULL,
      crimeType ENUM('Theft', 'Robbery', 'Burglary', 'Assault', 'Fraud', 'Vehicle Theft', 'Arson', 'Other') NOT NULL,
      status ENUM('Pending', 'Verified', 'Closed') NOT NULL DEFAULT 'Pending',
      reportedById VARCHAR(64) NOT NULL,
      verifiedById VARCHAR(64) NULL,
      officerInCharge VARCHAR(64) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_crime_reported_by FOREIGN KEY (reportedById) REFERENCES Users(id) ON DELETE CASCADE,
      CONSTRAINT fk_crime_verified_by FOREIGN KEY (verifiedById) REFERENCES Users(id) ON DELETE SET NULL,
      CONSTRAINT fk_crime_officer_in_charge FOREIGN KEY (officerInCharge) REFERENCES Users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await ensureIndex("Users", "idx_users_role", "role");
  await ensureIndex("Users", "idx_users_is_admin", "isAdmin");
  await ensureIndex("CrimeReports", "idx_crime_status", "status");
  await ensureIndex("CrimeReports", "idx_crime_region", "region");

  await ensureNormalizedSchema();
  await ensureCompatibilityTriggers();
  await backfillNormalizedData();
}

async function query(sql, params = []) {
  if (!pool) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = {
  initDatabase,
  query,
};
