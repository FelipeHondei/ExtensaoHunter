// Content Script for Email Extraction
class EmailExtractor {
    constructor() {
        this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Initializing EmailExtractor...');
        this.setupMessageListener();
        this.addFloatingButton();
        this.isInitialized = true;
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Content script received message:', request);
            
            if (request.action === 'extractEmails') {
                const emails = this.extractEmailsFromPage();
                console.log('Extracted emails:', emails);
                sendResponse({ emails: emails });
            } else if (request.action === 'ping') {
                sendResponse({ status: 'alive' });
            }
            
            return true;
        });
    }

    extractEmailsFromPage() {
        const emails = new Set();
        const textNodes = this.getAllTextNodes();
        
        console.log('Processing', textNodes.length, 'text nodes...');
        
        textNodes.forEach(node => {
            const text = node.textContent;
            const matches = text.match(this.emailRegex);
            if (matches) {
                matches.forEach(email => {
                    // Filter out common false positives
                    if (this.isValidEmail(email)) {
                        emails.add(email.toLowerCase());
                    }
                });
            }
        });

        // Also check specific attributes that might contain emails
        this.extractFromAttributes(emails);
        
        const emailArray = Array.from(emails);
        console.log('Valid emails found:', emailArray);
        return emailArray;
    }

    getAllTextNodes() {
        const walker = document.createTreeWalker(
            document.body || document.documentElement,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip script and style tags
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    const tagName = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript'].includes(tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip if text is too short or empty
                    if (!node.textContent || node.textContent.trim().length < 5) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            nodes.push(node);
        }
        return nodes;
    }

    extractFromAttributes(emails) {
        // Check href attributes in mailto links
        const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
        mailtoLinks.forEach(link => {
            const href = link.getAttribute('href');
            const email = href.replace('mailto:', '').split('?')[0];
            if (this.isValidEmail(email)) {
                emails.add(email.toLowerCase());
            }
        });

        // Check data attributes and other common places
        const selectors = [
            '[data-email]',
            '[data-contact]',
            '[data-mail]',
            'input[type="email"]',
            'span[class*="email"]',
            'div[class*="email"]',
            'p[class*="contact"]'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const dataEmail = element.getAttribute('data-email') || 
                                    element.getAttribute('data-contact') ||
                                    element.getAttribute('data-mail') ||
                                    element.value ||
                                    element.textContent;
                    
                    if (dataEmail) {
                        const matches = dataEmail.match(this.emailRegex);
                        if (matches) {
                            matches.forEach(email => {
                                if (this.isValidEmail(email)) {
                                    emails.add(email.toLowerCase());
                                }
                            });
                        }
                    }
                });
            } catch (error) {
                console.warn('Error processing selector', selector, ':', error);
            }
        });
    }

    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        // Basic format check
        if (!email.includes('@') || !email.includes('.')) return false;
        
        // Length check
        if (email.length < 5 || email.length > 100) return false;
        
        // Filter out common false positives
        const invalidPatterns = [
            /\.(png|jpg|jpeg|gif|svg|css|js|pdf|doc|docx|zip|rar)$/i,
            /^(no-reply|noreply|donotreply|do-not-reply)@/i,
            /example\./i,
            /test@/i,
            /placeholder/i,
            /dummy/i,
            /sample/i,
            /fake/i,
            /@(example\.com|test\.com|localhost|127\.0\.0\.1|domain\.com)/i,
            /^[0-9]+@/,  // Numbers only before @
            /\.(jpg|png|gif)@/i,  // File extensions in email
            /@.*\.(jpg|png|gif|css|js)/i  // File extensions in domain
        ];

        return !invalidPatterns.some(pattern => pattern.test(email));
    }

    addFloatingButton() {
        // Check if button already exists
        if (document.getElementById('hunter-floating-btn')) {
            return;
        }

        // Don't add button on certain pages
        if (window.location.href.startsWith('chrome://') || 
            window.location.href.startsWith('moz-extension://') ||
            window.location.href.startsWith('chrome-extension://')) {
            return;
        }

        // Create floating button for quick email extraction
        const button = document.createElement('div');
        button.id = 'hunter-floating-btn';
        button.innerHTML = '🔍';
        button.title = 'Hunter: Extrair emails desta página';
        
        button.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            width: 50px !important;
            height: 50px !important;
            background: linear-gradient(135deg, #667eea, #764ba2) !important;
            color: white !important;
            border: none !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 20px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            transition: all 0.3s ease !important;
            user-select: none !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showEmailsModal();
        });

        // Add button to page
        if (document.body) {
            document.body.appendChild(button);
        } else {
            // Wait for body to be available
            const observer = new MutationObserver(() => {
                if (document.body) {
                    document.body.appendChild(button);
                    observer.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    showEmailsModal() {
        const emails = this.extractEmailsFromPage();
        
        // Remove existing modal if present
        const existingModal = document.getElementById('hunter-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'hunter-modal';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 1000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white !important;
            padding: 30px !important;
            border-radius: 15px !important;
            max-width: 500px !important;
            max-height: 70vh !important;
            overflow-y: auto !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
            margin: 20px !important;
        `;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                    🔍 Emails Encontrados
                </h2>
                <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
        `;

        if (emails.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">😔</div>
                    <p style="margin: 0;">Nenhum email encontrado nesta página</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #999;">Tente uma página com mais conteúdo de contato</p>
                </div>
            `;
        } else {
            html += `
                <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                    <strong style="color: #1976d2;">✅ ${emails.length} email${emails.length > 1 ? 's' : ''} encontrado${emails.length > 1 ? 's' : ''}</strong>
                </div>
            `;

            emails.forEach((email, index) => {
                html += `
                    <div class="email-item-modal" data-email="${email}" style="
                        padding: 12px;
                        margin: 8px 0;
                        background: #f8f9fa;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        border-left: 4px solid #667eea;
                    " onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#f8f9fa'">
                        <div style="font-weight: 600; color: #2c3e50; word-break: break-all;">${email}</div>
                        <div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Clique para copiar</div>
                    </div>
                `;
            });

            html += `
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button id="copy-all-emails" style="
                        flex: 1;
                        background: linear-gradient(135deg, #28a745, #20c997);
                        color: white;
                        border: none;
                        padding: 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">📋 Copiar Todos</button>
                    <button id="export-emails" style="
                        flex: 1;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        padding: 12px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    ">📤 Exportar</button>
                </div>
            `;
        }

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = document.getElementById('close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.querySelectorAll('.email-item-modal').forEach(item => {
            item.addEventListener('click', () => {
                this.copyToClipboard(item.dataset.email);
            });
        });

        if (emails.length > 0) {
            const copyAllBtn = document.getElementById('copy-all-emails');
            if (copyAllBtn) {
                copyAllBtn.addEventListener('click', () => {
                    const allEmails = emails.join('\n');
                    this.copyToClipboard(allEmails);
                });
            }

            const exportBtn = document.getElementById('export-emails');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportEmails(emails);
                });
            }
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification(`📋 Copiado: ${text}`);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback for older browsers
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position: fixed; top: -9999px; left: -9999px;';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showNotification(`📋 Copiado: ${text}`);
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                this.showNotification('❌ Erro ao copiar');
            }
        }
    }

    exportEmails(emails) {
        try {
            const csv = 'Email\n' + emails.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `emails_${window.location.hostname}_${new Date().toISOString().split('T')[0]}.csv`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('📤 Arquivo CSV baixado!');
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('❌ Erro ao exportar');
        }
    }

    showNotification(message) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.hunter-notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'hunter-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: #28a745 !important;
            color: white !important;
            padding: 12px 24px !important;
            border-radius: 25px !important;
            z-index: 1000001 !important;
            font-family: system-ui, -apple-system, sans-serif !important;
            font-weight: 600 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            animation: slideDown 0.3s ease !important;
            max-width: 90vw !important;
            word-break: break-word !important;
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        
        if (!document.getElementById('hunter-animation-styles')) {
            style.id = 'hunter-animation-styles';
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize email extractor
console.log('Content script loaded');

// Multiple initialization methods to ensure it works
function initializeExtractor() {
    if (window.hunterEmailExtractor) return;
    
    try {
        window.hunterEmailExtractor = new EmailExtractor();
        console.log('EmailExtractor initialized successfully');
    } catch (error) {
        console.error('Failed to initialize EmailExtractor:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtractor);
} else {
    initializeExtractor();
}

// Also initialize after a short delay to ensure everything is loaded
setTimeout(initializeExtractor, 1000);