// Background Service Worker for Hunter Extension

class HunterBackground {
    constructor() {
        this.init();
    }

    init() {
        console.log('Initializing Hunter Background Service...');
        this.setupInstallHandler();
        this.setupContextMenus();
        this.setupMessageHandlers();
    }

    setupInstallHandler() {
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Extension installed:', details.reason);
            if (details.reason === 'install') {
                // Open popup on first install
                chrome.tabs.create({
                    url: chrome.runtime.getURL('popup.html')
                });
            }
        });
    }

    setupContextMenus() {
        // Remove existing menus first
        chrome.contextMenus.removeAll(() => {
            // Create new context menus
            chrome.contextMenus.create({
                id: 'hunter-extract-emails',
                title: '🔍 Hunter: Extrair emails desta página',
                contexts: ['page']
            });

            chrome.contextMenus.create({
                id: 'hunter-find-domain-emails',
                title: '🌐 Hunter: Buscar emails deste domínio',
                contexts: ['page']
            });

            chrome.contextMenus.create({
                id: 'hunter-separator',
                type: 'separator',
                contexts: ['page']
            });

            chrome.contextMenus.create({
                id: 'hunter-find-person-email',
                title: '👤 Hunter: Encontrar email desta pessoa',
                contexts: ['selection']
            });

            console.log('Context menus created');
        });

        // Handle context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            console.log('Context menu clicked:', info.menuItemId);
            this.handleContextMenuClick(info, tab);
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received:', request);
            
            if (request.action === 'getDomain') {
                try {
                    const url = new URL(sender.tab.url);
                    const domain = url.hostname.replace(/^www\./, '');
                    sendResponse({ domain: domain });
                } catch (error) {
                    console.error('Error getting domain:', error);
                    sendResponse({ domain: null });
                }
                return true;
            }
        });
    }

    async handleContextMenuClick(info, tab) {
        try {
            switch (info.menuItemId) {
                case 'hunter-extract-emails':
                    await this.extractEmailsFromPage(tab);
                    break;
                case 'hunter-find-domain-emails':
                    await this.openDomainSearch(tab);
                    break;
                case 'hunter-find-person-email':
                    await this.findPersonEmail(info.selectionText, tab);
                    break;
            }
        } catch (error) {
            console.error('Context menu action error:', error);
        }
    }

    async extractEmailsFromPage(tab) {
        try {
            console.log('Extracting emails from page:', tab.url);
            
            // Inject content script if not already injected
            await this.ensureContentScriptInjected(tab.id);
            
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'extractEmails' 
            });
            
            if (response && response.emails && response.emails.length > 0) {
                this.showNotification(
                    `${response.emails.length} email(s) encontrado(s)!`,
                    'Clique no ícone da extensão para ver os resultados'
                );
            } else {
                this.showNotification(
                    'Nenhum email encontrado',
                    'Tente uma página com mais conteúdo de contato'
                );
            }
        } catch (error) {
            console.error('Error extracting emails:', error);
            this.showNotification(
                'Erro ao extrair emails',
                'Verifique se a página permite acesso ao conteúdo'
            );
        }
    }

    async openDomainSearch(tab) {
        try {
            const url = new URL(tab.url);
            const domain = url.hostname.replace(/^www\./, '');
            
            console.log('Opening domain search for:', domain);
            
            // Store domain for popup
            await chrome.storage.local.set({ 
                contextDomain: domain,
                contextAction: 'domainSearch'
            });
            
            // Open popup
            chrome.action.openPopup();
        } catch (error) {
            console.error('Error opening domain search:', error);
        }
    }

    async findPersonEmail(selectedText, tab) {
        try {
            if (!selectedText) {
                this.showNotification(
                    'Nenhum texto selecionado',
                    'Selecione um nome completo (nome e sobrenome)'
                );
                return;
            }
            
            const nameParts = selectedText.trim().split(/\s+/);
            if (nameParts.length < 2) {
                this.showNotification(
                    'Nome incompleto',
                    'Selecione um nome completo (nome e sobrenome)'
                );
                return;
            }
            
            const url = new URL(tab.url);
            const domain = url.hostname.replace(/^www\./, '');
            
            console.log('Finding person email:', nameParts, 'at', domain);
            
            // Store person info for popup
            await chrome.storage.local.set({
                contextPerson: {
                    firstName: nameParts[0],
                    lastName: nameParts[nameParts.length - 1],
                    domain: domain
                },
                contextAction: 'findPerson'
            });
            
            // Open popup
            chrome.action.openPopup();
        } catch (error) {
            console.error('Error finding person email:', error);
        }
    }

    async ensureContentScriptInjected(tabId) {
        try {
            // Try to ping the content script
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
            // Content script not available, inject it
            console.log('Injecting content script...');
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                
                await chrome.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ['content.css']
                });
            } catch (injectionError) {
                console.error('Failed to inject content script:', injectionError);
                throw injectionError;
            }
        }
    }

    showNotification(title, message) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message
            });
        }
    }
}

// Initialize background service
console.log('Starting Hunter Background Service...');
const hunterBackground = new HunterBackground();