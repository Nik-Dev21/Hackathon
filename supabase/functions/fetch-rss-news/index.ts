import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSItem {
    title: string
    description: string
    link: string
    pubDate: string
    guid: string
    imageUrl?: string
}

function parseRSSFeed(xmlText: string): RSSItem[] {
    const items: RSSItem[] = []

    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is
    const descRegex = /<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is
    const linkRegex = /<link[^>]*>(.*?)<\/link>/is
    const pubDateRegex = /<pub[dD]ate[^>]*>(.*?)<\/pub[dD]ate>/is
    const guidRegex = /<guid[^>]*>(.*?)<\/guid>/is

    const mediaContentRegex = /<media:content[^>]*url=["']([^"']+)["'][^>]*>/i
    const enclosureRegex = /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i
    const mediaThumbnailRegex = /<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i
    const contentEncodedRegex = /<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/is

    let match
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1]

        const titleMatch = titleRegex.exec(itemXml)
        const descMatch = descRegex.exec(itemXml)
        const linkMatch = linkRegex.exec(itemXml)
        const pubDateMatch = pubDateRegex.exec(itemXml)
        const guidMatch = guidRegex.exec(itemXml)

        if (titleMatch && linkMatch && pubDateMatch) {
            const cleanTitle = titleMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .trim()

            const cleanDesc = descMatch ? descMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/<!\[CDATA\[|\]\]>/g, '')
                .replace(/<[^>]+>/g, '')
                .trim() : ''

            const cleanLink = linkMatch[1].trim()
            const cleanGuid = guidMatch ? guidMatch[1].trim() : cleanLink

            let imageUrl: string | undefined

            const mediaContentMatch = mediaContentRegex.exec(itemXml)
            if (mediaContentMatch) imageUrl = mediaContentMatch[1]

            if (!imageUrl) {
                const enclosureMatch = enclosureRegex.exec(itemXml)
                if (enclosureMatch) imageUrl = enclosureMatch[1]
            }

            if (!imageUrl) {
                const mediaThumbnailMatch = mediaThumbnailRegex.exec(itemXml)
                if (mediaThumbnailMatch) imageUrl = mediaThumbnailMatch[1]
            }

            if (!imageUrl) {
                const contentEncodedMatch = contentEncodedRegex.exec(itemXml)
                if (contentEncodedMatch) {
                    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i
                    const imgMatch = imgRegex.exec(contentEncodedMatch[1])
                    if (imgMatch) imageUrl = imgMatch[1]
                }
            }

            if (!imageUrl && descMatch) {
                const imgRegex = /<img[^>]+src=["']([^"']+)["']/i
                const imgMatch = imgRegex.exec(descMatch[1])
                if (imgMatch) imageUrl = imgMatch[1]
            }

            items.push({
                title: cleanTitle,
                description: cleanDesc,
                link: cleanLink,
                pubDate: pubDateMatch[1].trim(),
                guid: cleanGuid,
                imageUrl: imageUrl,
            })
        }
    }

    return items
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const logs: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        logs.push(msg)
    }

    try {
        const sbUrl = Deno.env.get('SUPABASE_URL')
        const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const geminiKey = Deno.env.get('GEMINI_API_KEY')

        if (!sbUrl || !sbKey) throw new Error('Missing Supabase credentials')
        if (!geminiKey) throw new Error('Missing GEMINI_API_KEY')

        const supabase = createClient(sbUrl, sbKey)
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

        log('Fetching active news sources...')

        const { data: sources, error: sourcesError } = await supabase
            .from('news_sources')
            .select('*')
            .eq('is_active', true)

        if (sourcesError) throw sourcesError

        log(`Found ${sources?.length || 0} active sources`)

        const allArticles: Array<RSSItem & { source: any }> = []

        // Fetch RSS feeds
        for (const source of sources || []) {
            log(`Fetching RSS from ${source.name}...`)

            try {
                const response = await fetch(source.rss_feed_url)
                if (!response.ok) {
                    log(`Failed to fetch ${source.name}: ${response.status}`)
                    continue
                }

                const xmlText = await response.text()
                const items = parseRSSFeed(xmlText)
                log(`Parsed ${items.length} articles from ${source.name}`)

                items.forEach(item => allArticles.push({ ...item, source }))
            } catch (error) {
                log(`Error processing ${source.name}: ${error.message}`)
            }
        }

        log(`Total articles collected: ${allArticles.length}`)

        // Process top 5 articles with Gemini
        const processedTopics = []
        const errors: string[] = []

        for (const article of allArticles.slice(0, 5)) {
            log(`Processing: ${article.title}`)

            const prompt = `
        Analyze this Canadian news article:
        Title: ${article.title}
        Description: ${article.description || "No description"}
        Source: ${article.source.name}

        Provide a JSON response with:
        - topic: Short topic name (e.g., "Housing Crisis")
        - headline: Neutral, catchy headline
        - ai_summary: 2-3 sentence summary
        - bias_rating: "Left", "Center", or "Right"
        - key_points: Array of 3 key bullet points
        - tags: Array of 2-3 relevant tags
        - left_emphasis: What left-leaning perspective focuses on (1 sentence)
        - right_emphasis: What right-leaning perspective focuses on (1 sentence)
        - common_ground: What both sides agree on (1 sentence)

        Return ONLY raw JSON, no markdown.
      `

            try {
                const result = await model.generateContent(prompt)
                const response = await result.response
                const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim()

                let analysis
                try {
                    analysis = JSON.parse(text)
                } catch (e) {
                    log(`Failed to parse JSON: ${text.substring(0, 100)}`)
                    continue
                }

                // Insert topic
                const { data: topicData, error: topicError } = await supabase
                    .from('news_topics')
                    .insert({
                        topic: analysis.topic,
                        headline: analysis.headline,
                        ai_summary: analysis.ai_summary,
                        thumbnail_url: article.imageUrl,
                        published_date: new Date(article.pubDate).toISOString(),
                        source_count_left: article.source.bias_rating === 'Left' ? 1 : 0,
                        source_count_centre: article.source.bias_rating === 'Center' ? 1 : 0,
                        source_count_right: article.source.bias_rating === 'Right' ? 1 : 0,
                        left_emphasis: [analysis.left_emphasis],
                        right_emphasis: [analysis.right_emphasis],
                        common_ground: [analysis.common_ground],
                        key_points: analysis.key_points,
                        tags: analysis.tags,
                        is_featured: processedTopics.length === 0 // First one is featured
                    })
                    .select()
                    .single()

                if (topicError) {
                    log(`Error inserting topic: ${topicError.message}`)
                    errors.push(topicError.message)
                    continue
                }

                // Insert article
                await supabase
                    .from('news_articles')
                    .insert({
                        topic: analysis.topic,
                        title: article.title,
                        url: article.link,
                        source: article.source.name,
                        source_bias: article.source.bias_rating,
                        published_date: new Date(article.pubDate).toISOString(),
                        thumbnail_url: article.imageUrl,
                        summary: article.description
                    })

                processedTopics.push(topicData)
                log(`Successfully processed: ${analysis.topic}`)

            } catch (e: any) {
                log(`Error: ${e.message}`)
                errors.push(e.message)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: processedTopics.length,
                totalArticles: allArticles.length,
                logs,
                errors
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message, logs }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
