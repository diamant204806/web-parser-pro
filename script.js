// Web Parser Pro - Основной скрипт
class WebParserPro {
    constructor() {
        this.isParsing = false;
        this.mediaInfo = null;
        this.results = null;
        
        // CORS прокси
        this.proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        console.log('✅ Web Parser Pro загружен');
    }
    
    bindEvents() {
        // Парсинг
        document.getElementById('parseBtn')?.addEventListener('click', () => this.parseWebsite());
        document.getElementById('downloadHtmlBtn')?.addEventListener('click', () => this.downloadWebsite());
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearResults());
        document.getElementById('copyResults')?.addEventListener('click', () => this.copyResults());
        
        // Скачивание медиа
        document.getElementById('analyzeBtn')?.addEventListener('click', () => this.analyzeMedia());
        document.getElementById('downloadMediaBtn')?.addEventListener('click', () => this.downloadMedia());
        
        // Enter для запуска
        document.getElementById('urlInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.parseWebsite();
        });
        
        document.getElementById('mediaUrl')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeMedia();
        });
    }
    
    // ============ ПАРСИНГ ============
    
    async parseWebsite() {
        if (this.isParsing) return;
        
        const url = document.getElementById('urlInput').value.trim();
        if (!this.validateUrl(url)) {
            this.showError('Введите корректный URL (начинается с http:// или https://)');
            return;
        }
        
        this.isParsing = true;
        this.showProgress();
        this.updateProgress(10, 'Начало парсинга...');
        
        try {
            const html = await this.fetchWithProxy(url);
            this.updateProgress(50, 'Анализ содержимого...');
            
            const type = document.getElementById('dataType').value;
            const data = this.parseData(html, type);
            this.updateProgress(80, 'Форматирование...');
            
            const format = document.getElementById('outputFormat').value;
            this.displayResults(data, format);
            this.updateProgress(100, 'Готово!', Array.isArray(data) ? data.length : 1);
            
            // Аналитика
            if (typeof gtag === 'function') {
                gtag('event', 'parse_success', {
                    url: url,
                    type: type
                });
            }
            
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(`Ошибка: ${error.message}`);
            
            // Аналитика ошибки
            if (typeof gtag === 'function') {
                gtag('event', 'parse_error', {
                    error: error.message
                });
            }
            
        } finally {
            this.isParsing = false;
            setTimeout(() => this.hideProgress(), 1500);
        }
    }
    
    async fetchWithProxy(url) {
        for (const proxy of this.proxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    return await response.text();
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('Не удалось загрузить страницу');
    }
    
    parseData(html, type) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        switch(type) {
            case 'html':
                return { html: html, title: doc.title };
                
            case 'text':
                const text = doc.body.textContent || '';
                return text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .slice(0, 50);
                
            case 'links':
                const links = [];
                doc.querySelectorAll('a[href]').forEach((link, i) => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('http')) {
                        links.push({
                            text: link.textContent.substring(0, 100).trim(),
                            href: href
                        });
                    }
                });
                return links.slice(0, 30);
                
            case 'images':
                const images = [];
                doc.querySelectorAll('img').forEach((img, i) => {
                    const src = img.getAttribute('src');
                    if (src) {
                        images.push({
                            src: src.startsWith('/') ? new URL(src, doc.baseURI).href : src,
                            alt: img.getAttribute('alt') || ''
                        });
                    }
                });
                return images.slice(0, 20);
                
            case 'metadata':
                return {
                    title: doc.title,
                    description: doc.querySelector('meta[name="description"]')?.content || 'Нет',
                    keywords: doc.querySelector('meta[name="keywords"]')?.content || 'Нет',
                    language: doc.documentElement.lang || 'Не указан',
                    charset: doc.characterSet
                };
                
            default:
                return { error: 'Неизвестный тип' };
        }
    }
    
    displayResults(data, format) {
        this.results = data;
        const output = document.getElementById('resultsOutput');
        
        if (format === 'json') {
            output.textContent = JSON.stringify(data, null, 2);
        } else if (format === 'html' && data.html) {
            output.textContent = data.html.substring(0, 5000) + '...';
        } else if (Array.isArray(data)) {
            output.textContent = data.map((item, i) => {
                if (typeof item === 'object') {
                    return `${i+1}. ${JSON.stringify(item)}`;
                }
                return `${i+1}. ${item}`;
            }).join('\n');
        } else {
            output.textContent = JSON.stringify(data, null, 2);
        }
    }
    
    async downloadWebsite() {
        const url = document.getElementById('urlInput').value.trim();
        if (!this.validateUrl(url)) {
            this.showError('Введите корректный URL');
            return;
        }
        
        this.showProgress();
        this.updateProgress(30, 'Загрузка сайта...');
        
        try {
            const html = await this.fetchWithProxy(url);
            this.updateProgress(80, 'Создание файла...');
            
            const blob = new Blob([html], { type: 'text/html' });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `website-${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
            
            this.updateProgress(100, 'Скачан!');
            
            if (typeof gtag === 'function') {
                gtag('event', 'download_html');
            }
            
        } catch (error) {
            this.showError(`Ошибка: ${error.message}`);
        } finally {
            setTimeout(() => this.hideProgress(), 1000);
        }
    }
    
    // ============ СКАЧИВАНИЕ МЕДИА ============
    
    async analyzeMedia() {
        const url = document.getElementById('mediaUrl').value.trim();
        if (!this.validateUrl(url)) {
            this.showError('Введите корректную ссылку');
            return;
        }
        
        this.showProgress();
        this.updateProgress(30, 'Анализ ссылки...');
        
        try {
            // Симуляция получения информации
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            this.mediaInfo = {
                title: 'Пример видео/аудио',
                duration: '3:45',
                quality: '720p',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                formats: ['MP4 720p', 'MP4 480p', 'MP3 128kbps']
            };
            
            this.displayMediaInfo();
            document.getElementById('mediaInfo').style.display = 'block';
            document.getElementById('downloadMediaBtn').disabled = false;
            
            this.updateProgress(100, 'Готово!');
            
        } catch (error) {
            this.showError(`Ошибка: ${error.message}`);
        } finally {
            setTimeout(() => this.hideProgress(), 1000);
        }
    }
    
    displayMediaInfo() {
        const details = document.getElementById('mediaDetails');
        details.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                <img src="${this.mediaInfo.thumbnail}" style="width: 120px; height: 90px; border-radius: 0.5rem;">
                <div>
                    <h4 style="margin: 0;">${this.mediaInfo.title}</h4>
                    <p style="margin: 0.25rem 0;">Длительность: ${this.mediaInfo.duration}</p>
                    <p style="margin: 0.25rem 0;">Качество: ${this.mediaInfo.quality}</p>
                </div>
            </div>
            <div>
                <p><strong>Доступные форматы:</strong></p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${this.mediaInfo.formats.map(f => `<span style="padding: 0.5rem; background: #e9ecef; border-radius: 0.25rem;">${f}</span>`).join('')}
                </div>
            </div>
        `;
    }
    
    async downloadMedia() {
        if (!this.mediaInfo) return;
        
        this.showProgress();
        this.updateProgress(10, 'Подготовка...');
        
        try {
            // Симуляция скачивания
            for (let i = 20; i <= 100; i += 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                this.updateProgress(i, `Скачивание... ${i}%`);
            }
            
            this.updateProgress(100, 'Готово!');
            
            this.showSuccess(`
                <strong>Контент готов!</strong><br>
                <small>В реальной версии файл скачается автоматически</small>
            `);
            
            if (typeof gtag === 'function') {
                gtag('event', 'media_download');
            }
            
        } catch (error) {
            this.showError(`Ошибка: ${error.message}`);
        } finally {
            setTimeout(() => this.hideProgress(), 2000);
        }
    }
    
    // ============ УТИЛИТЫ ============
    
    validateUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    showProgress() {
        const progress = document.getElementById('progressBar');
        if (progress) progress.style.display = 'block';
        
        document.getElementById('parseBtn').disabled = true;
        document.getElementById('downloadHtmlBtn').disabled = true;
        document.getElementById('analyzeBtn').disabled = true;
        
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const seconds = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('timeCounter').textContent = `${seconds}с`;
        }, 1000);
    }
    
    updateProgress(percent, text, items = 0) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressPercent').textContent = `${percent}%`;
        document.getElementById('statusText').textContent = text;
        document.getElementById('itemsCounter').textContent = items;
    }
    
    hideProgress() {
        const progress = document.getElementById('progressBar');
        if (progress) progress.style.display = 'none';
        
        document.getElementById('parseBtn').disabled = false;
        document.getElementById('downloadHtmlBtn').disabled = false;
        document.getElementById('analyzeBtn').disabled = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
    
    showError(message) {
        alert(`❌ ${message}`);
    }
    
    showSuccess(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
    
    clearResults() {
        this.results = null;
        document.getElementById('resultsOutput').textContent = 'Здесь появятся результаты парсинга...';
    }
    
    async copyResults() {
        if (!this.results) {
            this.showError('Нет данных для копирования');
            return;
        }
        
        try {
            const text = document.getElementById('resultsOutput').textContent;
            await navigator.clipboard.writeText(text);
            this.showSuccess('Скопировано в буфер обмена!');
        } catch {
            this.showError('Ошибка копирования');
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.parser = new WebParserPro();
});