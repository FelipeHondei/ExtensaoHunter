class HunterExtension {
    constructor() {
        this.apiKey = '';
        this.baseUrl = 'https://api.hunter.io/v2';
        this.currentDomain = '';
        this.init();
    }

    async init() {
        await this.loadApiKey();
        this.setupEventListeners();
        this.getCurrentTabInfo();
    }

    async loadApiKey() {
        const result = await chrome.storage.sync.get(['hunterApiKey']);
        if (result.hunterApiKey) {
            this.apiKey = result.hunterApiKey;
            this.showMainInterface();
        }
    }

    setupEventListeners() {
        // API Key setup
        document.getElementById('save-api-key').addEventListener('click', () => {
            this.saveApiKey();
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Search buttons
        document.getElementById('search-domain').addEventListener('click', () => {
            this.searchByDomain();
        });

        document.getElementById('extract-page').addEventListener('click', () => {
            this.extractFromPage();
        });

        document.getElementById('find-email').addEventListener('click', () => {
            this.findEmail();
        });

        // Enter key support
        document.getElementById('api-key').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveApiKey();
        });

        document.getElementById('domain-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchByDomain();
        });
    }

    async saveApiKey() {
        const apiKey = document.getElementById('api-key').value.trim();
        if (!apiKey) {
            this.showError('Por favor, insira uma API Key válida');
            return;
        }

        // Test the API key
        try {
            const response = await fetch(`${this.baseUrl}/account?api_key=${apiKey}`);
            if (response.ok) {
                await chrome.storage.sync.set({ hunterApiKey: apiKey });
                this.apiKey = apiKey;
                this.showMainInterface();
                this.showSuccess('API Key salva com sucesso!');
            } else {
                throw new Error('API Key inválida');
            }
        } catch (error) {
            this.showError('Erro ao validar API Key. Verifique se está correta.');
        }
    }

    showMainInterface() {
        document.getElementById('api-setup').style.display = 'none';
        document.getElementById('main-interface').style.display = 'block';
        
        const apiStatus = document.getElementById('api-setup');
        apiStatus.classList.add('configured');
        apiStatus.innerHTML = `
            <p>✅ API Key configurada</p>
            <button class="btn btn-small btn-warning" onclick="location.reload()">Reconfigurar</button>
        `;
        apiStatus.style.display = 'block';
    }

    async getCurrentTabInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url) {
                const url = new URL(tab.url);
                this.currentDomain = url.hostname.replace('www.', '');
                
                document.getElementById('current-url').textContent = tab.url;
                document.getElementById('domain-input').value = this.currentDomain;
                
                const domainInfo = document.getElementById('current-domain-info');
                domainInfo.innerHTML = `
                    <p>🌐 <strong>Domínio Atual:</strong> ${this.currentDomain}</p>
                    <p>Busque emails deste domínio automaticamente</p>
                `;
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Clear previous results
        this.clearResults();
    }

    async searchByDomain() {
        const domain = document.getElementById('domain-input').value.trim();
        if (!domain) {
            this.showError('Por favor, insira um domínio');
            return;
        }

        this.showLoading('domain-results', 'Buscando emails...');

        try {
            const response = await fetch(
                `${this.baseUrl}/domain-search?domain=${domain}&api_key=${this.apiKey}&limit=100`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayDomainResults(data);
        } catch (error) {
            this.showError('Erro ao buscar emails: ' + error.message);
            document.getElementById('domain-results').innerHTML = '';
        }
    }

    async extractFromPage() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url) {
            this.showError('Não foi possível acessar a página atual');
            return;
        }

        this.showLoading('page-results', 'Extraindo emails da página...');

        try {
            const url = encodeURIComponent(tab.url);
            const response = await fetch(
                `${this.baseUrl}/email-finder?domain=${this.currentDomain}&api_key=${this.apiKey}&url=${url}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Also inject content script to extract emails from page
            chrome.tabs.sendMessage(tab.id, { action: 'extractEmails' }, (response) => {
                this.displayPageResults(data, response?.emails || []);
            });

        } catch (error) {
            this.showError('Erro ao extrair emails: ' + error.message);
            document.getElementById('page-results').innerHTML = '';
        }
    }

    async findEmail() {
        const domain = document.getElementById('person-domain').value.trim();
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();

        if (!domain) {
            this.showError('Por favor, insira o domínio da empresa');
            return;
        }

        if (!firstName || !lastName) {
            this.showError('Por favor, insira o nome e sobrenome');
            return;
        }

        this.showLoading('find-results', 'Procurando email...');

        try {
            const response = await fetch(
                `${this.baseUrl}/email-finder?domain=${domain}&first_name=${firstName}&last_name=${lastName}&api_key=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayFindResults(data);
        } catch (error) {
            this.showError('Erro ao encontrar email: ' + error.message);
            document.getElementById('find-results').innerHTML = '';
        }
    }

    displayDomainResults(data) {
        const container = document.getElementById('domain-results');
        const statsContainer = document.getElementById('domain-stats');

        if (!data.data || !data.data.emails || data.data.emails.length === 0) {
            container.innerHTML = '<div class="no-results">Nenhum email encontrado para este domínio</div>';
            statsContainer.style.display = 'none';
            return;
        }

        const emails = data.data.emails;
        const deliverableCount = emails.filter(email => 
            email.confidence > 70 || email.status === 'valid'
        ).length;

        // Update stats
        document.getElementById('total-emails').textContent = emails.length;
        document.getElementById('deliverable-emails').textContent = deliverableCount;
        statsContainer.style.display = 'flex';

        // Display emails
        let html = '<div class="email-list">';
        emails.forEach(email => {
            const scoreClass = email.confidence >= 80 ? 'high' : 
                             email.confidence >= 50 ? 'medium' : 'low';
            
            html += `
                <div class="email-item" data-email="${email.value}">
                    <div class="email-address">${email.value}</div>
                    <div class="email-info">
                        <span>${email.first_name} ${email.last_name} - ${email.position || 'Posição não identificada'}</span>
                        <span class="email-score ${scoreClass}">${email.confidence}%</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        html += `
            <div class="export-options">
                <button class="btn btn-small btn-success" id="export-csv">📊 Exportar CSV</button>
                <button class="btn btn-small" id="copy-all">📋 Copiar Todos</button>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for email items
        document.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', () => {
                this.copyToClipboard(item.dataset.email);
            });
        });

        // Export functionality
        document.getElementById('export-csv')?.addEventListener('click', () => {
            this.exportToCSV(emails, `emails_${data.data.domain}`);
        });

        document.getElementById('copy-all')?.addEventListener('click', () => {
            const allEmails = emails.map(e => e.value).join('\n');
            this.copyToClipboard(allEmails);
        });
    }

    displayPageResults(apiData, extractedEmails) {
        const container = document.getElementById('page-results');
        let html = '';

        // Show API results if available
        if (apiData.data && apiData.data.email) {
            html += `
                <div class="page-emails">
                    <h4>📧 Email encontrado via API:</h4>
                    <div class="extracted-email" data-email="${apiData.data.email}">
                        ${apiData.data.email}
                        <span style="float: right;">${apiData.data.confidence}%</span>
                    </div>
                </div>
            `;
        }

        // Show extracted emails from page
        if (extractedEmails && extractedEmails.length > 0) {
            html += `
                <div class="page-emails">
                    <h4>🌐 Emails extraídos da página:</h4>
            `;
            extractedEmails.forEach(email => {
                html += `<div class="extracted-email" data-email="${email}">${email}</div>`;
            });
            html += '</div>';
        }

        if (!html) {
            html = '<div class="no-results">Nenhum email encontrado nesta página</div>';
        }

        container.innerHTML = html;

        // Add click handlers for copying
        document.querySelectorAll('.extracted-email').forEach(item => {
            item.addEventListener('click', () => {
                this.copyToClipboard(item.dataset.email);
            });
        });
    }

    displayFindResults(data) {
        const container = document.getElementById('find-results');

        if (!data.data || !data.data.email) {
            container.innerHTML = '<div class="no-results">Email não encontrado para esta pessoa</div>';
            return;
        }

        const email = data.data;
        container.innerHTML = `
            <div class="email-list">
                <div class="email-item" data-email="${email.email}">
                    <div class="email-address">${email.email}</div>
                    <div class="email-info">
                        <span>${email.first_name} ${email.last_name}</span>
                        <span class="email-score high">${email.confidence}%</span>
                    </div>
                </div>
            </div>
            <div class="export-options">
                <button class="btn btn-small" id="copy-found">📋 Copiar Email</button>
            </div>
        `;

        document.querySelector('.email-item').addEventListener('click', () => {
            this.copyToClipboard(email.email);
        });

        document.getElementById('copy-found')?.addEventListener('click', () => {
            this.copyToClipboard(email.email);
        });
    }

    showLoading(containerId, message) {
        document.getElementById(containerId).innerHTML = `
            <div class="loading">${message}</div>
        `;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        document.querySelector('.container').prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        document.querySelector('.container').prepend(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    clearResults() {
        document.getElementById('domain-results').innerHTML = '';
        document.getElementById('page-results').innerHTML = '';
        document.getElementById('find-results').innerHTML = '';
        document.getElementById('domain-stats').style.display = 'none';
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess(`📋 ${text} copiado!`);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    exportToCSV(emails, filename) {
        const csv = [
            ['Email', 'Nome', 'Sobrenome', 'Posição', 'Confiança'],
            ...emails.map(email => [
                email.value,
                email.first_name || '',
                email.last_name || '',
                email.position || '',
                email.confidence || ''
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
            url: url,
            filename: `${filename}.csv`
        });
    }
}

// Initialize extension when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new HunterExtension();
});