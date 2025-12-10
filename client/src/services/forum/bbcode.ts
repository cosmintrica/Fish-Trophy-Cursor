/**
 * Forum BBCode Parser
 * Parses custom BBCode tags for fish records, gear, quotes, videos, images, and text formatting
 */

import type { BBCodeParseResult } from './types'

// ============================================
// BBCODE PATTERNS
// ============================================

const BB_CODE_PATTERNS = {
    record: /\[record\]([\w-]+)\[\/record\]/gi,
    gear: /\[gear\]([\w-]+)\[\/gear\]/gi,
    quote: /\[quote user="([^"]+)" post_id="([^"]+)"\]([\s\S]*?)\[\/quote\]/gi,
    mention: /\[mention\](.+?)\[\/mention\]/gi,
    video_youtube: /\[video\](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+))\[\/video\]/gi,
    video_vimeo: /\[video\](https?:\/\/vimeo\.com\/(\d+))\[\/video\]/gi,
    // Auto-detect YouTube/Vimeo links
    auto_youtube: /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+))/gi,
    auto_vimeo: /(https?:\/\/vimeo\.com\/(\d+))/gi
} as const

// ============================================
// LEGACY SMILEY CODES TO EMOJI MAPPING
// ============================================

const LEGACY_SMILEY_MAP: Record<string, string> = {
    ':)': '😊',
    ';)': '😉',
    ':(': '☹️',
    ':P': '😛',
    ':p': '😛',
    ':D': '😀',
    'B-)': '😎',
    ':O': '😮',
    ':o': '😮',
    ':-/': '😕',
    ';;)': '😍',
    ':">': '😊',
    ':S': '😰',
    ':s': '😰',
    '>:)': '😈',
    '=))': '🤣',
    '8-|': '🙄',
    '=P~': '🤤',
    ':bz': '🐝',
    '^#(^': '🤷',
    ':-bd': '👍',
    ':-q': '👎',
    '\\m/': '🤘',
    ':!!': '⏰',
    'x_x': '😵',
    ':-w': '⏳',
    ':O)': '🤡',
    '8->': '😴',
    '/:)': '🤨',
    '\\:D/': '💃',
    '=(': '💔',
    ':^o': '🤥',
    ':ar!': '🏴‍☠️',
    '[(': '🤐',
    ':-t': '⏸️',
    ':|': '😐',
    '[-X': '🙈',
    ':*': '😘',
    '@-)': '😵',
    ':-$': '🤫',
    ':-h': '👋',
    ':))': '😂',
    ':)>-': '✌️',
    ':-SS': '😬',
    ':-&': '🤢',
    '~X(': '😤',
    ':((': '😭',
    'b-(': '😓',
    '=D>': '👏',
    'L-)': '😎',
    ':-c': '📞',
    ':-"': '😗',
    ':x': '😍',
    '#-o': '🤦',
    ':)]': '📱',
    '#:-S': '😅',
    '$-)': '💰',
    ':-?': '🤔',
    'I-)': '😴',
    ':-j': '😏',
    '[-O<': '🙏',
    '>:D<': '🤗',
    '=;': '🖐️',
    '^:)^': '🙇',
    '*-:)': '💡',
    '(:|': '🥱',
    ':-B': '🤓',
    ':-@': '💬',
    ':>': '😏',
    '>:P': '😛',
    '<:-P': '🎉',
    '%(': '😤',
    'O:-)': '😇',
    ';))': '😄',
    'X(': '😡',
    ':-<': '😔',
    '8-}': '😜',
    ':-??': '🤷',
    '>:/': '😤',
    '[]==[]': '💪',
    ':wink:': '😉',
    '~^o^~<': '🎉',
    ':(fight)': '👊',
    'o|:-)': '🎣',
    ':tongue:': '😛',
    '%*-{': '😞',
    'o|\\~': '🎤',
    ':smile:': '😊',
    '>%||:-{': '😞',
    ':puke!': '🤮',
    ':rolleyes:': '🙄',
    '&[]': '🎁',
    'o|^_^|o': '🎵',
    ':redface:': '😊',
    ':(tv)': '📺',
    ':::^^:::': '🔥',
    ':mad:': '😡',
    '?@_@?': '📚',
    "'+_+": '🥶',
    ':frown:': '☹️',
    ':->~~': '👻',
    ':-(||>': '😔',
    ':eek:': '😮',
    '@-@': '🔍',
    '^o^||3': '🍽️',
    ':cool:': '😎',
    ':(game)': '🎮',
    '[]---': '👨‍🍳',
    ':confused:': '😕',
    ':-)/\\:-)': '🙌',
    "'@^@|||": '😵',
    ':biggrin:': '😀',
    '<):)': '🤠',
    '8-X': '💀',
    '[..]': '🤖',
    '~O)': '☕',
    ':o3': '🐶',
    '(~~)': '🎃',
    '(*)': '⭐',
    '**==': '🏳️',
    '(%)': '☯️',
    '%%-': '🍀',
    'o-+': '🌷',
    '@};-': '🌹',
    'o=>': '👤',
    '~:>': '🐔',
    'o->': '👤',
    ':(|)': '🐵',
    ':-L': '😤',
    '3:-O': '🐄',
    '>-)': '👽',
    ':@)': '🐷',
    '=:)': '🐛',
};

/**
 * Transformă codurile text clasice (ex: :), :D, \m/) în emoji Unicode
 * Se aplică înainte de escape-ul HTML pentru a nu afecta codurile din BBCode tags
 */
function transformLegacySmileys(text: string): string {
    let result = text;
    
    // Sortăm codurile după lungime (descrescător) pentru a evita transformări parțiale
    // (ex: :)) trebuie să fie transformat înainte de :))
    const sortedCodes = Object.keys(LEGACY_SMILEY_MAP).sort((a, b) => b.length - a.length);
    
    // Protejăm tag-urile BBCode și codurile din interiorul lor
    const bbcodePlaceholders: string[] = [];
    let placeholderIndex = 0;
    
    // Înlocuim tag-urile BBCode cu placeholders temporari
    result = result.replace(/\[[^\]]+\]/g, (match) => {
        const placeholder = `__BBCODE_TAG_${placeholderIndex}__`;
        bbcodePlaceholders[placeholderIndex] = match;
        placeholderIndex++;
        return placeholder;
    });
    
    // Transformăm codurile text în emoji
    for (const code of sortedCodes) {
        // Escapăm caracterele speciale pentru regex
        const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Căutăm codul doar dacă nu este precedat sau urmat de caractere alfanumerice
        const regex = new RegExp(`(^|[^\\w\\[\\]])${escapedCode}(?![\\w\\]])`, 'g');
        result = result.replace(regex, `$1${LEGACY_SMILEY_MAP[code]}`);
    }
    
    // Restaurăm tag-urile BBCode
    bbcodePlaceholders.forEach((tag, index) => {
        result = result.replace(`__BBCODE_TAG_${index}__`, tag);
    });
    
    return result;
}

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

/**
 * Parse quote content recursively to display images, videos, formatting, etc.
 * This function parses BBCode within quotes but makes media smaller
 */
function parseQuoteContent(content: string, options?: { categorySlug?: string; subcategorySlug?: string; topicSlug?: string; getPostPermalink?: (postId: string) => string; postNumberMap?: Map<string, number>; skipNestedQuotes?: boolean }): string {
    let html = content
    const replacements: Array<{ original: string; replacement: string }> = []
    
    // ȘTERGEM LOGICA DE QUOTE ÎN QUOTE - conform cererii utilizatorului
    // Când dăm quote, se dă quote strict doar la mesajul scris de user, nu la quote-ul din acel mesaj
    // Eliminăm quote-urile din conținut înainte de procesare
    if (!options?.skipNestedQuotes) {
        html = html.replace(BB_CODE_PATTERNS.quote, '[Quote]');
    }
    
    // Nu mai procesăm quote-uri nested - doar formatările de bază
    
    // Parse images in quotes (smaller)
    html = html.replace(/\[img\](.*?)\[\/img\]/gi, (match, url) => {
        const cleanUrl = url.trim()
        const replacement = `<div class="bbcode-image-container bbcode-quote-media">
      <img src="${escapeHtml(cleanUrl)}" alt="Imagine" class="bbcode-image bbcode-quote-image" onerror="this.style.display='none'; this.nextElementSibling?.style.display='block';" />
      <div style="display: none; color: #dc2626; font-size: 0.75rem; padding: 0.25rem; background: rgba(220, 38, 38, 0.1); border-radius: 0.25rem; margin: 0.25rem 0;">Eroare: Imaginea nu poate fi încărcată</div>
    </div>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    
    // Parse videos in quotes (smaller)
    html = html.replace(BB_CODE_PATTERNS.video_youtube, (match, fullUrl, videoId) => {
        const replacement = `<div class="bbcode-video youtube bbcode-quote-media">
      <iframe
        src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    
    html = html.replace(BB_CODE_PATTERNS.video_vimeo, (match, fullUrl, videoId) => {
        const replacement = `<div class="bbcode-video vimeo bbcode-quote-media">
      <iframe
        src="https://player.vimeo.com/video/${escapeHtml(videoId)}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    
    // Parse links
    html = html.replace(/\[url=([^\]]+)\](.*?)\[\/url\]/gi, (match, url, text) => {
        const replacement = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="bbcode-link">${escapeHtml(text)}</a>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[url\](.*?)\[\/url\]/gi, (match, url) => {
        const replacement = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="bbcode-link">${escapeHtml(url)}</a>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    
    // Parse formatting
    html = html.replace(/\[b\](.*?)\[\/b\]/gi, (match, text) => {
        const replacement = `<strong class="bbcode-bold">${escapeHtml(text)}</strong>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[i\](.*?)\[\/i\]/gi, (match, text) => {
        const replacement = `<em class="bbcode-italic">${escapeHtml(text)}</em>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[u\](.*?)\[\/u\]/gi, (match, text) => {
        const replacement = `<u class="bbcode-underline">${escapeHtml(text)}</u>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[s\](.*?)\[\/s\]/gi, (match, text) => {
        const replacement = `<s class="bbcode-strikethrough">${escapeHtml(text)}</s>`
        replacements.push({ original: match, replacement })
        return `__QUOTE_REPLACEMENT_${replacements.length - 1}__`
    })
    
    // Protect placeholders
    const placeholderMap = new Map<string, string>()
    replacements.forEach((repl, index) => {
        const placeholder = `__QUOTE_REPLACEMENT_${index}__`
        const safePlaceholder = `__QUOTE_SAFE_${index}__`
        placeholderMap.set(safePlaceholder, repl.replacement)
        html = html.replace(placeholder, safePlaceholder)
    })
    
    // Convert line breaks
    const brPlaceholder = '__QUOTE_BR_PLACEHOLDER__'
    html = html.replace(/\n/g, brPlaceholder)
    
    // Escape remaining text
    const escapedHtml = escapeHtml(html)
    
    // Restore safe placeholders
    let finalHtml = escapedHtml
    placeholderMap.forEach((replacement, safePlaceholder) => {
        const escapedPlaceholder = escapeHtml(safePlaceholder)
        finalHtml = finalHtml.replace(escapedPlaceholder, replacement)
    })
    
    // Restore <br> tags
    finalHtml = finalHtml.replace(new RegExp(escapeHtml(brPlaceholder), 'g'), '<br>')
    
    return finalHtml
}

/**
 * Parse BBCode and convert to HTML
 * Strategy: Process BBCode tags first, then escape remaining text
 * 
 * IMPORTANT: If content already contains HTML (like <iframe>), it means it was
 * already processed or saved as HTML. In that case, we should return it as-is
 * (with proper sanitization) instead of trying to parse BBCode.
 * 
 * @param content - BBCode content to parse
 * @param options - Optional parameters for generating permalinks in quotes
 */
export function parseBBCode(
    content: string,
    options?: {
        categorySlug?: string;
        subcategorySlug?: string;
        topicSlug?: string;
        getPostPermalink?: (postId: string) => string;
        postNumberMap?: Map<string, number>; // Map postId -> postNumber pentru permalink-uri
    }
): BBCodeParseResult {
    // Check if content already contains HTML tags (like <iframe>, <div>, etc.)
    // If it does, it's likely already HTML and shouldn't be processed as BBCode
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    
    // If content has HTML tags but no BBCode tags, return as-is (already processed)
    const hasBBCodeTags = /\[(video|img|url|b|i|u|s|h[1-3]|list|code|quote|record|gear)/i.test(content);
    
    if (hasHtmlTags && !hasBBCodeTags) {
        // Content is already HTML, return as-is (but still escape for security)
        // Actually, if it's already HTML from our parser, we should trust it
        // But to be safe, we'll still sanitize it
        return {
            html: content, // Return as-is if it's already HTML
            embeds: {
                records: [],
                gear: [],
                quotes: []
            }
        };
    }
    
    let html = content
    
    // Debug: log content to see what we're parsing
    if (content.includes('[video]') || content.includes('youtube') || content.includes('youtu.be')) {
        console.log('[BBCode Parser] Parsing content:', content.substring(0, 200));
    }
    const embeds: BBCodeParseResult['embeds'] = {
        records: [],
        gear: [],
        quotes: []
    }

    // Store positions of BBCode tags to preserve them during escape
    const replacements: Array<{ original: string; replacement: string }> = []

    // Parse [record] tags
    html = html.replace(BB_CODE_PATTERNS.record, (match, recordId) => {
        embeds.records.push(recordId)
        const replacement = `<div class="bbcode-record-embed" data-record-id="${escapeHtml(recordId)}">
      <div class="loading">Loading record ${escapeHtml(recordId)}...</div>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse [gear] tags
    html = html.replace(BB_CODE_PATTERNS.gear, (match, gearId) => {
        embeds.gear.push(gearId)
        const replacement = `<div class="bbcode-gear-embed" data-gear-id="${escapeHtml(gearId)}">
      <div class="loading">Loading gear ${escapeHtml(gearId)}...</div>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse [spoiler] tags - trebuie înainte de quote pentru a nu fi afectate
    html = html.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, (match, text) => {
        const replacement = `<div class="bbcode-spoiler">
      <button class="bbcode-spoiler-toggle" type="button" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.nextElementSibling.style.display === 'none' ? 'Afișează Spoiler' : 'Ascunde Spoiler';">
        Afișează Spoiler
      </button>
      <div class="bbcode-spoiler-content" style="display: none;">${escapeHtml(text)}</div>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse [quote] tags - Parsează recursiv conținutul pentru a afișa poze, videouri, etc.
    // Folosim o abordare recursivă pentru a suporta quote-uri nested
    let quoteDepth = 0;
    const maxQuoteDepth = 10; // Previne infinite loops
    
    while (html.match(BB_CODE_PATTERNS.quote) && quoteDepth < maxQuoteDepth) {
        html = html.replace(BB_CODE_PATTERNS.quote, (match, username, postId, text) => {
            embeds.quotes.push({ user: username, post_id: postId, text })
            
            // Eliminăm quote-urile nested din conținut (conform cererii utilizatorului)
            // Când dăm quote, se dă quote strict doar la mesajul scris de user, nu la quote-ul din acel mesaj
            let cleanText = text.replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi, '');
            
            // Parsează formatările de bază (imagini, videouri, text) - dar NU quote-uri
            const parsedQuoteContent = parseQuoteContent(cleanText, { ...options, skipNestedQuotes: true } as any);
            
            // Generează permalink-ul corect
            // postId poate fi fie postNumber (string) fie UUID
            let permalink = `/forum/post/${escapeHtml(postId)}`; // Fallback la UUID
            if (options?.getPostPermalink) {
                permalink = options.getPostPermalink(postId);
            } else if (options?.subcategorySlug && options?.topicSlug) {
                // Dacă postId este un număr (postNumber), folosim direct
                if (/^\d+$/.test(postId)) {
                    permalink = `/forum/${options.subcategorySlug}/${options.topicSlug}#post${postId}`;
                } else {
                    // Dacă este UUID, căutăm în postNumberMap
                    const postNumber = options?.postNumberMap?.get(postId);
                    if (postNumber) {
                        permalink = `/forum/${options.subcategorySlug}/${options.topicSlug}#post${postNumber}`;
                    } else {
                        // Fallback la postId dacă nu avem postNumber
                        permalink = `/forum/${options.subcategorySlug}/${options.topicSlug}#post-${escapeHtml(postId)}`;
                    }
                }
            }
            
            const replacement = `<blockquote class="bbcode-quote" data-post-id="${escapeHtml(postId)}">
      <div class="quote-header">
        <span class="quote-author">${escapeHtml(username)}</span>
        <a href="${permalink}" class="quote-link">Vezi postare</a>
      </div>
      <div class="quote-content">${parsedQuoteContent}</div>
    </blockquote>`
            replacements.push({ original: match, replacement })
            return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
        })
        quoteDepth++;
    }

    // Parse video embeds (YouTube)
    html = html.replace(BB_CODE_PATTERNS.video_youtube, (match, fullUrl, videoId) => {
        console.log('[BBCode Parser] Found YouTube video:', videoId, 'Match:', match);
        const replacement = `<div class="bbcode-video youtube">
      <iframe
        src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse video embeds (Vimeo)
    html = html.replace(BB_CODE_PATTERNS.video_vimeo, (match, fullUrl, videoId) => {
        const replacement = `<div class="bbcode-video vimeo">
      <iframe
        src="https://player.vimeo.com/video/${escapeHtml(videoId)}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Auto-detect YouTube links (without tags)
    html = html.replace(BB_CODE_PATTERNS.auto_youtube, (match, fullUrl, videoId) => {
        // Only convert if not already in an embed
        if (!html.includes(`youtube.com/embed/${videoId}`)) {
            const replacement = `<div class="bbcode-video youtube auto-detected">
      <iframe
        src="https://www.youtube.com/embed/${escapeHtml(videoId)}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
            replacements.push({ original: match, replacement })
            return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
        }
        return match
    })

    // Auto-detect Vimeo links (without tags)
    html = html.replace(BB_CODE_PATTERNS.auto_vimeo, (match, fullUrl, videoId) => {
        if (!html.includes(`vimeo.com/video/${videoId}`)) {
            const replacement = `<div class="bbcode-video vimeo auto-detected">
      <iframe
        src="https://player.vimeo.com/video/${escapeHtml(videoId)}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
            replacements.push({ original: match, replacement })
            return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
        }
        return match
    })

    // Parse images [img]url[/img]
    html = html.replace(/\[img\](.*?)\[\/img\]/gi, (match, url) => {
        const cleanUrl = url.trim()
        const replacement = `<div class="bbcode-image-container">
      <img src="${escapeHtml(cleanUrl)}" alt="Imagine" class="bbcode-image" onerror="this.style.display='none'; this.nextElementSibling?.style.display='block';" />
      <div style="display: none; color: #dc2626; font-size: 0.875rem; padding: 0.5rem; background: rgba(220, 38, 38, 0.1); border-radius: 0.375rem; margin: 0.5rem 0;">Eroare: Imaginea nu poate fi încărcată</div>
    </div>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse links [url=...]text[/url] and [url]url[/url]
    html = html.replace(/\[url=([^\]]+)\](.*?)\[\/url\]/gi, (match, url, text) => {
        const replacement = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="bbcode-link">${escapeHtml(text)}</a>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[url\](.*?)\[\/url\]/gi, (match, url) => {
        const replacement = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="bbcode-link">${escapeHtml(url)}</a>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse headings [h1], [h2], [h3]
    html = html.replace(/\[h1\](.*?)\[\/h1\]/gi, (match, text) => {
        const replacement = `<h1 class="bbcode-heading bbcode-h1">${escapeHtml(text)}</h1>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[h2\](.*?)\[\/h2\]/gi, (match, text) => {
        const replacement = `<h2 class="bbcode-heading bbcode-h2">${escapeHtml(text)}</h2>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[h3\](.*?)\[\/h3\]/gi, (match, text) => {
        const replacement = `<h3 class="bbcode-heading bbcode-h3">${escapeHtml(text)}</h3>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse lists [list] and [list=1]
    html = html.replace(/\[list\](.*?)\[\/list\]/gis, (match, content) => {
        const items = content.split(/\[\*\]/).filter((item: string) => item.trim())
        const listItems = items.map((item: string) => `<li class="bbcode-list-item">${escapeHtml(item.trim())}</li>`).join('')
        const replacement = `<ul class="bbcode-list bbcode-list-unordered">${listItems}</ul>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[list=1\](.*?)\[\/list\]/gis, (match, content) => {
        const items = content.split(/\[\*\]/).filter((item: string) => item.trim())
        const listItems = items.map((item: string) => `<li class="bbcode-list-item">${escapeHtml(item.trim())}</li>`).join('')
        const replacement = `<ol class="bbcode-list bbcode-list-ordered">${listItems}</ol>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse code blocks [code]...[/code]
    html = html.replace(/\[code\](.*?)\[\/code\]/gis, (match, content) => {
        const replacement = `<pre class="bbcode-code-block"><code>${escapeHtml(content)}</code></pre>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Parse inline formatting - trebuie după toate celelalte pentru a nu afecta tag-urile
    html = html.replace(/\[b\](.*?)\[\/b\]/gi, (match, text) => {
        const replacement = `<strong class="bbcode-bold">${escapeHtml(text)}</strong>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[i\](.*?)\[\/i\]/gi, (match, text) => {
        const replacement = `<em class="bbcode-italic">${escapeHtml(text)}</em>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[u\](.*?)\[\/u\]/gi, (match, text) => {
        const replacement = `<u class="bbcode-underline">${escapeHtml(text)}</u>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    // Parse [mention] tags - transformă în @username clickable către profil
    html = html.replace(BB_CODE_PATTERNS.mention, (match, username) => {
        const cleanUsername = username.trim();
        const profileUrl = `/forum/user/${encodeURIComponent(cleanUsername)}`;
        const replacement = `<a href="${profileUrl}" class="bbcode-mention" style="color: #3b82f6; font-weight: 500; text-decoration: none; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">@${escapeHtml(cleanUsername)}</a>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })
    html = html.replace(/\[s\](.*?)\[\/s\]/gi, (match, text) => {
        const replacement = `<s class="bbcode-strikethrough">${escapeHtml(text)}</s>`
        replacements.push({ original: match, replacement })
        return `__BBCODE_REPLACEMENT_${replacements.length - 1}__`
    })

    // Now escape the remaining text (everything that's not a placeholder)
    // But first, we need to protect placeholders from being escaped
    // We'll use a temporary marker that won't be escaped
    const placeholderMap = new Map<string, string>()
    replacements.forEach((repl, index) => {
        const placeholder = `__BBCODE_REPLACEMENT_${index}__`
        const safePlaceholder = `__SAFE_PLACEHOLDER_${index}__`
        placeholderMap.set(safePlaceholder, repl.replacement)
        html = html.replace(placeholder, safePlaceholder)
    })

    // Transformă codurile text clasice în emoji (înainte de escape)
    html = transformLegacySmileys(html)

    // Convert line breaks to placeholders BEFORE escaping
    // This way <br> tags won't be escaped
    const brPlaceholder = '__BBCODE_BR_PLACEHOLDER__'
    html = html.replace(/\n/g, brPlaceholder)

    // Now escape the remaining text (but not the safe placeholders)
    // We need to escape HTML but preserve our safe placeholders
    const escapedHtml = escapeHtml(html)
    
    // Restore safe placeholders (they contain valid HTML, don't escape them)
    let finalHtml = escapedHtml
    placeholderMap.forEach((replacement, safePlaceholder) => {
        // Escape the safe placeholder itself so it doesn't get escaped
        const escapedPlaceholder = escapeHtml(safePlaceholder)
        finalHtml = finalHtml.replace(escapedPlaceholder, replacement)
    })
    
    // Restore <br> tags AFTER escaping (so they're not escaped)
    finalHtml = finalHtml.replace(new RegExp(escapeHtml(brPlaceholder), 'g'), '<br>')
    
    html = finalHtml

    // Debug: log final HTML if it contains video
    if (html.includes('bbcode-video') || html.includes('youtube.com/embed')) {
        console.log('[BBCode Parser] Final HTML (first 500 chars):', html.substring(0, 500));
    }

    return { html, embeds }
}

/**
 * Generate BBCode for quoting a post (partial quote)
 */
export function generateQuoteBBCode(username: string, postId: string, selectedText: string): string {
    return `[quote user="${username}" post_id="${postId}"]${selectedText}[/quote]\n\n`
}

/**
 * Generate BBCode for embedding a record
 */
export function generateRecordBBCode(recordId: string): string {
    return `[record]${recordId}[/record]`
}

/**
 * Generate BBCode for embedding gear
 */
export function generateGearBBCode(gearId: string): string {
    return `[gear]${gearId}[/gear]`
}

/**
 * Strip all BBCode tags from content (for preview/excerpt)
 */
export function stripBBCode(content: string): string {
    let stripped = content

    // Remove all BBCode tags
    stripped = stripped.replace(/\[record\][\w-]+\[\/record\]/gi, '[Record]')
    stripped = stripped.replace(/\[gear\][\w-]+\[\/gear\]/gi, '[Echipament]')
    stripped = stripped.replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi, '[Quote]')
    stripped = stripped.replace(/\[mention\].+?\[\/mention\]/gi, '@username')
    stripped = stripped.replace(/\[video\][^\[]+\[\/video\]/gi, '[Video]')
    stripped = stripped.replace(/\[img\][^\[]+\[\/img\]/gi, '[Imagine]')
    stripped = stripped.replace(/\[url[^\]]*\][^\[]+\[\/url\]/gi, '[Link]')
    stripped = stripped.replace(/\[b\](.*?)\[\/b\]/gi, '$1')
    stripped = stripped.replace(/\[i\](.*?)\[\/i\]/gi, '$1')
    stripped = stripped.replace(/\[u\](.*?)\[\/u\]/gi, '$1')
    stripped = stripped.replace(/\[s\](.*?)\[\/s\]/gi, '$1')
    stripped = stripped.replace(/\[h[1-3]\](.*?)\[\/h[1-3]\]/gi, '$1')
    stripped = stripped.replace(/\[list[^\]]*\](.*?)\[\/list\]/gis, '$1')
    stripped = stripped.replace(/\[code\](.*?)\[\/code\]/gis, '$1')

    return stripped.trim()
}

/**
 * Validate BBCode syntax
 */
export function validateBBCode(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for unclosed tags
    const openQuotes = (content.match(/\[quote/g) || []).length
    const closeQuotes = (content.match(/\[\/quote\]/g) || []).length
    if (openQuotes !== closeQuotes) {
        errors.push('Quote tag neconcordat (lipsește [/quote])')
    }

    // Check for invalid record IDs
    const recordMatches = content.matchAll(BB_CODE_PATTERNS.record)
    for (const match of recordMatches) {
        const recordId = match[1]
        if (!recordId || recordId.length < 3) {
            errors.push(`ID record invalid: ${recordId}`)
        }
    }

    // Check for invalid gear IDs
    const gearMatches = content.matchAll(BB_CODE_PATTERNS.gear)
    for (const match of gearMatches) {
        const gearId = match[1]
        if (!gearId || gearId.length < 3) {
            errors.push(`ID echipament invalid: ${gearId}`)
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}
