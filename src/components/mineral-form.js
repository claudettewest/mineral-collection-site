class MineralForm {
    constructor() {
        this.onSubmitCallback = null;
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
                    Photo:
                    <input type="file" name="photo" accept="image/*" required />
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

        return this.form;
    }

    _submitForm() {
        const photoInput = this.form.querySelector('input[name="photo"]');
        const photoFile = photoInput.files[0];
        if (!photoFile) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const mineralData = {
                specimenId: this.form.querySelector('input[name="specimenId"]').value,
                name: this.form.querySelector('input[name="name"]').value,
                type: this.form.querySelector('select[name="type"]').value,
                group: this.form.querySelector('input[name="group"]').value,
                subgroup: this.form.querySelector('input[name="subgroup"]').value,
                date: this.form.querySelector('input[name="date"]').value,
                origin: this.form.querySelector('input[name="origin"]').value,
                description: this.form.querySelector('textarea[name="description"]').value,
                photo: reader.result,
            };

            if (this.onSubmitCallback) {
                this.onSubmitCallback(mineralData);
            }
        };

        reader.readAsDataURL(photoFile);
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
