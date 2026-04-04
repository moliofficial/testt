
const https = require('https');
const http = require('http');
const zlib = require('zlib');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  baseUrl: 'https://apiv2.free-reels.com',
  country: 'ID',
  language: 'id-ID',
  appVersion: '2.1.91',
  appName: 'com.freereels.app',
  
  // Device identifiers (should be randomized per session in production)
  deviceId: 'ab7d060a1c2a6b47',
  deviceModel: 'ASUS_AI2401_A',
  deviceBrand: 'Asus',
  deviceProduct: 'PLJ110',
  deviceVersion: '36',
  screen: { width: 360, height: 812 },
  
  // OAuth tokens (these would need to be obtained from actual app)
  oauth: {
    token: '4zd4fL5xRaK7L9azadaEEN2vqGoRbf5f',
    signature: '1131ffdde3288b27f4f0a73eea6d534d'
  },
  
  // A/B experiment IDs
  abExps: '950:3202,960:3237,883:2925,962:3244,956:3222,697:2196,961:3243,477:1439,976:3287,932:3123,437:1325,807:2618,676:2112,823:2675,919:3075,731:2311,534:1612,205:552,906:3005,544:1646,645:2001,886:2939,769:2457,955:3217,963:3246,959:3231,617:1901'
};

// ============================================
// SESSION STATE
// ============================================
class Session {
  constructor() {
    this.sessionId = this.generateUuid();
    this.firebaseId = this.generateFirebaseId();
    this.appsflyerId = `${Date.now()}-${this.generateRandomId(19)}`;
    this.gaId = this.generateUuid();
    this.timestamp = Date.now();
  }
  
  generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  generateFirebaseId() {
    return this.generateRandomId(32);
  }
  
  generateRandomId(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  getTimestamp() {
    return Date.now().toString();
  }
}

// ============================================
// HTTP CLIENT
// ============================================
class HttpClient {
  static async request(options, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(options.url);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      if (body) {
        const bodyData = JSON.stringify(body);
        requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
      }
      
      const req = lib.request(requestOptions, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let data = buffer;
          
          // Handle gzip encoding
          if (res.headers['content-encoding'] === 'gzip') {
            try {
              data = zlib.gunzipSync(buffer);
            } catch (e) {
              // If gunzip fails, use original buffer
            }
          }
          
          try {
            const json = JSON.parse(data.toString('utf-8'));
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: json
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data.toString('utf-8')
            });
          }
        });
      });
      
      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }
}

// ============================================
// FREE REELS API CLIENT
// ============================================
class FreeReelsAPI {
  constructor() {
    this.session = new Session();
  }
  
  /**
   * Build common headers for all requests
   */
  buildHeaders(includeAuth = true) {
    const headers = {
      'Host': 'apiv2.free-reels.com',
      'Connection': 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'okhttp/4.12.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      
      // Device info
      'country': CONFIG.country,
      'timezone': '+7',
      'device-country': CONFIG.country,
      'language': CONFIG.language,
      'device-id': CONFIG.deviceId,
      'device-memory': '7.28',
      'device-language': CONFIG.language,
      'device-version': CONFIG.deviceVersion,
      'screen-width': CONFIG.screen.width.toString(),
      'screen-height': CONFIG.screen.height.toString(),
      'x-device-brand': CONFIG.deviceBrand,
      'x-device-product': CONFIG.deviceProduct,
      'x-device-model': CONFIG.deviceModel,
      'x-device-manufacturer': CONFIG.deviceBrand,
      'x-device-fingerprint': `OPPO/PLJ110/OP5E17L1:16/BP2A.250605.015/B.53fe372-338cc21-3391320:user/release-keys`,
      
      // App info
      'app-name': CONFIG.appName,
      'app-version': CONFIG.appVersion,
      'is-mainland': 'false',
      'mcc-country': '510',
      'device': 'android',
      'network-type': 'no_permission',
      
      // Tracking IDs
      'X-Appsflyer_Id': this.session.appsflyerId,
      'gaid': this.session.gaId,
      'appsflyer-id': this.session.appsflyerId,
      'firebase-id': this.session.firebaseId,
      'session-id': this.session.sessionId,
      
      // A/B Testing
      'Ab-Exps': CONFIG.abExps
    };
    
    if (includeAuth) {
      headers['Authorization'] = `oauth_signature=${CONFIG.oauth.signature},oauth_token=${CONFIG.oauth.token},ts=${this.session.getTimestamp()}`;
    }
    
    return headers;
  }
  
  /**
   * 1. DASHBOARD - Get homepage content by tab
   * @param {string} tabKey - Tab identifier (503=Popular, 547=Comics)
   * @param {number} positionIndex - Pagination index
   */
  async getDashboard(tabKey = '503', positionIndex = 10000) {
    const url = `${CONFIG.baseUrl}/frv2-api/homepage/v2/tab/index`;
    const params = new URLSearchParams({
      tab_key: tabKey,
      position_index: positionIndex.toString(),
      rec_trigger: '1'
    });
    
    console.log(`📱 Fetching Dashboard (tab=${tabKey}, index=${positionIndex})...`);
    
    const response = await HttpClient.request({
      url: `${url}?${params}`,
      method: 'GET',
      headers: this.buildHeaders()
    });
    
    return this.parseDashboard(response.data);
  }
  
  /**
   * Parse dashboard response
   */
  parseDashboard(data) {
    if (!data || data.code !== 200 || !data.data) {
      console.error('❌ Invalid dashboard response');
      return null;
    }
    
    const items = [];
    
    for (const module of data.data.items || []) {
      for (const item of module.items || []) {
        items.push({
          key: item.key,
          title: item.title,
          cover: item.cover,
          description: item.desc,
          tags: item.tag || [],
          seriesTags: item.series_tag || [],
          episodeCount: item.episode_count,
          followCount: item.follow_count,
          hotScore: item.hot_score,
          isFree: item.free,
          resourceType: item.resource_type,
          episode: item.episode_info ? {
            id: item.episode_info.id,
            name: item.episode_info.name,
            duration: item.episode_info.duration,
            h264Url: item.episode_info.external_audio_h264_m3u8,
            h265Url: item.episode_info.external_audio_h265_m3u8,
            subtitles: (item.episode_info.subtitle_list || []).map(sub => ({
              language: sub.language,
              name: sub.display_name,
              srtUrl: sub.subtitle,
              vttUrl: sub.vtt
            }))
          } : null,
          link: item.link
        });
      }
    }
    
    console.log(`✅ Found ${items.length} items`);
    return items;
  }
  
  /**
   * 2. HOTLIST - Get trending content
   */
  async getHotlist() {
    const url = `${CONFIG.baseUrl}/frv2-api/search/hot-list`;
    
    console.log('🔥 Fetching Hotlist...');
    
    const response = await HttpClient.request({
      url: url,
      method: 'POST',
      headers: this.buildHeaders()
    }, {});
    
    return this.parseHotlist(response.data);
  }
  
  /**
   * Parse hotlist response
   */
  parseHotlist(data) {
    if (!data || data.code !== 200 || !data.data) {
      console.error('❌ Invalid hotlist response');
      return null;
    }
    
    const items = [];
    
    for (const item of data.data.items || []) {
      items.push({
        id: item.id,
        name: item.name,
        description: item.desc,
        cover: item.cover,
        tags: item.series_tag || [],
        contentTags: item.content_tags || [],
        episodeCount: item.episode_count,
        viewCount: item.view_count,
        followCount: item.follow_count,
        commentCount: item.comment_count,
        hotScore: item.hot_score,
        performers: item.performers || [],
        isFree: item.free,
        episode: item.episode ? {
          id: item.episode.id,
          name: item.episode.name,
          duration: item.episode.duration,
          h264Url: item.episode.external_audio_h264_m3u8,
          h265Url: item.episode.external_audio_h265_m3u8,
          subtitles: (item.episode.subtitle_list || []).map(sub => ({
            language: sub.language,
            name: sub.display_name,
            url: sub.subtitle
          }))
        } : null
      });
    }
    
    console.log(`✅ Found ${items.length} trending items`);
    return items;
  }
  
  /**
   * 3. HOTWORDS - Get trending search terms
   */
  async getHotwords() {
    const url = `${CONFIG.baseUrl}/frv2-api/search/hot_words`;
    
    console.log('🔍 Fetching Hotwords...');
    
    const response = await HttpClient.request({
      url: url,
      method: 'GET',
      headers: this.buildHeaders()
    });
    
    return this.parseHotwords(response.data);
  }
  
  /**
   * Parse hotwords response
   */
  parseHotwords(data) {
    if (!data || data.code !== 200 || !data.data) {
      console.error('❌ Invalid hotwords response');
      return null;
    }
    
    const hotwords = data.data.hot_words || [];
    console.log(`✅ Found ${hotwords.length} trending searches`);
    
    return hotwords.map(hw => ({
      word: hw.word,
      recallScore: hw.r_info ? JSON.parse(hw.r_info).recall_score : null
    }));
  }
  
  /**
   * 4. DRAMA INFO - Get detailed drama information
   * @param {string} seriesId - Drama series ID
   */
  async getDramaInfo(seriesId) {
    const url = `${CONFIG.baseUrl}/frv2-api/drama/info_v2`;
    const params = new URLSearchParams({
      series_id: seriesId,
      clip_content: ''
    });
    
    console.log(`📺 Fetching Drama Info (seriesId=${seriesId})...`);
    
    const response = await HttpClient.request({
      url: `${url}?${params}`,
      method: 'GET',
      headers: this.buildHeaders()
    });
    
    return this.parseDramaInfo(response.data);
  }
  
  /**
   * Parse drama info response
   */
  parseDramaInfo(data) {
    if (!data || data.code !== 200 || !data.data) {
      console.error('❌ Invalid drama info response');
      return null;
    }
    
    const info = data.data.info || {};
    
    return {
      id: info.id,
      name: info.name,
      description: info.desc,
      cover: info.cover,
      tags: info.tag || [],
      contentTags: info.content_tags || [],
      episodeCount: info.episode_count,
      followCount: info.follow_count,
      commentCount: info.comment_count,
      isFree: info.free,
      freeStart: info.free_start,
      freeEnd: info.free_end,
      episodes: (info.episode_list || []).map(ep => ({
        id: ep.id,
        name: ep.name,
        cover: ep.cover,
        duration: ep.duration,
        index: ep.index,
        h264Url: ep.external_audio_h264_m3u8,
        h265Url: ep.external_audio_h265_m3u8,
        subtitles: (ep.subtitle_list || []).map(sub => ({
          language: sub.language,
          name: sub.display_name,
          srtUrl: sub.subtitle,
          vttUrl: sub.vtt
        }))
      }))
    };
  }
  
  /**
   * 5. SEARCH - Search for dramas
   * @param {string} keyword - Search keyword
   * @param {string} next - Pagination token (optional)
   */
  async search(keyword, next = '') {
    const url = `${CONFIG.baseUrl}/frv2-api/search/drama`;
    
    console.log(`🔎 Searching for "${keyword}"...`);
    
    const body = {
      next: next,
      keyword: keyword,
      timestamp: this.session.getTimestamp()
    };
    
    const response = await HttpClient.request({
      url: url,
      method: 'POST',
      headers: this.buildHeaders()
    }, body);
    
    return this.parseSearch(response.data);
  }
  
  /**
   * Parse search response
   */
  parseSearch(data) {
    if (!data || data.code !== 200 || !data.data) {
      console.error('❌ Invalid search response');
      return null;
    }
    
    const pageInfo = data.data.page_info || {};
    const items = [];
    
    for (const item of data.data.items || []) {
      items.push({
        id: item.id,
        name: item.name,
        description: item.desc,
        cover: item.cover,
        tags: item.series_tag || [],
        contentTags: item.content_tags || [],
        episodeCount: item.episode_count,
        viewCount: item.view_count,
        followCount: item.follow_count,
        hotScore: item.hot_score,
        isFree: item.free,
        bestMatch: item.best_match_flag === 1,
        highlight: item.highlight || null,
        episode: item.episode ? {
          id: item.episode.id,
          duration: item.episode.duration,
          h264Url: item.episode.external_audio_h264_m3u8,
          h265Url: item.episode.external_audio_h265_m3u8
        } : null
      });
    }
    
    console.log(`✅ Found ${items.length} results (hasMore: ${pageInfo.has_more})`);
    
    return {
      items: items,
      pageInfo: {
        next: pageInfo.next,
        hasMore: pageInfo.has_more
      }
    };
  }
  
  /**
   * 6. ANIME DASHBOARD - Get anime/comics content
   */
  async getAnimeDashboard(positionIndex = 10001) {
    return await this.getDashboard('547', positionIndex);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     FreeReels API Scraper              ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const api = new FreeReelsAPI();
  
  try {
    // 1. Get Popular Dashboard
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const dashboard = await api.getDashboard('503', 10000);
    if (dashboard && dashboard.length > 0) {
      console.log('\n📋 Sample Dashboard Item:');
      console.log(JSON.stringify(dashboard[0], null, 2));
    }
    
    // 2. Get Anime Dashboard
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const animeDashboard = await api.getAnimeDashboard(10001);
    if (animeDashboard && animeDashboard.length > 0) {
      console.log('\n📋 Sample Anime Item:');
      console.log(JSON.stringify(animeDashboard[0], null, 2));
    }
    
    // 3. Get Hotlist
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const hotlist = await api.getHotlist();
    if (hotlist && hotlist.length > 0) {
      console.log('\n📋 Sample Hotlist Item:');
      console.log(JSON.stringify(hotlist[0], null, 2));
    }
    
    // 4. Get Hotwords
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const hotwords = await api.getHotwords();
    if (hotwords) {
      console.log('\n📋 Trending Searches:');
      hotwords.slice(0, 5).forEach((hw, i) => {
        console.log(`   ${i + 1}. ${hw.word}`);
      });
    }
    
    // 5. Search Example
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const searchResults = await api.search('Ceo Cantik');
    if (searchResults && searchResults.items.length > 0) {
      console.log('\n📋 Sample Search Result:');
      console.log(JSON.stringify(searchResults.items[0], null, 2));
    }
    
    // 6. Get Drama Detail (using first hotlist item)
    if (hotlist && hotlist.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      const dramaInfo = await api.getDramaInfo(hotlist[0].id);
      if (dramaInfo) {
        console.log('\n📋 Drama Details:');
        console.log(JSON.stringify({
          ...dramaInfo,
          episodes: dramaInfo.episodes.slice(0, 3) // Show first 3 episodes
        }, null, 2));
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ All operations completed!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = {
  FreeReelsAPI,
  CONFIG,
  Session,
  HttpClient
};
