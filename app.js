const express = require('express');
const cors = require('cors');
const app = express();
const port = 8000;

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

app.use(cors());
app.use(express.json());

require("dotenv").config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_80neSdmGjoRi@ep-morning-base-a83jvhq1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require";

const {Pool} = require('pg');
const pool = new Pool({
      connectionString: databaseUrl ,
});


app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = `
            SELECT * FROM users WHERE email = $1;
        `;
        const result = await pool.query(query, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Email Not Exits." });
        }
        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user.id }, '10', { expiresIn: '30d' });

        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; 

        res.cookie('t_user', token,{
            httpOnly: true,      
            secure: true,        
            sameSite: 'Strict',  
            path: '/',           
            maxAge: THIRTY_DAYS
        })

        res.status(200).json({ message: "Login successful", userId: user.id });
    } catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/users", async (req, res) => {
    const {name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, isadmin, is_email_verified, is_phonenumber_verified } = req.body;
    try {

        const existingUserQuery = `
            SELECT * FROM users WHERE email = $1;
        `;
        const existingUserResult = await pool.query(existingUserQuery, [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "User with this email already exists" });
        }
        if (!name || !password || !email || !restaurentname || !branchname || !branchaddress || !phonenumber || !id || !country) {
            return res.status(400).json({registration_status: "Already Done", error: "All fields are required" });
        }
        console.log("one");
        const query = `
            INSERT INTO users (name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, isadmin, is_email_verified, is_phonenumber_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *;
        `;

        const hashedPassword = await bcrypt.hash(password, 10);
        const values = [name, hashedPassword, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, isadmin, is_email_verified, is_phonenumber_verified];
        const result = await pool.query(query, values);


        const token = jwt.sign({ userId: result.rows[0].id }, "10");

        res.status(201).json({registration_status: "Success" , user: result.rows[0], token });


    } catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({registration_status: "Failure", error: "Internal Server Error" });
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