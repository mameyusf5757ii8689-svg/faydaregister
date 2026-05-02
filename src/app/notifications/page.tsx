
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Megaphone,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Notification, Announcement, Conversation, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';
import Link from 'next/link';

export default function NotificationsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'notifications'));
  }, [db, user?.uid]);

  const announcementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'announcements'));
  }, [db, user?.uid]);

  const convsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid)
    );
  }, [db, user]);

  const { data: notifications, isLoading: isNotisLoading } = useCollection<Notification>(notificationsQuery);
  const { data: announcements, isLoading: isAnnLoading } = useCollection<Announcement>(announcementsQuery);
  const { data: conversations, isLoading: isConvsLoading } = useCollection<Conversation>(convsQuery);

  const getTs = (d: any) => {
    if (!d) return 0;
    if (typeof d === 'string') return new Date(d).getTime();
    if (d.toDate) return d.toDate().getTime();
    return new Date(d).getTime();
  };

  const combinedItems = useMemo(() => {
    const combined: any[] = [];
    
    if (notifications) {
      notifications.forEach(n => combined.push({ 
        ...n, 
        category: 'personal',
        sortDate: new Date(n.createdAt || Date.now())
      }));
    }
    
    if (announcements) {
      const lastRead = profile?.lastAnnouncementReadAt ? getTs(profile.lastAnnouncementReadAt) : 0;
      announcements.forEach(a => {
        const annTs = a.timestamp ? getTs(a.timestamp) : getTs(a.date);
        combined.push({ 
          ...a, 
          category: 'announcement',
          isRead: annTs <= lastRead,
          message: a.content,
          createdAt: a.timestamp?.toDate ? a.timestamp.toDate().toISOString() : new Date(a.date).toISOString(),
          sortDate: a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.date)
        });
      });
    }

    if (conversations && profile) {
      const lastMsgRead = profile.lastMessageReadAt ? getTs(profile.lastMessageReadAt) : 0;
      const unreadConvs = conversations.filter(c => getTs(c.lastTimestamp) > lastMsgRead);
      
      if (unreadConvs.length > 0) {
        combined.push({
          id: 'msg-alert-virtual',
          title: 'Secure Transmission Detected',
          message: `Operational alert: New messages detected in ${unreadConvs.length} coordination channel(s).`,
          type: 'info',
          category: 'message',
          isRead: false,
          createdAt: new Date().toISOString(),
          sortDate: new Date(),
          actionHref: '/communication'
        });
      }
    }

    return combined.sort((a, b) => getTs(b.sortDate) - getTs(a.sortDate));
  }, [notifications, announcements, conversations, profile]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter(item => 
      filter === 'all' ? true : !item.isRead
    );
  }, [combinedItems, filter]);

  const unreadCount = combinedItems.filter(n => !n.isRead).length;

  const markAllRead = () => {
    if (!user?.uid || !db) return;
    
    const now = new Date().toISOString();

    // 1. Mark personal notifications as read
    if (notifications) {
      notifications.forEach(n => {
        if (!n.isRead) {
          updateDocumentNonBlocking(doc(db, 'users', user.uid, 'notifications', n.id), { isRead: true });
        }
      });
    }

    // 2. Sync profile read timestamps
    updateDocumentNonBlocking(doc(db, 'users', user.uid), {
      lastAnnouncementReadAt: now,
      lastMessageReadAt: now,
      updatedAt: now
    });

    toast({
      title: "Terminal Synchronized",
      description: "All operational alerts and broadcasts acknowledged.",
    });
  };

  const clearAll = () => {
    if (!notifications || !user?.uid || !db) return;
    
    // Clear personal history
    notifications.forEach(n => {
      deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'notifications', n.id));
    });

    // Also reset timestamps to current to prevent historical re-alerts
    const now = new Date().toISOString();
    updateDocumentNonBlocking(doc(db, 'users', user.uid), {
      lastAnnouncementReadAt: now,
      lastMessageReadAt: now,
      updatedAt: now
    });

    toast({
      title: "Archive Purged",
      description: "Intelligence feed history has been cleared.",
    });
  };

  const getTypeIcon = (item: any) => {
    if (item.category === 'announcement') return <Megaphone className="h-5 w-5 text-primary" />;
    if (item.category === 'message') return <MessageSquare className="h-5 w-5 text-amber-500" />;
    
    switch (item.type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (isUserLoading || isNotisLoading || isAnnLoading || isConvsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-sm">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Bureau Operational Log</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground font-headline">Intelligence Feed</h1>
          <p className="text-sm text-muted-foreground">Synchronized personal alerts, transmissions, and bureau-wide announcements.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-2 w-full sm:w-[260px] bg-muted h-11 p-1">
            <TabsTrigger value="all" className="font-bold text-[10px] uppercase tracking-widest">
              All Items ({combinedItems.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="font-bold text-[10px] uppercase tracking-widest">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none font-bold text-[10px] uppercase tracking-widest border-border bg-background hover:bg-muted"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-3.5 w-3.5" /> Mark All Read
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none font-bold text-[10px] uppercase tracking-widest border-destructive/20 text-destructive bg-background hover:bg-destructive/5"
            onClick={clearAll}
            disabled={!notifications?.length}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Clear History
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <Card key={item.id} className={cn(
              "border-none shadow-sm transition-all hover:shadow-md bg-card overflow-hidden group",
              !item.isRead && "ring-1 ring-primary/20",
              item.category === 'announcement' && "bg-primary/[0.02]",
              item.category === 'message' && "bg-amber-500/[0.02]"
            )}>
              <CardContent className="p-6 flex items-start gap-5">
                <div className="mt-1 p-2.5 rounded-xl bg-muted/50 border border-border">
                  {getTypeIcon(item)}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-foreground text-sm tracking-tight">{item.title}</h3>
                      {item.category === 'announcement' && (
                        <span className="text-[9px] font-black uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full tracking-tighter">Official Broadcast</span>
                      )}
                      {item.category === 'message' && (
                        <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full tracking-tighter">Secure Channel</span>
                      )}
                      {!item.isRead && (
                        <span className="text-[8px] font-black uppercase text-primary animate-pulse">New</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                      {format(new Date(item.createdAt), 'MMM dd • HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {item.message}
                  </p>
                  {item.actionHref && (
                    <div className="pt-3">
                      <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest rounded-lg" asChild>
                        <Link href={item.actionHref}>
                          Open Terminal <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                {!item.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-card rounded-[32px] border border-dashed border-border shadow-inner">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-50" />
              <div className="p-8 bg-muted rounded-full relative z-10 border border-border shadow-sm">
                <Bell className="h-16 w-16 text-muted-foreground/20" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Operational Calm</h3>
            <p className="text-sm text-muted-foreground font-medium italic">No pending alerts or notifications for your unit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
