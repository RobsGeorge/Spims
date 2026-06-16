"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Thread = { id: string; title: string; isGraded: boolean; locked: boolean; pinned: boolean };
type Post = { id: string; body: string; author: { firstName: string; lastName: string }; createdAt: string };

export function DiscussionBoardPanel({ boardId }: { boardId: string }) {
  const t = useTranslations("discussion");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function loadThreads() {
    const res = await fetch(`/api/discussion/${boardId}/threads`);
    const data = await res.json();
    if (res.ok) {
      setThreads(data.threads ?? []);
      setLoaded(true);
    }
  }

  async function loadPosts(threadId: string) {
    setSelectedThread(threadId);
    const res = await fetch(`/api/threads/${threadId}/posts`);
    const data = await res.json();
    if (res.ok) setPosts(data.posts ?? []);
  }

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/discussion/${boardId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newThreadTitle }),
    });
    if (res.ok) {
      setNewThreadTitle("");
      await loadThreads();
    }
  }

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThread) return;
    const res = await fetch(`/api/threads/${selectedThread}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newPostBody }),
    });
    if (res.ok) {
      setNewPostBody("");
      await loadPosts(selectedThread);
    }
  }

  if (!loaded) {
    return (
      <Button variant="outline" onClick={loadThreads}>
        {t("loadBoard")}
      </Button>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("threads")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={createThread} className="flex gap-2">
            <Input value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} placeholder={t("newThread")} required />
            <Button type="submit" size="sm">{t("create")}</Button>
          </form>
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className="block w-full text-start text-sm border rounded-md px-3 py-2 hover:bg-muted"
              onClick={() => loadPosts(thread.id)}
            >
              {thread.title}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("posts")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedThread && (
            <form onSubmit={createPost} className="space-y-2">
              <Input value={newPostBody} onChange={(e) => setNewPostBody(e.target.value)} placeholder={t("writePost")} required />
              <Button type="submit" size="sm">{t("post")}</Button>
            </form>
          )}
          {posts.map((p) => (
            <div key={p.id} className="text-sm border-b pb-2">
              <p className="font-medium text-xs text-muted-foreground">{p.author.firstName} {p.author.lastName}</p>
              <p>{p.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
