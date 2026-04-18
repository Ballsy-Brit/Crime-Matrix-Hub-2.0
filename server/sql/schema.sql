CREATE DATABASE IF NOT EXISTS crimematrixhub2db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crimematrixhub2db;

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

CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_users_is_admin ON Users(isAdmin);
CREATE INDEX idx_crime_status ON CrimeReports(status);
CREATE INDEX idx_crime_region ON CrimeReports(region);
