const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
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
            photos TEXT,
            createdAt TEXT
        )
    `);
    db.run('ALTER TABLE minerals ADD COLUMN photos TEXT', (error) => {
        if (error && !/duplicate column name/i.test(error.message)) {
            console.error('Error adding photos column:', error);
        }
    });
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
    const photos = normalizePhotos(req.body.photos, photo);

    if (!specimenId || !name || !type || !group || !subgroup || !date || !origin || !description) {
        return res.status(400).json({ error: 'Missing required mineral fields' });
    }

    if (!photos.length) {
        return res.status(400).json({ error: 'At least one photo is required' });
    }

    const oversizedPhoto = photos.find((item) => item.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) {
        return res.status(400).json({ error: `${oversizedPhoto.name || 'Photo'} exceeds the 5 GB limit` });
    }

    const createdAt = new Date().toISOString();
    const sql = `
        INSERT INTO minerals (
            specimenId, name, type, groupName, subgroup, date, origin, description, photo, photos, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        specimenId,
        name,
        type,
        group,
        subgroup,
        date,
        origin,
        description,
        photos[0]?.dataUrl || '',
        JSON.stringify(photos),
        createdAt,
    ], function (error) {
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

app.put('/api/minerals/:id', (req, res) => {
    const { specimenId, name, type, group, subgroup, date, origin, description, photo } = req.body;
    const photos = normalizePhotos(req.body.photos, photo);

    if (!specimenId || !name || !type || !group || !subgroup || !date || !origin || !description) {
        return res.status(400).json({ error: 'Missing required mineral fields' });
    }

    if (!photos.length) {
        return res.status(400).json({ error: 'At least one photo is required' });
    }

    const oversizedPhoto = photos.find((item) => item.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) {
        return res.status(400).json({ error: `${oversizedPhoto.name || 'Photo'} exceeds the 5 GB limit` });
    }

    const sql = `
        UPDATE minerals
        SET specimenId = ?,
            name = ?,
            type = ?,
            groupName = ?,
            subgroup = ?,
            date = ?,
            origin = ?,
            description = ?,
            photo = ?,
            photos = ?
        WHERE id = ?
    `;

    db.run(sql, [
        specimenId,
        name,
        type,
        group,
        subgroup,
        date,
        origin,
        description,
        photos[0]?.dataUrl || '',
        JSON.stringify(photos),
        req.params.id,
    ], function (error) {
        if (error) {
            console.error('Error updating mineral:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!this.changes) {
            return res.status(404).json({ error: 'Mineral not found' });
        }

        db.get('SELECT * FROM minerals WHERE id = ?', [req.params.id], (err, row) => {
            if (err) {
                console.error('Error fetching updated mineral:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(row);
        });
    });
});

app.delete('/api/minerals/:id', (req, res) => {
    db.run('DELETE FROM minerals WHERE id = ?', [req.params.id], function (error) {
        if (error) {
            console.error('Error deleting mineral:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!this.changes) {
            return res.status(404).json({ error: 'Mineral not found' });
        }

        res.status(204).send();
    });
});

function normalizePhotos(photos, fallbackPhoto) {
    if (Array.isArray(photos)) {
        return photos
            .map((item) => ({
                dataUrl: typeof item === 'string' ? item : item.dataUrl,
                name: typeof item === 'string' ? '' : item.name || '',
                size: typeof item === 'string' ? 0 : Number(item.size || 0),
                type: typeof item === 'string' ? '' : item.type || '',
            }))
            .filter((item) => item.dataUrl);
    }

    return fallbackPhoto ? [{ dataUrl: fallbackPhoto, name: '', size: 0, type: '' }] : [];
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

const requestedPort = Number(process.env.PORT) || 3000;
const maxPortAttempts = process.env.PORT ? 1 : 10;

function startServer(port, attemptsLeft = maxPortAttempts) {
    const server = app.listen(port, () => {
        console.log(`Mineral collection server running at http://localhost:${port}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE' && attemptsLeft > 1) {
            console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
            startServer(port + 1, attemptsLeft - 1);
            return;
        }

        console.error(`Failed to start server on port ${port}:`, error.message);
        process.exit(1);
    });
}

startServer(requestedPort);
