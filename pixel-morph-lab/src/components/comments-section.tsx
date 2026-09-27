"use client";

import * as React from "react";
import { MessageSquare, Send, ThumbsUp, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Comment {
  id: string;
  author: string;
  initials: string;
  body: string;
  postedAt: string;
  likes: number;
  replies?: Comment[];
}

interface CommentsSectionProps {
  chapterId: string;
  chapterTitle: string;
  seedComments?: Comment[];
}

const PRESET: Comment[] = [
  {
    id: "c1",
    author: "ada",
    initials: "AD",
    body: "The morph between smile_01 and smile_06 is a great demo. Would love a slider for cross-fading with a custom easing curve.",
    postedAt: "2 days ago",
    likes: 14,
    replies: [
      {
        id: "c1r1",
        author: "pixelmorph",
        initials: "PM",
        body: "Good point — Chapter 7 (custom eases) is in draft, stay tuned!",
        postedAt: "2 days ago",
        likes: 3,
      },
    ],
  },
  {
    id: "c2",
    author: "lin_42",
    initials: "L4",
    body: "Tried the pixel sort on a photo of my cat. Hue-metric + vertical direction looks incredible. Thanks for the auto-run toggle.",
    postedAt: "1 day ago",
    likes: 8,
  },
];

/**
 * Per-chapter discussion thread.
 * Comments live in component state only (no backend persistence),
 * which fits the tutorial-blog spirit (mocked community).
 */
export function CommentsSection({
  chapterId,
  chapterTitle,
  seedComments = PRESET,
}: CommentsSectionProps) {
  const [comments, setComments] = React.useState<Comment[]>(seedComments);
  const [draft, setDraft] = React.useState("");
  const [liked, setLiked] = React.useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, likes: c.likes + (liked.has(id) ? -1 : 1) }
          : {
              ...c,
              replies: c.replies?.map((r) =>
                r.id === id
                  ? { ...r, likes: r.likes + (liked.has(id) ? -1 : 1) }
                  : r
              ),
            }
      )
    );
  };

  const submit = () => {
    if (!draft.trim()) return;
    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: "guest_" + Math.floor(Math.random() * 999),
      initials: "G",
      body: draft.trim(),
      postedAt: "just now",
      likes: 0,
    };
    setComments((prev) => [newComment, ...prev]);
    setDraft("");
  };

  return (
    <div id={`comments-${chapterId}`} className="mt-10 pt-6 border-t" style={{ borderColor: "var(--pml-border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-[var(--pml-accent)]" />
        <h3 className="font-serif text-lg font-semibold">
          Discussion · {chapterTitle}
        </h3>
        <span className="ml-1 text-xs text-[var(--pml-prose-muted)]">
          ({comments.length} thread{comments.length === 1 ? "" : "s"})
        </span>
      </div>

      <div className="flex gap-3 mb-6">
        <Avatar className="w-8 h-8">
          <AvatarFallback style={{ background: "var(--pml-accent)", color: "var(--pml-accent-fg)" }}>
            ME
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Share your thoughts, ask a question, or post a snippet output…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-sm mb-2"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={submit}
              disabled={!draft.trim()}
              style={{
                background: "var(--pml-accent)",
                color: "var(--pml-accent-fg)",
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Comment
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {comments.map((c) => (
          <CommentBlock
            key={c.id}
            c={c}
            liked={liked.has(c.id)}
            onLike={() => toggleLike(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CommentBlock({
  c,
  liked,
  onLike,
}: {
  c: Comment;
  liked: boolean;
  onLike: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback style={{ background: "var(--pml-muted)", color: "var(--pml-prose-muted)" }}>
          {c.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-mono font-semibold text-[var(--pml-prose)]">
            @{c.author}
          </span>
          <span className="text-[var(--pml-prose-muted)]">{c.postedAt}</span>
        </div>
        <p className="text-sm text-[var(--pml-prose)] mt-1 leading-relaxed font-serif">
          {c.body}
        </p>
        <button
          onClick={onLike}
          className="mt-1.5 text-xs inline-flex items-center gap-1 text-[var(--pml-prose-muted)] hover:text-[var(--pml-accent)]"
          style={{ color: liked ? "var(--pml-accent)" : undefined }}
        >
          <ThumbsUp className="h-3 w-3" /> {c.likes} {liked ? "liked" : "like"}
        </button>
        {c.replies && c.replies.length > 0 && (
          <div className="mt-3 ml-4 pl-4 border-l space-y-3" style={{ borderColor: "var(--pml-border)" }}>
            {c.replies.map((r) => (
              <div key={r.id} className="flex gap-2">
                <CornerDownRight className="h-3 w-3 mt-1 text-[var(--pml-prose-muted)] flex-shrink-0" />
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback style={{ background: "var(--pml-muted)", color: "var(--pml-prose-muted)" }} className="text-[10px]">
                    {r.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-mono font-semibold text-[var(--pml-prose)]">
                      @{r.author}
                    </span>
                    <span className="text-[var(--pml-prose-muted)]">{r.postedAt}</span>
                  </div>
                  <p className="text-sm text-[var(--pml-prose)] mt-0.5 leading-relaxed font-serif">
                    {r.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
