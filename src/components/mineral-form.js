class MineralForm {
    constructor() {
        this.onSubmitCallback = null;
        this.onCancelCallback = null;
        this.editingMineral = null;
        this.MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
        this.TYPE_OPTIONS = [
            'Element',
            'Mineral',
            'Fossil',
            'Manmade',
            'Igneous',
            'Sedimentary',
            'Metamorphic',
            'Meteorite',
            'Organic',
        ];
        this.GROUP_OPTIONS_BY_TYPE = {
            Element: ['Metals', 'Semimetals', 'Nonmetals'],
            Mineral: ['Sulfides', 'Halides', 'Oxides', 'Carbonates', 'Nitrates', 'Borates', 'Sulfates', 'Phosphates', 'Silicates'],
            Igneous: ['Felsic', 'Intermediate', 'Mafic', 'Ultramafic'],
            Sedimentary: ['Clastic', 'Chemical', 'Organic'],
            Metamorphic: ['Pelitic', 'Quartzpfeldspathic', 'Calcareous', 'Ultramafic', 'Amphibolitic', 'Serpentinite'],
        };
        this.FIELD_GROUPS = [
            {
                title: 'Basic Data',
                fields: [
                    { name: 'id', label: 'ID', disabled: true },
                    { name: 'specimenId', label: 'Specimen Number', required: true },
                    { name: 'name', label: 'Name', required: true },
                    { name: 'date', label: 'Date', type: 'date' },
                    { name: 'origin', label: 'Origin' },
                    { name: 'description', label: 'Description', multiline: true },
                    { name: 'gpsCoordinates', label: 'GPS Coordinates' },
                    { name: 'observations', label: 'Observations', multiline: true },
                    { name: 'createdAt', label: 'Created At', disabled: true },
                ],
            },
            {
                title: 'Photos',
                fields: [
                    { name: 'photos', label: 'Photos', type: 'file', multiple: true },
                ],
            },
            {
                title: 'Classification',
                fields: [
                    { name: 'type', label: 'Type', type: 'select' },
                    { name: 'groupName', label: 'Group Name' },
                    { name: 'subgroup', label: 'Subgroup' },
                    { name: 'strunz', label: 'Strunz' },
                    { name: 'dana', label: 'DANA' },
                ],
            },
            {
                title: 'Observable',
                fields: [
                    { name: 'colour', label: 'Colour' },
                    { name: 'streak', label: 'Streak' },
                    { name: 'hardness', label: 'Hardness' },
                    { name: 'magnetism', label: 'Magnetism' },
                    { name: 'cleavage', label: 'Cleavage' },
                    { name: 'fracture', label: 'Fracture' },
                    { name: 'luster', label: 'Luster' },
                    { name: 'transparency', label: 'Transparency' },
                    { name: 'uvShortwave', label: 'UV Shortwave' },
                    { name: 'uvLongwave', label: 'UV Longwave' },
                    { name: 'phosphorescence', label: 'Phosphorescence' },
                    { name: 'fluorescenceColour', label: 'Fluorescence Colour' },
                    { name: 'chartroyancy', label: 'Chartroyancy' },
                    { name: 'iridescence', label: 'Iridescence' },
                ],
            },
            {
                title: 'Tests',
                fields: [
                    { name: 'specificGravity', label: 'Specific Gravity' },
                    { name: 'refractiveIndex', label: 'Refractive Index' },
                    { name: 'crystalSystem', label: 'Crystal System' },
                    { name: 'hcl', label: 'HCL' },
                    { name: 'ammonia', label: 'Ammonia' },
                    { name: 'peroxide', label: 'Peroxide' },
                    { name: 'conductivity', label: 'Conductivity' },
                ],
            },
        ];
        this.EXTRA_FIELD_NAMES = [
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
            'dana',
        ];
    }

    render() {
        this.form = document.createElement('form');
        this.form.innerHTML = `
            ${this.FIELD_GROUPS.map((group) => this._renderFieldGroup(group)).join('')}
            <p class="augment-status" data-role="augment-status"></p>
            <div class="form-buttons">
                <button type="button" data-role="augment">Augment</button>
                <button type="button" data-role="update-photos" style="display:none;">Update</button>
                <button type="submit" data-role="submit">Save</button>
                <button type="button" data-role="cancel-edit" style="display:none;">Cancel</button>
            </div>
        `;

        const typeSelect = this.form.querySelector('select[name="type"]');
        this.TYPE_OPTIONS.forEach((option) => {
            const item = document.createElement('option');
            item.value = option;
            item.textContent = option;
            typeSelect.appendChild(item);
        });
        typeSelect.addEventListener('change', () => {
            this._updateGroupControl();
        });

        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this._submitForm({ returnToList: true });
        });
        this.form.querySelector('input[name="photos"]').addEventListener('change', (event) => {
            if (this._validatePhotoSizes(event.target)) {
                this._updatePhotoUpdateButton();
            }
        });
        this.form.querySelector('[data-role="cancel-edit"]').addEventListener('click', () => {
            this.clear();
            if (this.onCancelCallback) {
                this.onCancelCallback();
            }
        });
        this.form.querySelector('[data-role="augment"]').addEventListener('click', () => {
            this._augmentFromMindat();
        });
        this.form.querySelector('[data-role="update-photos"]').addEventListener('click', () => {
            this._submitForm({ returnToList: false });
        });
        this._setGeneratedFieldsForNewRecord();
        this._updateGroupControl();

        return this.form;
    }

    _submitForm(options = { returnToList: true }) {
        const photoInput = this.form.querySelector('input[name="photos"]');
        const photoFiles = Array.from(photoInput.files);

        if (!this._validatePhotoSizes(photoInput)) {
            return;
        }

        const existingPhotos = this.editingMineral ? this._getExistingPhotos(this.editingMineral) : [];
        const photosPromise = photoFiles.length
            ? Promise.all(photoFiles.map((file) => this._readPhoto(file)))
                .then((newPhotos) => [...existingPhotos, ...newPhotos])
            : Promise.resolve(existingPhotos);

        photosPromise
            .then((photos) => {
                const mineralData = {
                    id: this.editingMineral?.id,
                    specimenId: this.form.querySelector('input[name="specimenId"]').value,
                    name: this.form.querySelector('input[name="name"]').value,
                    type: this.form.querySelector('select[name="type"]').value,
                    groupName: this._getGroupValue(),
                    subgroup: this.form.querySelector('input[name="subgroup"]').value,
                    date: this.form.querySelector('input[name="date"]').value,
                    origin: this.form.querySelector('input[name="origin"]').value,
                    ...this._getExtraFieldValues(),
                    description: this.form.querySelector('textarea[name="description"]').value,
                    photos,
                    photo: photos[0]?.dataUrl || '',
                };

                if (this.onSubmitCallback) {
                    this.onSubmitCallback(mineralData, options);
                }
            })
            .catch((error) => {
                console.error('Error reading photos:', error);
                alert('Unable to read one or more selected photos.');
            });
    }

    _validatePhotoSizes(photoInput) {
        const oversizedFile = Array.from(photoInput.files)
            .find((file) => file.size > this.MAX_PHOTO_SIZE_BYTES);
        if (!oversizedFile) {
            return true;
        }

        alert(`${oversizedFile.name} is larger than the 5 GB limit.`);
        photoInput.value = '';
        return false;
    }

    _readPhoto(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                dataUrl: reader.result,
                name: file.name,
                size: file.size,
                type: file.type,
            });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    onSubmit(callback) {
        this.onSubmitCallback = callback;
    }

    onCancel(callback) {
        this.onCancelCallback = callback;
    }

    edit(mineral) {
        this.editingMineral = mineral;
        this.form.querySelector('input[name="id"]').value = this._formatId(mineral.id);
        this.form.querySelector('input[name="specimenId"]').value = mineral.specimenId || '';
        this.form.querySelector('input[name="name"]').value = mineral.name || '';
        this.form.querySelector('select[name="type"]').value = mineral.type || '';
        this._updateGroupControl(mineral.group || mineral.groupName || '');
        this.form.querySelector('input[name="subgroup"]').value = mineral.subgroup || '';
        this.form.querySelector('input[name="date"]').value = mineral.date || '';
        this.form.querySelector('input[name="origin"]').value = mineral.origin || '';
        this.EXTRA_FIELD_NAMES.forEach((fieldName) => {
            this.form.querySelector(`[name="${fieldName}"]`).value = mineral[fieldName] || '';
        });
        this.form.querySelector('textarea[name="description"]').value = mineral.description || '';
        this.form.querySelector('input[name="createdAt"]').value = mineral.createdAt || '';
        this.form.querySelector('input[name="photos"]').required = false;
        this._resetSectionState();
        this.form.querySelector('[data-role="submit"]').textContent = 'Save';
        this.form.querySelector('[data-role="update-photos"]').style.display = 'none';
        this.form.querySelector('[data-role="cancel-edit"]').style.display = '';
    }

    clear() {
        if (this.form) {
            this.form.reset();
            this.editingMineral = null;
            this._setGeneratedFieldsForNewRecord();
            this._updateGroupControl();
            this._setAugmentStatus('');
            this.form.querySelector('input[name="photos"]').required = false;
            this._resetSectionState();
            this.form.querySelector('[data-role="submit"]').textContent = 'Save';
            this.form.querySelector('[data-role="update-photos"]').style.display = 'none';
            this.form.querySelector('[data-role="cancel-edit"]').style.display = 'none';
        }
    }

    markSaved(mineral) {
        this.editingMineral = mineral;
        this.form.querySelector('input[name="photos"]').value = '';
        this.form.querySelector('[data-role="update-photos"]').style.display = 'none';
        this.form.querySelector('[data-role="submit"]').textContent = 'Save';
    }

    _getExistingPhotos(mineral) {
        if (Array.isArray(mineral.photos)) {
            return mineral.photos;
        }

        if (mineral.photos) {
            try {
                const photos = JSON.parse(mineral.photos);
                if (Array.isArray(photos)) {
                    return photos;
                }
            } catch (error) {
                console.error('Error parsing existing photos:', error);
            }
        }

        return mineral.photo ? [{ dataUrl: mineral.photo, name: mineral.name }] : [];
    }

    _renderFieldGroup(group) {
        const isBasicData = group.title === 'Basic Data';
        return `
            <details class="form-section"${isBasicData ? ' open' : ''}>
                <summary>${group.title}</summary>
                <div class="form-field-grid">
                    ${group.fields.map((field) => this._renderField(field)).join('')}
                </div>
            </details>
        `;
    }

    _renderField(field) {
        const required = field.required ? ' required' : '';
        const readonly = field.readonly ? ' readonly' : '';
        const disabled = field.disabled ? ' disabled' : '';
        const multiple = field.multiple ? ' multiple' : '';
        const type = field.type || 'text';
        let control = `<input type="${type}" name="${field.name}"${required}${readonly}${disabled}${multiple} />`;

        if (type === 'file') {
            control = `<input type="file" name="${field.name}" accept="image/*"${required}${multiple} />`;
        } else if (field.name === 'groupName') {
            control = `
                <select name="groupName" data-role="group-select" hidden>
                    <option value="">Select group</option>
                </select>
                <input type="text" name="groupNameText" data-role="group-input" />
            `;
        } else if (type === 'select') {
            control = `
                <select name="${field.name}"${required}>
                    <option value="">Select type</option>
                </select>
            `;
        } else if (field.multiline) {
            control = `<textarea name="${field.name}"${required}${readonly}${disabled}></textarea>`;
        }

        return `
            <div class="form-field">
                <label>
                    ${field.label}:
                    ${control}
                </label>
            </div>
        `;
    }

    _getExtraFieldValues() {
        return this.EXTRA_FIELD_NAMES.reduce((values, fieldName) => {
            values[fieldName] = this.form.querySelector(`[name="${fieldName}"]`).value;
            return values;
        }, {});
    }

    _updatePhotoUpdateButton() {
        const photoInput = this.form.querySelector('input[name="photos"]');
        const updateButton = this.form.querySelector('[data-role="update-photos"]');
        updateButton.style.display = this.editingMineral && photoInput.files.length ? '' : 'none';
    }

    _augmentFromMindat() {
        const name = this.form.querySelector('input[name="name"]').value.trim();
        const button = this.form.querySelector('[data-role="augment"]');
        if (!name) {
            this._setAugmentStatus('Enter a specimen name before using Augment.', true);
            return;
        }

        button.disabled = true;
        this._setAugmentStatus('Looking up mineral data...');
        fetch(`/api/mindat/lookup?name=${encodeURIComponent(name)}`)
            .then((response) => response.json().then((data) => ({ response, data })))
            .then(({ response, data }) => {
                if (!response.ok) {
                    throw new Error(data.error || 'Unable to look up mineral data');
                }

                this._applyAugmentFields(data.fields || {});
                const fieldCount = Object.values(data.fields || {}).filter((value) => String(value || '').trim()).length;
                this._setAugmentStatus(fieldCount
                    ? `Filled ${fieldCount} field(s) from Mindat.`
                    : 'Mindat was found, but no matching fields were available.');
            })
            .catch((error) => {
                this._setAugmentStatus(error.message, true);
            })
            .finally(() => {
                button.disabled = false;
            });
    }

    _applyAugmentFields(fields) {
        Object.entries(fields).forEach(([fieldName, value]) => {
            const trimmedValue = String(value || '').trim();
            if (!trimmedValue) {
                return;
            }

            if (fieldName === 'groupName') {
                this._updateGroupControl(trimmedValue);
                return;
            }

            const control = this.form.querySelector(`[name="${fieldName}"]`);
            if (control) {
                control.value = trimmedValue;
            }
        });
    }

    _setAugmentStatus(message, isError = false) {
        const status = this.form.querySelector('[data-role="augment-status"]');
        status.textContent = message;
        status.classList.toggle('error', isError);
    }

    _resetSectionState() {
        this.form.querySelectorAll('.form-section').forEach((section) => {
            section.open = section.querySelector('summary').textContent === 'Basic Data';
        });
    }

    _setGeneratedFieldsForNewRecord() {
        this.form.querySelector('input[name="createdAt"]').value = new Date().toISOString();
        this._loadNextId();
    }

    _loadNextId() {
        fetch('/api/minerals/next-id')
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Unable to load next mineral ID');
                }
                return response.json();
            })
            .then((data) => {
                if (!this.editingMineral) {
                    this.form.querySelector('input[name="id"]').value = data.formattedId || this._formatId(data.nextId);
                }
            })
            .catch((error) => {
                console.error('Error loading next mineral ID:', error);
                if (!this.editingMineral) {
                    this.form.querySelector('input[name="id"]').value = '';
                }
            });
    }

    _formatId(id) {
        return String(id || '').padStart(4, '0');
    }

    _updateGroupControl(value = this._getGroupValue()) {
        const type = this.form.querySelector('select[name="type"]').value;
        const options = this.GROUP_OPTIONS_BY_TYPE[type] || [];
        const groupSelect = this.form.querySelector('[data-role="group-select"]');
        const groupInput = this.form.querySelector('[data-role="group-input"]');

        if (options.length) {
            groupSelect.innerHTML = '<option value="">Select group</option>';
            options.forEach((option) => {
                const item = document.createElement('option');
                item.value = option;
                item.textContent = option;
                groupSelect.appendChild(item);
            });
            groupSelect.hidden = false;
            groupSelect.disabled = false;
            groupInput.hidden = true;
            groupInput.disabled = true;
            groupSelect.value = options.includes(value) ? value : '';
            groupInput.value = value;
            return;
        }

        groupSelect.hidden = true;
        groupSelect.disabled = true;
        groupInput.hidden = false;
        groupInput.disabled = false;
        groupInput.value = value;
    }

    _getGroupValue() {
        const groupSelect = this.form.querySelector('[data-role="group-select"]');
        const groupInput = this.form.querySelector('[data-role="group-input"]');

        return groupSelect && !groupSelect.hidden ? groupSelect.value : groupInput.value;
    }
}
