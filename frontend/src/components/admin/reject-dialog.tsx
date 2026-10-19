'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  rejectionReasonSchema,
  type RejectionReasonFormValues,
} from '@/lib/validation';

/**
 * Collects the mandatory rejection reason before an administrator rejects a
 * storage request or a release request.
 */
export function RejectDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectionReasonFormValues>({
    resolver: zodResolver(rejectionReasonSchema),
    defaultValues: { rejectionReason: '' },
  });

  useEffect(() => {
    if (open) reset({ rejectionReason: '' });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await onConfirm(values.rejectionReason.trim());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-2" noValidate>
          <Label htmlFor="rejectionReason">Reason</Label>
          <Textarea
            id="rejectionReason"
            rows={3}
            placeholder="Explain why this request is being rejected. The owner will see this."
            aria-invalid={Boolean(errors.rejectionReason)}
            {...register('rejectionReason')}
          />
          {errors.rejectionReason ? (
            <p className="text-sm text-destructive">
              {errors.rejectionReason.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              A reason is required and is shown to the device owner.
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
