class GemmaAssistant {
    constructor() {
        this.messages = [];
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'gemma-assistant';
        this.container.innerHTML = `
            <h2>Gemma Assistant</h2>
            <div class="gemma-chat" data-role="chat" aria-live="polite"></div>
            <form class="gemma-form">
                <label>
                    Ask about your catalog:
                    <textarea name="prompt" required placeholder="Summarize saved specimens, compare catalog records, or find missing details in the catalog."></textarea>
                </label>
                <div class="form-buttons">
                    <button type="submit" data-role="ask">Ask Gemma</button>
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
        this.messages.push({ role: 'status', text: 'Gemma is thinking...' });
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
                    throw new Error(body.error || 'Gemma request failed');
                }
                this.messages.push({
                    role: 'assistant',
                    text: body.answer || 'Gemma returned an empty response.',
                    model: body.model,
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
            this.chat.innerHTML = '<p class="gemma-empty">Ask Gemma to answer from saved catalog records only.</p>';
            return;
        }

        this.chat.innerHTML = this.messages.map((message) => `
            <article class="gemma-message ${message.role}">
                <strong>${this._labelForRole(message)}</strong>
                <p>${this._escapeHtml(message.text).replace(/\n/g, '<br>')}</p>
            </article>
        `).join('');
        this.chat.scrollTop = this.chat.scrollHeight;
    }

    _labelForRole(message) {
        if (message.role === 'user') {
            return 'You';
        }
        if (message.role === 'assistant') {
            return message.model ? `Gemma (${this._escapeHtml(message.model)})` : 'Gemma';
        }
        if (message.role === 'error') {
            return 'Error';
        }
        return 'Status';
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
