class MineralList {
    constructor() {
        this.minerals = [];
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'mineral-list';
        this.container.innerHTML = `
            <h2>Mineral Collection</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Group</th>
                        <th>Subgroup</th>
                        <th>Images</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        this.body = this.container.querySelector('tbody');
        return this.container;
    }

    setMinerals(minerals) {
        this.minerals = minerals;
        this.body.innerHTML = '';
        minerals.forEach((mineral) => this._appendMineral(mineral));
    }

    addMineral(mineral) {
        this.minerals.unshift(mineral);
        this._appendMineral(mineral, true);
    }

    _appendMineral(mineral, prepend = false) {
        const row = document.createElement('tr');
        const groupValue = mineral.group || mineral.groupName || '';
        const imageMarkup = this._getPhotos(mineral)
            .map((photo, index) => this._renderThumbnail(photo, mineral.name, index))
            .join('');

        row.innerHTML = `
            <td data-label="ID">${this._escape(mineral.id || '')}</td>
            <td data-label="Name">${this._escape(mineral.name)}</td>
            <td data-label="Type">${this._escape(mineral.type)}</td>
            <td data-label="Group">${this._escape(groupValue)}</td>
            <td data-label="Subgroup">${this._escape(mineral.subgroup)}</td>
            <td data-label="Images">${imageMarkup}</td>
        `;

        if (prepend && this.body.firstChild) {
            this.body.insertBefore(row, this.body.firstChild);
        } else {
            this.body.appendChild(row);
        }
    }

    _escape(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    _renderThumbnail(photo, mineralName, index) {
        const src = typeof photo === 'string' ? photo : photo.dataUrl;
        const name = typeof photo === 'string' ? mineralName : photo.name || mineralName;
        if (!src) {
            return '';
        }

        const altText = `${mineralName} thumbnail ${index + 1}`;
        const title = name ? ` title="${this._escape(name)}"` : '';
        return `<a class="mineral-thumbnail-link" href="${this._escape(src)}" target="_blank" rel="noopener noreferrer"${title}><img class="mineral-thumbnail" src="${this._escape(src)}" alt="${this._escape(altText)}" loading="lazy" /></a>`;
    }
}
