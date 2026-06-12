const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Abcd_123456789',
    database: 'shiftswap'
});

async function seedDatabase() {
    console.log("🌱 Starting Database Seeding...");
    
    try {
        // Default password for all fake users
        const defaultPasswordHash = await bcrypt.hash("password123", 10);

        // 1. Insert Base Roles (if they don't exist)
        await pool.query(`INSERT IGNORE INTO Roles (id, title, max_weekly_hours) VALUES (1, 'Associate', 40), (2, 'Shift Lead', 45)`);
        console.log("✅ Roles ensured.");

        // Loop 3 Times for Organizations
        for (let i = 0; i < 3; i++) {
            const orgName = faker.company.name();
            const [orgResult] = await pool.query(`INSERT INTO Organizations (name) VALUES (?)`, [orgName]);
            const orgId = orgResult.insertId;
            console.log(`🏢 Created Org: ${orgName}`);

            // Loop 4 Times for Branches within this Org
            for (let j = 0; j < 4; j++) {
                const branchCode = faker.string.alphanumeric(6).toUpperCase();
                const branchName = faker.location.city() + ' Branch';
                const [branchResult] = await pool.query(
                    `INSERT INTO Branches (org_id, branch_code, name) VALUES (?, ?, ?)`, 
                    [orgId, branchCode, branchName]
                );
                const branchId = branchResult.insertId;
                console.log(`   📍 Created Branch: ${branchName} (Code: ${branchCode})`);

                // Create 1 Manager for the branch
                await pool.query(
                    `INSERT INTO Employees (branch_id, role_id, is_manager, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [branchId, 2, true, `manager@${branchCode.toLowerCase()}.com`, defaultPasswordHash, faker.person.firstName(), faker.person.lastName()]
                );

                // Loop 20 Times for Employees within this Branch
                for (let k = 0; k < 20; k++) {
                    const firstName = faker.person.firstName();
                    const lastName = faker.person.lastName();
                    // Using unique dummy emails to prevent SQL unique constraint errors
                    const email = faker.internet.email({ firstName, lastName, provider: 'shiftswap.local' });
                    
                    await pool.query(
                        `INSERT INTO Employees (branch_id, role_id, is_manager, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [branchId, 1, false, email, defaultPasswordHash, firstName, lastName]
                    );
                }
                console.log(`      👥 Added 1 Manager and 20 Employees.`);
            }
        }

        console.log("🎉 Seeding Complete! You now have a fully populated database.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seedDatabase();