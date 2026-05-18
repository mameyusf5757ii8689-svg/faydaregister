"use client"

import { useState } from 'react';
import { Registration } from '@/lib/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { AiSuggestionModal } from './ai-suggestion-modal';
import { format } from 'date-fns';

interface RegistrationTableProps {
  registrations: Registration[];
  isDashboardView?: boolean;
}

export function RegistrationTable({ registrations, isDashboardView = false }: RegistrationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(registrations.length / itemsPerPage);
  const currentItems = registrations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={isDashboardView ? "" : "rounded-xl border border-border bg-card shadow-sm overflow-hidden"}>
      <Table>
        <TableHeader className={isDashboardView ? "bg-muted/30" : "bg-muted/50"}>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Name</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Date</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Status</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Location</TableHead>
            {!isDashboardView && <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider h-10 text-muted-foreground">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((reg) => (
            <TableRow key={reg.id} className="hover:bg-muted/30 transition-colors border-border">
              <TableCell className="py-4 font-medium text-foreground text-sm">
                {reg.applicantName}
              </TableCell>
              <TableCell className="py-4 text-muted-foreground text-sm">
                {format(new Date(reg.submissionDate), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell className="py-4">
                <StatusBadge status={reg.status} className="scale-90 origin-left" />
              </TableCell>
              <TableCell className="py-4 text-muted-foreground text-sm">
                {reg.location}
              </TableCell>
              {!isDashboardView && (
                <TableCell className="text-right py-4">
                  <div className="flex items-center justify-end gap-2">
                    <AiSuggestionModal registration={reg} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                        <DropdownMenuLabel className="text-foreground">Registration Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem className="flex items-center text-foreground hover:bg-muted cursor-pointer">
                          <ExternalLink className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-foreground hover:bg-muted cursor-pointer">Update Status</DropdownMenuItem>
                        <DropdownMenuItem className="text-foreground hover:bg-muted cursor-pointer">Email Applicant</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem className="text-destructive hover:bg-destructive/5 cursor-pointer">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Showing {currentItems.length} of {registrations.length} records • Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}