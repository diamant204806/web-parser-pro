// Web Parser Pro - Professional Edition
class WebParserPro {
    constructor() {
        this.isParsing = false;
        this.results = null;
        this.currentUrl = null;
        
        // Professional CORS proxies
        this.proxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url='
        ];
        
        // Rate limiting
        this.rateLimit = {
            lastRequest: 0,
            minInterval: 1000 // 1 second between requests
        };
        
        this.init();
    }
    
    init() {
        console.log('🚀 Web Parser Pro v2.0 initialized');
        this.bindEvents();
        this.loadExamples();
        this.checkUpdates();
    }
    
    bindEvents() {
        // Core functionality
        document.getElementById('parseBtn')?.addEventListener('click', () => this.parseWebsite());
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearResults());
        document.getElementById('copyResults')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('exportResults')?.addEventListener('click', () => this.exportResults());
        
        // Keyboard shortcuts
        document.getElementById('urlInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.parseWebsite();
            }
        });
        
        // URL input validation
        document.getElementById('urlInput')?.addEventListener('input', (e) => {
            this.validateUrlInput(e.target);
        });
    }
    
    async parseWebsite() {
        // Rate limiting check
        const now = Date.now();
        if (now - this.rateLimit.lastRequest < this.rateLimit.minInterval) {
            this.showToast('Пожалуйста, подождите немного между запросами', 'warning');
            return;
        }
        
        const url = document.getElementById('urlInput').value.trim();
        if (!this.validateUrl(url)) {
            this.showToast('Пожалуйста, введите корректный URL', 'error');
            return;
        }
        
        if (this.isParsing) return;
        
        this.isParsing = true;
        this.currentUrl = url;
        this.showProgress();
        this.updateProgress(10, 'Подготовка к анализу...');
        
        try {
            // Analytics
            if (typeof gtag === 'function') {
                gtag('event', 'parse_start', { url });
            }
            
            // Fetch with retry logic
            const html = await this.fetchWithRetry(url);
            this.updateProgress(40, 'Получен HTML контент');
            
            // Parse based on selected type
            const dataType = document.getElementById('dataType').value;
            const data = await this.parseWithTimeout(html, dataType);
            this.updateProgress(70, 'Анализ данных...');
            
            // Format results
            const format = document.getElementById('outputFormat').value;
            const formattedResults = this.formatResults(data, format);
            this.updateProgress(90, 'Форматирование результатов...');
            
            // Display results
            this.displayResults(formattedResults, data);
            this.updateProgress(100, 'Анализ завершен!', data.count || 1);
            
            // Success analytics
            if (typeof gtag === 'function') {
                gtag('event', 'parse_success', {
                    url,
                    data_type: dataType,
                    items_found: data.count || 0
                });
            }
            
            this.rateLimit.lastRequest = Date.now();
            
        } catch (error) {
            console.error('Parse error:', error);
            this.showToast(`Ошибка: ${error.message}`, 'error');
            
            // Error analytics
            if (typeof gtag === 'function') {
                gtag('event', 'parse_error', {
                    error: error.message,
                    url: this.currentUrl
                });
            }
            
        } finally {
            this.isParsing = false;
            setTimeout(() => this.hideProgress(), 2000);
        }
    }
    
    async fetchWithRetry(url, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.updateProgress(
                    10 + (attempt - 1) * 10,
                    `Попытка подключения (${attempt}/${retries})...`
                );
                
                const proxy = this.proxies[(attempt - 1) % this.proxies.length];
                const proxyUrl = proxy + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; WebParserPro/2.0)',
                        'Accept': 'text/html,application/xhtml+xml',
                        'Accept-Language': 'ru-RU,ru;q=0.9',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 10000
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const html = await response.text();
                if (!html || html.length < 100) {
                    throw new Error('Получен пустой или слишком короткий ответ');
                }
                
                return html;
                
            } catch (error) {
                if (attempt === retries) {
                    throw new Error(`Не удалось загрузить страницу: ${error.message}`);
                }
                await this.sleep(1000 * attempt); // Exponential backoff
            }
        }
    }
    
    async parseWithTimeout(html, type) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут анализа (30 секунд)'));
            }, 30000);
            
            try {
                const result = this.parseData(html, type);
                clearTimeout(timeout);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    
    parseData(html, type) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const baseURI = doc.baseURI || this.currentUrl;
        
        switch(type) {
            case 'metadata':
                const metadata = {
                    title: doc.title || 'Не указан',
                    description: doc.querySelector('meta[name="description"]')?.content || 'Не указано',
                    keywords: doc.querySelector('meta[name="keywords"]')?.content || 'Не указаны',
                    charset: doc.characterSet,
                    language: doc.documentElement.lang || 'Не указан',
                    viewport: doc.querySelector('meta[name="viewport"]')?.content || 'Не указано',
                    robots: doc.querySelector('meta[name="robots"]')?.content || 'Не указано',
                    ogTitle: doc.querySelector('meta[property="og:title"]')?.content || 'Не указано',
                    ogDescription: doc.querySelector('meta[property="og:description"]')?.content || 'Не указано'
                };
                return { ...metadata, count: Object.keys(metadata).length };
                
            case 'links':
                const links = [];
                doc.querySelectorAll('a[href]').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                        const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseURI).href;
                        links.push({
                            text: link.textContent.trim().substring(0, 100) || '[без текста]',
                            href: absoluteUrl,
                            isExternal: href.startsWith('http') && !href.includes(baseURI),
                            rel: link.getAttribute('rel') || '',
                            target: link.getAttribute('target') || '_self'
                        });
                    }
                });
                return { links, count: links.length };
                
            case 'headings':
                const headings = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
                for (let i = 1; i <= 6; i++) {
                    doc.querySelectorAll(`h${i}`).forEach(h => {
                        headings[`h${i}`].push({
                            text: h.textContent.trim(),
                            id: h.id || null
                        });
                    });
                }
                const totalHeadings = Object.values(headings).reduce((sum, arr) => sum + arr.length, 0);
                return { ...headings, count: totalHeadings };
                
            case 'images':
                const images = [];
                doc.querySelectorAll('img').forEach(img => {
                    const src = img.getAttribute('src');
                    if (src) {
                        const absoluteSrc = src.startsWith('http') ? src : new URL(src, baseURI).href;
                        images.push({
                            src: absoluteSrc,
                            alt: img.getAttribute('alt') || '',
                            width: img.getAttribute('width') || null,
                            height: img.getAttribute('height') || null,
                            loading: img.getAttribute('loading') || 'eager'
                        });
                    }
                });
                return { images, count: images.length };
                
            case 'text':
                const textContent = doc.body.textContent || '';
                const sentences = textContent
                    .replace(/\s+/g, ' ')
                    .split(/[.!?]+/)
                    .filter(s => s.trim().length > 10)
                    .map(s => s.trim())
                    .slice(0, 50);
                    
                const words = textContent
                    .toLowerCase()
                    .match(/\b[\w']+\b/g) || [];
                    
                const wordCount = words.length;
                const uniqueWords = [...new Set(words)].length;
                
                return {
                    sentences,
                    wordCount,
                    uniqueWords,
                    readingTime: Math.ceil(wordCount / 200), // minutes
                    count: sentences.length
                };
                
            default:
                return { error: 'Неизвестный тип анализа', count: 0 };
        }
    }
    
    formatResults(data, format) {
        switch(format) {
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            case 'html':
                return this.convertToHTML(data);
                
            default:
                return JSON.stringify(data, null, 2);
        }
    }
    
    convertToCSV(data) {
        if (!data || typeof data !== 'object') return '';
        
        if (Array.isArray(data.links)) {
            const headers = ['Text', 'URL', 'External', 'Rel'];
            const rows = data.links.map(link => [
                `"${link.text.replace(/"/g, '""')}"`,
                `"${link.href}"`,
                link.isExternal ? 'Yes' : 'No',
                `"${link.rel}"`
            ]);
            return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }
        
        return 'CSV формат доступен только для табличных данных';
    }
    
    convertToHTML(data) {
        let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Web Parser Pro Results</title></head><body>';
        html += '<h1>Результаты анализа</h1>';
        
        for (const [key, value] of Object.entries(data)) {
            if (key === 'count') continue;
            
            html += `<h2>${key}</h2>`;
            if (Array.isArray(value)) {
                html += '<ul>';
                value.forEach(item => {
                    if (typeof item === 'object') {
                        html += '<li>' + JSON.stringify(item) + '</li>';
                    } else {
                        html += `<li>${item}</li>`;
                    }
                });
                html += '</ul>';
            } else if (typeof value === 'object') {
                html += '<pre>' + JSON.stringify(value, null, 2) + '</pre>';
            } else {
                html += `<p><strong>${key}:</strong> ${value}</p>`;
            }
        }
        
        html += '</body></html>';
        return html;
    }
    
    displayResults(formattedResults, rawData) {
        const output = document.getElementById('resultsOutput');
        const format = document.getElementById('outputFormat').value;
        
        // Clear previous results
        output.innerHTML = '';
        
        if (format === 'json') {
            const pre = document.createElement('pre');
            pre.textContent = formattedResults;
            pre.className = 'json-output';
            output.appendChild(pre);
        } else if (format === 'csv') {
            const pre = document.createElement('pre');
            pre.textContent = formattedResults;
            pre.className = 'csv-output';
            output.appendChild(pre);
        } else if (format === 'html') {
            const iframe = document.createElement('iframe');
            iframe.srcdoc = formattedResults;
            iframe.style.width = '100%';
            iframe.style.height = '400px';
            iframe.style.border = '1px solid var(--border)';
            iframe.style.borderRadius = 'var(--radius)';
            output.appendChild(iframe);
        }
        
        // Show summary
        if (rawData.count > 0) {
            this.showToast(`Найдено ${rawData.count} элементов`, 'success');
        }
        
        this.results = { formatted: formattedResults, raw: rawData };
    }
    
    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }
    
    validateUrlInput(input) {
        if (input.value.trim() && this.validateUrl(input.value.trim())) {
            input.style.borderColor = 'var(--success)';
        } else {
            input.style.borderColor = '';
        }
    }
    
    showProgress() {
        document.getElementById('progressBar').style.display = 'block';
        document.getElementById('parseBtn').disabled = true;
        document.getElementById('clearBtn').disabled = true;
    }
    
    updateProgress(percent, text, items = 0) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressPercent').textContent = `${percent}%`;
        document.getElementById('statusText').textContent = text;
        document.getElementById('itemsCounter').textContent = items > 0 ? `${items} элементов` : '';
    }
    
    hideProgress() {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) progressBar.style.display = 'none';
        
        document.getElementById('parseBtn').disabled = false;
        document.getElementById('clearBtn').disabled = false;
    }
    
    clearResults() {
        const output = document.getElementById('resultsOutput');
        output.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>Результаты анализа появятся здесь</h4>
                <p>Введите URL и нажмите "Запустить анализ"</p>
            </div>
        `;
        this.results = null;
        document.getElementById('urlInput').value = '';
        document.getElementById('urlInput').style.borderColor = '';
    }
    
    async copyToClipboard() {
        if (!this.results) {
            this.showToast('Нет данных для копирования', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(this.results.formatted);
            this.showToast('Скопировано в буфер обмена!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Ошибка копирования', 'error');
        }
    }
    
    exportResults() {
        if (!this.results) {
            this.showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        const format = document.getElementById('outputFormat').value;
        const extension = format === 'csv' ? 'csv' : format === 'html' ? 'html' : 'json';
        const filename = `webparser-pro-results-${Date.now()}.${extension}`;
        
        const blob = new Blob([this.results.formatted], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`Файл ${filename} скачан`, 'success');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(toast);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--surface);
                border: 1px solid var(--border);
                border-left: 4px solid var(--primary);
                border-radius: var(--radius);
                padding: 1rem 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                box-shadow: var(--shadow-lg);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .toast-success { border-left-color: var(--success); }
            .toast-error { border-left-color: var(--danger); }
            .toast-warning { border-left-color: var(--warning); }
            .toast .toast-close {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0.25rem;
                margin-left: auto;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
    
    loadExamples() {
        const examples = [
            { url: 'https://example.com', name: 'Пример сайта' },
            { url: 'https://developer.mozilla.org', name: 'MDN Web Docs' },
            { url: 'https://github.com', name: 'GitHub' }
        ];
        
        // Could be used for example buttons if added
    }
    
    checkUpdates() {
        // Check for updates periodically
        setInterval(() => {
            if (navigator.onLine) {
                console.log('Checking for updates...');
                // Update logic here
            }
        }, 3600000); // Every hour
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.webParser = new WebParserPro();
    
    // Initialize AdSense
    setTimeout(() => {
        try {
            if (typeof adsbygoogle !== 'undefined') {
                (adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (error) {
            console.log('AdSense initialization error:', error);
        }
    }, 1000);
});
