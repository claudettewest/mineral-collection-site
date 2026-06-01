class GemmaAssistant {
    constructor() {
        this.messages = [];
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'gemma-assistant';
        this.container.innerHTML = `
            <h2>Ask a question</h2>
            <div class="gemma-chat" data-role="chat" aria-live="polite"></div>
            <form class="gemma-form">
                <label>
                    Ask about your catalog:
                    <textarea name="prompt" required placeholder="Summarize saved specimens, compare catalog records, or find missing details in the catalog."></textarea>
                </label>
                <div class="form-buttons">
                    <button type="submit" data-role="ask">Ask a question</button>
                    <button type="button" data-role="clear">Clear</button>
                </div>
            </form>
        `;

        this.chat = this.container.querySelector('[data-role="chat"]');
        this.form = this.container.querySelector('form');
        this.promptInput = this.form.querySelector('textarea[name="prompt"]');
        this.askButton = this.form.querySelector('[data-role="ask"]');

        this.form.addEventListener('submit', (event) => {
            event.preventDefault();
            this._askGemma();
        });
        this.form.querySelector('[data-role="clear"]').addEventListener('click', () => {
            this.clear();
        });

        this._renderMessages();
        return this.container;
    }

    clear() {
        this.messages = [];
        if (this.promptInput) {
            this.promptInput.value = '';
        }
        this._renderMessages();
    }

    _askGemma() {
        const prompt = this.promptInput.value.trim();
        if (!prompt) {
            return;
        }

        this.messages.push({ role: 'user', text: prompt });
        this.messages.push({ role: 'status', text: 'Thinking...' });
        this._setLoading(true);
        this._renderMessages();

        fetch('/api/gemma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        })
            .then((response) => response.json().then((body) => ({
                ok: response.ok,
                body,
            })))
            .then(({ ok, body }) => {
                this._removeStatusMessage();
                if (!ok) {
                    throw new Error(body.error || 'Question failed');
                }
                this.messages.push({
                    role: 'assistant',
                    text: body.answer || 'No answer was returned.',
                });
                this.promptInput.value = '';
            })
            .catch((error) => {
                this._removeStatusMessage();
                this.messages.push({ role: 'error', text: error.message });
            })
            .finally(() => {
                this._setLoading(false);
                this._renderMessages();
            });
    }

    _setLoading(isLoading) {
        this.askButton.disabled = isLoading;
        this.promptInput.disabled = isLoading;
    }

    _removeStatusMessage() {
        this.messages = this.messages.filter((message) => message.role !== 'status');
    }

    _renderMessages() {
        if (!this.chat) {
            return;
        }

        if (!this.messages.length) {
            this.chat.innerHTML = '<p class="gemma-empty">Ask a question about saved catalog records.</p>';
            return;
        }

        this.chat.innerHTML = this.messages.map((message) => `
            <article class="gemma-message ${message.role}">
                <strong>${this._labelForRole(message)}</strong>
                ${this._formatMessageText(message.text)}
            </article>
        `).join('');
        this.chat.scrollTop = this.chat.scrollHeight;
    }

    _labelForRole(message) {
        if (message.role === 'user') {
            return 'You';
        }
        if (message.role === 'assistant') {
            return 'Answer';
        }
        if (message.role === 'error') {
            return 'Error';
        }
        return 'Status';
    }

    _formatMessageText(text) {
        const table = this._parseMarkdownTable(text);
        if (table) {
            return this._renderTable(table);
        }

        return `<p>${this._escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
    }

    _parseMarkdownTable(text) {
        const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
        const tableStart = lines.findIndex((line, index) => (
            line.includes('|')
            && lines[index + 1]
            && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
        ));

        if (tableStart === -1) {
            return null;
        }

        const title = lines.slice(0, tableStart).join('\n');
        const headers = this._splitTableRow(lines[tableStart]);
        const rowLines = [];
        const footerLines = [];
        lines.slice(tableStart + 2).forEach((line) => {
            if (line.includes('|') && !footerLines.length) {
                rowLines.push(line);
            } else {
                footerLines.push(line);
            }
        });
        const rows = rowLines
            .map((line) => this._splitTableRow(line))
            .filter((row) => row.length === headers.length);

        if (!headers.length || !rows.length) {
            return null;
        }

        return { title, footer: footerLines.join('\n'), headers, rows };
    }

    _splitTableRow(line) {
        return line
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim());
    }

    _renderTable(table) {
        const title = table.title
            ? `<p>${this._escapeHtml(table.title).replace(/\n/g, '<br>')}</p>`
            : '';
        const footer = table.footer
            ? `<p>${this._escapeHtml(table.footer).replace(/\n/g, '<br>')}</p>`
            : '';
        const headerHtml = table.headers
            .map((header) => `<th>${this._escapeHtml(header)}</th>`)
            .join('');
        const bodyHtml = table.rows.map((row) => `
            <tr>
                ${row.map((cell, index) => `<td data-label="${this._escapeHtml(table.headers[index])}">${this._escapeHtml(cell)}</td>`).join('')}
            </tr>
        `).join('');

        return `
            ${title}
            <div class="answer-table-wrap">
                <table class="answer-table">
                    <thead><tr>${headerHtml}</tr></thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
            ${footer}
        `;
    }

    _escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
