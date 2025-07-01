const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL ;

const {Pool} = require('pg');
const pool = new Pool({
      connectionString: databaseUrl ,
});

app.post("/users", async (req, res) => {
    const {name, password, email, restaurentName, branchName, branchAddress, phoneNumber, id } = req.body;
    try {

        const existingUserQuery = `
            SELECT * FROM users WHERE email = $1;
        `;
        const existingUserResult = await pool.query(existingUserQuery, [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "User with this email already exists" });
        }
        if (!name || !password || !email || !restaurentName || !branchName || !branchAddress || !phoneNumber) {
            return res.status(400).json({ error: "All fields are required" });
        }
        const query = `
            INSERT INTO users (name, password, email, restaurentName, branchName, branchAddress, phoneNumber, id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [name, password, email, restaurentName, branchName, branchAddress, phoneNumber, id];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error executing query", error);
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