CREATE DATABASE IF NOT EXISTS crimematrixhub2db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crimematrixhub2db;

-- Compatibility tables used by the current API layer.
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

-- Normalized schema from EER.
CREATE TABLE IF NOT EXISTS Region (
  region_id INT AUTO_INCREMENT PRIMARY KEY,
  region_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `User` (
  user_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  date_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS GeneralCitizen (
  user_id VARCHAR(64) PRIMARY KEY,
  CONSTRAINT fk_general_citizen_user FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Admin (
  user_id VARCHAR(64) PRIMARY KEY,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Officer (
  user_id VARCHAR(64) PRIMARY KEY,
  officer_no VARCHAR(100) NOT NULL UNIQUE,
  region_id INT NULL,
  CONSTRAINT fk_officer_user FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_officer_region FOREIGN KEY (region_id) REFERENCES Region(region_id) ON DELETE SET NULL
) ENGINE=InnoDB;

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
  CONSTRAINT fk_crime_reported_by_user FOREIGN KEY (reported_by) REFERENCES `User`(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_crime_region FOREIGN KEY (region_id) REFERENCES Region(region_id) ON DELETE SET NULL,
  CONSTRAINT fk_crime_verified_by_officer FOREIGN KEY (verified_by) REFERENCES Officer(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_crime_in_charge_officer FOREIGN KEY (in_charge_officer) REFERENCES Officer(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

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

CREATE OR REPLACE VIEW OCCURRENCE_COUNT AS
SELECT
  r.region_id,
  r.region_name,
  COUNT(c.case_id) AS total_occurrences
FROM Region r
LEFT JOIN Crime c ON c.region_id = r.region_id
GROUP BY r.region_id, r.region_name;

-- Keep normalized tables synchronized with compatibility tables.
DROP TRIGGER IF EXISTS trg_users_ai;
DROP TRIGGER IF EXISTS trg_users_au;
DROP TRIGGER IF EXISTS trg_users_ad;
DROP TRIGGER IF EXISTS trg_crime_reports_ai;
DROP TRIGGER IF EXISTS trg_crime_reports_au;
DROP TRIGGER IF EXISTS trg_crime_reports_ad;

DELIMITER $$

CREATE TRIGGER trg_users_ai
AFTER INSERT ON Users
FOR EACH ROW
BEGIN
  INSERT INTO `User` (user_id, name, password, date_joined, status)
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
END$$

CREATE TRIGGER trg_users_au
AFTER UPDATE ON Users
FOR EACH ROW
BEGIN
  INSERT INTO `User` (user_id, name, password, date_joined, status)
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
END$$

CREATE TRIGGER trg_users_ad
AFTER DELETE ON Users
FOR EACH ROW
BEGIN
  DELETE FROM `User` WHERE user_id = OLD.id;
END$$

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
END$$

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
END$$

CREATE TRIGGER trg_crime_reports_ad
AFTER DELETE ON CrimeReports
FOR EACH ROW
BEGIN
  DELETE FROM Crime WHERE case_id = OLD.id;
END$$

DELIMITER ;

-- Initial backfill from compatibility tables into normalized schema.
INSERT INTO Region (region_name)
SELECT region_name FROM (
  SELECT DISTINCT region AS region_name FROM Users
  UNION
  SELECT DISTINCT region AS region_name FROM CrimeReports
) AS all_regions
WHERE region_name IS NOT NULL AND region_name <> ''
ON DUPLICATE KEY UPDATE region_name = VALUES(region_name);

INSERT INTO `User` (user_id, name, password, date_joined, status)
SELECT id, name, password, createdAt, 'active'
FROM Users
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  date_joined = VALUES(date_joined),
  status = 'active';

DELETE FROM Admin;
DELETE FROM Officer;
DELETE FROM GeneralCitizen;

INSERT IGNORE INTO Admin (user_id)
SELECT id FROM Users WHERE isAdmin = 1 OR role = 'Admin';

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

INSERT IGNORE INTO GeneralCitizen (user_id)
SELECT id
FROM Users
WHERE (isAdmin = 0 OR isAdmin IS NULL)
  AND role <> 'Officer'
  AND role <> 'Admin';

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

INSERT INTO Assignment (officer_id, case_id, assigned_date, created_by)
SELECT officerInCharge, id, updatedAt, NULL
FROM CrimeReports
WHERE officerInCharge IS NOT NULL
ON DUPLICATE KEY UPDATE assigned_date = VALUES(assigned_date);
