
"use client"

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  FileCheck, 
  Database, 
  BarChart3, 
  Bell, 
  Trophy,
  Menu,
  LogOut,
  Users,
  Megaphone,
  CalendarPlus,
  MessageSquare,
  ClipboardEdit,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Search,
  HardDrive,
  Activity,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where } from 'firebase/firestore';
import { UserProfile, Notification, Announcement, Conversation } from '@/lib/types';
import { useMemo, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const OFFICER_NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Full Registry', href: '/full-registration', icon: Activity },
  { name: 'Performance', href: '/performance', icon: TrendingUp },
  { name: 'Status', href: '/status-check', icon: Search },
  { name: 'Comm', href: '/communication', icon: MessageSquare },
  { name: 'Reporting', href: '/daily-registrations', icon: CalendarPlus },
  { name: 'Records', href: '/registrations', icon: FileCheck },
  { name: 'History', href: '/historical', icon: Database },
  { name: 'Analytics', href: '/reports', icon: BarChart3 },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

const ADMIN_NAV_ITEMS = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Full Registry', href: '/full-registration', icon: Activity },
  { name: 'Performance', href: '/performance', icon: TrendingUp },
  { name: 'Status', href: '/status-check', icon: Search },
  { name: 'Comm', href: '/communication', icon: MessageSquare },
  { name: 'Personnel', href: '/admin/officers', icon: Users },
  { name: 'Proxy', href: '/admin/reports-entry', icon: ClipboardEdit },
  { name: 'Broadcasts', href: '/admin/announcements', icon: Megaphone },
];

export function Navbar() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc<UserProfile>(userProfileRef);

  const unreadNotificationsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'users', user.uid, 'notifications'), 
      where('isRead', '==', false)
    );
  }, [db, user?.uid]);

  const announcementsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'announcements'));
  }, [db, user]);

  const convsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'conversations'),
      where('members', 'array-contains', user.uid)
    );
  }, [db, user]);

  const { data: unreadNotifications } = useCollection<Notification>(unreadNotificationsQuery);
  const { data: announcements } = useCollection<Announcement>(announcementsQuery);
  const { data: conversations } = useCollection<Conversation>(convsQuery);

  const unreadCount = useMemo(() => {
    if (!profile) return unreadNotifications?.length || 0;

    let count = unreadNotifications?.length || 0;
    
    const getTs = (d: any) => {
      if (!d) return 0;
      if (typeof d === 'string') return new Date(d).getTime();
      if (d.toDate) return d.toDate().getTime();
      return new Date(d).getTime();
    };

    const lastReadAnnTime = profile.lastAnnouncementReadAt ? getTs(profile.lastAnnouncementReadAt) : 0;
    const lastReadMsgTime = profile.lastMessageReadAt ? getTs(profile.lastMessageReadAt) : 0;

    if (announcements) {
      const newAnnCount = announcements.filter(ann => {
        const annTs = ann.timestamp ? getTs(ann.timestamp) : getTs(ann.date);
        return annTs > lastReadAnnTime;
      }).length;
      count += newAnnCount;
    }

    if (conversations) {
      const newMsgCount = conversations.filter(conv => {
        const convTs = getTs(conv.lastTimestamp);
        return convTs > lastReadMsgTime;
      }).length;
      count += newMsgCount;
    }

    return count;
  }, [unreadNotifications, announcements, conversations, profile]);

  if (pathname === '/login') return null;

  const isAdminSection = pathname.startsWith('/admin') && !pathname.includes('full-registration') && !pathname.includes('performance') && !pathname.includes('status-check') && !pathname.includes('communication');
  
  // Refine logic to determine which nav set to use
  const navItems = profile?.role === 'admin' ? ADMIN_NAV_ITEMS : OFFICER_NAV_ITEMS;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleSwitchView = () => {
    router.push(isAdminSection ? '/dashboard' : '/admin');
  };

  const photoUrl = profile?.profilePhoto || user?.photoURL || undefined;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl transition-all duration-300">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative h-8 w-8 overflow-hidden rounded-md transition-all group-hover:scale-105">
              <Image 
                src="https://imgs.search.brave.com/hbAJSw_uYBZxF3ww4Xys7njKWsrlOTeqfxCjk7DHf0A/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9wbGF5/LWxoLmdvb2dsZXVz/ZXJjb250ZW50LmNv/bS90eDFxcnBHZTBi/NnVCVGFkSnFMcUY2/NF9IVy1laHFuSF8w/MEo1TDVDeGp0RFB1/ODRlRGduRHZTRDVk/OU9USGUzU3V3PXcy/NDAtaDQ4MC1ydw"
                alt="FaydaTrack Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xs font-black tracking-widest text-foreground uppercase">Fayda<span className="text-primary italic">Track</span></span>
          </Link>

          <nav className="hidden xl:flex items-center space-x-1">
            {user && navItems.map((item: any) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all relative",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {user && (
            <Link href="/notifications" className="relative p-2 rounded-md hover:bg-muted transition-colors group">
              <Bell className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-black rounded-full ring-2 ring-background animate-in zoom-in duration-300">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 w-9 p-0 rounded-full border border-border/50 ring-offset-background hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={photoUrl || undefined} alt={profile?.fullName || "Official"} />
                    <AvatarFallback className="text-[10px] font-black bg-muted/30 uppercase">
                      {profile?.fullName?.substring(0, 2) || user.email?.substring(0, 2) || "OFF"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1 rounded-xl shadow-2xl border-border bg-popover">
                <DropdownMenuLabel className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={photoUrl || undefined} />
                    <AvatarFallback className="text-xs font-black bg-muted">
                      {profile?.fullName?.substring(0, 2) || "OFF"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">{profile?.fullName || 'Official'}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate">{profile?.role || 'Authorized Personnel'}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profile?.role === 'admin' && (
                  <DropdownMenuItem onClick={handleSwitchView} className="rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                    Switch to {isAdminSection ? 'Officer' : 'Admin'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/profile')} className="rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                  <Settings className="mr-2 h-3 w-3" /> Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')} className="rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">
                  Bureau Hub
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer" onClick={handleLogout}>
                  <LogOut className="mr-2 h-3 w-3" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" asChild className="rounded-md h-8 text-[10px] font-black uppercase tracking-widest px-4">
              <Link href="/login">Sign In</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 border-none bg-background shadow-2xl">
              <SheetHeader className="p-6 border-b text-left bg-muted/20">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={photoUrl || undefined} />
                    <AvatarFallback className="text-xs font-black">
                       {profile?.fullName?.substring(0, 2) || "OFF"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-sm font-black uppercase tracking-tight">{profile?.fullName || 'Official'}</SheetTitle>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{profile?.role}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="p-2 space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase px-4 py-3 tracking-widest">Navigation</p>
                {user && navItems.map((item: any) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </div>
                    <ChevronRight className="h-3 w-3 opacity-30" />
                  </Link>
                ))}
                <div className="my-2 border-t border-border/50" />
                <Link
                  href="/profile"
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                    pathname === '/profile'
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    Identity Settings
                  </div>
                  <ChevronRight className="h-3 w-3 opacity-30" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/5 rounded-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    Terminate Session
                  </div>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
