
"use client"

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Registration, UserProfile } from '@/lib/types';
import { Edit2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  applicantName: z.string().min(2, "Name must be at least 2 characters"),
  id: z.string().regex(/^\d{29}$/, "Registration ID must be exactly 29 digits"),
  submissionDate: z.string().min(1, "Date is required"),
  phone: z.string().regex(/^\d+$/, "Phone must contain only numeric digits"),
  status: z.enum(['Processed', 'Pending Review', 'Rejected', 'Processing', 'Failed']),
  rejectionReason: z.string().optional(),
  officer: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormModalProps {
  registration?: Registration;
  mode: 'add' | 'edit';
  trigger?: React.ReactNode;
}

export function RegistrationFormModal({ registration, mode, trigger }: RegistrationFormModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: profile } = useDoc<UserProfile>(userProfileRef);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicantName: registration?.applicantName || '',
      id: registration?.id || '',
      submissionDate: registration?.submissionDate ? new Date(registration.submissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      phone: registration?.phone || '',
      status: registration?.status || 'Pending Review',
      rejectionReason: registration?.rejectionReason || '',
      officer: registration?.officer || '',
      location: registration?.location || '',
      remarks: registration?.remarks || '',
    },
  });

  const selectedStatus = form.watch('status');

  useEffect(() => {
    if (open) {
      form.reset({
        applicantName: registration?.applicantName || '',
        id: registration?.id || '',
        submissionDate: registration?.submissionDate ? new Date(registration.submissionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        phone: registration?.phone || '',
        status: registration?.status || 'Pending Review',
        rejectionReason: registration?.rejectionReason || '',
        officer: registration?.officer || (mode === 'add' ? profile?.fullName : registration?.officer) || '',
        location: registration?.location || '',
        remarks: registration?.remarks || '',
      });
    }
  }, [open, registration, form, profile, mode]);

  function onSubmit(values: FormValues) {
    if (!db || !user) return;

    const finalRejectionReason = values.status === 'Rejected' ? values.rejectionReason : '';

    const data = {
      ...values,
      rejectionReason: finalRejectionReason,
      submissionDate: new Date(values.submissionDate).toISOString(),
      updatedAt: new Date().toISOString(),
      assignedReviewerId: mode === 'add' ? user.uid : (registration?.assignedReviewerId || user.uid),
      requiredFieldsFilled: true,
      attachmentsIncluded: false,
    };

    if (mode === 'edit' && registration) {
      setDocumentNonBlocking(doc(db, 'registrations', registration.id), data, { merge: true });
      toast({
        title: "Registration Updated",
        description: `Successfully modified record for ${values.applicantName}.`,
      });
    } else {
      setDocumentNonBlocking(doc(db, 'registrations', values.id), data, { merge: true });
      toast({
        title: "Registration Created",
        description: `Success: New record for ${values.applicantName} saved.`,
      });
    }

    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={mode === 'add' ? "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" : "h-7 text-[10px] px-3 font-semibold text-muted-foreground hover:text-foreground"}>
            {mode === 'add' ? (
              <><Plus className="mr-2 h-4 w-4" /> Add Registration</>
            ) : (
              'Edit'
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-popover">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            {mode === 'add' ? <Plus className="h-6 w-6 text-primary" /> : <Edit2 className="h-6 w-6 text-primary" />}
            {mode === 'add' ? 'New Bureau Registration' : 'Update Record Details'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="applicantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} className="h-11 bg-background border-border" />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Registration ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="29-digit numeric ID" {...field} className="h-11 bg-background border-border" maxLength={29} disabled={mode === 'edit'} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="submissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-11 bg-background border-border" />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Numeric digits only" {...field} className="h-11 bg-background border-border" />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending Review">Pending Review</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Processed">Processed</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="officer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Officer</FormLabel>
                    <FormControl>
                      <Input placeholder="Officer name" {...field} className="h-11 bg-background border-border" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {selectedStatus === 'Rejected' && (
              <FormField
                control={form.control}
                name="rejectionReason"
                render={({ field }) => (
                  <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <FormLabel className="text-[10px] font-bold uppercase text-rose-500 tracking-wider">Rejection Reason *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-rose-200 bg-rose-500/10 text-rose-600">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Biometric Match">Biometric Match</SelectItem>
                        <SelectItem value="Rejected by Superveser">Rejected by Superveser</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Location</FormLabel>
                  <FormControl>
                    <Input placeholder="City or office location" {...field} className="h-11 bg-background border-border" />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes" 
                      className="resize-none min-h-[80px] bg-background border-border" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                {mode === 'add' ? 'Finalize Registration' : 'Update Record Permanently'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-12 font-bold text-muted-foreground">
                Discard
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
