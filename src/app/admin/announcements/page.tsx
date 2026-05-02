
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Send, Trash2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, serverTimestamp, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Announcement } from '@/lib/types';

export default function AdminAnnouncementsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'info' | 'alert' | 'update'>('info');

  const announcementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'announcements'));
  }, [db, user]);

  const { data: rawAnnouncements, isLoading } = useCollection<Announcement>(announcementsQuery);

  const announcements = useMemo(() => {
    if (!rawAnnouncements) return [];
    return [...rawAnnouncements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawAnnouncements]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !db) return;

    const newAnnouncement = {
      title,
      content,
      type,
      date: new Date().toISOString().split('T')[0],
      timestamp: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(db, 'announcements'), newAnnouncement);
    
    setTitle('');
    setContent('');
    setType('info');

    toast({
      title: "Announcement Published",
      description: "The broadcast is now live for all bureau staff.",
    });
  };

  const handleDelete = (id: string) => {
    if (!db) return;
    deleteDocumentNonBlocking(doc(db, 'announcements', id));
    toast({
      title: "Announcement Removed",
      description: "The broadcast has been deleted.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bureau Administration</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Broadcast Center</h1>
        <p className="text-sm text-muted-foreground">Manage bureau-wide messages for the field operations team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1">
          <Card className="border-none shadow-sm bg-card sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Draft Broadcast
              </CardTitle>
              <CardDescription>Issue a formal update to all officers.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Subject</Label>
                  <Input 
                    placeholder="e.g. System Maintenance" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Category</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="alert">Critical Alert</SelectItem>
                      <SelectItem value="update">Policy Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Message</Label>
                  <Textarea 
                    placeholder="Enter details for the field team..." 
                    className="min-h-[120px] resize-none bg-background border-border"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold">
                  <Send className="mr-2 h-4 w-4" /> Deploy Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Telegrams</h2>
            <span className="text-[10px] font-bold px-2 py-1 bg-muted rounded text-muted-foreground">
              {announcements.length} TOTAL
            </span>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
            ) : announcements.map((ann) => (
              <Card key={ann.id} className="border-none shadow-sm overflow-hidden group">
                <div className="flex">
                  <div className={cn(
                    "w-1.5",
                    ann.type === 'alert' ? "bg-red-500" : 
                    ann.type === 'info' ? "bg-blue-500" : "bg-green-500"
                  )} />
                  <CardContent className="p-5 flex-1 bg-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground">{ann.title}</h3>
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                            ann.type === 'alert' ? "bg-red-500/10 text-red-500" : 
                            ann.type === 'info' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                          )}>
                            {ann.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
                        <p className="text-[10px] text-muted-foreground/50 font-medium pt-2">Published: {ann.date}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => handleDelete(ann.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}

            {!isLoading && announcements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed text-muted-foreground/30">
                <Megaphone className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No live broadcasts</p>
                <p className="text-xs">System-wide messages will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
