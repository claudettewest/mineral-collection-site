class MineralList {
    constructor() {
        this.minerals = [];
        this.onEditCallback = null;
        this.onDeleteCallback = null;
        this.onPhotosCallback = null;
        this.photoTargetMineral = null;
        this.MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024;
        this.ACCEPTED_PHOTO_TYPES = new Set([
            'image/jpeg',
            'image/png',
            'image/heic',
            'image/heif',
            'image/webp',
        ]);
        this.sortField = null;
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.isCompactListView = false;
        this.columns = [
            { field: 'specimenId', label: 'Specimen Number' },
            { field: 'name', label: 'Name' },
            { field: 'variety', label: 'Variety' },
            { field: 'type', label: 'Type' },
            { field: 'groupName', label: 'Group Name' },
            { field: 'subgroup', label: 'Subgroup' },
            { field: 'thumbnail', label: 'Photo', sortable: false },
        ];
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'mineral-list';
        this.container.innerHTML = `
            <h2>My-Geo-Collection.com</h2>
            <p class="collection-note">Click on specimen to view details.</p>
            <div class="collection-actions">
                <button type="button" data-action="open-photo-upload">Add Photos</button>
            </div>
            <form class="mineral-search" role="search">
                <label>
                    Search entries
                    <input type="search" name="search" placeholder="Specimen number, name, origin, group..." autocomplete="off">
                </label>
                <button type="submit">Search</button>
                <button type="button" data-action="clear-search">Clear</button>
            </form>
            <table>
                <thead>
                    <tr>
                        ${this.columns.map((column) => `
                            <th>
                                ${column.sortable === false
                                    ? column.label
                                    : `<button class="sort-header" type="button" data-sort-field="${column.field}">
                                        ${column.label}
                                        <span class="sort-indicator" aria-hidden="true"></span>
                                    </button>`}
                            </th>
                        `).join('')}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <dialog class="mineral-details-dialog" data-role="details-dialog">
                <div class="mineral-details-content">
                    <div class="details-header">
                        <h3 data-role="details-title"></h3>
                        <button class="icon-button" type="button" data-action="close-details" aria-label="Close details">&times;</button>
                    </div>
                    <div class="details-photo-strip-wrap" data-role="details-photos-wrap" hidden>
                        <button class="icon-button" type="button" data-action="scroll-photos-left" aria-label="Previous photos">&lsaquo;</button>
                        <div class="details-photos" data-role="details-photos"></div>
                        <button class="icon-button" type="button" data-action="scroll-photos-right" aria-label="Next photos">&rsaquo;</button>
                    </div>
                    <dl data-role="details-body"></dl>
                    <div class="form-buttons">
                        <button type="button" data-action="details-edit">Edit</button>
                        <button class="danger-button" type="button" data-action="details-delete">Delete</button>
                    </div>
                </div>
            </dialog>
            <dialog class="photo-viewer-dialog" data-role="photo-viewer">
                <div class="photo-viewer-content">
                    <button class="icon-button" type="button" data-action="close-photo-viewer" aria-label="Close photo">&times;</button>
                    <img data-role="photo-viewer-image" alt="">
                </div>
            </dialog>
            <dialog class="photo-upload-dialog" data-role="photo-upload-dialog">
                <form method="dialog" class="photo-upload-form" data-role="photo-upload-form">
                    <div class="details-header">
                        <h3>Add Photos</h3>
                        <button class="icon-button" type="button" data-action="close-photo-upload" aria-label="Close photo upload">&times;</button>
                    </div>
                    <label>
                        Specimen Number
                        <input type="text" name="photoSpecimenId" autocomplete="off">
                    </label>
                    <p class="photo-upload-match" data-role="photo-upload-match">Enter a specimen number.</p>
                    <label>
                        Photos
                        <input type="file" name="photoFiles" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp" multiple disabled>
                    </label>
                    <p class="upload-status" data-role="photo-upload-status" aria-live="polite"></p>
                    <div class="form-buttons">
                        <button type="submit" data-action="save-photo-upload" disabled>Save Photos</button>
                        <button type="button" data-action="cancel-photo-upload">Cancel</button>
                    </div>
                </form>
            </dialog>
        `;
        this.body = this.container.querySelector('tbody');
        this.searchForm = this.container.querySelector('.mineral-search');
        this.searchInput = this.searchForm.querySelector('input[name="search"]');
        this.detailsDialog = this.container.querySelector('[data-role="details-dialog"]');
        this.detailsTitle = this.container.querySelector('[data-role="details-title"]');
        this.detailsPhotosWrap = this.container.querySelector('[data-role="details-photos-wrap"]');
        this.detailsPhotos = this.container.querySelector('[data-role="details-photos"]');
        this.detailsBody = this.container.querySelector('[data-role="details-body"]');
        this.photoViewerDialog = this.container.querySelector('[data-role="photo-viewer"]');
        this.photoViewerImage = this.container.querySelector('[data-role="photo-viewer-image"]');
        this.photoUploadDialog = this.container.querySelector('[data-role="photo-upload-dialog"]');
        this.photoUploadForm = this.container.querySelector('[data-role="photo-upload-form"]');
        this.photoSpecimenInput = this.photoUploadForm.querySelector('input[name="photoSpecimenId"]');
        this.photoFileInput = this.photoUploadForm.querySelector('input[name="photoFiles"]');
        this.photoUploadMatch = this.container.querySelector('[data-role="photo-upload-match"]');
        this.photoUploadStatus = this.container.querySelector('[data-role="photo-upload-status"]');
        this.photoUploadSaveButton = this.container.querySelector('[data-action="save-photo-upload"]');
        this.activeDetailsMineral = null;
        this.container.querySelectorAll('[data-sort-field]').forEach((button) => {
            button.addEventListener('click', () => {
                this._sortBy(button.dataset.sortField);
            });
        });
        this.searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.searchTerm = this.searchInput.value.trim();
            this._renderRows();
        });
        this.searchInput.addEventListener('input', () => {
            this.searchTerm = this.searchInput.value.trim();
            this._renderRows();
        });
        this.container.querySelector('[data-action="clear-search"]').addEventListener('click', () => {
            this.searchTerm = '';
            this.searchInput.value = '';
            this._renderRows();
        });
        this.container.querySelector('[data-action="close-details"]').addEventListener('click', () => {
            this.detailsDialog.close();
        });
        this.container.querySelector('[data-action="details-edit"]').addEventListener('click', () => {
            if (this.activeDetailsMineral && this.onEditCallback) {
                this.detailsDialog.close();
                this.onEditCallback(this.activeDetailsMineral);
            }
        });
        this.container.querySelector('[data-action="details-delete"]').addEventListener('click', () => {
            if (this.activeDetailsMineral && this.onDeleteCallback) {
                this.detailsDialog.close();
                this.onDeleteCallback(this.activeDetailsMineral);
            }
        });
        this.container.querySelector('[data-action="close-photo-viewer"]').addEventListener('click', () => {
            this.photoViewerDialog.close();
        });
        this.container.querySelector('[data-action="scroll-photos-left"]').addEventListener('click', () => {
            this._scrollDetailsPhotos(-1);
        });
        this.container.querySelector('[data-action="scroll-photos-right"]').addEventListener('click', () => {
            this._scrollDetailsPhotos(1);
        });
        this.container.querySelector('[data-action="open-photo-upload"]').addEventListener('click', () => {
            this._openPhotoUpload();
        });
        this.container.querySelector('[data-action="close-photo-upload"]').addEventListener('click', () => {
            this._closePhotoUpload();
        });
        this.container.querySelector('[data-action="cancel-photo-upload"]').addEventListener('click', () => {
            this._closePhotoUpload();
        });
        this.photoSpecimenInput.addEventListener('input', () => {
            this._updatePhotoUploadTarget();
        });
        this.photoFileInput.addEventListener('change', () => {
            this._validatePhotoFiles();
            this._updatePhotoUploadSaveState();
        });
        this.photoUploadForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this._submitPhotoUpload();
        });
        this.compactListQuery = window.matchMedia('(max-width: 760px)');
        this.isCompactListView = this.compactListQuery.matches;
        const handleCompactListChange = (event) => {
            this.isCompactListView = event.matches;
            this._renderRows();
        };
        if (typeof this.compactListQuery.addEventListener === 'function') {
            this.compactListQuery.addEventListener('change', handleCompactListChange);
        } else if (typeof this.compactListQuery.addListener === 'function') {
            this.compactListQuery.addListener(handleCompactListChange);
        }
        return this.container;
    }

    setMinerals(minerals) {
        this.minerals = minerals;
        this._renderRows();
    }

    addMineral(mineral) {
        this.minerals.unshift(mineral);
        this._renderRows();
    }

    _appendMineral(mineral, prepend = false) {
        const row = document.createElement('tr');
        const groupValue = mineral.group || mineral.groupName || '';
        const firstPhoto = this.isCompactListView ? null : this._getPhotos(mineral)[0];
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Open details for ${mineral.specimenId || mineral.name}`);

        row.innerHTML = `
            <td data-label="Specimen Number">${this._escape(mineral.specimenId)}</td>
            <td data-label="Name">${this._escape(mineral.name)}</td>
            <td data-label="Variety">${this._escape(mineral.variety)}</td>
            <td data-label="Type">${this._escape(mineral.type)}</td>
            <td data-label="Group Name">${this._escape(groupValue)}</td>
            <td data-label="Subgroup">${this._escape(mineral.subgroup)}</td>
            <td data-label="Photo">${this._renderThumbnail(firstPhoto, mineral.name)}</td>
            <td data-label="Actions">
                <div class="row-actions">
                    <button class="icon-button" type="button" data-action="edit" aria-label="Edit ${this._escape(mineral.name)}" title="Edit">&#9998;</button>
                    <button class="icon-button danger" type="button" data-action="delete" aria-label="Delete ${this._escape(mineral.name)}" title="Delete">&#128465;</button>
                </div>
            </td>
        `;
        row.querySelector('[data-action="edit"]').addEventListener('click', (event) => {
            event.stopPropagation();
            if (this.onEditCallback) {
                this.onEditCallback(mineral);
            }
        });
        row.querySelector('[data-action="delete"]').addEventListener('click', (event) => {
            event.stopPropagation();
            if (this.onDeleteCallback) {
                this.onDeleteCallback(mineral);
            }
        });
        row.addEventListener('click', (event) => {
            if (event.target.closest('button, a')) {
                return;
            }
            this._openDetails(mineral);
        });
        row.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this._openDetails(mineral);
            }
        });

        if (prepend && this.body.firstChild) {
            this.body.insertBefore(row, this.body.firstChild);
        } else {
            this.body.appendChild(row);
        }
    }

    _renderRows() {
        this.body.innerHTML = '';
        const minerals = this._getFilteredMinerals();
        minerals.forEach((mineral) => this._appendMineral(mineral));
        this._updateSortIndicators();
    }

    _escape(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _formatId(id) {
        return String(id || '').padStart(4, '0');
    }

    _getPhotos(mineral) {
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
                console.error('Error parsing mineral photos:', error);
            }
        }

        return mineral.photo ? [{ dataUrl: mineral.photo, name: mineral.name }] : [];
    }

    _renderThumbnail(photo, mineralName) {
        const src = typeof photo === 'string' ? photo : photo?.thumbWebp || photo?.dataUrl || photo?.mainWebp;
        const name = typeof photo === 'string' ? mineralName : photo?.name || mineralName;
        if (!src) {
            return '';
        }

        const title = name ? ` title="${this._escape(name)}"` : '';
        return `<span class="mineral-thumbnail-link"${title}><img class="mineral-thumbnail" src="${this._escape(src)}" alt="${this._escape(`${mineralName} thumbnail`)}" loading="lazy" /></span>`;
    }

    _sortBy(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this._renderRows();
    }

    _getSortedMinerals() {
        if (!this.sortField) {
            return [...this.minerals];
        }

        const column = this.columns.find((item) => item.field === this.sortField);
        return [...this.minerals].sort((left, right) => {
            const leftValue = this._getSortValue(left, this.sortField);
            const rightValue = this._getSortValue(right, this.sortField);
            const comparison = column?.numeric
                ? Number(leftValue || 0) - Number(rightValue || 0)
                : String(leftValue || '').localeCompare(String(rightValue || ''), undefined, {
                    numeric: true,
                    sensitivity: 'base',
                });

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    _getFilteredMinerals() {
        const sortedMinerals = this._getSortedMinerals();
        const term = this.searchTerm.toLowerCase();
        if (!term) {
            return sortedMinerals;
        }

        return sortedMinerals.filter((mineral) => [
            mineral.specimenId,
            mineral.name,
            mineral.variety,
            mineral.type,
            mineral.group || mineral.groupName,
            mineral.subgroup,
            mineral.origin,
            mineral.description,
            mineral.observations,
            mineral.strunz,
            mineral.dana,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }

    _openDetails(mineral) {
        if (Number(mineral.photoCount || 0) > 0 && !mineral.photo && !mineral.photos) {
            this._loadFullMineral(mineral.id)
                .then((fullMineral) => {
                    this.updateMineral(fullMineral);
                    this._openDetails(fullMineral);
                })
                .catch((error) => {
                    console.error('Error loading specimen details:', error);
                    this._openDetails({ ...mineral, photoCount: 0 });
                });
            return;
        }

        this.activeDetailsMineral = mineral;
        this.detailsTitle.textContent = `${mineral.specimenId || this._formatId(mineral.id)} ${mineral.name || ''}`.trim();
        const photos = this._getPhotos(mineral);
        const fields = [
            ['Specimen Number', mineral.specimenId],
            ['Name', mineral.name],
            ['Variety', mineral.variety],
            ['Type', mineral.type],
            ['Group Name', mineral.group || mineral.groupName],
            ['Subgroup', mineral.subgroup],
            ['Date', mineral.date],
            ['Origin', mineral.origin],
            ['GPS Coordinates', mineral.gpsCoordinates],
            ['Description', mineral.description],
            ['Observations', mineral.observations],
            ['Strunz', mineral.strunz],
            ['DANA', mineral.dana],
            ['Colour', mineral.colour],
            ['Streak', mineral.streak],
            ['Hardness', mineral.hardness],
            ['Specific Gravity', mineral.specificGravity],
            ['Refractive Index', mineral.refractiveIndex],
            ['Magnetism', mineral.magnetism],
            ['Cleavage', mineral.cleavage],
            ['Fracture', mineral.fracture],
            ['Luster', mineral.luster],
            ['Crystal System', mineral.crystalSystem],
            ['Transparency', mineral.transparency],
            ['Shortwave UV', mineral.uvShortwave],
            ['Longwave UV', mineral.uvLongwave],
            ['Phosphorescence', mineral.phosphorescence],
            ['Fluorescence Colour', mineral.fluorescenceColour],
            ['Chartroyancy', mineral.chartroyancy],
            ['Iridescence', mineral.iridescence],
            ['HCL', mineral.hcl],
            ['Ammonia', mineral.ammonia],
            ['Peroxide', mineral.peroxide],
            ['Conductivity', mineral.conductivity],
        ];
        const maintainedFields = fields.filter(([, value]) => this._hasMaintainedValue(value));

        this.detailsPhotosWrap.hidden = !photos.length;
        this.detailsPhotos.innerHTML = photos.length
            ? `
                ${photos.map((photo, index) => this._renderDetailPhoto(photo, mineral.name, index)).join('')}
            `
            : '';

        this.detailsBody.innerHTML = maintainedFields.map(([label, value]) => `
            <div>
                <dt>${this._escape(label)}</dt>
                <dd>${this._escape(value)}</dd>
            </div>
        `).join('');

        this.detailsPhotos.querySelectorAll('[data-photo-src]').forEach((button) => {
            button.addEventListener('click', () => {
                this._openPhotoViewer(button.dataset.photoSrc, button.dataset.photoName);
            });
        });

        if (typeof this.detailsDialog.showModal === 'function') {
            this.detailsDialog.showModal();
        }
    }

    _loadFullMineral(id) {
        return fetch(`/api/minerals/${id}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Unable to load specimen details');
                }
                return response.json();
            });
    }

    _getSortValue(mineral, field) {
        if (field === 'groupName') {
            return mineral.group || mineral.groupName || '';
        }

        return mineral[field] || '';
    }

    _hasMaintainedValue(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    _renderDetailPhoto(photo, mineralName, index) {
        const thumbSrc = typeof photo === 'string' ? photo : photo?.thumbWebp || photo?.dataUrl || photo?.mainWebp;
        const mainSrc = typeof photo === 'string' ? photo : photo?.mainWebp || photo?.dataUrl || photo?.thumbWebp;
        const name = typeof photo === 'string' ? mineralName : photo?.originalName || photo?.name || `${mineralName} photo ${index + 1}`;
        if (!thumbSrc || !mainSrc) {
            return '';
        }

        return `
            <button class="details-photo-link" type="button" data-photo-src="${this._escape(mainSrc)}" data-photo-name="${this._escape(name)}">
                <img class="details-photo" src="${this._escape(thumbSrc)}" alt="${this._escape(name)}" loading="lazy">
            </button>
        `;
    }

    _openPhotoViewer(src, name) {
        this.photoViewerImage.src = src;
        this.photoViewerImage.alt = name || 'Specimen photo';
        if (typeof this.photoViewerDialog.showModal === 'function') {
            this.photoViewerDialog.showModal();
        }
    }

    _scrollDetailsPhotos(direction) {
        const distance = Math.max(160, Math.floor(this.detailsPhotos.clientWidth * 0.8));
        this.detailsPhotos.scrollBy({
            left: direction * distance,
            behavior: 'smooth',
        });
    }

    _openPhotoUpload() {
        this._resetPhotoUpload();
        if (typeof this.photoUploadDialog.showModal === 'function') {
            this.photoUploadDialog.showModal();
        }
        this.photoSpecimenInput.focus();
    }

    _closePhotoUpload() {
        this._resetPhotoUpload();
        this.photoUploadDialog.close();
    }

    _resetPhotoUpload() {
        this.photoTargetMineral = null;
        this.photoUploadForm.reset();
        this.photoFileInput.disabled = true;
        this.photoUploadSaveButton.disabled = true;
        this.photoUploadMatch.textContent = 'Enter a specimen number.';
        this.photoUploadStatus.textContent = '';
        this.photoUploadStatus.classList.remove('error');
    }

    _updatePhotoUploadTarget() {
        const specimenId = this.photoSpecimenInput.value.trim().toLowerCase();
        this.photoTargetMineral = specimenId
            ? this.minerals.find((mineral) => String(mineral.specimenId || '').trim().toLowerCase() === specimenId)
            : null;

        if (this.photoTargetMineral) {
            this.photoUploadMatch.textContent = `Specimen: ${this.photoTargetMineral.name || 'Name not recorded'}`;
            this.photoFileInput.disabled = false;
        } else {
            this.photoUploadMatch.textContent = specimenId ? 'No specimen found with that number.' : 'Enter a specimen number.';
            this.photoFileInput.disabled = true;
            this.photoFileInput.value = '';
        }

        this._updatePhotoUploadSaveState();
    }

    _validatePhotoFiles() {
        const files = Array.from(this.photoFileInput.files);
        const unsupportedFile = files.find((file) => !this._isAcceptedPhotoType(file));
        if (unsupportedFile) {
            this.photoFileInput.value = '';
            this.photoUploadStatus.textContent = `${unsupportedFile.name} is not a supported image type. Use JPG, PNG, HEIC, or WebP.`;
            this.photoUploadStatus.classList.add('error');
            return false;
        }

        const oversizedFile = files.find((file) => file.size > this.MAX_PHOTO_SIZE_BYTES);
        if (!oversizedFile) {
            this.photoUploadStatus.textContent = '';
            this.photoUploadStatus.classList.remove('error');
            return true;
        }
        this.photoFileInput.value = '';
        this.photoUploadStatus.textContent = `${oversizedFile.name} is larger than the 50 MB limit.`;
        this.photoUploadStatus.classList.add('error');
        return false;
    }

    _updatePhotoUploadSaveState() {
        this.photoUploadSaveButton.disabled = !this.photoTargetMineral || !this.photoFileInput.files.length;
    }

    _submitPhotoUpload() {
        if (!this.photoTargetMineral) {
            this.photoUploadStatus.textContent = 'Enter a valid specimen number first.';
            this.photoUploadStatus.classList.add('error');
            return;
        }

        if (!this.photoFileInput.files.length) {
            this.photoUploadStatus.textContent = 'Select one or more photos.';
            this.photoUploadStatus.classList.add('error');
            return;
        }

        if (!this._validatePhotoFiles()) {
            this._updatePhotoUploadSaveState();
            return;
        }

        this.photoUploadSaveButton.disabled = true;
        this.photoUploadStatus.textContent = 'Processing photos...';
        Promise.all(Array.from(this.photoFileInput.files).map((file) => this._processPhoto(file)))
            .then((newPhotos) => {
                if (this.onPhotosCallback) {
                    return this.onPhotosCallback(this.photoTargetMineral, newPhotos);
                }
                return null;
            })
            .then(() => {
                this._closePhotoUpload();
            })
            .catch((error) => {
                console.error('Error adding photos:', error);
                this.photoUploadStatus.textContent = error.message || 'Unable to add photos.';
                this.photoUploadStatus.classList.add('error');
                this._updatePhotoUploadSaveState();
            });
    }

    _isAcceptedPhotoType(file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return this.ACCEPTED_PHOTO_TYPES.has(file.type)
            || ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(extension);
    }

    async _processPhoto(file) {
        const image = await this._decodeImage(file);
        const mainBlob = await this._renderWebp(image, {
            fit: 'contain',
            maxBytes: 500 * 1024,
            maxHeight: 1600,
            maxWidth: 1600,
            quality: 0.8,
        });
        const thumbBlob = await this._renderWebp(image, {
            fit: 'cover',
            maxBytes: 50 * 1024,
            maxHeight: 300,
            maxWidth: 300,
            quality: 0.8,
        });

        return {
            mainWebp: await this._blobToDataUrl(mainBlob),
            thumbWebp: await this._blobToDataUrl(thumbBlob),
            mainName: 'main.webp',
            thumbName: 'thumb.webp',
            originalName: file.name,
            mainSize: mainBlob.size,
            thumbSize: thumbBlob.size,
            type: 'image/webp',
        };
    }

    _decodeImage(file) {
        const objectUrl = URL.createObjectURL(file);
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(image);
            };
            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error(`${file.name} could not be decoded by this browser. HEIC support depends on the device browser.`));
            };
            image.src = objectUrl;
        });
    }

    async _renderWebp(image, options) {
        let maxWidth = options.maxWidth;
        let maxHeight = options.maxHeight;
        let quality = options.quality;
        let blob = null;

        for (let attempt = 0; attempt < 8; attempt += 1) {
            const canvas = this._drawToCanvas(image, maxWidth, maxHeight, options.fit);
            blob = await this._canvasToBlob(canvas, quality);
            if (blob.size <= options.maxBytes) {
                return blob;
            }
            quality = Math.max(0.62, quality - 0.04);
            if (options.fit !== 'cover') {
                maxWidth = Math.max(320, Math.round(maxWidth * 0.9));
                maxHeight = Math.max(320, Math.round(maxHeight * 0.9));
            }
        }

        throw new Error(`Unable to compress image below ${Math.round(options.maxBytes / 1024)} KB.`);
    }

    _drawToCanvas(image, maxWidth, maxHeight, fit) {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });

        if (fit === 'cover') {
            canvas.width = maxWidth;
            canvas.height = maxHeight;
            const scale = Math.max(maxWidth / sourceWidth, maxHeight / sourceHeight);
            const drawWidth = sourceWidth * scale;
            const drawHeight = sourceHeight * scale;
            context.drawImage(image, (maxWidth - drawWidth) / 2, (maxHeight - drawHeight) / 2, drawWidth, drawHeight);
            return canvas;
        }

        const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    _canvasToBlob(canvas, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Unable to convert image to WebP.'));
                }
            }, 'image/webp', quality);
        });
    }

    _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    _updateSortIndicators() {
        this.container.querySelectorAll('[data-sort-field]').forEach((button) => {
            const indicator = button.querySelector('.sort-indicator');
            const isActive = button.dataset.sortField === this.sortField;
            indicator.textContent = isActive ? (this.sortDirection === 'asc' ? '▲' : '▼') : '';
            button.setAttribute('aria-sort', isActive ? this.sortDirection : 'none');
        });
    }

    updateMineral(updatedMineral) {
        this.minerals = this.minerals.map((mineral) => (
            mineral.id === updatedMineral.id ? updatedMineral : mineral
        ));
        this._renderRows();
    }

    removeMineral(id) {
        this.minerals = this.minerals.filter((mineral) => mineral.id !== id);
        this._renderRows();
    }

    onEdit(callback) {
        this.onEditCallback = callback;
    }

    onDelete(callback) {
        this.onDeleteCallback = callback;
    }

    onPhotos(callback) {
        this.onPhotosCallback = callback;
    }
}
