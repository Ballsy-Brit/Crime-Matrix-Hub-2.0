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
