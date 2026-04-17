const axios = require('axios');

class KomikIndo {
    constructor() {
        this.client = axios.create({
            baseURL: 'komikindo.ch',
            headers: {
                'accept-encoding': 'gzip',
                connection: 'Keep-Alive',
                host: 'komikindo.ch',
                'user-agent': 'Dalvik/2.1.0 (Linux; U; Android 10; Redmi Note 4 Build/QQ3A.200905.001)'
            }
        });
        
        this.regex = /^https?:\/\/kmkindo\.click\/?\?.*?page=(manga|chapter).*?id=(\d+)/;
        this.genres = ['action', 'adventure', 'comedy', 'crime', 'drama', 'fantasy', 'historical', 'horror', 'isekai', 'mecha', 'medical', 'music', 'mystery', 'psychological', 'romance', 'sci-fi', 'shoujo-ai', 'shounen-ai', 'slice-of-life', 'sports', 'thriller', 'tragedy', 'wuxia', 'yuri'];
        this.demographics = ['josei', 'seinen', 'shoujo', 'shounen'];
        this.themes = ['aliens', 'animals', 'cooking', 'crossdressing', 'delinquents', 'demons', 'genderswap', 'ghosts', 'gyaru', 'harem', 'incest', 'loli', 'mafia', 'magic', 'martial-arts', 'military', 'monster-girls', 'monsters', 'music', 'ninja', 'office-workers', 'police', 'post-apocalyptic', 'reincarnation', 'reverse-harem', 'samurai', 'school-life', 'shota', 'supernatural', 'survival', 'time-travel', 'traditional-games', 'vampires', 'video-games', 'villainess', 'virtual-reality', 'zombies'];
        this.contents = ['ecchi', 'gore', 'sexual-violence', 'smut'];
        this.types = ['manga', 'manhua', 'manhwa', 'colorized', 'bnw'];
    }
    
    async fetch(url) {
        const { data } = await this.client(url).catch(e => { throw new Error(e.message); });
        return data;
    }
    
    validate(val, list, label) {
        if (list && !list.includes(val)) throw new Error(`List available ${label}: ${list.join(', ')}.`);
        if (!list && isNaN(val)) throw new Error('Invalid page input.');
    }
    
    async homepage(type, page = '1') {
        this.validate(type, ['latest', 'rekomendasi', 'terpopuler'], 'types');
        if (type === 'latest') this.validate(page);
        
        return this.fetch(`?page=${type}${type === 'latest' ? `&paged=${page}` : ''}`);
    }
    
    async search(query, page = '1') {
        if (!query) throw new Error('Query is required.');
        this.validate(page);
        
        return this.fetch(`?page=search&search=${query}&paged=${page}`);
    }
    
    async genre(genre, page = '1') {
        this.validate(genre, this.genres, 'genres');
        this.validate(page);
        
        return this.fetch(`?page=term_result&term=genres&val=${genre}&paged=${page}`);
    }
    
    async demographic(dg, page = '1') {
        this.validate(dg, this.demographics, 'demographics');
        this.validate(page);
        
        return this.fetch(`?page=term_result&term=demographic&val=${dg}&paged=${page}`);
    }
    
    async theme(th, page = '1') {
        this.validate(th, this.themes, 'themes');
        this.validate(page);
        
        return this.fetch(`?page=term_result&term=theme&val=${th}&paged=${page}`);
    }
    
    async content(ct, page = '1') {
        this.validate(ct, this.contents, 'contents');
        this.validate(page);
        
        return this.fetch(`?page=term_result&term=content&val=${ct}&paged=${page}`);
    }
    
    async type(ty, page = '1') {
        this.validate(ty, this.types, 'types');
        this.validate(page);
        
        const url = (ty === 'colorized' || ty === 'bnw') ? `?page=colorized&colorized=${ty === 'colorized' ? '1' : '0'}&paged=${page}` : `?page=type&type=${ty}&paged=${page}`;
        return this.fetch(url);
    }
    
    async detail(url) {
        const match = url?.match(this.regex);
        if (!match || match[1] !== 'manga') throw new Error('Invalid url.');
        
        return this.fetch(`?page=manga&id=${match[2]}`);
    }
    
    async getImage(url) {
        const match = url?.match(this.regex);
        if (!match || match[1] !== 'chapter') throw new Error('Invalid url.');
        
        return this.fetch(`?page=chapter&id=${match[2]}`);
    }
}

// Usage:
const kmk = new KomikIndo();
kmk.genre('yuri').then(console.log);
