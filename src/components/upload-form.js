class UploadForm {
    constructor() {
        this.onUploadCompleteCallback = null;
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
            </div>
            <p class="upload-status" data-role="status" aria-live="polite"></p>
        `;

        this.fileInput = this.container.querySelector('input[name="csv"]');
        this.status = this.container.querySelector('[data-role="status"]');
        this.container.querySelector('[data-role="upload"]').addEventListener('click', () => {
            this._uploadCsv();
        });

        return this.container;
    }

    onUploadComplete(callback) {
        this.onUploadCompleteCallback = callback;
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

    _setStatus(message, isError = false) {
        this.status.textContent = message;
        this.status.classList.toggle('error', isError);
    }
}
