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
                        <th>Image</th>
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
        const imageMarkup = mineral.photo
            ? `<a class="mineral-thumbnail-link" href="${this._escape(mineral.photo)}" target="_blank" rel="noopener noreferrer"><img class="mineral-thumbnail" src="${this._escape(mineral.photo)}" alt="${this._escape(mineral.name)} thumbnail" loading="lazy" /></a>`
            : '';

        row.innerHTML = `
            <td>${this._escape(mineral.id || '')}</td>
            <td>${this._escape(mineral.name)}</td>
            <td>${this._escape(mineral.type)}</td>
            <td>${this._escape(groupValue)}</td>
            <td>${this._escape(mineral.subgroup)}</td>
            <td>${imageMarkup}</td>
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
}
