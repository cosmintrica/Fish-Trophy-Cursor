/**
 * Forum BBCode Parser
 * Parses custom BBCode tags for fish records, gear, and quotes
 */

import type { BBCodeParseResult } from './types'

// ============================================
// BBCODE PATTERNS
// ============================================

const BB_CODE_PATTERNS = {
    record: /\[record\]([\w-]+)\[\/record\]/gi,
    gear: /\[gear\]([\w-]+)\[\/gear\]/gi,
    quote: /\[quote user="([^"]+)" post_id="([^"]+)"\]([\s\S]*?)\[\/quote\]/gi,
    video_youtube: /\[video\](https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+))\[\/video\]/gi,
    video_vimeo: /\[video\](https?:\/\/vimeo\.com\/(\d+))\[\/video\]/gi,
    // Auto-detect YouTube/Vimeo links
    auto_youtube: /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+))/gi,
    auto_vimeo: /(https?:\/\/vimeo\.com\/(\d+))/gi
} as const

// ============================================
// PARSER FUNCTIONS
// ============================================

/**
 * Parse BBCode and convert to HTML
 */
export function parseBBCode(content: string): BBCodeParseResult {
    let html = content
    const embeds: BBCodeParseResult['embeds'] = {
        records: [],
        gear: [],
        quotes: []
    }

    // Parse [record] tags
    html = html.replace(BB_CODE_PATTERNS.record, (match, recordId) => {
        embeds.records.push(recordId)
        return `<div class="bbcode-record-embed" data-record-id="${recordId}">
      <div class="loading">Loading record ${recordId}...</div>
    </div>`
    })

    // Parse [gear] tags
    html = html.replace(BB_CODE_PATTERNS.gear, (match, gearId) => {
        embeds.gear.push(gearId)
        return `<div class="bbcode-gear-embed" data-gear-id="${gearId}">
      <div class="loading">Loading gear ${gearId}...</div>
    </div>`
    })

    // Parse [quote] tags
    html = html.replace(BB_CODE_PATTERNS.quote, (match, username, postId, text) => {
        embeds.quotes.push({ user: username, post_id: postId, text })
        return `<blockquote class="bbcode-quote" data-post-id="${postId}">
      <div class="quote-header">
        <span class="quote-author">${escapeHtml(username)}</span>
        <a href="/forum/post/${postId}" class="quote-link">Vezi postare</a>
      </div>
      <div class="quote-content">${escapeHtml(text)}</div>
    </blockquote>`
    })

    // Parse video embeds (YouTube)
    html = html.replace(BB_CODE_PATTERNS.video_youtube, (match, fullUrl, videoId) => {
        return `<div class="bbcode-video youtube">
      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
    })

    // Parse video embeds (Vimeo)
    html = html.replace(BB_CODE_PATTERNS.video_vimeo, (match, fullUrl, videoId) => {
        return `<div class="bbcode-video vimeo">
      <iframe
        src="https://player.vimeo.com/video/${videoId}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
    })

    // Auto-detect YouTube links (without tags)
    html = html.replace(BB_CODE_PATTERNS.auto_youtube, (match, fullUrl, videoId) => {
        // Only convert if not already in an embed
        if (html.includes(`youtube.com/embed/${videoId}`)) {
            return match
        }
        return `<div class="bbcode-video youtube auto-detected">
      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
    })

    // Auto-detect Vimeo links (without tags)
    html = html.replace(BB_CODE_PATTERNS.auto_vimeo, (match, fullUrl, videoId) => {
        if (html.includes(`vimeo.com/video/${videoId}`)) {
            return match
        }
        return `<div class="bbcode-video vimeo auto-detected">
      <iframe
        src="https://player.vimeo.com/video/${videoId}"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>`
    })

    // Convert line breaks
    html = html.replace(/\n/g, '<br>')

    return { html, embeds }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
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
    stripped = stripped.replace(/\[video\][^\[]+\[\/video\]/gi, '[Video]')

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
