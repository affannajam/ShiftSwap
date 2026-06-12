CREATE DATABASE IF NOT EXISTS shiftswap;
USE shiftswap;

CREATE TABLE Organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id INT NOT NULL,
    branch_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (org_id) REFERENCES Organizations(id) ON DELETE CASCADE
);

CREATE TABLE Roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    max_weekly_hours INT NOT NULL DEFAULT 40
);

CREATE TABLE Employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    role_id INT NOT NULL,
    is_manager BOOLEAN DEFAULT FALSE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    FOREIGN KEY (branch_id) REFERENCES Branches(id),
    FOREIGN KEY (role_id) REFERENCES Roles(id)
);

CREATE TABLE Schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id INT NOT NULL,
    shift_start DATETIME NOT NULL,
    shift_end DATETIME NOT NULL,
    FOREIGN KEY (emp_id) REFERENCES Employees(id)
);

CREATE TABLE Swap_Requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_schedule_id INT NOT NULL,
    target_schedule_id INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_schedule_id) REFERENCES Schedules(id),
    FOREIGN KEY (target_schedule_id) REFERENCES Schedules(id)
);

-- TRIGGER: Automatically swap shifts when a Manager approves
DELIMITER //
CREATE TRIGGER After_Swap_Approval
AFTER UPDATE ON Swap_Requests
FOR EACH ROW
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' THEN
        -- Store temporary emp_ids
        SET @emp1 = (SELECT emp_id FROM Schedules WHERE id = NEW.requester_schedule_id);
        SET @emp2 = (SELECT emp_id FROM Schedules WHERE id = NEW.target_schedule_id);
        
        -- Swap the employees in the schedules table
        UPDATE Schedules SET emp_id = @emp2 WHERE id = NEW.requester_schedule_id;
        UPDATE Schedules SET emp_id = @emp1 WHERE id = NEW.target_schedule_id;
    END IF;
END; //
DELIMITER ;