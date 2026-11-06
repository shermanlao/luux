'use client';

import { TextInput } from '@/components/ui/FormField';

export type TrackingDraft = {
  tracking_carrier: string;
  tracking_number: string;
  tracking_url: string;
};

export const EMPTY_TRACKING: TrackingDraft = {
  tracking_carrier: '',
  tracking_number: '',
  tracking_url: '',
};

export function trackingFromOrder(order: { tracking_carrier?: string; tracking_number?: string; tracking_url?: string }): TrackingDraft {
  return {
    tracking_carrier: order.tracking_carrier || '',
    tracking_number: order.tracking_number || '',
    tracking_url: order.tracking_url || '',
  };
}

export default function TrackingForm({
  value,
  onChange,
}: {
  value: TrackingDraft;
  onChange: (next: TrackingDraft) => void;
}) {
  return (
    <div className="grid gap-3">
      <TextInput
        label="Carrier"
        value={value.tracking_carrier}
        onChange={(event) => onChange({ ...value, tracking_carrier: event.target.value })}
      />
      <TextInput
        label="Tracking number"
        value={value.tracking_number}
        onChange={(event) => onChange({ ...value, tracking_number: event.target.value })}
      />
      <TextInput
        label="Tracking link"
        value={value.tracking_url}
        onChange={(event) => onChange({ ...value, tracking_url: event.target.value })}
      />
    </div>
  );
}
