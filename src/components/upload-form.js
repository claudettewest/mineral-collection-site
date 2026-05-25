class UploadForm {
    constructor() {
        this.onUploadCompleteCallback = null;
        this.onDeleteAllCallback = null;
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'upload-form';
        this.container.innerHTML = `
            <h2>Upload CSV</h2>
            <div class="upload-actions">
                <a class="button-link" href="/api/minerals/csv-template" download>Download CSV Template</a>
                <label class="upload-file-label">
                    CSV File:
                    <input type="file" name="csv" accept=".csv,text/csv" />
                </label>
                <button type="button" data-role="upload">Upload CSV</button>
                <button class="danger-button" type="button" data-role="delete-all">Delete All Data</button>
            </div>
            <p class="upload-status" data-role="status" aria-live="polite"></p>
        `;

        this.fileInput = this.container.querySelector('input[name="csv"]');
        this.status = this.container.querySelector('[data-role="status"]');
        this.container.querySelector('[data-role="upload"]').addEventListener('click', () => {
            this._uploadCsv();
        });
        this.container.querySelector('[data-role="delete-all"]').addEventListener('click', () => {
            this._deleteAllData();
        });

        return this.container;
    }

    onUploadComplete(callback) {
        this.onUploadCompleteCallback = callback;
    }

    onDeleteAll(callback) {
        this.onDeleteAllCallback = callback;
    }

    clear() {
        if (!this.container) {
            return;
        }

        this.fileInput.value = '';
        this._setStatus('');
    }

    async _uploadCsv() {
        const file = this.fileInput.files[0];
        if (!file) {
            this._setStatus('Choose a CSV file before uploading.', true);
            return;
        }

        const formData = new FormData();
        formData.append('csv', file);
        this._setStatus('Checking CSV...');

        try {
            const response = await fetch('/api/minerals/upload-csv', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (!response.ok) {
                const details = Array.isArray(result.details) && result.details.length
                    ? ` ${result.details.join(' ')}`
                    : '';
                this._setStatus(`${result.error || 'CSV upload failed.'}${details}`, true);
                return;
            }

            this._setStatus(`${result.addedCount} record${result.addedCount === 1 ? '' : 's'} added.`);
            this.fileInput.value = '';
            if (this.onUploadCompleteCallback) {
                this.onUploadCompleteCallback(result.addedCount);
            }
        } catch (error) {
            console.error('Error uploading CSV:', error);
            this._setStatus('CSV upload failed.', true);
        }
    }

    async _deleteAllData() {
        const firstConfirm = confirm('This will permanently delete every record in the database. Continue?');
        if (!firstConfirm) {
            return;
        }

        const secondConfirm = confirm('All mineral records will be deleted and the next ID will reset to 0001. This cannot be undone. Delete all data?');
        if (!secondConfirm) {
            return;
        }

        this._setStatus('Deleting all records...');

        try {
            const response = await fetch('/api/minerals', {
                method: 'DELETE',
            });
            const result = await response.json();

            if (!response.ok) {
                this._setStatus(result.error || 'Delete all failed.', true);
                return;
            }

            this.fileInput.value = '';
            this._setStatus(`All records deleted. Next ID is ${result.formattedId || '0001'}.`);
            if (this.onDeleteAllCallback) {
                this.onDeleteAllCallback();
            }
        } catch (error) {
            console.error('Error deleting all data:', error);
            this._setStatus('Delete all failed.', true);
        }
    }

    _setStatus(message, isError = false) {
        this.status.textContent = message;
        this.status.classList.toggle('error', isError);
    }
}
