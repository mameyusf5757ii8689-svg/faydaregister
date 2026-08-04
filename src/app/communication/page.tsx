'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, limit, serverTimestamp, where, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  MessageSquare, 
  Loader2, 
  Users, 
  Plus, 
  Search, 
  UserPlus,
  ShieldCheck,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
  User,
  Mic,
  Square,
  Volume2,
  Pin,
  PinOff,
  UserMinus,
  Settings2,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Message, Conversation, UserProfile } from '@/lib/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export default function CommunicationPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [channelSearchTerm, setChannelSearchTerm] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [isMsgSearchActive, setIsMsgSearchActive] = useState(false);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (db && user?.uid) {
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        lastMessageReadAt: new Date().toISOString()
      });
    }
  }, [db, user?.uid]);

  const convsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid)
    );
  }, [db, user]);

  const { data: rawConversations } = useCollection<Conversation>(convsQuery);

  const conversations = useMemo(() => {
    if (!rawConversations) return [];
    return [...rawConversations]
      .filter(c => {
        if (!channelSearchTerm) return true;
        const name = c.type === 'group' ? c.name : 'Direct Message';
        return name?.toLowerCase().includes(channelSearchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const timeA = a.lastTimestamp?.toDate ? a.lastTimestamp.toDate().getTime() : 0;
        const timeB = b.lastTimestamp?.toDate ? b.lastTimestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [rawConversations, channelSearchTerm]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(100));
  }, [db, user]);

  const { data: allUsers } = useCollection<UserProfile>(usersQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!db || !activeConvId || !user) return null;
    return query(
      collection(db, 'messages'),
      where('conversationId', '==', activeConvId),
      limit(200)
    );
  }, [db, activeConvId, user]);

  const { data: rawMessages, isLoading: isMessagesLoading } = useCollection<Message>(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages || !user) return [];
    return [...rawMessages]
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
        return timeA - timeB;
      });
  }, [rawMessages, user]);

  const filteredMessages = useMemo(() => {
    if (!messages || !user) return [];
    let list = messages.filter(m => !m.deletedFor?.includes(user.uid));
    if (messageSearchTerm) {
      list = list.filter(m => m.text?.toLowerCase().includes(messageSearchTerm.toLowerCase()));
    }
    return list;
  }, [messages, user, messageSearchTerm]);

  useEffect(() => {
    if (scrollRef.current && !messageSearchTerm) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [filteredMessages, messageSearchTerm]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !db || !activeConvId) return;
    performSendMessage(inputText.trim());
    setInputText('');
  };

  const performSendMessage = (text?: string, audioUrl?: string) => {
    if (!user || !db || !activeConvId) return;

    if (editingMsg && text) {
      updateDocumentNonBlocking(doc(db, 'messages', editingMsg.id), {
        text,
        isEdited: true,
        updatedAt: serverTimestamp(),
      });
      setEditingMsg(null);
    } else {
      const messageData = {
        conversationId: activeConvId,
        text: text || null,
        audioUrl: audioUrl || null,
        senderId: user.uid,
        senderName: currentUserProfile?.fullName || user.email?.split('@')[0] || 'Official',
        senderEmail: user.email || '',
        timestamp: serverTimestamp(),
        deletedFor: []
      };

      addDocumentNonBlocking(collection(db, 'messages'), messageData);
      setDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
        lastMessage: audioUrl ? 'Voice Message' : text,
        lastTimestamp: serverTimestamp(),
      }, { merge: true });
      
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        lastMessageReadAt: new Date().toISOString()
      });
    }
  };

  const handleDeleteForMe = async () => {
    if (!db || !user || !msgToDelete) return;
    const targetId = msgToDelete.id;
    setIsDeleting(true);
    try {
      await updateDocumentNonBlocking(doc(db, 'messages', targetId), {
        deletedFor: arrayUnion(user.uid)
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Could not remove message.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setMsgToDelete(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!db || !msgToDelete || !activeConvId) return;
    const targetId = msgToDelete.id;
    setIsDeleting(true);
    try {
      await deleteDocumentNonBlocking(doc(db, 'messages', targetId));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Could not purge message.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setMsgToDelete(null);
    }
  };

  const togglePin = (msgId: string) => {
    if (!db || !activeConvId) return;
    const isAlreadyPinned = activeConv?.pinnedMessageId === msgId;
    updateDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
      pinnedMessageId: isAlreadyPinned ? null : msgId
    });
    toast({
      title: isAlreadyPinned ? "Transmission Unpinned" : "Protocol Pinned",
      description: isAlreadyPinned ? "Instruction removed from header." : "Added to operational pinned view."
    });
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const pinnedMessage = messages.find(m => m.id === activeConv?.pinnedMessageId);

  const getConvName = (conv: Conversation | undefined | null) => {
    if (!conv) return '...';
    if (conv.type === 'group') return conv.name || 'Bureau Group';
    const otherId = conv.members?.find(m => m !== user?.uid);
    if (!otherId) return 'Private Notes';
    const otherUser = allUsers?.find(u => u.id === otherId);
    return otherUser?.fullName || 'Bureau Official';
  };

  const getOtherUserStatus = (conv: Conversation) => {
    if (conv.type !== 'dm') return null;
    const otherId = conv.members.find(m => m !== user?.uid);
    const otherUser = allUsers?.find(u => u.id === otherId);
    return otherUser?.isDutyActive;
  };

  if (isUserLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-headline uppercase">Coordination Portal</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Secure operational link</p>
        </div>
        <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 md:px-5 font-bold text-[10px] uppercase tracking-widest">
              <Plus className="mr-2 h-3.5 w-3.5" /> Assemble
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-border bg-popover max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-6 border-b bg-muted/30">
              <DialogTitle className="text-lg font-bold text-foreground">Initialize Field Group</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Group Designation</Label>
                <Input placeholder="e.g. Regional Response A" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="h-11 rounded-xl bg-background" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Select Personnel</Label>
                <ScrollArea className="h-[200px] border border-border rounded-xl p-2 bg-muted/20">
                  <div className="space-y-1">
                    {allUsers?.filter(u => u.id !== user?.uid).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-background rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px]">{u.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold text-foreground">{u.fullName}</p>
                            <p className="text-[9px] text-muted-foreground uppercase">{u.role}</p>
                          </div>
                        </div>
                        <Checkbox checked={selectedUserIds.includes(u.id)} onCheckedChange={(c) => setSelectedUserIds(prev => c ? [...prev, u.id] : prev.filter(id => id !== u.id))} />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="p-6 bg-muted/30 border-t">
              <Button onClick={() => setIsCreateGroupOpen(false)} className="w-full sm:w-auto rounded-xl font-bold px-8">Initialize Channel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
        {/* Channel Sidebar */}
        <Card className={cn(
          "w-full lg:w-80 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-2xl transition-all duration-300",
          activeConvId ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filter channels..." 
                className="pl-9 h-10 text-xs bg-muted/30 border-none rounded-xl"
                value={channelSearchTerm}
                onChange={(e) => setChannelSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map(conv => {
                const isActive = getOtherUserStatus(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left mb-1 relative",
                      activeConvId === conv.id ? "bg-muted shadow-inner" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-11 w-11 border-2 border-background">
                        {conv.type === 'group' ? (
                          <div className="bg-primary/10 h-full w-full flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                        ) : (
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(conv)}`} />
                        )}
                        <AvatarFallback>{getConvName(conv).substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {isActive !== null && (
                        <span className={cn(
                          "absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                          isActive ? "bg-green-500" : "bg-muted-foreground/30"
                        )} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{getConvName(conv)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{conv.lastMessage || 'No transmissions'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Message Viewport */}
        <Card className={cn(
          "flex-1 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-2xl transition-all duration-300",
          !activeConvId ? "hidden lg:flex" : "flex"
        )}>
          {activeConvId && activeConv ? (
            <>
              <CardHeader className="py-3 px-4 md:px-6 border-b flex flex-row items-center justify-between bg-card">
                <div className="flex items-center gap-3 md:gap-4">
                  <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 -ml-2" onClick={() => setActiveConvId(null)}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-9 w-9 md:h-10 md:w-10">
                    {activeConv.type === 'group' ? (
                      <div className="bg-primary/10 h-full w-full flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    ) : (
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(activeConv)}`} />
                    )}
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm md:text-base font-black text-foreground leading-none">{getConvName(activeConv)}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        activeConv.type === 'group' || getOtherUserStatus(activeConv) ? "bg-green-500" : "bg-muted-foreground/30"
                      )} />
                      <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {activeConv.type === 'group' ? `${activeConv.members?.length || 0} Personnel` : getOtherUserStatus(activeConv) ? 'Active Duty' : 'Signal Offline'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsMsgSearchActive(!isMsgSearchActive)} className={cn("h-8 w-8 md:h-9 md:w-9 rounded-xl", isMsgSearchActive && "text-primary bg-primary/5")}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {pinnedMessage && (
                <div className="bg-primary/5 border-b border-primary/10 px-4 md:px-6 py-2 flex items-center justify-between group/pinned">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Pinned Intelligence</p>
                      <p className="text-xs text-foreground truncate font-medium">"{pinnedMessage.text}"</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => togglePin(pinnedMessage.id)} className="h-7 w-7 opacity-0 group-hover/pinned:opacity-100 transition-opacity">
                    <PinOff className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-muted/5">
                <ScrollArea ref={scrollRef} className="flex-1 p-4 md:p-6">
                  <div className="space-y-6">
                    {isMessagesLoading ? (
                      <div className="flex justify-center py-20 opacity-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : filteredMessages.map((msg) => {
                      const isMe = msg.senderId === user?.uid;
                      const isPinned = activeConv.pinnedMessageId === msg.id;
                      return (
                        <div key={msg.id} className={cn("flex flex-col max-w-[90%] md:max-w-[80%] group/msg", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                          <div className="flex items-center gap-2 mb-1.5 w-full">
                            <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{msg.senderName}</p>
                          </div>
                          <div className={cn(
                            "px-4 py-3 rounded-[18px] md:rounded-[20px] text-sm shadow-sm transition-all relative",
                            isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground border border-border rounded-tl-none",
                            isPinned && "ring-2 ring-primary/20 ring-offset-2"
                          )}>
                            {isPinned && <Pin className="absolute -top-1 -right-1 h-3 w-3 text-primary bg-background rounded-full p-0.5 border shadow-sm" />}
                            {msg.text}
                          </div>
                          <p className={cn("text-[8px] font-black text-muted-foreground mt-1.5 uppercase", isMe ? "mr-1" : "ml-1")}>
                            {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="p-3 md:p-4 bg-card border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 items-center">
                    <Input 
                      placeholder="Secure message..."
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      className="flex-1 h-11 md:h-12 border-border bg-muted/30 rounded-xl text-xs md:text-sm" 
                    />
                    <Button type="submit" size="icon" disabled={!inputText.trim()} className="h-11 w-11 md:h-12 md:w-12 bg-primary text-primary-foreground rounded-xl shrink-0">
                      <Send className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8 text-center">
              <div className="p-6 bg-muted/50 rounded-full border border-border/40">
                <MessageSquare className="h-10 w-10 md:h-12 md:w-12 opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Ready for Transmission</p>
                <p className="text-[10px] font-medium opacity-60">Select a coordination channel to begin secure team communication.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center font-black uppercase tracking-tight">Purge Transmission?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">Select deletion scope for this record.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 mt-4">
             <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11" onClick={handleDeleteForMe}>Delete for Me</Button>
             <Button variant="destructive" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11" onClick={handleDeleteForEveryone}>Delete for Everyone</Button>
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="w-full rounded-xl font-bold uppercase text-[10px] tracking-widest border-none">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}