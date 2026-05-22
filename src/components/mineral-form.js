class MineralForm {
    constructor() {
        this.onSubmitCallback = null;
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
                <button type="submit">Save</button>
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

        return this.form;
    }

    _submitForm() {
        const photoInput = this.form.querySelector('input[name="photos"]');
        const photoFiles = Array.from(photoInput.files);
        if (!photoFiles.length) {
            return;
        }

        if (!this._validatePhotoSizes(photoInput)) {
            return;
        }

        Promise.all(photoFiles.map((file) => this._readPhoto(file)))
            .then((photos) => {
                const mineralData = {
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

    clear() {
        if (this.form) {
            this.form.reset();
        }
    }
}
