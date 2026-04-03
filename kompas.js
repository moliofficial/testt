const axios = require('axios');
const cheerio = require('cheerio');

class Kompas {
    constructor() {
        this.baseUrl = 'https://news.kompas.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    async fetchHTML(url) {
        const response = await axios.get(url, { headers: this.headers });
        return response.data;
    }

    extractTrendingTopics($) {
        const trends = [];
        $('.trendItem').each((index, element) => {
            const title = $(element).find('.trendTitle a').text().trim();
            const link = $(element).find('.trendTitle a').attr('href');
            if (title) {
                trends.push({ title, link });
            }
        });
        return trends;
    }

    extractMainNews($) {
        const mainNews = [];
        
        $('.articleHL-big .swiper-slide').each((index, element) => {
            const title = $(element).find('.articleTitle').text().trim();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('.articleHL-img img').attr('data-src') || 
                          $(element).find('.articleHL-img img').attr('src');
            const category = $(element).find('.articlePost-subtitle').text().trim();
            const date = $(element).find('.articlePost-date').text().trim();
            
            if (title) {
                mainNews.push({ title, link, image, category, date });
            }
        });
        
        return mainNews;
    }

    extractLatestNews($) {
        const latestNews = [];
        
        $('.articleList .articleItem').each((index, element) => {
            const title = $(element).find('.articleTitle').text().trim();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('.articleItem-img img').attr('data-src') || 
                          $(element).find('.articleItem-img img').attr('src');
            const category = $(element).find('.articlePost-subtitle').text().trim();
            const date = $(element).find('.articlePost-date').text().trim();
            
            if (title) {
                latestNews.push({ title, link, image, category, date });
            }
        });
        
        return latestNews;
    }

    extractPopularNews($) {
        const popularNews = [];
        
        $('.mostList .mostItem').each((index, element) => {
            const rank = $(element).find('.mostItem-count').text().trim();
            const title = $(element).find('.mostItem-title').text().trim();
            const link = $(element).find('a').attr('href');
            const category = $(element).find('.mostItem-subtitle').text().trim();
            const image = $(element).find('.mostItem-img img').attr('data-src') || 
                          $(element).find('.mostItem-img img').attr('src');
            
            if (title) {
                popularNews.push({ rank, title, link, category, image });
            }
        });
        
        return popularNews;
    }

    extractVideoNews($) {
        const videos = [];
        
        $('.videoKG-item').each((index, element) => {
            const title = $(element).find('.videoKG-title').text().trim();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('.videoKG-image img').attr('data-src') || 
                          $(element).find('.videoKG-image img').attr('src');
            const duration = $(element).find('.videoKG-duration').text().trim();
            const date = $(element).find('.videoKG-date').text().trim();
            
            if (title) {
                videos.push({ title, link, image, duration, date });
            }
        });
        
        return videos;
    }

    extractGlobalNews($) {
        const globalNews = [];
        
        $('.sectionBox.--line .articleHL-bigType2').each((index, element) => {
            const title = $(element).find('.articleTitle').text().trim();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('.articleHL-img img').attr('data-src') || 
                          $(element).find('.articleHL-img img').attr('src');
            const description = $(element).find('.articleLead p').text().trim();
            const date = $(element).find('.articlePost-date').text().trim();
            
            if (title) {
                globalNews.push({ title, link, image, description, date });
            }
        });
        
        return globalNews;
    }

    extractFactCheckNews($) {
        const factCheck = [];
        
        $('.swiper-faktahoax .swiper-slide').each((index, element) => {
            const title = $(element).find('.articleTitle').text().trim();
            const link = $(element).find('a').attr('href');
            const image = $(element).find('.articleItem-img img').attr('data-src') || 
                          $(element).find('.articleItem-img img').attr('src');
            
            if (title) {
                factCheck.push({ title, link, image });
            }
        });
        
        return factCheck;
    }

    extractPhotoGalleries($) {
        const galleries = [];
        
        $('.lensa--photo--wp .article__grid').each((index, element) => {
            const title = $(element).find('.article__title a').text().trim();
            const link = $(element).find('.article__title a').attr('href');
            const image = $(element).find('.article__asset img').attr('data-src') || 
                          $(element).find('.article__asset img').attr('src');
            const photoCount = $(element).find('.article__photo__count').text().trim();
            
            if (title) {
                galleries.push({ title, link, image, photoCount });
            }
        });
        
        return galleries;
    }

    async scrape() {
        const html = await this.fetchHTML(this.baseUrl);
        const $ = cheerio.load(html);
        
        const result = {
            url: this.baseUrl,
            title: $('title').text().trim(),
            description: $('meta[name="description"]').attr('content'),
            lastUpdated: new Date().toISOString(),
            data: {
                trendingTopics: this.extractTrendingTopics($),
                mainNews: this.extractMainNews($),
                latestNews: this.extractLatestNews($),
                popularNews: this.extractPopularNews($),
                videoNews: this.extractVideoNews($),
                globalNews: this.extractGlobalNews($),
                factCheckNews: this.extractFactCheckNews($),
                photoGalleries: this.extractPhotoGalleries($)
            }
        };
        
        return result;
    }
}

(async () => {
    const scraper = new Kompas();
    const result = await scraper.scrape();
    console.log(JSON.stringify(result, null, 2));
})();