class MineralForm {
    constructor() {
        this.onSubmitCallback = null;
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
    }

    render() {
        this.form = document.createElement('form');
        this.form.innerHTML = `
            <div>
                <label>
                    Specimen ID:
                    <input type="text" name="specimenId" required />
                </label>
            </div>
            <div>
                <label>
                    Name:
                    <input type="text" name="name" required />
                </label>
            </div>
            <div>
                <label>
                    Type:
                    <select name="type" required>
                        <option value="">Select type</option>
                    </select>
                </label>
            </div>
            <div>
                <label>
                    Group:
                    <input type="text" name="group" required />
                </label>
            </div>
            <div>
                <label>
                    Subgroup:
                    <input type="text" name="subgroup" required />
                </label>
            </div>
            <div>
                <label>
                    Date:
                    <input type="date" name="date" required />
                </label>
            </div>
            <div>
                <label>
                    Origin:
                    <input type="text" name="origin" required />
                </label>
            </div>
            <div>
                <label>
                    Description:
                    <textarea name="description" required></textarea>
                </label>
            </div>
            <div>
                <label>
                    Photos:
                    <input type="file" name="photos" accept="image/*" multiple required />
                </label>
            </div>
            <div class="form-buttons">
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

        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this._submitForm();
        });
        this.form.querySelector('input[name="photos"]').addEventListener('change', (event) => {
            this._validatePhotoSizes(event.target);
        });
        this.form.querySelector('[data-role="cancel-edit"]').addEventListener('click', () => {
            this.clear();
        });

        return this.form;
    }

    _submitForm() {
        const photoInput = this.form.querySelector('input[name="photos"]');
        const photoFiles = Array.from(photoInput.files);
        if (!photoFiles.length && !this.editingMineral) {
            return;
        }

        if (!this._validatePhotoSizes(photoInput)) {
            return;
        }

        const existingPhotos = this.editingMineral ? this._getExistingPhotos(this.editingMineral) : [];
        const photosPromise = photoFiles.length
            ? Promise.all(photoFiles.map((file) => this._readPhoto(file)))
            : Promise.resolve(existingPhotos);

        photosPromise
            .then((photos) => {
                const mineralData = {
                    id: this.editingMineral?.id,
                    specimenId: this.form.querySelector('input[name="specimenId"]').value,
                    name: this.form.querySelector('input[name="name"]').value,
                    type: this.form.querySelector('select[name="type"]').value,
                    group: this.form.querySelector('input[name="group"]').value,
                    subgroup: this.form.querySelector('input[name="subgroup"]').value,
                    date: this.form.querySelector('input[name="date"]').value,
                    origin: this.form.querySelector('input[name="origin"]').value,
                    description: this.form.querySelector('textarea[name="description"]').value,
                    photos,
                    photo: photos[0]?.dataUrl || '',
                };

                if (this.onSubmitCallback) {
                    this.onSubmitCallback(mineralData);
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

    edit(mineral) {
        this.editingMineral = mineral;
        this.form.querySelector('input[name="specimenId"]').value = mineral.specimenId || '';
        this.form.querySelector('input[name="name"]').value = mineral.name || '';
        this.form.querySelector('select[name="type"]').value = mineral.type || '';
        this.form.querySelector('input[name="group"]').value = mineral.group || mineral.groupName || '';
        this.form.querySelector('input[name="subgroup"]').value = mineral.subgroup || '';
        this.form.querySelector('input[name="date"]').value = mineral.date || '';
        this.form.querySelector('input[name="origin"]').value = mineral.origin || '';
        this.form.querySelector('textarea[name="description"]').value = mineral.description || '';
        this.form.querySelector('input[name="photos"]').required = false;
        this.form.querySelector('[data-role="submit"]').textContent = 'Update';
        this.form.querySelector('[data-role="cancel-edit"]').style.display = '';
    }

    clear() {
        if (this.form) {
            this.form.reset();
            this.editingMineral = null;
            this.form.querySelector('input[name="photos"]').required = true;
            this.form.querySelector('[data-role="submit"]').textContent = 'Save';
            this.form.querySelector('[data-role="cancel-edit"]').style.display = 'none';
        }
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
}
