const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const http = require('http');
const https = require('https');

const app = express();
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma3:1b';
const GEMMA_API_URL = process.env.GEMMA_API_URL || 'http://localhost:11434/api/generate';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const MINERAL_SELECT_FIELDS = [
    'id',
    'specimenId',
    'name',
    'type',
    'groupName',
    'subgroup',
    'date',
    'origin',
    'description',
    'gpsCoordinates',
    'observations',
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
    'strunz',
];
const MINERAL_SEARCH_FIELDS = [
    'specimenId',
    'name',
    'type',
    'groupName',
    'subgroup',
    'date',
    'origin',
    'description',
    'gpsCoordinates',
    'observations',
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
    'strunz',
];
const FIELD_ALIASES = [
    { field: 'specimenId', label: 'specimen ID', terms: ['specimen id', 'specimen ids', 'catalog number', 'catalog numbers'] },
    { field: 'name', label: 'name', terms: ['name', 'names', 'mineral name', 'mineral names'] },
    { field: 'type', label: 'type', terms: ['type', 'types'] },
    { field: 'groupName', label: 'group', terms: ['group', 'groups', 'group name', 'group names'] },
    { field: 'subgroup', label: 'subgroup', terms: ['subgroup', 'subgroups', 'sub group', 'sub groups'] },
    { field: 'date', label: 'date', terms: ['date', 'dates', 'collected date', 'collected dates', 'collection date', 'collection dates'] },
    { field: 'origin', label: 'origin', terms: ['origin', 'origins', 'locality', 'localities', 'location', 'locations'] },
    { field: 'description', label: 'description', terms: ['description', 'descriptions'] },
    { field: 'gpsCoordinates', label: 'GPS coordinates', terms: ['gps', 'coordinate', 'coordinates', 'gps coordinate', 'gps coordinates'] },
    { field: 'observations', label: 'observations', terms: ['observation', 'observations', 'note', 'notes'] },
    { field: 'colour', label: 'colour', terms: ['colour', 'colours', 'color', 'colors'] },
    { field: 'streak', label: 'streak', terms: ['streak', 'streaks'] },
    { field: 'hardness', label: 'hardness', terms: ['hardness', 'hardnesses', 'mohs'] },
    { field: 'specificGravity', label: 'specific gravity', terms: ['specific gravity', 'specific gravities', 'gravity', 'sg'] },
    { field: 'refractiveIndex', label: 'refractive index', terms: ['refractive index', 'refractive indexes', 'refractive indices', 'ri'] },
    { field: 'magnetism', label: 'magnetism', terms: ['magnetism', 'magnetic'] },
    { field: 'cleavage', label: 'cleavage', terms: ['cleavage', 'cleavages'] },
    { field: 'fracture', label: 'fracture', terms: ['fracture', 'fractures'] },
    { field: 'luster', label: 'luster', terms: ['luster', 'lusters', 'lustre', 'lustres'] },
    { field: 'crystalSystem', label: 'crystal system', terms: ['crystal system', 'crystal systems'] },
    { field: 'transparency', label: 'transparency', terms: ['transparency', 'transparent'] },
    { field: 'uvShortwave', label: 'shortwave UV', terms: ['shortwave uv', 'uv shortwave'] },
    { field: 'uvLongwave', label: 'longwave UV', terms: ['longwave uv', 'uv longwave'] },
    { field: 'phosphorescence', label: 'phosphorescence', terms: ['phosphorescence'] },
    { field: 'fluorescenceColour', label: 'fluorescence colour', terms: ['fluorescence colour', 'fluorescence colours', 'fluorescence color', 'fluorescence colors'] },
    { field: 'chartroyancy', label: 'chartroyancy', terms: ['chartroyancy', 'chatoyancy'] },
    { field: 'iridescence', label: 'iridescence', terms: ['iridescence'] },
    { field: 'hcl', label: 'HCL reaction', terms: ['hcl', 'acid'] },
    { field: 'ammonia', label: 'ammonia reaction', terms: ['ammonia'] },
    { field: 'peroxide', label: 'peroxide reaction', terms: ['peroxide'] },
    { field: 'conductivity', label: 'conductivity', terms: ['conductivity', 'conductive'] },
    { field: 'strunz', label: 'Strunz classification', terms: ['strunz'] },
];
const QUERY_STOPWORDS = new Set([
    'about',
    'again',
    'also',
    'all',
    'answer',
    'are',
    'based',
    'blank',
    'can',
    'catalog',
    'catalogue',
    'collection',
    'compare',
    'could',
    'data',
    'database',
    'detail',
    'details',
    'describe',
    'described',
    'describes',
    'does',
    'each',
    'empty',
    'find',
    'for',
    'from',
    'give',
    'have',
    'help',
    'how',
    'list',
    'many',
    'mineral',
    'minerals',
    'missing',
    'no',
    'not',
    'note',
    'notes',
    'of',
    'only',
    'please',
    'record',
    'records',
    'saved',
    'say',
    'show',
    'specimin',
    'specimins',
    'specimen',
    'specimens',
    'summarize',
    'summary',
    'tell',
    'that',
    'the',
    'their',
    'this',
    'unknown',
    'unset',
    'varieties',
    'variety',
    'what',
    'which',
    'without',
    'with',
    'you',
]);
const CATALOG_REFUSAL = 'The catalog does not contain enough information to answer that.';
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

app.post('/api/gemma', (req, res) => {
    const prompt = String(req.body.prompt || '').trim();
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const summaryQuery = getSummaryQuery(prompt);
    if (summaryQuery) {
        db.all(summaryQuery.sql, summaryQuery.params, (error, rows) => {
            if (error) {
                console.error('Error answering summary question:', error);
                return res.status(500).json({ error: 'Database error' });
            }

            return res.json({
                answer: formatSummaryAnswer(rows, summaryQuery),
                model: 'SQLite',
            });
        });
        return;
    }

    const countQuery = getCountQuery(prompt);
    if (countQuery) {
        db.get(countQuery.sql, countQuery.params, (error, row) => {
            if (error) {
                console.error('Error answering count question:', error);
                return res.status(500).json({ error: 'Database error' });
            }

            return res.json({
                answer: formatCountAnswer(row.count, countQuery.label),
                model: 'SQLite',
            });
        });
        return;
    }

    const catalogCountQuery = getCatalogCountQuery(prompt);
    if (catalogCountQuery) {
        db.get(catalogCountQuery.sql, catalogCountQuery.params, (error, row) => {
            if (error) {
                console.error('Error answering catalog count question:', error);
                return res.status(500).json({ error: 'Database error' });
            }

            return res.json({
                answer: formatCountAnswer(row.count, catalogCountQuery.label),
                model: 'SQLite',
            });
        });
        return;
    }

    const catalogQuery = buildCatalogQuery(prompt);
    runCatalogQuery(catalogQuery, (queryError, minerals) => {
        if (queryError) {
            console.error('Error querying mineral catalog:', queryError);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!minerals.length) {
            return res.json({
                answer: catalogQuery.existenceQuestion
                    || catalogQuery.listRecords
                    ? 'No matching catalog records were found.'
                    : !catalogQuery.whereClause
                    ? 'The mineral catalog is empty, so I cannot answer from catalog data yet.'
                    : CATALOG_REFUSAL,
                model: 'Catalog',
            });
        }

        if (catalogQuery.answerField) {
            return res.json({
                answer: formatFieldAnswer(minerals, catalogQuery.answerField),
                model: 'SQLite',
            });
        }

        if (catalogQuery.describeRecords) {
            return res.json({
                answer: formatRecordSummaryAnswer(minerals),
                model: 'SQLite',
            });
        }

        if (catalogQuery.listRecords || catalogQuery.existenceQuestion) {
            return res.json({
                answer: formatCatalogFallbackAnswer(minerals, catalogQuery),
                model: 'SQLite',
            });
        }

        const fullPrompt = buildGemmaPrompt(prompt, minerals, catalogQuery);
        callGemma(fullPrompt, (modelError, answer) => {
            if (modelError) {
                console.error('Question model request failed:', modelError.message);
                return res.status(502).json({
                    error: 'The question service is unavailable. Start Ollama and make sure the configured local model is installed.',
                    details: modelError.message,
                });
            }

            if (!answerUsesCatalogCitation(answer, minerals)) {
                return res.json({
                    answer: formatCatalogFallbackAnswer(minerals, catalogQuery),
                    model: 'Catalog',
                    warning: 'The generated response omitted catalog citations, so a deterministic catalog answer was returned instead.',
                });
            }

            res.json({ answer, model: GEMMA_MODEL });
        });
    });
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

app.delete('/api/minerals', (req, res) => {
    db.serialize(() => {
        db.run('DELETE FROM minerals', (deleteError) => {
            if (deleteError) {
                console.error('Error deleting all minerals:', deleteError);
                return res.status(500).json({ error: 'Database error' });
            }

            db.run("DELETE FROM sqlite_sequence WHERE name = 'minerals'", (sequenceError) => {
                if (sequenceError) {
                    console.error('Error resetting mineral ID sequence:', sequenceError);
                    return res.status(500).json({ error: 'Database error' });
                }

                res.json({
                    deleted: true,
                    nextId: 1,
                    formattedId: formatDisplayId(1),
                });
            });
        });
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

function getSummaryQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const isSummaryQuestion = /\b(summarize|summarise|summary|breakdown|grouped by|by)\b/.test(normalizedPrompt);
    if (!isSummaryQuestion) {
        return null;
    }

    const groupField = findGroupByField(normalizedPrompt);
    if (!groupField) {
        return null;
    }

    const catalogQuery = buildCatalogQueryWithoutAnswerField(prompt);
    const whereClause = catalogQuery.whereClause ? `WHERE ${catalogQuery.whereClause}` : '';

    return {
        field: groupField.field,
        label: groupField.label,
        params: catalogQuery.params,
        sql: `
            SELECT
                CASE
                    WHEN ${groupField.field} IS NULL OR TRIM(${groupField.field}) = '' THEN '(blank)'
                    ELSE TRIM(${groupField.field})
                END AS value,
                COUNT(*) AS count
            FROM minerals
            ${whereClause}
            GROUP BY value
            ORDER BY count DESC, value COLLATE NOCASE ASC
        `,
    };
}

function buildCatalogQueryWithoutAnswerField(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const filters = getCatalogFilters(normalizedPrompt, null);
    const groupField = findGroupByField(normalizedPrompt);
    const searchTerms = getSearchTerms(prompt, groupField, filters);
    const whereParts = [];
    const params = [];

    filters
        .filter((filter) => filter.fieldName !== groupField?.field)
        .forEach((filter) => {
            whereParts.push(filter.sql);
            params.push(...filter.params);
        });

    searchTerms.forEach((term) => {
        whereParts.push(`(${MINERAL_SEARCH_FIELDS.map((field) => `LOWER(${field}) LIKE ?`).join(' OR ')})`);
        MINERAL_SEARCH_FIELDS.forEach(() => {
            params.push(`%${escapeLike(term.toLowerCase())}%`);
        });
    });

    return {
        params,
        whereClause: whereParts.length ? whereParts.join(' AND ') : '',
    };
}

function findGroupByField(normalizedPrompt) {
    const byMatch = normalizedPrompt.match(/\b(?:by|per|for each)\s+([a-z][a-z ]{0,40})/);
    const targetText = byMatch ? byMatch[1].replace(/[?.!]+$/, '').trim() : normalizedPrompt;
    return FIELD_ALIASES.find((fieldInfo) => (
        fieldInfo.terms.some((term) => fieldTermMatches(targetText, term))
    )) || null;
}

function formatSummaryAnswer(rows, summaryQuery) {
    if (!rows.length) {
        return `No catalog records matched for summary by ${summaryQuery.label}.`;
    }

    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return [
        `Summary by ${summaryQuery.label} (${total} total):`,
        formatMarkdownTable(['Value', 'Count'], rows.map((row) => [row.value, row.count])),
    ].join('\n');
}

function getCountQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const isCountQuestion = /\b(how many|count|number of|total)\b/.test(normalizedPrompt);
    if (!isCountQuestion) {
        return null;
    }

    const filters = getCountFilters(normalizedPrompt);
    if (!filters.length) {
        if (getSearchTerms(prompt, null, []).length) {
            return null;
        }

        return {
            sql: 'SELECT COUNT(*) AS count FROM minerals',
            params: [],
            label: 'specimens in the database',
        };
    }

    return {
        sql: `SELECT COUNT(*) AS count FROM minerals WHERE ${filters.map((filter) => filter.sql).join(' AND ')}`,
        params: filters.flatMap((filter) => filter.params),
        label: `specimens with ${filters.map((filter) => filter.label).join(' and ')}`,
    };
}

function getCountFilters(normalizedPrompt) {
    const filters = [];
    filters.push(...getBlankFieldFilters(normalizedPrompt));
    addCountFilter(filters, normalizedPrompt, 'type', 'type', ['element', 'mineral', 'fossil', 'manmade', 'igneous', 'sedimentary', 'metamorphic', 'meteorite', 'organic']);
    addCountFilter(filters, normalizedPrompt, 'groupName', 'group', [
        'metals',
        'semimetals',
        'nonmetals',
        'sulfides',
        'halides',
        'oxides',
        'carbonates',
        'nitrates',
        'borates',
        'sulfates',
        'phosphates',
        'silicates',
        'felsic',
        'intermediate',
        'mafic',
        'ultramafic',
        'clastic',
        'chemical',
        'pelitic',
        'quartzpfeldspathic',
        'calcareous',
        'amphibolitic',
        'serpentinite',
    ]);

    const originMatch = normalizedPrompt.match(/\b(?:from|origin(?:ating)?\s+(?:from|in)|collected\s+(?:from|in))\s+([a-z0-9 .,'-]+)/);
    if (originMatch) {
        const origin = originMatch[1]
            .replace(/\b(in|are|is|do|does|have|my|catalog|collection|database|specimens?|minerals?)\b.*$/i, '')
            .replace(/[?.!]+$/, '')
            .trim();
        if (origin) {
            filters.push({
                fieldName: 'origin',
                params: [`%${origin}%`],
                sql: 'LOWER(origin) LIKE ?',
                value: `%${origin}%`,
                label: `origin matching "${origin}"`,
            });
        }
    }

    return filters;
}

function getBlankFieldFilters(normalizedPrompt) {
    const blankFieldTerms = /\b(no|without|missing|blank|empty|unset|unknown|not recorded)\b/;
    if (!blankFieldTerms.test(normalizedPrompt)) {
        return [];
    }

    return FIELD_ALIASES
        .filter((fieldInfo) => fieldInfo.terms.some((term) => {
            const pattern = escapeRegExp(term);
            return new RegExp(`\\b(?:no|without|missing|blank|empty|unset|unknown|not recorded)\\s+${pattern}\\b`).test(normalizedPrompt)
                || new RegExp(`\\b${pattern}\\s+(?:is\\s+)?(?:missing|blank|empty|unset|unknown|not recorded)\\b`).test(normalizedPrompt);
        }))
        .map((fieldInfo) => ({
            fieldName: fieldInfo.field,
            isBlankFilter: true,
            params: [],
            sql: `(${fieldInfo.field} IS NULL OR TRIM(${fieldInfo.field}) = '')`,
            value: '',
            label: `no ${fieldInfo.label}`,
        }));
}

function addCountFilter(filters, normalizedPrompt, fieldName, labelName, values) {
    values.forEach((value) => {
        const singular = value.endsWith('s') ? value.slice(0, -1) : value;
        const plural = value.endsWith('s') ? value : `${value}s`;
        const pattern = new RegExp(`\\b${escapeRegExp(value)}\\b|\\b${escapeRegExp(singular)}\\b|\\b${escapeRegExp(plural)}\\b`);
        if (pattern.test(normalizedPrompt)) {
            const values = Array.from(new Set([value, singular, plural]));
            filters.push({
                fieldName,
                params: values,
                sql: `LOWER(${fieldName}) IN (${values.map(() => '?').join(', ')})`,
                value,
                label: `${labelName} ${value}`,
            });
        }
    });
}

function formatCountAnswer(count, label) {
    const normalizedLabel = count === 1
        ? label.replace(/\brecords\b/g, 'record').replace(/\bmatches\b/g, 'match')
        : label;
    return `There ${count === 1 ? 'is' : 'are'} ${count} ${normalizedLabel}.`;
}

function getCatalogCountQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    if (!/\b(how many|count|number of|total)\b/.test(normalizedPrompt)) {
        return null;
    }

    const catalogQuery = buildCatalogQuery(prompt);
    if (!catalogQuery.whereClause) {
        return null;
    }

    return {
        sql: `
            SELECT COUNT(*) AS count
            FROM minerals
            WHERE ${catalogQuery.whereClause}
        `,
        params: catalogQuery.params,
        label: `matching catalog records${catalogQuery.searchTerms.length ? ` for ${catalogQuery.searchTerms.map((term) => `"${term}"`).join(', ')}` : ''}`,
    };
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCatalogQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const answerField = findRequestedField(normalizedPrompt);
    const requiresFullCatalog = shouldUseFullCatalog(normalizedPrompt);
    const describeRecords = /\b(describe|description|summarize|summarise|summary|overview)\b/.test(normalizedPrompt);
    const listRecords = /\b(show|list|which)\b/.test(normalizedPrompt);
    const existenceQuestion = /\b(do i have|any|have any)\b/.test(normalizedPrompt);
    const filters = getCatalogFilters(normalizedPrompt, answerField);
    const searchTerms = getSearchTerms(prompt, answerField, filters);
    const whereParts = [];
    const params = [];

    filters.forEach((filter) => {
        whereParts.push(filter.sql);
        params.push(...filter.params);
    });

    searchTerms.forEach((term) => {
        const searchableFields = getSearchFieldsForQuery(answerField);
        whereParts.push(`(${searchableFields.map((field) => `LOWER(${field}) LIKE ?`).join(' OR ')})`);
        searchableFields.forEach(() => {
            params.push(`%${escapeLike(term.toLowerCase())}%`);
        });
    });

    return {
        answerField,
        requestedFieldName: answerField?.field || '',
        description: buildCatalogQueryDescription(filters, searchTerms, requiresFullCatalog),
        describeRecords,
        existenceQuestion,
        listRecords,
        params,
        requiresFullCatalog,
        searchTerms,
        whereClause: whereParts.length ? whereParts.join(' AND ') : '',
    };
}

function getSearchFieldsForQuery(answerField) {
    if (!answerField) {
        return MINERAL_SEARCH_FIELDS;
    }

    return answerField.field === 'name'
        ? ['specimenId']
        : ['specimenId', 'name'];
}

function runCatalogQuery(catalogQuery, callback) {
    if ((catalogQuery.listRecords || catalogQuery.existenceQuestion || catalogQuery.describeRecords) && catalogQuery.searchTerms.length) {
        const identityQuery = buildSearchCatalogSql(catalogQuery, ['specimenId', 'name']);
        db.all(identityQuery.sql, identityQuery.params, (identityError, identityRows) => {
            if (identityError || identityRows.length) {
                callback(identityError, identityRows);
                return;
            }

            const query = buildCatalogSql(catalogQuery, false);
            db.all(query.sql, query.params, callback);
        });
        return;
    }

    if (catalogQuery.answerField && catalogQuery.searchTerms.length === 1) {
        const exactQuery = buildCatalogSql(catalogQuery, true);
        db.all(exactQuery.sql, exactQuery.params, (exactError, exactRows) => {
            if (exactError || exactRows.length) {
                callback(exactError, exactRows);
                return;
            }

            const fallbackQuery = buildCatalogSql(catalogQuery, false);
            db.all(fallbackQuery.sql, fallbackQuery.params, callback);
        });
        return;
    }

    const query = buildCatalogSql(catalogQuery, false);
    db.all(query.sql, query.params, callback);
}

function buildSearchCatalogSql(catalogQuery, searchFields) {
    const originalSearchFieldCount = getSearchFieldsForQuery(catalogQuery.answerField).length;
    const searchParamCount = catalogQuery.searchTerms.length * originalSearchFieldCount;
    const filterParams = catalogQuery.params.slice(0, catalogQuery.params.length - searchParamCount);
    const filterClause = getFilterWhereClause(catalogQuery);
    const searchParts = [];
    const searchParams = [];

    catalogQuery.searchTerms.forEach((term) => {
        searchParts.push(`(${searchFields.map((field) => `LOWER(${field}) LIKE ?`).join(' OR ')})`);
        searchFields.forEach(() => {
            searchParams.push(`%${escapeLike(term.toLowerCase())}%`);
        });
    });

    const whereClause = [filterClause, ...searchParts].filter(Boolean).join(' AND ');

    return {
        params: filterParams.concat(searchParams),
        sql: formatCatalogSql(whereClause),
    };
}

function buildCatalogSql(catalogQuery, exactIdentityMatch) {
    if (!exactIdentityMatch) {
        return {
            params: catalogQuery.params,
            sql: formatCatalogSql(catalogQuery.whereClause),
        };
    }

    const searchFieldCount = getSearchFieldsForQuery(catalogQuery.answerField).length;
    const searchParamCount = catalogQuery.searchTerms.length * searchFieldCount;
    const filterParams = catalogQuery.params.slice(0, catalogQuery.params.length - searchParamCount);
    const filterClause = getFilterWhereClause(catalogQuery);
    const exactParts = [];
    const exactParams = [];

    catalogQuery.searchTerms.forEach((term) => {
        exactParts.push('(LOWER(specimenId) = ? OR LOWER(name) = ?)');
        exactParams.push(term.toLowerCase(), term.toLowerCase());
    });

    const whereClause = [filterClause, exactParts.length ? `(${exactParts.join(' OR ')})` : '']
        .filter(Boolean)
        .join(' AND ');

    return {
        params: filterParams.concat(exactParams),
        sql: formatCatalogSql(whereClause),
    };
}

function getFilterWhereClause(catalogQuery) {
    if (!catalogQuery.searchTerms.length) {
        return catalogQuery.whereClause;
    }

    const parts = catalogQuery.whereClause.split(' AND ');
    return parts.slice(0, Math.max(0, parts.length - catalogQuery.searchTerms.length)).join(' AND ');
}

function formatCatalogSql(whereClause) {
    return `
        SELECT ${MINERAL_SELECT_FIELDS.join(', ')}
        FROM minerals
        ${whereClause ? `WHERE ${whereClause}` : ''}
        ORDER BY id DESC
    `;
}

function findRequestedField(normalizedPrompt) {
    const matches = FIELD_ALIASES
        .map((fieldInfo) => ({
            fieldInfo,
            score: fieldInfo.terms.reduce((bestScore, term) => {
                if (!fieldTermMatches(normalizedPrompt, term)) {
                    return bestScore;
                }
                return Math.max(bestScore, term.split(/\s+/).length);
            }, 0),
        }))
        .filter((match) => match.score > 0)
        .sort((left, right) => right.score - left.score);

    return matches[0]?.fieldInfo || null;
}

function shouldUseFullCatalog(normalizedPrompt) {
    return /\b(all|every|entire|whole|catalog|catalogue|collection|records|saved|latest|recent|newest|oldest|missing|compare|summary|summarize|summarise|overview)\b/.test(normalizedPrompt);
}

function getCatalogFilters(normalizedPrompt, answerField) {
    const filters = getCountFilters(normalizedPrompt);
    return filters
        .filter((filter) => filter.isBlankFilter || filter.fieldName !== answerField?.field)
        .map((filter) => ({
            params: filter.params,
            sql: filter.sql,
            value: filter.value,
            label: filter.label,
        }));
}

function getSearchTerms(prompt, answerField, filters = []) {
    const aliasWords = new Set();
    FIELD_ALIASES.forEach((fieldInfo) => {
        fieldInfo.terms.forEach((term) => {
            term.split(/\s+/).forEach((word) => aliasWords.add(word));
        });
        splitCamelCase(fieldInfo.field).forEach((word) => aliasWords.add(word));
    });

    if (answerField) {
        answerField.terms.forEach((term) => {
            term.split(/\s+/).forEach((word) => aliasWords.add(word));
        });
    }

    filters.forEach((filter) => {
        filter.params.forEach((param) => {
            String(param || '').split(/\s+/).forEach((word) => aliasWords.add(word));
        });
    });

    const quotedTerms = Array.from(prompt.matchAll(/"([^"]+)"/g))
        .map((match) => normalizeSearchTerm(match[1]))
        .filter(Boolean);
    const terms = prompt
        .replace(/"[^"]+"/g, ' ')
        .toLowerCase()
        .replace(/[^a-z0-9 .'-]/g, ' ')
        .split(/\s+/)
        .map(normalizeSearchTerm)
        .filter((term) => (
            term
            && !QUERY_STOPWORDS.has(term)
            && !aliasWords.has(term)
            && (term.length >= 3 || /^\d+$/.test(term))
        ));

    return Array.from(new Set([...quotedTerms, ...terms]));
}

function fieldTermMatches(normalizedPrompt, term) {
    return new RegExp(`\\b${escapeRegExp(term)}\\b`).test(normalizedPrompt);
}

function splitCamelCase(value) {
    return String(value || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

function normalizeSearchTerm(term) {
    const normalizedTerm = String(term || '')
        .toLowerCase()
        .replace(/'s\b/g, '')
        .replace(/[']/g, '')
        .replace(/^[.'-]+|[.'-]+$/g, '')
        .trim();

    return singularizeSearchTerm(normalizedTerm);
}

function singularizeSearchTerm(term) {
    if (term.length > 4 && term.endsWith('ies')) {
        return `${term.slice(0, -3)}y`;
    }

    if (
        term.length > 4
        && term.endsWith('s')
        && !term.endsWith('ss')
        && !term.endsWith('us')
        && !term.endsWith('is')
    ) {
        return term.slice(0, -1);
    }

    return term;
}

function buildCatalogQueryDescription(filters, searchTerms, requiresFullCatalog) {
    const parts = [];
    if (requiresFullCatalog && !filters.length && !searchTerms.length) {
        parts.push('all catalog records');
    }
    filters.forEach((filter) => parts.push(filter.label));
    searchTerms.forEach((term) => parts.push(`text matching "${term}"`));
    return parts.length ? parts.join(', ') : 'all catalog records';
}

function escapeLike(value) {
    return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildGemmaPrompt(userPrompt, minerals, catalogQuery) {
    const catalogRecords = minerals.map((mineral) => {
        const record = {};
        Object.entries(mineral).forEach(([key, value]) => {
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                record[key] = String(value);
            }
        });
        return record;
    });

    return [
        'You answer questions about a mineral collection catalog.',
        'The catalog records below are your only source of truth.',
        'Do not use general geology knowledge, training data, outside facts, assumptions, or guesses.',
        'If the catalog records do not contain enough information to answer, say: "The catalog does not contain enough information to answer that."',
        'Use field names exactly as provided in the JSON records. Do not treat type, groupName, and subgroup as interchangeable.',
        'When answering with facts, mention the relevant specimenId or catalog id from the records.',
        'Keep answers concise.',
        `Available catalog fields: ${MINERAL_SELECT_FIELDS.join(', ')}.`,
        `The server selected records using: ${catalogQuery.description}.`,
        '',
        'CATALOG_RECORDS_JSON:',
        JSON.stringify(catalogRecords, null, 2),
        '',
        `QUESTION: ${userPrompt}`,
    ].join('\n');
}

function formatFieldAnswer(minerals, answerField) {
    return formatMarkdownTable(
        ['Specimen ID', 'Name', 'Catalog ID', answerField.label],
        minerals.map((mineral) => [
            mineral.specimenId || '',
            mineral.name || '',
            mineral.id,
            formatCatalogValue(mineral[answerField.field]),
        ])
    );
}

function formatRecordSummaryAnswer(minerals) {
    return formatMarkdownTable(
        ['Specimen ID', 'Name', 'Catalog ID', 'Type', 'Group', 'Subgroup', 'Origin', 'Description', 'Observations', 'Strunz'],
        minerals.map((mineral) => [
            mineral.specimenId || '',
            mineral.name || '',
            mineral.id,
            mineral.type || '',
            mineral.groupName || '',
            mineral.subgroup || '',
            mineral.origin || '',
            mineral.description || '',
            mineral.observations || '',
            mineral.strunz || '',
        ])
    );
}

function formatCatalogValue(value) {
    const cleanedValue = String(value || '').trim();
    return cleanedValue || 'not recorded in the catalog';
}

function answerUsesCatalogCitation(answer, minerals) {
    if (!String(answer || '').trim()) {
        return false;
    }

    const normalizedAnswer = answer.toLowerCase();
    return minerals.some((mineral) => {
        const idReference = `id ${mineral.id}`;
        const specimenReference = String(mineral.specimenId || '').trim().toLowerCase();
        return normalizedAnswer.includes(idReference)
            || (specimenReference && normalizedAnswer.includes(specimenReference));
    });
}

function formatCatalogFallbackAnswer(minerals, catalogQuery) {
    if (catalogQuery?.answerField) {
        return formatFieldAnswer(minerals, catalogQuery.answerField);
    }

    const previewRows = minerals.slice(0, 25);

    const suffix = minerals.length > previewRows.length
        ? `\n${minerals.length - previewRows.length} more matching catalog record(s) were found.`
        : '';

    const prefix = catalogQuery?.existenceQuestion
        ? 'Yes. Matching catalog record(s):'
        : 'Matching catalog record(s):';

    return [
        prefix,
        formatMarkdownTable(
            ['Specimen ID', 'Name', 'Catalog ID', 'Type', 'Group', 'Subgroup', 'Origin'],
            previewRows.map((mineral) => [
                mineral.specimenId || '',
                mineral.name || '',
                mineral.id,
                mineral.type || '',
                mineral.groupName || '',
                mineral.subgroup || '',
                mineral.origin || '',
            ])
        ),
        suffix.trim(),
    ].filter(Boolean).join('\n');
}

function formatMarkdownTable(headers, rows) {
    return [
        `| ${headers.map(formatMarkdownCell).join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.map(formatMarkdownCell).join(' | ')} |`),
    ].join('\n');
}

function formatMarkdownCell(value) {
    const text = String(value ?? '').trim();
    return (text || 'not recorded')
        .replace(/\|/g, '/')
        .replace(/\r?\n/g, ' ');
}

function formatMineralReference(mineral) {
    const specimenId = String(mineral.specimenId || '').trim();
    const name = String(mineral.name || '').trim();
    const id = `id ${mineral.id}`;

    if (specimenId && name) {
        return `${specimenId} (${name}, ${id})`;
    }
    if (specimenId) {
        return `${specimenId} (${id})`;
    }
    if (name) {
        return `${name} (${id})`;
    }
    return id;
}

function callGemma(prompt, callback) {
    let url;
    try {
        url = new URL(GEMMA_API_URL);
    } catch (error) {
        callback(new Error('Invalid question service URL'));
        return;
    }

    const payload = JSON.stringify({
        model: GEMMA_MODEL,
        prompt,
        stream: false,
        options: {
            temperature: 0,
            top_p: 0.1,
            repeat_penalty: 1.2,
        },
    });
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 120000,
    }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
            body += chunk;
        });
        response.on('end', () => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                callback(new Error(`Question service returned HTTP ${response.statusCode}: ${body}`));
                return;
            }

            try {
                const parsed = JSON.parse(body);
                callback(null, parsed.response || '');
            } catch (error) {
                callback(new Error('Question service returned invalid JSON'));
            }
        });
    });

    request.on('timeout', () => {
        request.destroy(new Error('Question service request timed out'));
    });
    request.on('error', callback);
    request.write(payload);
    request.end();
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
