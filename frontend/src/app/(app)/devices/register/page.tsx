'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  SERIAL_REQUIRED_PRODUCT_TYPES,
} from '@/lib/format';
import { deviceSchema, type DeviceFormValues } from '@/lib/validation';
import type { ProductType } from '@/types/api';

/** Drops empty optional fields so the API only receives what was provided. */
function toPayload(values: DeviceFormValues) {
  const optional = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };
  return {
    productType: values.productType,
    productName: values.productName.trim(),
    brand: optional(values.brand),
    model: optional(values.model),
    serialNumber: optional(values.serialNumber),
    description: optional(values.description),
  };
}

export default function RegisterDevicePage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      productType: 'LAPTOP',
      productName: '',
      brand: '',
      model: '',
      serialNumber: '',
      description: '',
    },
  });

  const productType = watch('productType') as ProductType;
  const serialRequired = SERIAL_REQUIRED_PRODUCT_TYPES.includes(productType);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.devices.create(toPayload(values));
      toast.success('Storage request submitted. The store will review it.');
      router.replace('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (
            field === 'productType' ||
            field === 'productName' ||
            field === 'brand' ||
            field === 'model' ||
            field === 'serialNumber' ||
            field === 'description'
          ) {
            setError(field, { message });
          }
        }
        return;
      }
      setFormError('Something went wrong. Please try again.');
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to my devices
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Register a device for storage
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell the store what you are leaving. Your request starts as{' '}
          <span className="font-medium">pending review</span>; storage is
          approved only after the device is handed over at the counter.
        </p>
      </div>

      <Alert variant="info">
        <Info />
        <AlertDescription>
          Submitting this form does not mean the store has received your device.
          Bring it to the store office to complete the handover.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="productType">Product type</Label>
              <Select
                value={productType}
                onValueChange={(value) =>
                  setValue('productType', value as ProductType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger
                  id="productType"
                  aria-invalid={Boolean(errors.productType)}
                >
                  <SelectValue placeholder="Choose a device type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PRODUCT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productType ? (
                <p className="text-sm text-destructive">
                  {errors.productType.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productName">Product name</Label>
              <Input
                id="productName"
                placeholder="ThinkPad X1 Carbon"
                aria-invalid={Boolean(errors.productName)}
                {...register('productName')}
              />
              {errors.productName ? (
                <p className="text-sm text-destructive">
                  {errors.productName.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand">
                  Brand <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="brand"
                  placeholder="Lenovo"
                  aria-invalid={Boolean(errors.brand)}
                  {...register('brand')}
                />
                {errors.brand ? (
                  <p className="text-sm text-destructive">{errors.brand.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  Model <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="model"
                  placeholder="X1 Carbon Gen 11"
                  aria-invalid={Boolean(errors.model)}
                  {...register('model')}
                />
                {errors.model ? (
                  <p className="text-sm text-destructive">{errors.model.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">
                Serial number{' '}
                {serialRequired ? null : (
                  <span className="text-muted-foreground">(optional)</span>
                )}
              </Label>
              <Input
                id="serialNumber"
                placeholder="TB380VM-4V10001"
                aria-invalid={Boolean(errors.serialNumber)}
                {...register('serialNumber')}
              />
              {errors.serialNumber ? (
                <p className="text-sm text-destructive">
                  {errors.serialNumber.message}
                </p>
              ) : serialRequired ? (
                <p className="text-xs text-muted-foreground">
                  Required for computers, laptops, mobile phones and tablets.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not required for &ldquo;Other&rdquo; devices.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Additional description{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Anything the store should know — accessories included, existing damage, and so on."
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  'Submit storage request'
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
