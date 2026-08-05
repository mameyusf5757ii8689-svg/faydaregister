'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, limit, serverTimestamp, where, doc, arrayUnion } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  ShieldCheck, 
  Check, 
  MoreHorizontal, 
  Trash2,
  X,
  Pin,
  PinOff,
  ChevronLeft,
  User,
  Activity
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
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
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'channels' | 'directory'>('channels');
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);

  // Sync "Read" status on mount or active channel change
  useEffect(() => {
    if (db && user?.uid) {
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        lastMessageReadAt: new Date().toISOString()
      });
    }
  }, [db, user?.uid, activeConvId]);

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
        const name = c.type === 'group' ? (c.name || '') : getConvName(c);
        return name.toLowerCase().includes(channelSearchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const timeA = a.lastTimestamp?.toDate ? a.lastTimestamp.toDate().getTime() : 0;
        const timeB = b.lastTimestamp?.toDate ? b.lastTimestamp.toDate().getTime() : 0;
        return timeB - timeA;
      });
  }, [rawConversations, channelSearchTerm]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user]);

  const { data: allUsers } = useCollection<UserProfile>(usersQuery);

  const filteredPersonnel = useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers.filter(u => 
      u.id !== user.uid && 
      (u.fullName.toLowerCase().includes(personnelSearchTerm.toLowerCase()) || 
       u.email.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
       u.region?.toLowerCase().includes(personnelSearchTerm.toLowerCase()))
    );
  }, [allUsers, personnelSearchTerm, user]);

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
    return messages.filter(m => !m.deletedFor?.includes(user.uid));
  }, [messages, user]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    }
  }, [filteredMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !db || !activeConvId) return;

    const messageData = {
      conversationId: activeConvId,
      text: inputText.trim(),
      senderId: user.uid,
      senderName: currentUserProfile?.fullName || user.email?.split('@')[0] || 'Official',
      senderEmail: user.email || '',
      timestamp: serverTimestamp(),
      deletedFor: []
    };

    const msgRef = doc(collection(db, 'messages'));
    setDocumentNonBlocking(msgRef, messageData, { merge: true });

    updateDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
      lastMessage: inputText.trim(),
      lastTimestamp: serverTimestamp(),
    });
    
    setInputText('');
  };

  const handleOpenDirectMessage = async (otherId: string) => {
    if (!db || !user) return;
    
    const existingDm = rawConversations?.find(c => 
      c.type === 'dm' && 
      c.members.includes(user.uid) && 
      c.members.includes(otherId)
    );

    if (existingDm) {
      setActiveConvId(existingDm.id);
      setSidebarTab('channels');
      return;
    }

    setIsCreating(true);
    try {
      const newDmRef = doc(collection(db, 'conversations'));
      const dmData = {
        type: 'dm',
        members: [user.uid, otherId],
        lastMessage: 'Secure link established.',
        lastTimestamp: serverTimestamp(),
        createdBy: user.uid
      };
      await setDocumentNonBlocking(newDmRef, dmData, { merge: true });
      setActiveConvId(newDmRef.id);
      setSidebarTab('channels');
      toast({ title: "Secure Link Established", description: "Direct communication path initialized." });
    } catch (err) {
      toast({ title: "Handshake Failed", description: "Could not initialize channel.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!db || !user || selectedUserIds.length === 0) return;

    setIsCreating(true);
    try {
      if (selectedUserIds.length === 1) {
        await handleOpenDirectMessage(selectedUserIds[0]);
      } else {
        const newGroupRef = doc(collection(db, 'conversations'));
        const groupData = {
          type: 'group',
          name: newGroupName || 'Tactical Coordination Group',
          members: [user.uid, ...selectedUserIds],
          lastMessage: 'Tactical group initialized.',
          lastTimestamp: serverTimestamp(),
          createdBy: user.uid
        };
        await setDocumentNonBlocking(newGroupRef, groupData, { merge: true });
        setActiveConvId(newGroupRef.id);
        toast({ title: "Group Assembled", description: `"${groupData.name}" is now online.` });
      }

      setIsCreateGroupOpen(false);
      setSelectedUserIds([]);
      setNewGroupName('');
      setPersonnelSearchTerm('');
    } catch (err) {
      toast({ title: "Handshake Failed", description: "Could not initialize channel.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const pinnedMessage = messages.find(m => m.id === activeConv?.pinnedMessageId);

  const getConvName = (conv: Conversation | undefined | null) => {
    if (!conv) return '...';
    if (conv.type === 'group') return conv.name || 'Bureau Group';
    const otherId = conv.members?.find(m => m !== user?.uid);
    if (!otherId) return 'Private Vault';
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-headline uppercase leading-none">Coordination Portal</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">Authorized Tactical Link</p>
        </div>
        <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 md:px-6 h-9 md:h-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10">
              <Plus className="mr-2 h-4 w-4" /> Assemble Group
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[450px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-popover max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 border-b bg-muted/30">
              <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight">Initialize Tactical Link</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
              {selectedUserIds.length > 1 && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Group Designation</Label>
                  <Input placeholder="e.g. Sector A Response" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="h-11 rounded-xl bg-background border-border font-bold" />
                </div>
              )}
              
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Select Personnel</Label>
                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selectedUserIds.length} Selected</span>
                </div>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                  <Input 
                    placeholder="Search name or terminal address..." 
                    className="pl-9 h-10 text-xs bg-muted/20 border-border rounded-xl font-medium"
                    value={personnelSearchTerm}
                    onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                  />
                </div>

                <ScrollArea className="flex-1 border border-border rounded-2xl bg-muted/10 p-2">
                  <div className="space-y-1">
                    {filteredPersonnel.length > 0 ? filteredPersonnel.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 hover:bg-background rounded-xl transition-all group">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                            <AvatarImage src={u.profilePhoto} />
                            <AvatarFallback className="text-[10px] font-black bg-muted">{u.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground uppercase tracking-tight">{u.fullName}</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase truncate max-w-[180px]">{u.role} • {u.region || 'HQ'}</p>
                          </div>
                        </div>
                        <Checkbox 
                          checked={selectedUserIds.includes(u.id)} 
                          onCheckedChange={(c) => setSelectedUserIds(prev => c ? [...prev, u.id] : prev.filter(id => id !== u.id))} 
                          className="rounded-full h-5 w-5"
                        />
                      </div>
                    )) : (
                      <div className="py-20 text-center opacity-30">
                        <Search className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No matching personnel</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="p-6 bg-muted/30 border-t">
              <Button 
                onClick={handleCreateConversation} 
                disabled={selectedUserIds.length === 0 || isCreating}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/10 transition-all active:scale-[0.98]"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Initialize Transmission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
        {/* Unified Coordination Sidebar */}
        <Card className={cn(
          "w-full lg:w-80 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-3xl transition-all duration-300",
          activeConvId ? "hidden lg:flex" : "flex"
        )}>
          <div className="p-4 border-b border-border bg-muted/10">
            <Tabs value={sidebarTab} onValueChange={(v: any) => setSidebarTab(v)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-10 bg-background border border-border p-1 rounded-xl">
                <TabsTrigger value="channels" className="text-[10px] font-black uppercase tracking-tighter rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Transmissions</TabsTrigger>
                <TabsTrigger value="directory" className="text-[10px] font-black uppercase tracking-tighter rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Directory</TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder={sidebarTab === 'channels' ? "Filter channels..." : "Search personnel..."}
                    className="pl-9 h-11 text-xs bg-background border-border rounded-xl font-bold"
                    value={sidebarTab === 'channels' ? channelSearchTerm : personnelSearchTerm}
                    onChange={(e) => sidebarTab === 'channels' ? setChannelSearchTerm(e.target.value) : setPersonnelSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {sidebarTab === 'channels' ? (
                <div className="space-y-1">
                  {conversations.length > 0 ? conversations.map(conv => {
                    const isActive = getOtherUserStatus(conv);
                    const isSelected = activeConvId === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConvId(conv.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left mb-1 relative border border-transparent",
                          isSelected ? "bg-primary/5 border-primary/10 shadow-sm" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                            {conv.type === 'group' ? (
                              <div className="bg-primary/10 h-full w-full flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                            ) : (
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(conv)}`} />
                            )}
                            <AvatarFallback className="font-black text-[10px]">{getConvName(conv).substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {isActive !== null && (
                            <span className={cn(
                              "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background",
                              isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-black uppercase tracking-tight truncate", isSelected ? "text-primary" : "text-foreground")}>{getConvName(conv)}</p>
                          <p className="text-[11px] text-muted-foreground truncate font-medium mt-0.5">{conv.lastMessage || 'Link active'}</p>
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="py-20 text-center px-6 opacity-20">
                       <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No active links</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPersonnel.length > 0 ? filteredPersonnel.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleOpenDirectMessage(u.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-all text-left group"
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                          <AvatarImage src={u.profilePhoto} />
                          <AvatarFallback className="font-black text-[10px] bg-muted">{u.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background",
                          u.isDutyActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{u.fullName}</p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase truncate">{u.role} • {u.region || 'HQ'}</p>
                      </div>
                    </button>
                  )) : (
                    <div className="py-20 text-center px-6 opacity-20">
                       <User className="h-10 w-10 mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No personnel found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Message Viewport */}
        <Card className={cn(
          "flex-1 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-3xl transition-all duration-300",
          !activeConvId ? "hidden lg:flex" : "flex"
        )}>
          {activeConvId && activeConv ? (
            <>
              <CardHeader className="py-4 px-6 border-b flex flex-row items-center justify-between bg-card">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 -ml-2 rounded-xl" onClick={() => setActiveConvId(null)}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10 border border-border shadow-sm">
                    {activeConv.type === 'group' ? (
                      <div className="bg-primary/10 h-full w-full flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    ) : (
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(activeConv)}`} />
                    )}
                    <AvatarFallback className="font-black text-[10px]">{getConvName(activeConv).substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-black text-foreground leading-none uppercase tracking-tight">{getConvName(activeConv)}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        activeConv.type === 'group' || getOtherUserStatus(activeConv) ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                      )} />
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">
                        {activeConv.type === 'group' ? `${activeConv.members?.length || 0} Personnel Online` : getOtherUserStatus(activeConv) ? 'Active Duty' : 'Terminal Offline'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {activeConv.pinnedMessageId && pinnedMessage && (
                <div className="bg-primary/[0.03] border-b border-primary/10 px-6 py-3 flex items-center justify-between group/pinned animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-2 bg-primary/10 rounded-lg"><Pin className="h-3.5 w-3.5 text-primary shrink-0" /></div>
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Pinned Intelligence</p>
                      <p className="text-xs text-foreground truncate font-bold">"{pinnedMessage.text}"</p>
                    </div>
                  </div>
                </div>
              )}

              <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-muted/5">
                <ScrollArea ref={scrollRef} className="flex-1 p-6">
                  <div className="space-y-8">
                    {isMessagesLoading ? (
                      <div className="flex justify-center py-20 opacity-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : filteredMessages.map((msg) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <div key={msg.id} className={cn("flex flex-col max-w-[85%] group/msg", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{msg.senderName}</p>
                            <span className="text-[8px] font-mono text-muted-foreground/30">
                              {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                            </span>
                          </div>
                          <div className={cn(
                            "px-5 py-3.5 rounded-[22px] text-sm shadow-sm transition-all border",
                            isMe 
                              ? "bg-primary text-primary-foreground border-primary/10 rounded-tr-none" 
                              : "bg-card text-foreground border-border rounded-tl-none"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="p-4 bg-card border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                    <Input 
                      placeholder="Secure transmission payload..."
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      className="flex-1 h-12 border-border bg-muted/30 rounded-2xl text-sm font-medium" 
                    />
                    <Button type="submit" size="icon" disabled={!inputText.trim()} className="h-12 w-12 bg-primary text-white rounded-2xl shrink-0 shadow-xl shadow-primary/20 transition-transform active:scale-95">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-6 p-12 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl opacity-50" />
                <div className="p-10 bg-muted/50 rounded-full border-2 border-dashed border-border/40 relative z-10">
                  <MessageSquare className="h-16 w-16 opacity-10" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-foreground">Ready for Transmission</p>
                <p className="text-xs font-medium opacity-60 max-w-xs mx-auto leading-relaxed">Select a coordination channel or browse the bureau directory to initialize a new secure transmission link.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl bg-popover max-w-sm mx-4">
          <AlertDialogHeader className="p-6 text-center">
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Purge Transmission?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-muted-foreground mt-2">Permanently remove this record from your local terminal viewport.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-6 pt-0 bg-muted/30 flex flex-col gap-3">
             <Button variant="destructive" className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-destructive/10" onClick={() => setIsDeleteDialogOpen(false)}>Purge Record</Button>
             <AlertDialogCancel className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-none bg-transparent">Abort</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}