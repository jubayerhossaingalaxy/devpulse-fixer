import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot, Send, RefreshCw, CheckCircle2, XCircle, Clock,
  Facebook, Zap, Settings, Eye, EyeOff, Save, Sparkles,
  TrendingUp, Target, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AutoPost {
  id: string;
  title: string;
  content: string;
  topic: string | null;
  tags: string[] | null;
  status: string;
  facebook_post_id: string | null;
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
}

const statusConfig = {
  posted: { icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", label: "Published", dotColor: "bg-primary" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Failed", dotColor: "bg-destructive" },
  pending: { icon: Clock, color: "text-accent-orange", bg: "bg-accent-orange/10", label: "Draft", dotColor: "bg-accent-orange" },
};

const AutoPostPage = () => {
  const [posting, setPosting] = useState(false);
  const [postCount, setPostCount] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [pageId, setPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPageId(localStorage.getItem("fb_page_id") || "");
    setAccessToken(localStorage.getItem("fb_access_token") || "");
  }, []);

  const handleSaveSettings = () => {
    const trimmedPageId = pageId.trim();
    const trimmedToken = accessToken.trim();
    if (!trimmedPageId || !trimmedToken) return;
    localStorage.setItem("fb_page_id", trimmedPageId);
    localStorage.setItem("fb_access_token", trimmedToken);
    toast({ title: "✅ Settings Saved", description: "Facebook credentials updated." });
    setShowSettings(false);
  };

  const isConfigured = !!(localStorage.getItem("fb_page_id") && localStorage.getItem("fb_access_token"));

  const { data: posts, refetch, isLoading } = useQuery({
    queryKey: ["auto-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AutoPost[];
    },
  });

  const handlePost = async () => {
    setPosting(true);
    try {
      const savedPageId = localStorage.getItem("fb_page_id") || undefined;
      const savedToken = localStorage.getItem("fb_access_token") || undefined;

      const { data, error } = await supabase.functions.invoke("auto-post-facebook", {
        body: { count: postCount, pageId: savedPageId, accessToken: savedToken },
      });
      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      const totalCount = data?.total || 0;

      if (successCount > 0) {
        toast({
          title: "🚀 Posts Published!",
          description: `${successCount}/${totalCount} posts published to Facebook.`,
        });
      } else if (!savedPageId || !savedToken) {
        toast({
          title: "📝 AI Posts Generated!",
          description: `${totalCount} posts saved as drafts. Configure Facebook to publish.`,
        });
      } else {
        toast({
          title: "⚠️ Posts Generated with Issues",
          description: `Posts generated but Facebook publishing had errors. Check post history.`,
          variant: "destructive",
        });
      }
      refetch();
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  const stats = {
    total: posts?.length || 0,
    posted: posts?.filter((p) => p.status === "posted").length || 0,
    failed: posts?.filter((p) => p.status === "failed").length || 0,
    pending: posts?.filter((p) => p.status === "pending").length || 0,
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">AI Auto Post</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered viral content generation • SEO optimized • Auto-publish to Facebook
            </p>
          </div>
        </div>
      </div>

      {/* Facebook Config Card */}
      <motion.div
        layout
        className="rounded-xl border border-border bg-card p-5 mb-5 overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <Facebook className="h-5 w-5 text-accent-blue" />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground block">Facebook Integration</span>
              <span className="text-xs text-muted-foreground">
                {isConfigured ? "Page connected — posts will auto-publish" : "Configure to auto-publish posts"}
              </span>
            </div>
            {isConfigured ? (
              <Badge className="bg-primary/10 text-primary text-xs border-0 ml-2">Connected</Badge>
            ) : (
              <Badge className="bg-accent-orange/10 text-accent-orange text-xs border-0 ml-2">Optional</Badge>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            {showSettings ? "Hide" : "Configure"}
          </button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="e.g. 123456789012345"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Facebook Page → About → Page ID</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Page Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAAxxxxxxx..."
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From{" "}
                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-accent-blue hover:underline">
                      Graph API Explorer
                    </a>
                    {" "}with <span className="font-mono text-foreground">pages_manage_posts</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={!pageId.trim() || !accessToken.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-accent-orange/20 bg-accent-orange/5 p-3">
                <AlertTriangle className="h-4 w-4 text-accent-orange mt-0.5 flex-shrink-0" />
                <p className="text-xs text-accent-orange">
                  Credentials stored locally. Without Facebook config, posts save as drafts you can publish later.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Generate Card */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-5 mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center animate-pulse-glow">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">AI Content Generator</span>
              <span className="text-xs text-muted-foreground">Deep research → SEO content → Auto publish</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Posts:</label>
              <select
                value={postCount}
                onChange={(e) => setPostCount(Number(e.target.value))}
                className="bg-muted rounded-lg px-3 py-1.5 text-sm text-foreground border border-border"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handlePost}
              disabled={posting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 glow-primary"
            >
              {posting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {posting ? "Generating..." : "Generate & Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, icon: Zap, color: "text-foreground", bg: "bg-muted" },
          { label: "Published", value: stats.posted, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Drafts", value: stats.pending, icon: Clock, color: "text-accent-orange", bg: "bg-accent-orange/10" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border border-border ${stat.bg} p-4 text-center`}>
            <stat.icon className={`h-4 w-4 mx-auto mb-1.5 ${stat.color}`} />
            <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 mb-6">
        <div className="flex items-center gap-2 mb-2.5">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Optimal Posting Schedule (UTC)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { time: "8:00 AM", label: "☕ Morning" },
            { time: "11:00 AM", label: "📈 Peak" },
            { time: "2:00 PM", label: "🎯 Afternoon" },
            { time: "5:00 PM", label: "🔥 Evening" },
            { time: "8:00 PM", label: "🌙 Night" },
          ].map(({ time, label }) => (
            <span key={time} className="px-3 py-1.5 rounded-lg bg-primary/10 text-xs font-mono text-primary border border-primary/10">
              {label} {time}
            </span>
          ))}
        </div>
      </div>

      {/* Post History */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-foreground" />
          <h2 className="font-display font-semibold text-foreground">Post History</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !posts?.length ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card/50">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Generate & Post" to create your first AI-powered viral content!
          </p>
          <button
            onClick={handlePost}
            disabled={posting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity glow-primary"
          >
            <Sparkles className="h-4 w-4" />
            Generate First Post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => {
            const cfg = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <Badge className={`${cfg.bg} ${cfg.color} text-xs border-0 flex-shrink-0`}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{post.content}</p>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {post.topic && (
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" /> {post.topic}
                        </span>
                      )}
                      <span>{new Date(post.created_at).toLocaleString()}</span>
                      {post.facebook_post_id && (
                        <a
                          href={`https://facebook.com/${post.facebook_post_id}`}
                          target="_blank"
                          rel="noopener"
                          className="text-accent-blue hover:underline font-medium"
                        >
                          View on Facebook →
                        </a>
                      )}
                    </div>

                    {post.error_message && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-destructive">{post.error_message}</p>
                      </div>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AutoPostPage;
