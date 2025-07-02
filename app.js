const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

const bcrypt = require('bcrypt');

app.use(cors());
app.use(express.json());

require("dotenv").config();

const databaseUrl = "postgresql://neondb_owner:npg_80neSdmGjoRi@ep-morning-base-a83jvhq1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require" ;

const {Pool} = require('pg');
const pool = new Pool({
      connectionString: databaseUrl ,
});

app.post("/users", async (req, res) => {
    const {name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country } = req.body;
    try {

        const existingUserQuery = `
            SELECT * FROM users WHERE email = $1;
        `;
        const existingUserResult = await pool.query(existingUserQuery, [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "User with this email already exists" });
        }
        if (!name || !password || !email || !restaurentname || !branchname || !branchaddress || !phonenumber || !id || !country) {
            return res.status(400).json({ error: "All fields are required" });
        }
        console.log("one");
        const query = `
            INSERT INTO users (name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;

        const hashedPassword = await bcrypt.hash(password, 10);
        const values = [name, hashedPassword, email, restaurentname, branchname, branchaddress, phonenumber, id, country];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/users", async (req, res) => {
    const url = "select * from users";
    try {
        const result = await pool.query(url);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});