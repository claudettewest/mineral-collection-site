const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

const app = express();
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const EXTRA_MINERAL_FIELDS = [
    'gpsCoordinates',
    'colour',
    'streak',
    'hardness',
    'specificGravity',
    'refractiveIndex',
    'magnetism',
    'cleavage',
    'fracture',
    'luster',
    'crystalSystem',
    'transparency',
    'uvShortwave',
    'uvLongwave',
    'phosphorescence',
    'fluorescenceColour',
    'chartroyancy',
    'iridescence',
    'hcl',
    'ammonia',
    'peroxide',
    'conductivity',
    'observations',
    'strunz',
];
const IMPORTABLE_FIELDS = [
    'specimenId',
    'name',
    'date',
    'origin',
    'description',
    'gpsCoordinates',
    'observations',
    'photo',
    'photos',
    'type',
    'groupName',
    'subgroup',
    'strunz',
    'colour',
    'streak',
    'hardness',
    'magnetism',
    'cleavage',
    'fracture',
    'luster',
    'transparency',
    'uvShortwave',
    'uvLongwave',
    'phosphorescence',
    'fluorescenceColour',
    'chartroyancy',
    'iridescence',
    'specificGravity',
    'refractiveIndex',
    'crystalSystem',
    'hcl',
    'ammonia',
    'peroxide',
    'conductivity',
];
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
            gpsCoordinates TEXT,
            colour TEXT,
            streak TEXT,
            hardness TEXT,
            specificGravity TEXT,
            refractiveIndex TEXT,
            magnetism TEXT,
            cleavage TEXT,
            fracture TEXT,
            luster TEXT,
            crystalSystem TEXT,
            transparency TEXT,
            uvShortwave TEXT,
            uvLongwave TEXT,
            phosphorescence TEXT,
            fluorescenceColour TEXT,
            chartroyancy TEXT,
            iridescence TEXT,
            hcl TEXT,
            ammonia TEXT,
            peroxide TEXT,
            conductivity TEXT,
            observations TEXT,
            strunz TEXT,
            createdAt TEXT
        )
    `);
    ['photos', ...EXTRA_MINERAL_FIELDS].forEach((field) => {
        db.run(`ALTER TABLE minerals ADD COLUMN ${field} TEXT`, (error) => {
            if (error && !/duplicate column name/i.test(error.message)) {
                console.error(`Error adding ${field} column:`, error);
            }
        });
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

app.get('/api/minerals/next-id', (req, res) => {
    db.get(`
        SELECT COALESCE(
            (SELECT seq FROM sqlite_sequence WHERE name = 'minerals'),
            (SELECT MAX(id) FROM minerals),
            0
        ) + 1 AS nextId
    `, (error, row) => {
        if (error) {
            console.error('Error fetching next mineral ID:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            nextId: row.nextId,
            formattedId: formatDisplayId(row.nextId),
        });
    });
});

app.get('/api/minerals/csv-template', (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mineral-upload-template.csv"');
    res.send(`${IMPORTABLE_FIELDS.join(',')}\n`);
});

app.post('/api/minerals/upload-csv', upload.single('csv'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
    }

    let records;
    try {
        records = parseMineralCsv(req.file.buffer.toString('utf8'));
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    if (!records.length) {
        return res.status(400).json({ error: 'CSV must contain at least one data row' });
    }

    const validationErrors = validateCsvRecords(records);
    if (validationErrors.length) {
        return res.status(400).json({
            error: 'CSV is not uploadable',
            details: validationErrors,
        });
    }

    insertCsvRecords(records, (error, addedCount) => {
        if (error) {
            console.error('Error importing CSV:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        res.status(201).json({ addedCount });
    });
});

app.post('/api/minerals', (req, res) => {
    const { specimenId, name, type, subgroup, date, origin, description, photo } = req.body;
    const group = req.body.groupName || req.body.group;
    const photos = normalizePhotos(req.body.photos, photo);

    if (!hasRequiredBasicFields(req.body)) {
        return res.status(400).json({ error: 'Missing required mineral fields' });
    }

    const oversizedPhoto = photos.find((item) => item.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) {
        return res.status(400).json({ error: `${oversizedPhoto.name || 'Photo'} exceeds the 5 GB limit` });
    }

    const createdAt = new Date().toISOString();
    const extraValues = getExtraMineralValues(req.body);
    const sql = `
        INSERT INTO minerals (
            specimenId, name, type, groupName, subgroup, date, origin, description, photo, photos,
            ${EXTRA_MINERAL_FIELDS.join(', ')}, createdAt
        ) VALUES (${Array.from({ length: 11 + EXTRA_MINERAL_FIELDS.length }, () => '?').join(', ')})
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
        ...extraValues,
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
    const { specimenId, name, type, subgroup, date, origin, description, photo } = req.body;
    const group = req.body.groupName || req.body.group;
    const photos = normalizePhotos(req.body.photos, photo);

    if (!hasRequiredBasicFields(req.body)) {
        return res.status(400).json({ error: 'Missing required mineral fields' });
    }

    const oversizedPhoto = photos.find((item) => item.size > MAX_PHOTO_SIZE_BYTES);
    if (oversizedPhoto) {
        return res.status(400).json({ error: `${oversizedPhoto.name || 'Photo'} exceeds the 5 GB limit` });
    }

    const extraValues = getExtraMineralValues(req.body);
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
            photos = ?,
            ${EXTRA_MINERAL_FIELDS.map((field) => `${field} = ?`).join(',\n            ')}
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
        ...extraValues,
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

function getExtraMineralValues(body) {
    return EXTRA_MINERAL_FIELDS.map((field) => body[field] || '');
}

function hasRequiredBasicFields(body) {
    return [
        'specimenId',
        'name',
        'date',
        'origin',
        'description',
        'gpsCoordinates',
        'observations',
    ].every((field) => String(body[field] || '').trim());
}

function formatDisplayId(id) {
    return String(id || '').padStart(4, '0');
}

function parseMineralCsv(csvText) {
    const text = csvText.replace(/^\uFEFF/, '').trim();
    if (!text) {
        throw new Error('CSV file is empty');
    }

    const rows = parseCsvRows(text);
    const headers = rows[0].map((header) => header.trim());
    const unknownHeaders = headers.filter((header) => !IMPORTABLE_FIELDS.includes(header));
    if (unknownHeaders.length) {
        throw new Error(`Unknown CSV field(s): ${unknownHeaders.join(', ')}`);
    }

    const missingHeaders = IMPORTABLE_FIELDS.filter((field) => !headers.includes(field));
    if (missingHeaders.length) {
        throw new Error(`Missing CSV field(s): ${missingHeaders.join(', ')}`);
    }

    return rows.slice(1)
        .filter((row) => row.some((value) => value.trim()))
        .map((row) => headers.reduce((record, header, index) => {
            record[header] = row[index] || '';
            return record;
        }, {}));
}

function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const nextChar = text[index + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                value += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                index += 1;
            }
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    if (inQuotes) {
        throw new Error('CSV contains an unterminated quoted value');
    }

    row.push(value);
    rows.push(row);
    return rows;
}

function validateCsvRecords(records) {
    const errors = [];
    records.forEach((record, index) => {
        if (!hasRequiredBasicFields(record)) {
            errors.push(`Row ${index + 2}: missing required Basic Data field`);
        }

        const photos = normalizePhotos(record.photos ? safeParsePhotos(record.photos) : [], record.photo);
        const oversizedPhoto = photos.find((item) => item.size > MAX_PHOTO_SIZE_BYTES);
        if (oversizedPhoto) {
            errors.push(`Row ${index + 2}: ${oversizedPhoto.name || 'Photo'} exceeds the 5 GB limit`);
        }
    });

    return errors;
}

function safeParsePhotos(value) {
    if (!value) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return value;
    }
}

function insertCsvRecords(records, callback) {
    const sql = `
        INSERT INTO minerals (
            specimenId, name, type, groupName, subgroup, date, origin, description, photo, photos,
            ${EXTRA_MINERAL_FIELDS.join(', ')}, createdAt
        ) VALUES (${Array.from({ length: 11 + EXTRA_MINERAL_FIELDS.length }, () => '?').join(', ')})
    `;
    const createdAt = new Date().toISOString();

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const statement = db.prepare(sql);
        let failed = false;

        records.forEach((record) => {
            if (failed) {
                return;
            }

            const photos = normalizePhotos(record.photos ? safeParsePhotos(record.photos) : [], record.photo);
            statement.run([
                record.specimenId,
                record.name,
                record.type,
                record.groupName,
                record.subgroup,
                record.date,
                record.origin,
                record.description,
                photos[0]?.dataUrl || record.photo || '',
                JSON.stringify(photos),
                ...getExtraMineralValues(record),
                createdAt,
            ], (error) => {
                if (error) {
                    failed = true;
                }
            });
        });

        statement.finalize((statementError) => {
            if (statementError || failed) {
                db.run('ROLLBACK', () => callback(statementError || new Error('CSV insert failed')));
                return;
            }

            db.run('COMMIT', (commitError) => callback(commitError, records.length));
        });
    });
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
