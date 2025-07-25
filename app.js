const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 8000;

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

app.use(express.json());
app.use(cookieParser());

require("dotenv").config();

const allowedOrigins = [
  'http://localhost:3000',
  'https://ptabletrack.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_80neSdmGjoRi@ep-morning-base-a83jvhq1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require&channel_binding=require";

const {Pool} = require('pg');
const pool = new Pool({
      connectionString: databaseUrl ,
});


app.post("/restaurantLogin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const query = `
            SELECT * FROM restaurant_admin WHERE email = $1;
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

        res.status(200).json({ message: "Login successful", userId: user.id, token, user: { name: user.name, email: user.email} });
    } catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



app.post("/restaurant", async (req, res) => {
    const {name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, is_email_verified, is_phonenumber_verified } = req.body;
    try {
        const existingUserQuery = `
            SELECT * FROM restaurant_admin WHERE email = $1;
        `;
        const existingUserResult = await pool.query(existingUserQuery, [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "Restaurant with this email already exists" });
        }
        if (!name || !password || !email || !restaurentname || !branchname || !branchaddress || !phonenumber || !id || !country) {
            return res.status(400).json({registration_status: "Require Feilds", error: "All fields are required" });
        }
        const query = `
            INSERT INTO restaurant_admin (name, password, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, is_email_verified, is_phonenumber_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *;
        `;

        const hashedPassword = await bcrypt.hash(password, 10);
        const values = [name, hashedPassword, email, restaurentname, branchname, branchaddress, phonenumber, id, country, countrycode, is_email_verified, is_phonenumber_verified];
        const result = await pool.query(query, values);

        const token = jwt.sign({ userId: result.rows[0].id }, '10', { expiresIn: '30d' });

        res.status(201).json({registration_status: "Success" , user: result.rows[0], token });


    } catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({registration_status: "Failure", error: "Internal Server Error" });
    }
});


app.post("/restaurant_details/addAreas", async (req, res) => {
  const areas = req.body;

  if (!Array.isArray(areas) || areas.length === 0) {
    return res.status(400).json({ error: "Area list is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const area of areas) {
      const { area_id, area_name, restaurant_id } = area;
      if (!area_id || !area_name || !restaurant_id) {
        throw new Error("Missing fields in one of the area objects");
      }

    const checkResult = await client.query(
      "SELECT 1 FROM restaurant_area WHERE id = $1",
      [area_id]
    );

    if (checkResult.rowCount === 0) {
      await client.query(
        "INSERT INTO restaurant_area (id, area_name, restaurant_id) VALUES ($1, $2, $3)",
        [area_id, area_name, restaurant_id]
      );
    }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "All areas added successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inserting areas:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
});



app.post('/restaurant_details/addTable', async (req, res) => {
    const tables = req.body;
    if (!Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ error: "Tables list is required" });
    }
    // const { table_id, table_name, table_capacity, table_status, restaurant_id, area_id } = req.body;
    const client = await pool.connect();
    try{

        await client.query("BEGIN");

        for(const table of tables){
            const { table_id, table_name, table_capacity, table_status, restaurant_id, area_id } = table;
            if (!table_id || !table_name || !table_capacity || !table_status || !restaurant_id || !area_id) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const checkResult = await client.query(
                "SELECT 1 FROM restaurant_tables WHERE id = $1",
                [table_id]
                );

            if (checkResult.rowCount === 0) {
                const query = 'INSERT INTO restaurant_tables (id, name, seat_capacity, is_active, restaurant_id, area_id) VALUES ($1, $2, $3, $4, $5, $6);';
                await client.query(query, [table_id, table_name, table_capacity, table_status, restaurant_id, area_id]);    
            }
        }

        await client.query("COMMIT");
        res.status(201).json({ message: "All Tables added successfully" });

    }catch (error) {
        console.error("Error executing query:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }finally{
        client.release();
    }

});

app.post('/restaurant_details/addMenuCategory', async (req, res) => {
    const categories = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ error: "Category list is required" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const category of categories) {
            const { menu_category_id, menu_category_name, restaurant_id } = category;

            if (!menu_category_id || !menu_category_name || !restaurant_id) {
                throw new Error("Missing fields in one of the category objects");
            }

            const checkResult = await client.query(
                "SELECT 1 FROM restaurant_menu_category WHERE id = $1",
                [menu_category_id]
                );

            if (checkResult.rowCount === 0) {
                const query = `
                    INSERT INTO restaurant_menu_category (id, menu_category_name, restaurant_id)
                    VALUES ($1, $2, $3);
                `;
                await client.query(query, [menu_category_id, menu_category_name, restaurant_id]);
            }
        }

        await client.query("COMMIT");
        res.status(201).json({ message: "All menu categories added successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error inserting menu categories:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
});



app.post('/restaurant_details/addMenuItems', async (req, res) => {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Item list is required" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const item of items) {
            const {
                item_id,
                item_name,
                item_dec,
                item_price,
                item_menu_category_id,
                item_category,
                item_url,
                item_availabiliy,
                item_preparation_time,
                restaurant_id
            } = item;

            if (
                !item_id || !item_name || !item_dec || !item_price ||
                !item_menu_category_id || !item_category || !item_availabiliy ||
                !item_preparation_time || !restaurant_id
            ) {
                throw new Error("Missing fields in one of the item objects");
            }

            
            const checkResult = await client.query(
                "SELECT 1 FROM restaurant_menu_items WHERE id = $1",
                [item_id]
                );

            if (checkResult.rowCount === 0) {
                const query = `
                    INSERT INTO restaurant_menu_items
                    (id, item_name, item_category, item_dec, preparation_time, availability, image_url, price, menu_category_id, restaurant_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
                `;

                await client.query(query, [
                    item_id,
                    item_name,
                    item_category,
                    item_dec,
                    item_preparation_time,
                    item_availabiliy,
                    item_url,
                    item_price,
                    item_menu_category_id,
                    restaurant_id
                ]);
            }
        }

        await client.query("COMMIT");
        res.status(201).json({ message: "All menu items added successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error inserting menu items:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        client.release();
    }
});

app.get("/restaurant/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const query = 'SELECT * FROM restaurant_admin WHERE id = $1';
        const result = await pool.query(query, [id]);
        res.json(result.rows); // send the data as JSON
    } catch (error) {
        console.error("Got an error:", error);
        res.status(500).send("Server error");
    }
});


app.get("/restaurant", async (req, res) => {
    const url = "select * from restaurant_admin;";
    try {
        const result = await pool.query(url);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error executing query", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/ping", (req, res) => {
  res.send("pong");
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});