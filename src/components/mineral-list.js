class MineralList {
    constructor() {
        this.minerals = [];
        this.onEditCallback = null;
        this.onDeleteCallback = null;
        this.sortField = null;
        this.sortDirection = 'asc';
        this.columns = [
            { field: 'specimenId', label: 'Specimen Number' },
            { field: 'name', label: 'Name' },
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
            <h2>Mineral Collection</h2>
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
        `;
        this.body = this.container.querySelector('tbody');
        this.container.querySelectorAll('[data-sort-field]').forEach((button) => {
            button.addEventListener('click', () => {
                this._sortBy(button.dataset.sortField);
            });
        });
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
        const firstPhoto = this._getPhotos(mineral)[0];

        row.innerHTML = `
            <td data-label="Specimen Number">${this._escape(mineral.specimenId)}</td>
            <td data-label="Name">${this._escape(mineral.name)}</td>
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
        row.querySelector('[data-action="edit"]').addEventListener('click', () => {
            if (this.onEditCallback) {
                this.onEditCallback(mineral);
            }
        });
        row.querySelector('[data-action="delete"]').addEventListener('click', () => {
            if (this.onDeleteCallback) {
                this.onDeleteCallback(mineral);
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
        const minerals = this._getSortedMinerals();
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
        const src = typeof photo === 'string' ? photo : photo?.dataUrl;
        const name = typeof photo === 'string' ? mineralName : photo?.name || mineralName;
        if (!src) {
            return '';
        }

        const title = name ? ` title="${this._escape(name)}"` : '';
        return `<a class="mineral-thumbnail-link" href="${this._escape(src)}" target="_blank" rel="noopener noreferrer"${title}><img class="mineral-thumbnail" src="${this._escape(src)}" alt="${this._escape(`${mineralName} thumbnail`)}" loading="lazy" /></a>`;
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

    _getSortValue(mineral, field) {
        if (field === 'groupName') {
            return mineral.group || mineral.groupName || '';
        }

        return mineral[field] || '';
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
}
