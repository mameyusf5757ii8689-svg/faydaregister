
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
  DialogFooter
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
import { useState } from 'react';

const formSchema = z.object({
  applicantName: z.string().min(2, "Name must be at least 2 characters"),
  id: z.string().regex(/^\d{29}$/, "Registration ID must be exactly 29 digits"),
  submissionDate: z.string().min(1, "Date is required"),
  phone: z.string().regex(/^\d+$/, "Phone must contain only digits"),
  status: z.enum(['Processed', 'Pending Review', 'Rejected', 'Processing', 'Failed']),
  officer: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddRegistrationModal() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicantName: '',
      id: '',
      submissionDate: new Date().toISOString().split('T')[0],
      phone: '',
      status: 'Pending Review',
      officer: '',
      location: '',
      remarks: '',
    },
  });

  function onSubmit(values: FormValues) {
    console.log(values);
    // In a real app, we would call a server action here to save to Firebase
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold shadow-sm">
          Add Registration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-5 border-b bg-slate-50/50">
          <DialogTitle className="text-lg font-bold text-slate-800">New Registration</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="applicantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Applicant Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} className="h-9 text-sm" />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Reg ID (29 Digits) *</FormLabel>
                    <FormControl>
                      <Input placeholder="29-digit ID" {...field} className="h-9 text-sm" maxLength={29} />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="submissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-9 text-sm" />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Phone *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digits only" {...field} className="h-9 text-sm" />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending Review">Pending Review</SelectItem>
                        <SelectItem value="Processed">Processed</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="officer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Officer</FormLabel>
                    <FormControl>
                      <Input placeholder="Officer name" {...field} className="h-9 text-sm" />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="City or branch location" {...field} className="h-9 text-sm" />
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase text-slate-500">Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes" 
                      className="resize-none min-h-[70px] text-sm" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[9px]" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 px-6 text-sm">
                Cancel
              </Button>
              <Button type="submit" className="bg-[#0f172a] hover:bg-[#1e293b] h-9 px-6 text-sm">
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
