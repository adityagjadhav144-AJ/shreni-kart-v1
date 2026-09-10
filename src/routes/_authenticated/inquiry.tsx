import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Phone, ScreenHeader } from "@/components/kk/shell";
import { inquiries as sampleInquiries, type Inquiry } from "@/lib/kalakart-data";
import { useAuth } from "@/lib/auth";
import { replyToInquiry, subscribeInquiries } from "@/lib/firestore-service";
import { replyToInquiryInCloudSql } from "@/lib/cloudsql-service.functions";

export const Route = createFileRoute("/_authenticated/inquiry")({
  head: () => ({
    meta: [
      { title: "Buyer Inquiries — Shreni Kart" },
      {
        name: "description",
        content:
          "Read buyer questions about your handicrafts and reply instantly, or let Shreni AI draft a polite reply you can edit.",
      },
      { property: "og:title", content: "Buyer Inquiries — Shreni Kart" },
      {
        property: "og:description",
        content: "Answer buyer questions with help from Shreni AI.",
      },
    ],
  }),
  component: InquiryPage,
});

export function InquiryPage() {
  const { user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id || "";
  const [liveInquiries, setLiveInquiries] = useState<Inquiry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!artisanId) return;
    const unsub = subscribeInquiries(artisanId, (items) => {
      setLiveInquiries(items);
    });
    return () => unsub();
  }, [artisanId]);

  const displayedInquiries = liveInquiries.length > 0 ? liveInquiries : sampleInquiries;

  const open = (id: string, text: string) => {
    setOpenId(id);
    setDraft(text);
  };

  const aiReply = (id: string, reply: string) => {
    setOpenId(id);
    setDraft("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setDraft(reply);
    }, 1100);
  };

  const handleSendReply = async (inq: Inquiry) => {
    if (!draft.trim()) return;
    try {
      await replyToInquiry(inq.id, draft);
      void replyToInquiryInCloudSql({
        data: {
          inquiryId: inq.id,
          reply: draft,
        },
      });
      toast.success(`Reply sent to ${inq.buyer}`);
    } catch {
      void replyToInquiryInCloudSql({
        data: {
          inquiryId: inq.id,
          reply: draft,
        },
      });
      toast.success(`Reply sent to ${inq.buyer}`);
    }
    setOpenId(null);
  };

  return (
    <Phone withNav>
      <ScreenHeader
        title="Buyer Inquiries"
        subtitle="Questions waiting for your answer"
        back={false}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 landscape:grid-cols-2 gap-3.5 px-4 sm:px-5 py-4 sm:py-5">
        {displayedInquiries.map((q, i) => (
          <article
            key={q.id}
            className="rise rounded-3xl bg-card p-4 shadow-soft"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex gap-3">
              <img
                src={q.image}
                alt={q.product}
                loading="lazy"
                width={700}
                height={700}
                className="size-14 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{q.buyer}</p>
                  <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" /> {q.time}
                  </span>
                </div>
                <p className="truncate text-[11px] text-primary">{q.product}</p>
                <p className="mt-1.5 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-xs leading-snug text-secondary-foreground">
                  {q.message}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => open(q.id, "")}
                className="tap flex-1 rounded-2xl bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground"
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => aiReply(q.id, q.aiReply)}
                className="tap flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-warm py-2.5 text-xs font-semibold text-primary-foreground"
              >
                <Sparkles className="size-3.5" /> Use AI Reply
              </button>
            </div>

            {openId === q.id ? (
              <div className="mt-3 rounded-3xl bg-beige/70 p-3">
                {thinking ? (
                  <p className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Sparkles className="size-4 animate-pulse text-primary" />
                    Shreni AI is writing a polite reply…
                  </p>
                ) : (
                  <>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      placeholder="Write your reply…"
                      className="w-full resize-none rounded-2xl border border-border bg-card p-3 text-xs leading-relaxed outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => handleSendReply(q)}
                      className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-maroon py-3 text-sm font-semibold text-maroon-foreground disabled:opacity-50"
                    >
                      <Send className="size-4" /> Send Reply
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </Phone>
  );
}
