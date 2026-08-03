
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
  ArrowRight
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
  const [editGroupName, setNewEditGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Deletion state
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

  const { data: rawConversations, isLoading: isConvsLoading } = useCollection<Conversation>(convsQuery);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          performSendMessage(undefined, base64Audio);
          toast({ title: "Voice Transmission Sent", description: "Audio log added to record." });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({
        variant: "destructive",
        title: "Mic Access Denied",
        description: "Please allow microphone access to record voice messages."
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEditClick = (msg: Message) => {
    if (msg.audioUrl) return;
    setEditingMsg(msg);
    setInputText(msg.text || '');
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
      const remaining = messages.filter(m => m.id !== targetId);
      const newLatest = remaining.length > 0 ? remaining[remaining.length - 1] : null;

      await deleteDocumentNonBlocking(doc(db, 'messages', targetId));
      
      if (newLatest) {
        await updateDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
          lastMessage: newLatest.audioUrl ? 'Voice Message' : (newLatest.text || 'Message sent'),
          lastTimestamp: newLatest.timestamp,
        });
      }
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

  const startPrivateChat = (otherUser: UserProfile) => {
    if (!user || !db) return;
    const dmId = [user.uid, otherUser.id].sort().join('_');
    
    const existing = conversations.find(c => c.id === dmId);
    if (existing) {
      setActiveConvId(existing.id);
      return;
    }

    const dmData: Conversation = {
      id: dmId,
      type: 'dm',
      members: [user.uid, otherUser.id],
      lastTimestamp: serverTimestamp(),
      lastMessage: 'Channel initialized',
    };

    setDocumentNonBlocking(doc(db, 'conversations', dmId), dmData, { merge: true });
    setActiveConvId(dmId);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !user || !db) return;
    const groupId = Math.random().toString(36).substr(2, 9);
    
    const groupData: Conversation = {
      id: groupId,
      type: 'group',
      name: newGroupName.trim(),
      members: [user.uid, ...selectedUserIds],
      createdBy: user.uid,
      lastTimestamp: serverTimestamp(),
      lastMessage: 'Group established',
    };

    setDocumentNonBlocking(doc(db, 'conversations', groupId), groupData, { merge: true });
    setActiveConvId(groupId);
    setNewGroupName('');
    setSelectedUserIds([]);
    setIsCreateGroupOpen(false);
  };

  const handleUpdateGroupName = () => {
    if (!editGroupName.trim() || !db || !activeConvId) return;
    updateDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
      name: editGroupName.trim()
    });
    setIsSettingsOpen(false);
    toast({ title: "Designation Updated", description: "Channel name successfully changed." });
  };

  const handleRemoveMember = (targetUserId: string) => {
    if (!db || !activeConvId) return;
    updateDocumentNonBlocking(doc(db, 'conversations', activeConvId), {
      members: arrayRemove(targetUserId)
    });
    toast({ title: "Personnel Revoked", description: "Official removed from coordination line." });
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
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Authenticating Terminal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">Bureau Communications</h1>
          <p className="text-xs text-muted-foreground">Secure operational coordination portal.</p>
        </div>
        <Dialog open={isCreateGroupOpen} onOpenChange={(open) => {
          setIsCreateGroupOpen(open);
          if (!open) setSelectedUserIds([]);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 font-bold text-[10px] uppercase tracking-widest">
              <Plus className="mr-2 h-3.5 w-3.5" /> Assemble Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-2xl border-border bg-popover">
            <DialogHeader className="p-6 border-b bg-muted/30">
              <DialogTitle className="text-lg font-bold text-foreground">Initialize Field Group</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Group Designation</Label>
                <Input placeholder="e.g. Regional Response A" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="h-11 rounded-xl bg-background text-foreground border-border" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Select Personnel ({selectedUserIds.length})</Label>
                <ScrollArea className="h-[200px] border border-border rounded-xl p-2 bg-muted/20">
                  <div className="space-y-1">
                    {allUsers?.filter(u => u.id !== user?.uid).map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 hover:bg-background rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarFallback className="text-[10px]">{u.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {u.isDutyActive && <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />}
                          </div>
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
              <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="rounded-xl font-bold px-8">Initialize Channel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <Card className="w-80 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-2xl">
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
              <p className="text-[10px] font-black text-muted-foreground uppercase px-3 py-3 tracking-widest">Active Channels</p>
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
                        {conv.lastTimestamp && (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase">
                            {format(conv.lastTimestamp.toDate ? conv.lastTimestamp.toDate() : new Date(), 'HH:mm')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{conv.lastMessage}</p>
                    </div>
                  </button>
                );
              })}

              <p className="text-[10px] font-black text-muted-foreground uppercase px-3 py-4 tracking-widest">Bureau Officials</p>
              {allUsers?.filter(u => u.id !== user?.uid).map(uProfile => (
                <button
                  key={uProfile.id}
                  onClick={() => startPrivateChat(uProfile)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all text-left"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={uProfile.profilePhoto} />
                      <AvatarFallback>{uProfile.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {uProfile.isDutyActive && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{uProfile.fullName}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{uProfile.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex-1 flex flex-col border-border shadow-sm bg-card overflow-hidden rounded-2xl">
          {activeConvId && activeConv ? (
            <>
              <CardHeader className="py-3 px-6 border-b flex flex-row items-center justify-between bg-card">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    {activeConv.type === 'group' ? (
                      <div className="bg-primary/10 h-full w-full flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    ) : (
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${getConvName(activeConv)}`} />
                    )}
                    <AvatarFallback>{getConvName(activeConv).substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-black text-foreground leading-none">{getConvName(activeConv)}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full animate-pulse",
                        activeConv.type === 'group' || getOtherUserStatus(activeConv) ? "bg-green-500" : "bg-muted-foreground/30"
                      )} />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {activeConv.type === 'group' ? `${activeConv.members?.length || 0} Members Active` : getOtherUserStatus(activeConv) ? 'Active Duty' : 'Signal Offline'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setIsMsgSearchActive(!isMsgSearchActive)} className={cn("h-9 w-9 rounded-xl", isMsgSearchActive && "text-primary bg-primary/5")}>
                    <Search className="h-4 w-4" />
                  </Button>
                  {activeConv.type === 'group' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl"><Settings2 className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl">
                        <DropdownMenuItem onClick={() => { setNewEditGroupName(activeConv.name || ''); setIsSettingsOpen(true); }} className="gap-2 font-bold text-xs">
                          <Pencil className="h-3.5 w-3.5" /> Channel Designation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsAddMemberOpen(true)} className="gap-2 font-bold text-xs">
                          <UserPlus className="h-3.5 w-3.5" /> Assign Personnel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              {isMsgSearchActive && (
                <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2 animate-in slide-in-from-top duration-300">
                  <Search className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                  <Input 
                    placeholder="Search transmissions..." 
                    className="h-9 text-xs border-none bg-transparent focus-visible:ring-0" 
                    value={messageSearchTerm}
                    onChange={(e) => setMessageSearchTerm(e.target.value)}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMessageSearchTerm(''); setIsMsgSearchActive(false); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {pinnedMessage && (
                <div className="bg-primary/5 border-b border-primary/10 px-6 py-2 flex items-center justify-between group/pinned">
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

              <CardContent className="flex-1 p-0 flex flex-col min-h-0 bg-muted/5 relative">
                <ScrollArea ref={scrollRef} className="flex-1 p-6">
                  <div className="space-y-6">
                    {isMessagesLoading ? (
                      <div className="flex justify-center py-20 opacity-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : filteredMessages.length > 0 ? filteredMessages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.uid;
                      const isAdmin = currentUserProfile?.role === 'admin';
                      const isPinned = activeConv.pinnedMessageId === msg.id;
                      const showSender = !isMe && (idx === 0 || filteredMessages[idx-1].senderId !== msg.senderId);
                      return (
                        <div key={msg.id} className={cn("flex flex-col max-w-[80%] group/msg", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                          <div className="flex items-center gap-2 mb-1.5 w-full">
                            {showSender && <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{msg.senderName}</p>}
                            <div className={cn("flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity", isMe ? "ml-auto" : "mr-auto order-last")}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full"><MoreHorizontal className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isMe ? "end" : "start"} className="w-32 p-1 rounded-xl">
                                  <DropdownMenuItem onClick={() => togglePin(msg.id)} className="gap-2 text-xs font-bold">
                                    {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />} {isPinned ? 'Unpin' : 'Pin Protocol'}
                                  </DropdownMenuItem>
                                  {isMe && !msg.audioUrl && (
                                    <DropdownMenuItem onClick={() => handleEditClick(msg)} className="gap-2 text-xs font-bold"><Pencil className="h-3 w-3" /> Edit</DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => { setMsgToDelete(msg); setIsDeleteDialogOpen(true); }} className="gap-2 text-xs font-bold text-destructive">
                                    <Trash2 className="h-3 w-3" /> Purge
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className={cn(
                            "px-4 py-3 rounded-[20px] text-sm shadow-sm transition-all relative",
                            isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground border border-border rounded-tl-none",
                            isPinned && "ring-2 ring-primary/20 ring-offset-2"
                          )}>
                            {isPinned && <Pin className="absolute -top-1 -right-1 h-3 w-3 text-primary bg-background rounded-full p-0.5 border shadow-sm" />}
                            {msg.audioUrl ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-1">
                                  <Volume2 className={cn("h-4 w-4", isMe ? "text-primary-foreground/60" : "text-muted-foreground")} />
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>Bureau Audio Log</span>
                                </div>
                                <audio controls className="h-8 w-full max-w-[240px] [&::-webkit-media-controls-panel]:bg-muted/20">
                                  <source src={msg.audioUrl} type="audio/webm" />
                                </audio>
                              </div>
                            ) : (
                              msg.text
                            )}
                            {msg.isEdited && <span className="block text-[8px] opacity-40 mt-1 italic">(Edited)</span>}
                          </div>
                          <p className={cn("text-[8px] font-black text-muted-foreground mt-1.5 uppercase", isMe ? "mr-1" : "ml-1")}>
                            {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm • MMM dd') : 'Transmitting...'}
                          </p>
                        </div>
                      );
                    }) : (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                        <MessageSquare className="h-12 w-12 mb-3" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching transmissions</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 bg-card border-t">
                  {editingMsg && (
                    <div className="flex items-center justify-between mb-2 px-3 py-1.5 bg-muted rounded-lg border">
                      <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5"><Pencil className="h-3 w-3" /> Modifying record...</p>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingMsg(null); setInputText(''); }} className="h-5 w-5"><X className="h-3 w-3" /></Button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                    <Input 
                      placeholder={editingMsg ? "Update secure text..." : isRecording ? "Recording operational log..." : "Secure message for team..."}
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      disabled={isRecording}
                      className="flex-1 h-12 border-border bg-muted/30 shadow-inner rounded-xl" 
                    />
                    {!editingMsg && (
                      <Button type="button" size="icon" onClick={isRecording ? stopRecording : startRecording} className={cn("h-12 w-12 rounded-xl transition-all shadow-lg", isRecording ? "bg-destructive text-white animate-pulse" : "bg-muted text-muted-foreground")}>
                        {isRecording ? <Square className="h-5 w-5 fill-white" /> : <Mic className="h-5 w-5" />}
                      </Button>
                    )}
                    <Button type="submit" size="icon" disabled={!inputText.trim() || isRecording} className="h-12 w-12 bg-primary text-primary-foreground shadow-xl rounded-xl">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-6">
              <div className="p-8 bg-muted rounded-[40px] shadow-inner relative">
                <div className="absolute inset-0 bg-primary/5 rounded-[40px] animate-pulse" />
                <MessageSquare className="h-16 w-16 text-muted-foreground/30 relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-black text-muted-foreground uppercase tracking-[0.2em]">Establish Comms</p>
                <p className="text-xs text-muted-foreground font-medium italic">Select a team channel or department to begin secure handover.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="rounded-2xl border-none p-0 overflow-hidden sm:max-w-[400px]">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Channel Protocols</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Designation</Label>
              <div className="flex gap-2">
                <Input value={editGroupName} onChange={(e) => setNewEditGroupName(e.target.value)} className="h-11 rounded-xl" />
                <Button onClick={handleUpdateGroupName} className="rounded-xl h-11 px-6">Save</Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assigned Personnel</Label>
              <ScrollArea className="h-[200px] rounded-xl border p-2">
                <div className="space-y-1">
                  {activeConv?.members.map(mId => {
                    const u = allUsers?.find(u => u.id === mId);
                    return (
                      <div key={mId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback>{u?.fullName.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-xs font-bold">{u?.fullName}</p>
                            <p className="text-[9px] uppercase font-medium text-muted-foreground">{u?.role}</p>
                          </div>
                        </div>
                        {u?.id !== user?.uid && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(u!.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><UserMinus className="h-4 w-4" /></Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Personnel Add Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="rounded-2xl p-0 overflow-hidden sm:max-w-[400px]">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Deploy Personnel</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] p-2">
            <div className="space-y-1">
              {allUsers?.filter(u => !activeConv?.members.includes(u.id)).map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    updateDocumentNonBlocking(doc(db!, 'conversations', activeConvId!), { members: arrayUnion(u.id) });
                    setIsAddMemberOpen(false);
                    toast({ title: "Personnel Deployed", description: `${u.fullName} added to channel.` });
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8"><AvatarFallback>{u.fullName.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      {u.isDutyActive && <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{u.fullName}</p>
                      <p className="text-[9px] uppercase font-medium text-muted-foreground">{u.role}</p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl bg-popover overflow-hidden p-0">
          <div className="p-8 text-center space-y-4">
             <div className="mx-auto bg-destructive/10 p-4 rounded-2xl w-fit">
              {isDeleting ? <Loader2 className="h-8 w-8 text-destructive animate-spin" /> : <ShieldAlert className="h-8 w-8 text-destructive" />}
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-center text-foreground uppercase tracking-tight">
                {isDeleting ? "PURGING TRANSMISSION..." : "MESSAGE DELETION"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                {isDeleting ? "Removing record from coordination log. Please stand by..." : "Select the scope of deletion for this transmission."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          {!isDeleting && (
            <div className="grid grid-cols-1 gap-3 px-8 pb-4">
              <Button variant="outline" className="h-12 justify-start px-6 rounded-xl border-border font-bold" onClick={handleDeleteForMe}><User className="mr-3 h-4 w-4 text-muted-foreground" /> Delete for Me</Button>
              {(msgToDelete?.senderId === user?.uid || currentUserProfile?.role === 'admin') && (
                <Button variant="outline" className="h-12 justify-start px-6 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 font-bold" onClick={handleDeleteForEveryone}><Trash2 className="mr-3 h-4 w-4" /> Delete for Everyone</Button>
              )}
            </div>
          )}
          <AlertDialogFooter className="bg-muted/30 p-6">
            <AlertDialogCancel disabled={isDeleting} className="w-full h-11 rounded-xl font-bold">Cancel Operation</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
