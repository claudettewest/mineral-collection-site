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
    { field: 'specimenId', label: 'specimen ID', terms: ['specimen id', 'specimen', 'catalog number'] },
    { field: 'name', label: 'name', terms: ['name', 'mineral name'] },
    { field: 'type', label: 'type', terms: ['type'] },
    { field: 'groupName', label: 'group', terms: ['group'] },
    { field: 'subgroup', label: 'subgroup', terms: ['subgroup', 'sub group'] },
    { field: 'date', label: 'date', terms: ['date', 'collected date', 'collection date'] },
    { field: 'origin', label: 'origin', terms: ['origin', 'from', 'locality', 'location'] },
    { field: 'description', label: 'description', terms: ['description'] },
    { field: 'gpsCoordinates', label: 'GPS coordinates', terms: ['gps', 'coordinates', 'gps coordinates'] },
    { field: 'observations', label: 'observations', terms: ['observation', 'observations', 'notes'] },
    { field: 'colour', label: 'colour', terms: ['colour', 'color'] },
    { field: 'streak', label: 'streak', terms: ['streak'] },
    { field: 'hardness', label: 'hardness', terms: ['hardness', 'mohs'] },
    { field: 'specificGravity', label: 'specific gravity', terms: ['specific gravity', 'gravity', 'sg'] },
    { field: 'refractiveIndex', label: 'refractive index', terms: ['refractive index', 'ri'] },
    { field: 'magnetism', label: 'magnetism', terms: ['magnetism', 'magnetic'] },
    { field: 'cleavage', label: 'cleavage', terms: ['cleavage'] },
    { field: 'fracture', label: 'fracture', terms: ['fracture'] },
    { field: 'luster', label: 'luster', terms: ['luster', 'lustre'] },
    { field: 'crystalSystem', label: 'crystal system', terms: ['crystal system'] },
    { field: 'transparency', label: 'transparency', terms: ['transparency', 'transparent'] },
    { field: 'uvShortwave', label: 'shortwave UV', terms: ['shortwave uv', 'uv shortwave'] },
    { field: 'uvLongwave', label: 'longwave UV', terms: ['longwave uv', 'uv longwave'] },
    { field: 'phosphorescence', label: 'phosphorescence', terms: ['phosphorescence'] },
    { field: 'fluorescenceColour', label: 'fluorescence colour', terms: ['fluorescence colour', 'fluorescence color'] },
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
    'answer',
    'are',
    'based',
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
    'does',
    'each',
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
    'specimen',
    'specimens',
    'summarize',
    'summary',
    'tell',
    'that',
    'the',
    'their',
    'this',
    'what',
    'which',
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

    const catalogQuery = buildCatalogQuery(prompt);
    runCatalogQuery(catalogQuery, (queryError, minerals) => {
        if (queryError) {
            console.error('Error querying mineral catalog:', queryError);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!minerals.length) {
            return res.json({
                answer: !catalogQuery.whereClause
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

        const fullPrompt = buildGemmaPrompt(prompt, minerals, catalogQuery);
        callGemma(fullPrompt, (gemmaError, answer) => {
            if (gemmaError) {
                console.error('Gemma request failed:', gemmaError.message);
                return res.status(502).json({
                    error: 'Gemma is unavailable. Start Ollama and make sure the configured Gemma model is installed.',
                    details: gemmaError.message,
                    model: GEMMA_MODEL,
                    apiUrl: GEMMA_API_URL,
                });
            }

            if (!answerUsesCatalogCitation(answer, minerals)) {
                return res.json({
                    answer: formatCatalogFallbackAnswer(minerals),
                    model: 'Catalog',
                    warning: 'Gemma response omitted catalog citations, so a deterministic catalog answer was returned instead.',
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

function getCountQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const isCountQuestion = /\b(how many|count|number of|total)\b/.test(normalizedPrompt);
    if (!isCountQuestion) {
        return null;
    }

    const filters = getCountFilters(normalizedPrompt);
    if (!filters.length) {
        return {
            sql: 'SELECT COUNT(*) AS count FROM minerals',
            params: [],
            label: 'specimens in the database',
        };
    }

    return {
        sql: `SELECT COUNT(*) AS count FROM minerals WHERE ${filters.map((filter) => filter.sql).join(' AND ')}`,
        params: filters.map((filter) => filter.value),
        label: `specimens with ${filters.map((filter) => filter.label).join(' and ')}`,
    };
}

function getCountFilters(normalizedPrompt) {
    const filters = [];
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
        const origin = originMatch[1].replace(/[?.!]+$/, '').trim();
        if (origin) {
            filters.push({
                sql: 'LOWER(origin) LIKE ?',
                value: `%${origin}%`,
                label: `origin matching "${origin}"`,
            });
        }
    }

    return filters;
}

function addCountFilter(filters, normalizedPrompt, fieldName, labelName, values) {
    values.forEach((value) => {
        const singular = value.endsWith('s') ? value.slice(0, -1) : value;
        const plural = value.endsWith('s') ? value : `${value}s`;
        const pattern = new RegExp(`\\b${escapeRegExp(value)}\\b|\\b${escapeRegExp(singular)}\\b|\\b${escapeRegExp(plural)}\\b`);
        if (pattern.test(normalizedPrompt)) {
            filters.push({
                sql: `LOWER(${fieldName}) = ?`,
                value,
                label: `${labelName} ${value}`,
            });
        }
    });
}

function formatCountAnswer(count, label) {
    return `There ${count === 1 ? 'is' : 'are'} ${count} ${label}.`;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCatalogQuery(prompt) {
    const normalizedPrompt = prompt.toLowerCase();
    const answerField = findRequestedField(normalizedPrompt);
    const requiresFullCatalog = shouldUseFullCatalog(normalizedPrompt);
    const filters = getCatalogFilters(normalizedPrompt);
    const searchTerms = getSearchTerms(prompt, answerField);
    const whereParts = [];
    const params = [];

    filters.forEach((filter) => {
        whereParts.push(filter.sql);
        params.push(filter.value);
    });

    searchTerms.forEach((term) => {
        const searchableFields = answerField
            ? MINERAL_SEARCH_FIELDS.filter((field) => field !== answerField.field)
            : MINERAL_SEARCH_FIELDS;
        whereParts.push(`(${searchableFields.map((field) => `LOWER(${field}) LIKE ?`).join(' OR ')})`);
        searchableFields.forEach(() => {
            params.push(`%${escapeLike(term.toLowerCase())}%`);
        });
    });

    return {
        answerField,
        description: buildCatalogQueryDescription(filters, searchTerms, requiresFullCatalog),
        params,
        requiresFullCatalog,
        whereClause: whereParts.length ? whereParts.join(' AND ') : '',
    };
}

function runCatalogQuery(catalogQuery, callback) {
    const sql = `
        SELECT ${MINERAL_SELECT_FIELDS.join(', ')}
        FROM minerals
        ${catalogQuery.whereClause ? `WHERE ${catalogQuery.whereClause}` : ''}
        ORDER BY id DESC
    `;
    db.all(sql, catalogQuery.params, callback);
}

function findRequestedField(normalizedPrompt) {
    return FIELD_ALIASES.find((fieldInfo) => (
        fieldInfo.terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`).test(normalizedPrompt))
    )) || null;
}

function shouldUseFullCatalog(normalizedPrompt) {
    return /\b(all|every|entire|whole|catalog|catalogue|collection|records|saved|latest|recent|newest|oldest|missing|compare|summary|summarize|summarise|overview)\b/.test(normalizedPrompt);
}

function getCatalogFilters(normalizedPrompt) {
    const filters = getCountFilters(normalizedPrompt);
    return filters.map((filter) => ({
        sql: filter.sql,
        value: filter.value,
        label: filter.label,
    }));
}

function getSearchTerms(prompt, answerField) {
    const aliasWords = new Set();
    FIELD_ALIASES.forEach((fieldInfo) => {
        fieldInfo.terms.forEach((term) => {
            term.split(/\s+/).forEach((word) => aliasWords.add(word));
        });
    });

    if (answerField) {
        answerField.terms.forEach((term) => {
            term.split(/\s+/).forEach((word) => aliasWords.add(word));
        });
    }

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

function normalizeSearchTerm(term) {
    return String(term || '')
        .toLowerCase()
        .replace(/^[.'-]+|[.'-]+$/g, '')
        .trim();
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
        'When answering with facts, mention the relevant specimenId or catalog id from the records.',
        'Keep answers concise.',
        `The server selected records using: ${catalogQuery.description}.`,
        '',
        'CATALOG_RECORDS_JSON:',
        JSON.stringify(catalogRecords, null, 2),
        '',
        `QUESTION: ${userPrompt}`,
    ].join('\n');
}

function formatFieldAnswer(minerals, answerField) {
    const lines = minerals.map((mineral) => {
        const label = formatMineralReference(mineral);
        const value = mineral[answerField.field];
        return `${label}: ${answerField.label} is ${formatCatalogValue(value)}.`;
    });
    return lines.join('\n');
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

function formatCatalogFallbackAnswer(minerals) {
    const previewRows = minerals.slice(0, 25).map((mineral) => {
        const details = [
            mineral.type && `type: ${mineral.type}`,
            mineral.groupName && `group: ${mineral.groupName}`,
            mineral.subgroup && `subgroup: ${mineral.subgroup}`,
            mineral.origin && `origin: ${mineral.origin}`,
        ].filter(Boolean);
        return `${formatMineralReference(mineral)}${details.length ? ` (${details.join(', ')})` : ''}`;
    });

    const suffix = minerals.length > previewRows.length
        ? `\n${minerals.length - previewRows.length} more matching catalog record(s) were found.`
        : '';

    return `Matching catalog record(s):\n${previewRows.join('\n')}${suffix}`;
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
        callback(new Error(`Invalid GEMMA_API_URL: ${GEMMA_API_URL}`));
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
                callback(new Error(`Gemma API returned HTTP ${response.statusCode}: ${body}`));
                return;
            }

            try {
                const parsed = JSON.parse(body);
                callback(null, parsed.response || '');
            } catch (error) {
                callback(new Error('Gemma API returned invalid JSON'));
            }
        });
    });

    request.on('timeout', () => {
        request.destroy(new Error('Gemma request timed out'));
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
