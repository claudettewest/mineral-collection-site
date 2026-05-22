const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const dbPath = path.join(__dirname, 'minerals.db');
const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        console.error('Failed to open SQLite database:', error);
        process.exit(1);
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS minerals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            specimenId TEXT,
            name TEXT,
            type TEXT,
            groupName TEXT,
            subgroup TEXT,
            date TEXT,
            origin TEXT,
            description TEXT,
            photo TEXT,
            createdAt TEXT
        )
    `);
});

app.use(bodyParser.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'src')));

app.get('/api/minerals', (req, res) => {
    db.all('SELECT * FROM minerals ORDER BY id DESC', (error, rows) => {
        if (error) {
            console.error('Error fetching minerals:', error);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/minerals', (req, res) => {
    const { specimenId, name, type, group, subgroup, date, origin, description, photo } = req.body;

    if (!specimenId || !name || !type || !group || !subgroup || !date || !origin || !description) {
        return res.status(400).json({ error: 'Missing required mineral fields' });
    }

    const createdAt = new Date().toISOString();
    const sql = `
        INSERT INTO minerals (
            specimenId, name, type, groupName, subgroup, date, origin, description, photo, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [specimenId, name, type, group, subgroup, date, origin, description, photo || '', createdAt], function (error) {
        if (error) {
            console.error('Error saving mineral:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        db.get('SELECT * FROM minerals WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                console.error('Error fetching saved mineral:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json(row);
        });
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Mineral collection server running at http://localhost:${port}`);
});
