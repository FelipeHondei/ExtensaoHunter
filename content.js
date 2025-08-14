// Content Script for Email Extraction
class EmailExtractor {
    constructor() {
        this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        this.init();
    }

    init() {
        this.setupMessageListener();
        this.addFloatingButton();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'extractEmails') {
                const emails = this.extractEmailsFromPage();
                sendResponse({ emails: emails });
            }
            return true;
        });
    }

    extractEmailsFromPage() {
        const emails = new Set();
        const textNodes = this.getAllTextNodes();
        
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
        
        return Array.from(emails);
    }

    getAllTextNodes() {
        const walker = document.createTreeWalker(
            document.body,
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
        const elementsWithEmails = document.querySelectorAll('[data-email], [data-contact]');
        elementsWithEmails.forEach(element => {
            const dataEmail = element.getAttribute('data-email') || element.getAttribute('data-contact');
            if (dataEmail && this.isValidEmail(dataEmail)) {
                emails.add(dataEmail.toLowerCase());
            }
        });
    }

    isValidEmail(email) {
        // Filter out common false positives
        const invalidPatterns = [
            /\.(png|jpg|jpeg|gif|svg|css|js|pdf|doc|docx)$/i,
            /^(no-reply|noreply|donotreply)@/i,
            /example\./i,
            /test@/i,
            /placeholder/i,
            /dummy/i,
            /@(example\.com|test\.com|localhost|127\.0\.0\.1)/i
        ];

        return !invalidPatterns.some(pattern => pattern.test(email)) && 
               email.includes('.') && 
               email.length > 5 && 
               email.length < 100;
    }

    addFloatingButton() {
        // Create floating button for quick email extraction
        const button = document.createElement('div');
        button.id = 'hunter-floating-btn';
        button.innerHTML = '🔍';
        button.title = 'Hunter: Extrair emails desta página';
        
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });

        button.addEventListener('click', () => {
            this.showEmailsModal();
        });

        document.body.appendChild(button);
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
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    🔍 Emails Encontrados
                </h2>
                <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
            </div>
        `;

        if (emails.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">😔</div>
                    <p>Nenhum email encontrado nesta página</p>
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
                        <div style="font-weight: 600; color: #2c3e50;">${email}</div>
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
        document.getElementById('close-modal').addEventListener('click', () => {
            modal.remove();
        });

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
            document.getElementById('copy-all-emails').addEventListener('click', () => {
                const allEmails = emails.join('\n');
                this.copyToClipboard(allEmails);
            });

            document.getElementById('export-emails').addEventListener('click', () => {
                this.exportEmails(emails);
            });
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification(`📋 Copiado: ${text}`);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification(`📋 Copiado: ${text}`);
        }
    }

    exportEmails(emails) {
        const csv = 'Email\n' + emails.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `emails_${window.location.hostname}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('📤 Arquivo CSV baixado!');
    }

    showNotification(message) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.hunter-notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'hunter-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #28a745;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 10002;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideDown 0.3s ease;
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }
}

// Initialize email extractor when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new EmailExtractor();
    });
} else {
    new EmailExtractor();
}