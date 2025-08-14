// Background Service Worker for Hunter Extension

class HunterBackground {
    constructor() {
        this.init();
    }

    init() {
        this.setupInstallHandler();
        this.setupContextMenus();
        this.setupMessageHandlers();
    }

    setupInstallHandler() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                // Open options page on first install
                chrome.tabs.create({
                    url: chrome.runtime.getURL('popup.html')
                });
            }
        });
    }

    setupContextMenus() {
        chrome.contextMenus.create({
            id: 'hunter-extract-emails',
            title: '🔍 Extrair emails desta página',
            contexts: ['page']
        });

        chrome.contextMenus.create({
            id: 'hunter-find-domain-emails',
            title: '🌐 Buscar emails deste domínio',
            contexts: ['page']
        });

        chrome.contextMenus.create({
            id: 'hunter-separator',
            type: 'separator',
            contexts: ['page']
        });

        chrome.contextMenus.create({
            id: 'hunter-find-person-email',
            title: '👤 Encontrar email desta pessoa',
            contexts: ['selection']
        });

        // Handle context menu clicks
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getDomain') {
                const url = new URL(sender.tab.url);
                sendResponse({ domain: url.hostname.replace('www.', '') });
            }
            return true;
        });
    }

    async handleContextMenuClick(info, tab) {
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
    }

    async extractEmailsFromPage(tab) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'extractEmails' 
            });
            
            if (response && response.emails && response.emails.length > 0) {
                // Show notification with results
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Hunter Email Finder',
                    message: `${response.emails.length} email(s) encontrado(s) nesta página!`
                });
            } else {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Hunter Email Finder',
                    message: 'Nenhum email encontrado nesta página.'
                });
            }
        } catch (error) {
            console.error('Error extracting emails:', error);
        }
    }

    async openDomainSearch(tab) {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        
        // Store domain for popup
        await chrome.storage.local.set({ 
            contextDomain: domain,
            contextAction: 'domainSearch'
        });
        
        // Open popup
        chrome.action.openPopup();
    }

    async findPersonEmail(selectedText, tab) {
        if (!selectedText) return;
        
        const nameParts = selectedText.trim().split(/\s+/);
        if (nameParts.length < 2) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Hunter Email Finder',
                message: 'Selecione um nome completo (nome e sobrenome)'
            });
            return;
        }
        
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');
        
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
    }
}

// Initialize background service
new HunterBackground();