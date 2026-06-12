const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Abcd_123456789',
    database: 'shiftswap',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Secure Login Endpoint
app.post('/api/login', async (req, res) => {
    const { branchCode, roleType, email, password } = req.body;
    
    // Map the string roleType ('Manager' or 'Employee') to the database boolean integer
    const isManager = roleType === 'Manager' ? 1 : 0;
    
    try {
        // 1. Fetch user records by matching the branch code, role status, and email
        const [users] = await pool.query(`
            SELECT e.* FROM Employees e
            JOIN Branches b ON e.branch_id = b.id
            WHERE b.branch_code = ? AND e.is_manager = ? AND e.email = ?
        `, [branchCode, isManager, email]);

        // If no matching user record is found
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found or incorrect branch/role.' 
            });
        }

        const user = users[0];

        // 2. Compare incoming plain-text password with stored bcrypt hash
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        if (isPasswordMatch) {
            // Remove the sensitive password hash before sending data back to frontend
            delete user.password_hash;
            
            return res.json({ 
                success: true, 
                message: 'Authentication successful',
                user 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid password.' 
            });
        }
    } catch (err) {
        console.error("Database Login Error:", err);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server database error.' 
        });
    }
});

// 1. Get all shifts for a specific employee
app.get('/api/shifts/mine/:employeeId', async (req, res) => {
    try {
        const [shifts] = await pool.query(
            `SELECT * FROM Shifts WHERE employee_id = ? ORDER BY shift_date ASC`, 
            [req.params.employeeId]
        );
        res.json({ success: true, shifts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Employee posts a shift to the Trade Board
app.post('/api/trades/request', async (req, res) => {
    const { shiftId, requesterId } = req.body;
    try {
        await pool.query(
            `INSERT INTO ShiftTrades (shift_id, requester_id, status) VALUES (?, ?, 'Pending')`,
            [shiftId, requesterId]
        );
        res.json({ success: true, message: 'Shift posted to trade board!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Employee offers to cover a shift from the Trade Board
app.put('/api/trades/offer', async (req, res) => {
    const { tradeId, covererId } = req.body;
    try {
        await pool.query(
            `UPDATE ShiftTrades SET coverer_id = ?, status = 'Cover_Offered' WHERE id = ?`,
            [covererId, tradeId]
        );
        res.json({ success: true, message: 'Offer sent to manager for approval!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Manager fetches pending approvals & approves them
app.put('/api/trades/approve', async (req, res) => {
    const { tradeId, shiftId, covererId } = req.body;
    try {
        // Start a database transaction to ensure both updates happen safely
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // A. Update the trade status to Approved
            await connection.query(
                `UPDATE ShiftTrades SET status = 'Approved' WHERE id = ?`, 
                [tradeId]
            );
            
            // B. Reassign the actual shift to the new employee
            await connection.query(
                `UPDATE Shifts SET employee_id = ? WHERE id = ?`, 
                [covererId, shiftId]
            );

            await connection.commit();
            connection.release();
            
            res.json({ success: true, message: 'Trade officially approved and schedule updated!' });
        } catch (transactionError) {
            await connection.rollback();
            connection.release();
            throw transactionError;
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Manager fetches pending trade approvals for their branch
app.get('/api/trades/pending/:branchId', async (req, res) => {
    try {
        const [trades] = await pool.query(`
            SELECT st.id as trade_id, st.shift_id, st.requester_id, st.coverer_id, 
                   s.shift_date, s.start_time, s.end_time,
                   req.first_name as req_first, req.last_name as req_last,
                   cov.first_name as cov_first, cov.last_name as cov_last
            FROM ShiftTrades st
            JOIN Shifts s ON st.shift_id = s.id
            JOIN Employees req ON st.requester_id = req.id
            JOIN Employees cov ON st.coverer_id = cov.id
            WHERE s.branch_id = ? AND st.status = 'Cover_Offered'
        `, [req.params.branchId]);
        res.json({ success: true, trades });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Employee fetches available shifts on the trade board
app.get('/api/trades/available/:branchId/:employeeId', async (req, res) => {
    try {
        const [trades] = await pool.query(`
            SELECT st.id as trade_id, s.shift_date, s.start_time, s.end_time, req.first_name, req.last_name
            FROM ShiftTrades st
            JOIN Shifts s ON st.shift_id = s.id
            JOIN Employees req ON st.requester_id = req.id
            WHERE s.branch_id = ? AND st.status = 'Pending' AND st.requester_id != ?
        `, [req.params.branchId, req.params.employeeId]);
        res.json({ success: true, trades });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`ShiftSwap API running on port ${PORT}`);
});