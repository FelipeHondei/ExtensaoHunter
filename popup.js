class HunterExtension {
    constructor() {
        this.apiKey = '';
        this.baseUrl = 'https://api.hunter.io/v2';
        this.currentDomain = '';
        this.init();
    }

    async init() {
        console.log('Initializing Hunter Extension...');
        await this.loadApiKey();
        await this.checkContextData();
        this.setupEventListeners();
        this.getCurrentTabInfo();
    }

    async loadApiKey() {
        try {
            const result = await chrome.storage.sync.get(['hunterApiKey']);
            if (result.hunterApiKey) {
                this.apiKey = result.hunterApiKey;
                this.showMainInterface();
                console.log('API Key loaded successfully');
            } else {
                console.log('No API Key found');
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    }

    async checkContextData() {
        try {
            const result = await chrome.storage.local.get(['contextDomain', 'contextAction', 'contextPerson']);
            
            if (result.contextAction === 'domainSearch' && result.contextDomain) {
                document.getElementById('domain-input').value = result.contextDomain;
                this.switchTab('domain');
                chrome.storage.local.remove(['contextDomain', 'contextAction']);
            } else if (result.contextAction === 'findPerson' && result.contextPerson) {
                const person = result.contextPerson;
                document.getElementById('person-domain').value = person.domain;
                document.getElementById('first-name').value = person.firstName;
                document.getElementById('last-name').value = person.lastName;
                this.switchTab('find');
                chrome.storage.local.remove(['contextPerson', 'contextAction']);
            }
        } catch (error) {
            console.error('Error checking context data:', error);
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // API Key setup
        const saveApiBtn = document.getElementById('save-api-key');
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                console.log('Save API key clicked');
                this.saveApiKey();
            });
        }

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                console.log('Tab clicked:', tab.dataset.tab);
                this.switchTab(tab.dataset.tab);
            });
        });

        // Search buttons
        const searchDomainBtn = document.getElementById('search-domain');
        if (searchDomainBtn) {
            searchDomainBtn.addEventListener('click', () => {
                console.log('Search domain clicked');
                this.searchByDomain();
            });
        }

        const extractPageBtn = document.getElementById('extract-page');
        if (extractPageBtn) {
            extractPageBtn.addEventListener('click', () => {
                console.log('Extract page clicked');
                this.extractFromPage();
            });
        }

        const findEmailBtn = document.getElementById('find-email');
        if (findEmailBtn) {
            findEmailBtn.addEventListener('click', () => {
                console.log('Find email clicked');
                this.findEmail();
            });
        }

        // Enter key support
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveApiKey();
            });
        }

        const domainInput = document.getElementById('domain-input');
        if (domainInput) {
            domainInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchByDomain();
            });
        }

        console.log('Event listeners setup complete');
    }

    async saveApiKey() {
        const apiKeyInput = document.getElementById('api-key');
        const apiKey = apiKeyInput.value.trim();
        
        console.log('Saving API key...');
        
        if (!apiKey) {
            this.showError('Por favor, insira uma API Key válida');
            return;
        }

        // Show loading state
        const saveBtn = document.getElementById('save-api-key');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Validando...';
        saveBtn.disabled = true;

        // Test the API key
        try {
            const response = await fetch(`${this.baseUrl}/account?api_key=${apiKey}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                await chrome.storage.sync.set({ hunterApiKey: apiKey });
                this.apiKey = apiKey;
                this.showMainInterface();
                this.showSuccess('✅ API Key salva com sucesso!');
                console.log('API Key validated and saved');
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.details || 'API Key inválida');
            }
        } catch (error) {
            console.error('API Key validation error:', error);
            this.showError(`❌ Erro: ${error.message}`);
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    showMainInterface() {
        const apiSetup = document.getElementById('api-setup');
        const mainInterface = document.getElementById('main-interface');
        
        if (apiSetup && mainInterface) {
            apiSetup.style.display = 'none';
            mainInterface.style.display = 'block';
            console.log('Main interface shown');
        }
    }

    async getCurrentTabInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url && !tab.url.startsWith('chrome://')) {
                const url = new URL(tab.url);
                this.currentDomain = url.hostname.replace('www.', '');
                
                const currentUrlElement = document.getElementById('current-url');
                const domainInput = document.getElementById('domain-input');
                const currentDomainInfo = document.getElementById('current-domain-info');
                const personDomainInput = document.getElementById('person-domain');
                
                if (currentUrlElement) {
                    currentUrlElement.textContent = tab.url;
                }
                
                if (domainInput && !domainInput.value) {
                    domainInput.value = this.currentDomain;
                }
                
                if (personDomainInput && !personDomainInput.value) {
                    personDomainInput.value = this.currentDomain;
                }
                
                if (currentDomainInfo) {
                    currentDomainInfo.innerHTML = `
                        <p>🌐 <strong>Domínio Atual:</strong> ${this.currentDomain}</p>
                        <p>Busque emails deste domínio automaticamente</p>
                    `;
                }
                
                console.log('Current domain:', this.currentDomain);
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`tab-${tabName}`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            
            // Clear previous results
            this.clearResults();
        }
    }

    async searchByDomain() {
        const domainInput = document.getElementById('domain-input');
        const domain = domainInput.value.trim();
        
        console.log('Searching domain:', domain);
        
        if (!domain) {
            this.showError('Por favor, insira um domínio');
            return;
        }

        if (!this.apiKey) {
            this.showError('API Key não configurada');
            return;
        }

        this.showLoading('domain-results', '🔍 Buscando emails...');

        try {
            const url = `${this.baseUrl}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}&limit=100`;
            console.log('API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.details || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Domain search results:', data);
            this.displayDomainResults(data);
        } catch (error) {
            console.error('Domain search error:', error);
            this.showError('❌ Erro ao buscar emails: ' + error.message);
            document.getElementById('domain-results').innerHTML = '';
        }
    }

    async extractFromPage() {
        console.log('Extracting from page...');
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
                this.showError('Não foi possível acessar esta página');
                return;
            }

            this.showLoading('page-results', '🌐 Extraindo emails...');

            // Extract emails from page content
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractEmails' });
            
            let apiResults = null;
            
            // Also try API search if we have API key
            if (this.apiKey && this.currentDomain) {
                try {
                    const apiResponse = await fetch(
                        `${this.baseUrl}/domain-search?domain=${encodeURIComponent(this.currentDomain)}&api_key=${this.apiKey}&limit=10`
                    );
                    
                    if (apiResponse.ok) {
                        apiResults = await apiResponse.json();
                    }
                } catch (error) {
                    console.log('API search failed, showing only extracted emails');
                }
            }
            
            this.displayPageResults(apiResults, response?.emails || []);
            
        } catch (error) {
            console.error('Page extraction error:', error);
            this.showError('❌ Erro ao extrair emails: ' + error.message);
            document.getElementById('page-results').innerHTML = '';
        }
    }

    async findEmail() {
        const domain = document.getElementById('person-domain').value.trim();
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();

        console.log('Finding email for:', firstName, lastName, 'at', domain);

        if (!domain) {
            this.showError('Por favor, insira o domínio da empresa');
            return;
        }

        if (!firstName || !lastName) {
            this.showError('Por favor, insira o nome e sobrenome');
            return;
        }

        if (!this.apiKey) {
            this.showError('API Key não configurada');
            return;
        }

        this.showLoading('find-results', '🎯 Procurando email...');

        try {
            const url = `${this.baseUrl}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${this.apiKey}`;
            console.log('Email finder URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errors?.[0]?.details || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Email finder results:', data);
            this.displayFindResults(data);
        } catch (error) {
            console.error('Email finder error:', error);
            this.showError('❌ Erro ao encontrar email: ' + error.message);
            document.getElementById('find-results').innerHTML = '';
        }
    }

    displayDomainResults(data) {
        const container = document.getElementById('domain-results');
        const statsContainer = document.getElementById('domain-stats');

        if (!data.data || !data.data.emails || data.data.emails.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>📭 Nenhum email encontrado para este domínio</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        Tente um domínio diferente ou verifique se está correto
                    </p>
                </div>
            `;
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
                        <span>${email.first_name || ''} ${email.last_name || ''} ${email.position ? '- ' + email.position : ''}</span>
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
        const exportBtn = document.getElementById('export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCSV(emails, `emails_${data.data.domain}`);
            });
        }

        const copyAllBtn = document.getElementById('copy-all');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => {
                const allEmails = emails.map(e => e.value).join('\n');
                this.copyToClipboard(allEmails);
            });
        }
    }

    displayPageResults(apiData, extractedEmails) {
        const container = document.getElementById('page-results');
        let html = '';

        // Show API results if available
        if (apiData && apiData.data && apiData.data.emails && apiData.data.emails.length > 0) {
            html += `
                <div class="page-emails">
                    <h4>🔍 Emails encontrados via API:</h4>
            `;
            apiData.data.emails.slice(0, 5).forEach(email => {
                html += `
                    <div class="extracted-email" data-email="${email.value}">
                        <strong>${email.value}</strong>
                        <span style="float: right; font-size: 11px; color: #666;">${email.confidence}%</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show extracted emails from page
        if (extractedEmails && extractedEmails.length > 0) {
            html += `
                <div class="page-emails">
                    <h4>🌐 Emails extraídos da página (${extractedEmails.length}):</h4>
            `;
            extractedEmails.forEach(email => {
                html += `<div class="extracted-email" data-email="${email}"><strong>${email}</strong></div>`;
            });
            html += '</div>';
        }

        if (!html) {
            html = `
                <div class="no-results">
                    <p>📭 Nenhum email encontrado nesta página</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        Tente uma página diferente com mais conteúdo de contato
                    </p>
                </div>
            `;
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
            container.innerHTML = `
                <div class="no-results">
                    <p>📭 Email não encontrado para esta pessoa</p>
                    <p style="font-size: 12px; color: #666; margin-top: 10px;">
                        Verifique se o nome e domínio estão corretos
                    </p>
                </div>
            `;
            return;
        }

        const email = data.data;
        const scoreClass = email.confidence >= 80 ? 'high' : 
                         email.confidence >= 50 ? 'medium' : 'low';
        
        container.innerHTML = `
            <div class="email-list">
                <div class="email-item" data-email="${email.email}">
                    <div class="email-address">${email.email}</div>
                    <div class="email-info">
                        <span>${email.first_name || ''} ${email.last_name || ''}</span>
                        <span class="email-score ${scoreClass}">${email.confidence}%</span>
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

        const copyBtn = document.getElementById('copy-found');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyToClipboard(email.email);
            });
        }
    }

    showLoading(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">${message}</div>
            `;
        }
    }

    showError(message) {
        this.showMessage(message, 'error-message', 5000);
    }

    showSuccess(message) {
        this.showMessage(message, 'success-message', 3000);
    }

    showMessage(message, className, duration) {
        // Remove existing messages
        document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = className;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, duration);
        }
    }

    clearResults() {
        const containers = ['domain-results', 'page-results', 'find-results'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
            }
        });
        
        const statsContainer = document.getElementById('domain-stats');
        if (statsContainer) {
            statsContainer.style.display = 'none';
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showSuccess(`📋 ${text} copiado para a área de transferência!`);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showSuccess(`📋 ${text} copiado!`);
        }
    }

    exportToCSV(emails, filename) {
        try {
            const csvContent = [
                ['Email', 'Nome', 'Sobrenome', 'Posição', 'Confiança'],
                ...emails.map(email => [
                    email.value || email.email,
                    email.first_name || '',
                    email.last_name || '',
                    email.position || '',
                    email.confidence || ''
                ])
            ].map(row => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            // Use downloads API if available
            if (chrome.downloads) {
                chrome.downloads.download({
                    url: url,
                    filename: `${filename}.csv`
                }, () => {
                    URL.revokeObjectURL(url);
                    this.showSuccess('📊 Arquivo CSV baixado!');
                });
            } else {
                // Fallback method
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showSuccess('📊 Arquivo CSV baixado!');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Erro ao exportar arquivo CSV');
        }
    }
}

// Initialize extension when popup loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Hunter Extension...');
    new HunterExtension();
});

// Also initialize if DOM is already loaded
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, initializing Hunter Extension...');
    new HunterExtension();
}