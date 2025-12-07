// script.js
class WebParserPro {
    constructor() {
        this.baseUrl = 'https://corsproxy.io/?';
        this.isParsing = false;
        this.results = null;
        this.startTime = null;
        this.timer = null;
        this.init();
    }

    init() {
        // Инициализация событий
        document.getElementById('parseBtn').addEventListener('click', () => this.startParsing());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearResults());
        document.getElementById('copyResults').addEventListener('click', () => this.copyResults());
        document.getElementById('exportResults').addEventListener('click', () => this.exportResults());
        
        // Валидация URL при вводе
        const urlInput = document.getElementById('urlInput');
        urlInput.addEventListener('input', (e) => {
            this.validateUrl(e.target.value);
        });
    }

    validateUrl(url) {
        const urlRegex = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}(\/.*)?$/i;
        const parseBtn = document.getElementById('parseBtn');
        
        if (url.trim() && urlRegex.test(url.trim())) {
            parseBtn.disabled = false;
            parseBtn.classList.remove('loading');
            return true;
        } else {
            parseBtn.disabled = true;
            return false;
        }
    }

    async startParsing() {
        if (this.isParsing) return;
        
        const url = document.getElementById('urlInput').value.trim();
        const dataType = document.getElementById('dataType').value;
        const outputFormat = document.getElementById('outputFormat').value;
        
        if (!this.validateUrl(url)) {
            this.showToast('Введите корректный URL', 'error');
            return;
        }

        this.isParsing = true;
        this.startTime = Date.now();
        this.results = null;
        
        // Показываем прогресс
        this.showProgress();
        this.updateProgress('Подготовка запроса...', 10);
        
        try {
            // Добавляем http:// если нет протокола
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            const proxyUrl = `${this.baseUrl}${encodeURIComponent(fullUrl)}`;
            
            this.updateProgress('Загрузка страницы...', 30);
            
            // Загружаем страницу через прокси
            const response = await fetch(proxyUrl, {
                headers: {
                    'User-Agent': 'WebParserPro/1.0 (+https://webparser.pro)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.updateProgress('Парсинг контента...', 60);
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Извлекаем данные в зависимости от типа
            let data;
            switch (dataType) {
                case 'metadata':
                    data = this.extractMetadata(doc, fullUrl);
                    break;
                case 'links':
                    data = this.extractLinks(doc);
                    break;
                case 'headings':
                    data = this.extractHeadings(doc);
                    break;
                case 'images':
                    data = this.extractImages(doc);
                    break;
                case 'text':
                    data = this.extractText(doc);
                    break;
                default:
                    data = this.extractMetadata(doc, fullUrl);
            }
            
            this.updateProgress('Форматирование результатов...', 90);
            
            // Форматируем вывод
            const formattedResults = this.formatResults(data, outputFormat);
            this.results = { data, formatted: formattedResults, type: dataType };
            
            this.updateProgress('Завершение...', 100);
            
            // Показываем результаты
            this.showResults(formattedResults);
            this.showToast('Анализ завершен успешно!', 'success');
            
        } catch (error) {
            console.error('Ошибка парсинга:', error);
            this.showToast(`Ошибка: ${error.message}`, 'error');
            this.showResults(`Ошибка при парсинге сайта:\n${error.message}`);
        } finally {
            this.isParsing = false;
            setTimeout(() => this.hideProgress(), 1500);
        }
    }

    extractMetadata(doc, url) {
        const metadata = {
            url: url,
            title: doc.title || 'Нет заголовка',
            description: this.getMetaContent(doc, 'description'),
            keywords: this.getMetaContent(doc, 'keywords'),
            author: this.getMetaContent(doc, 'author'),
            viewport: this.getMetaContent(doc, 'viewport'),
            charset: doc.characterSet || doc.charset,
            language: doc.documentElement.lang || 'Не указан',
            og: {
                title: this.getMetaContent(doc, 'og:title'),
                description: this.getMetaContent(doc, 'og:description'),
                image: this.getMetaContent(doc, 'og:image'),
                type: this.getMetaContent(doc, 'og:type')
            }
        };
        
        return metadata;
    }

    extractLinks(doc) {
        const links = Array.from(doc.querySelectorAll('a[href]'))
            .map(a => ({
                text: a.textContent.trim() || '[без текста]',
                href: a.href,
                title: a.title || '',
                rel: a.rel || '',
                target: a.target || '_self'
            }))
            .filter(link => link.href && !link.href.startsWith('javascript:'));
        
        return {
            total: links.length,
            internal: links.filter(l => new URL(l.href).hostname === new URL(doc.URL).hostname).length,
            external: links.filter(l => new URL(l.href).hostname !== new URL(doc.URL).hostname).length,
            links: links.slice(0, 100) // Ограничиваем для производительности
        };
    }

    extractHeadings(doc) {
        const headings = [];
        for (let i = 1; i <= 6; i++) {
            const hTags = doc.querySelectorAll(`h${i}`);
            headings.push({
                level: i,
                count: hTags.length,
                items: Array.from(hTags).slice(0, 20).map(h => ({
                    text: h.textContent.trim(),
                    id: h.id || ''
                }))
            });
        }
        return headings;
    }

    extractImages(doc) {
        const images = Array.from(doc.querySelectorAll('img[src]'))
            .map(img => ({
                src: img.src,
                alt: img.alt || '',
                title: img.title || '',
                width: img.width || img.naturalWidth,
                height: img.height || img.naturalHeight,
                loading: img.loading || 'eager'
            }));
        
        return {
            total: images.length,
            withAlt: images.filter(img => img.alt).length,
            withoutAlt: images.filter(img => !img.alt).length,
            images: images.slice(0, 50)
        };
    }

    extractText(doc) {
        // Удаляем скрипты и стили
        const clone = doc.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
        
        // Получаем текст
        const text = clone.body.textContent || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        return {
            totalCharacters: text.length,
            totalWords: words.length,
            totalSentences: sentences.length,
            averageWordsPerSentence: words.length / Math.max(sentences.length, 1),
            readingTime: Math.ceil(words.length / 200), // минуты
            sample: text.substring(0, 1000) + (text.length > 1000 ? '...' : '')
        };
    }

    formatResults(data, format) {
        switch (format) {
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
        if (typeof data !== 'object') return data;
        
        const flatten = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, key) => {
                const pre = prefix.length ? prefix + '.' : '';
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    Object.assign(acc, flatten(obj[key], pre + key));
                } else {
                    acc[pre + key] = obj[key];
                }
                return acc;
            }, {});
        };
        
        const flat = flatten(data);
        const headers = Object.keys(flat);
        const values = headers.map(h => `"${String(flat[h]).replace(/"/g, '""')}"`);
        
        return headers.join(',') + '\n' + values.join(',');
    }

    convertToHTML(data) {
        const toHTML = (obj, level = 0) => {
            if (typeof obj !== 'object' || obj === null) {
                return `<span class="text-value">${String(obj)}</span>`;
            }
            
            if (Array.isArray(obj)) {
                return `<ul class="list-array">${obj.map(item => 
                    `<li>${toHTML(item, level + 1)}</li>`
                ).join('')}</ul>`;
            }
            
            const entries = Object.entries(obj);
            return `<dl class="dict-level-${level}">${entries.map(([key, value]) => `
                <dt class="dict-key">${key}:</dt>
                <dd class="dict-value">${toHTML(value, level + 1)}</dd>
            `).join('')}</dl>`;
        };
        
        return `<div class="html-results">${toHTML(data)}</div>`;
    }

    getMetaContent(doc, name) {
        const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return meta ? meta.getAttribute('content') || '' : '';
    }

    showProgress() {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.display = 'block';
        this.startTimer();
    }

    updateProgress(status, percent) {
        document.getElementById('statusText').textContent = status;
        document.getElementById('progressPercent').textContent = `${percent}%`;
        document.getElementById('progressFill').style.width = `${percent}%`;
        
        // Обновляем счетчик элементов
        if (this.results && this.results.data) {
            let count = 0;
            if (this.results.type === 'links' && this.results.data.links) {
                count = this.results.data.links.length;
            } else if (this.results.type === 'images' && this.results.data.images) {
                count = this.results.data.images.length;
            }
            document.getElementById('itemsCounter').textContent = `${count} элементов`;
        }
    }

    startTimer() {
        if (this.timer) clearInterval(this.timer);
        this.startTime = Date.now();
        this.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('timeCounter').textContent = `${elapsed}с`;
        }, 1000);
    }

    hideProgress() {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.display = 'none';
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    showResults(content) {
        const output = document.getElementById('resultsOutput');
        
        if (typeof content === 'string' && content.includes('<div class="html-results">')) {
            output.innerHTML = content;
        } else {
            output.innerHTML = `<pre>${this.escapeHtml(content)}</pre>`;
        }
        
        // Удаляем состояние "пусто"
        const emptyState = output.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
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
        
        document.getElementById('urlInput').value = '';
        document.getElementById('parseBtn').disabled = true;
        this.showToast('Результаты очищены', 'info');
    }

    copyResults() {
        const output = document.getElementById('resultsOutput');
        const text = output.textContent || output.innerText;
        
        navigator.clipboard.writeText(text)
            .then(() => this.showToast('Результаты скопированы в буфер', 'success'))
            .catch(() => this.showToast('Не удалось скопировать', 'error'));
    }

    exportResults() {
        if (!this.results || !this.results.formatted) {
            this.showToast('Нет данных для экспорта', 'warning');
            return;
        }
        
        const format = document.getElementById('outputFormat').value;
        const filename = `webparser-${Date.now()}.${format}`;
        const content = this.results.formatted;
        const blob = new Blob([content], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        this.showToast('Файл экспортирован', 'success');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => toast.remove());
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideInRight 0.3s reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.parser = new WebParserPro();
});

// Утилита для открытия инструментов
window.openTool = function(tool) {
    const tools = {
        'html-validator': 'https://validator.w3.org/',
        'seo-analyzer': 'https://seositecheckup.com/',
        'responsive-test': 'https://ui.dev/amiresponsive',
        'speed-test': 'https://pagespeed.web.dev/'
    };
    
    if (tools[tool]) {
        window.open(tools[tool], '_blank');
    } else {
        alert('Инструмент будет доступен в следующем обновлении!');
    }
};
