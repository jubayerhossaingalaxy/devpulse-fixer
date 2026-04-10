import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPICS = [
  "Advanced TypeScript patterns and best practices for 2025",
  "Microservices architecture patterns and anti-patterns",
  "Edge computing and CDN optimization strategies",
  "DevOps CI/CD pipeline best practices and automation",
  "AI-powered developer tools and workflow automation",
  "Rust vs Go: systems programming comparison for backend",
  "React Server Components and modern frontend architecture",
  "Kubernetes at scale: lessons from production deployments",
  "Database optimization: PostgreSQL performance tuning",
  "WebAssembly: the future of web performance",
  "Zero-trust security architecture for modern applications",
  "Event-driven architecture with Apache Kafka",
  "GraphQL vs REST API design in 2025",
  "Infrastructure as Code with Terraform and Pulumi",
  "Observability and distributed tracing best practices",
  "Container security and supply chain hardening",
  "Serverless computing patterns and pitfalls",
  "Machine learning ops (MLOps) pipeline design",
  "Progressive Web Apps (PWA) in 2025",
  "API gateway patterns and rate limiting strategies",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 1, pageId, accessToken } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = [];
    const postsToGenerate = Math.min(count, 5);

    for (let i = 0; i < postsToGenerate; i++) {
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

      try {
        // Step 1: AI generates the post content
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a viral developer content strategist. Create Facebook posts that get massive engagement in developer communities.

RULES:
- Write in a conversational, bold, opinionated tone
- Start with a HOOK that stops scrolling (controversial take, surprising stat, or bold claim)
- Include 3-5 actionable tips or insights with numbering
- Use emojis strategically (not excessively) — 2-4 per post
- End with a discussion question to drive comments
- Include a "Pro-tip" section
- Length: 800-1500 characters (optimal for Facebook engagement)
- Make it educational yet entertaining
- Reference specific tools, libraries, or frameworks by name
- Include code concepts without actual code blocks (Facebook doesn't render code)
- Optimize for SEO: use keywords naturally
- Make it shareable and bookmark-worthy

HASHTAG RULES:
- Generate exactly 5 relevant hashtags
- Mix broad (#WebDev) and specific (#ReactServerComponents) tags
- Always include #ProgrammingTips or #DevPulse

Return ONLY valid JSON with this exact structure:
{
  "title": "Catchy post title under 100 chars",
  "content": "Full post content with hooks, tips, pro-tip, and discussion question",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`
              },
              {
                role: "user",
                content: `Create a viral, SEO-optimized developer Facebook post about: ${topic}. 
                
Research deeply: What are the latest trends, pain points, and best practices? What would make developers stop scrolling and engage? What controversial or surprising angle can you take?`
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          if (aiResponse.status === 429) {
            throw new Error("Rate limited — please try again later");
          }
          if (aiResponse.status === 402) {
            throw new Error("AI credits exhausted — please add funds");
          }
          throw new Error(`AI generation failed: ${errText}`);
        }

        const aiData = await aiResponse.json();
        let rawContent = aiData.choices?.[0]?.message?.content || "";

        // Clean up markdown code fences if present
        rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let parsed;
        try {
          parsed = JSON.parse(rawContent);
        } catch {
          parsed = {
            title: topic,
            content: rawContent,
            tags: ["DevPulse", "Programming", "WebDev", "Tech", "ProgrammingTips"],
          };
        }

        const postContent = `${parsed.content}\n\n${parsed.tags.map((t: string) => `#${t}`).join("\n")}`;

        // Step 2: Try to post to Facebook if credentials provided
        let fbPostId = null;
        let postError = null;
        let status = "pending";

        if (pageId && accessToken) {
          try {
            const fbResponse = await fetch(
              `https://graph.facebook.com/v21.0/${pageId}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: postContent,
                  access_token: accessToken,
                }),
              }
            );

            const fbData = await fbResponse.json();

            if (fbData.id) {
              fbPostId = fbData.id;
              status = "posted";
            } else {
              postError = JSON.stringify(fbData.error || fbData);
              status = "failed";
            }
          } catch (fbErr) {
            postError = fbErr instanceof Error ? fbErr.message : "Facebook API error";
            status = "failed";
          }
        } else {
          status = "pending";
          postError = "Facebook credentials not provided — post saved as draft";
        }

        // Step 3: Save to database
        const { data: savedPost, error: dbError } = await supabase
          .from("auto_posts")
          .insert({
            title: parsed.title,
            content: parsed.content,
            topic,
            tags: parsed.tags,
            status,
            facebook_post_id: fbPostId,
            error_message: postError,
            posted_at: status === "posted" ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        results.push({ success: status === "posted", post: savedPost });
      } catch (postErr) {
        console.error("Error generating post:", postErr);
        
        // Still save the failed attempt
        const { data: failedPost } = await supabase
          .from("auto_posts")
          .insert({
            title: `Failed: ${topic}`,
            content: "Generation failed",
            topic,
            tags: [],
            status: "failed",
            error_message: postErr instanceof Error ? postErr.message : "Unknown error",
          })
          .select()
          .single();

        results.push({ success: false, post: failedPost, error: postErr instanceof Error ? postErr.message : "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({
        total: postsToGenerate,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("auto-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
