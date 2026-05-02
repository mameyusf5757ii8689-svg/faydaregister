"use client"

import { useState } from 'react';
import { Registration } from '@/lib/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Info, Check } from 'lucide-react';
import { getStatusSuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './status-badge';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AiSuggestionModalProps {
  registration: Registration;
}

export function AiSuggestionModal({ registration }: AiSuggestionModalProps) {
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<{ status: string; reason: string } | null>(null);
  const { toast } = useToast();
  const db = useFirestore();

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const result = await getStatusSuggestion({
        submissionContent: registration.content,
        requiredFieldsFilled: registration.requiredFieldsFilled,
        applicantName: registration.applicantName,
        attachmentsIncluded: registration.attachmentsIncluded,
        submissionDate: registration.submissionDate,
      });
      setSuggestion({
        status: result.suggestedStatus,
        reason: result.reason,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "The AI assistant could not analyze this submission at this time.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!db || !suggestion) return;
    setIsApplying(true);

    const statusMap: Record<string, any> = {
      'pending review': 'Pending Review',
      'processing': 'Processing',
      'rejected': 'Rejected'
    };

    const newStatus = statusMap[suggestion.status] || suggestion.status;

    updateDocumentNonBlocking(doc(db, 'registrations', registration.id), {
      status: newStatus,
      remarks: `AI RECOMMENDED: ${suggestion.reason}`,
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: "Recommendation Applied",
      description: `Status updated to ${newStatus} based on AI analysis.`,
    });

    // Close modal implicitly via parent state if needed, or just let user see success
    setTimeout(() => {
      setIsApplying(false);
      setSuggestion(null);
    }, 500);
  };

  return (
    <Dialog onOpenChange={(open) => !open && setSuggestion(null)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/5">
          <Sparkles className="h-3 w-3" />
          AI Suggest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Status Recommendation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            RegistraTrack AI analyzes the submission content and metadata to recommend an initial status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm border border-border">
            <h4 className="font-bold mb-1 flex items-center gap-2 text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" /> 
              Submission Context
            </h4>
            <p className="text-muted-foreground line-clamp-3 italic font-medium">
              "{registration.content}"
            </p>
          </div>

          {!suggestion && !loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground max-w-[240px]">
                Ready to analyze registration details for {registration.applicantName}.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Analyzing content patterns...</p>
            </div>
          )}

          {suggestion && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recommended Status</span>
                <StatusBadge status={suggestion.status as any} />
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reasoning</h4>
                <p className="text-sm text-foreground p-4 bg-muted/30 rounded-xl border border-border leading-relaxed">
                  {suggestion.reason}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-3">
          {!suggestion ? (
            <Button 
              onClick={handleSuggest} 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 font-bold"
            >
              {loading ? "Analyzing..." : "Analyze Submission"}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" onClick={() => setSuggestion(null)} className="font-bold border-border">
                Recalculate
              </Button>
              <Button 
                onClick={handleApplySuggestion} 
                disabled={isApplying}
                className="bg-primary hover:bg-primary/90 font-bold"
              >
                {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> Apply</>}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
