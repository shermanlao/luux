'use client';

import { TextInput, SelectField } from '@/components/ui/FormField';
import { COUNTRIES } from '@shared/address';

export type AddressKind = 'invoice' | 'shipping';

export type AddressFields = {
  invoice_first_name: string;
  invoice_last_name: string;
  invoice_company: string;
  invoice_phone: string;
  invoice_line1: string;
  invoice_line2: string;
  invoice_city: string;
  invoice_region: string;
  invoice_postal: string;
  invoice_country: string;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_company: string;
  shipping_phone: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postal: string;
  shipping_country: string;
};

export const EMPTY_ADDRESS: AddressFields = {
  invoice_first_name: '',
  invoice_last_name: '',
  invoice_company: '',
  invoice_phone: '',
  invoice_line1: '',
  invoice_line2: '',
  invoice_city: '',
  invoice_region: '',
  invoice_postal: '',
  invoice_country: 'HK',
  shipping_first_name: '',
  shipping_last_name: '',
  shipping_company: '',
  shipping_phone: '',
  shipping_line1: '',
  shipping_line2: '',
  shipping_city: '',
  shipping_region: '',
  shipping_postal: '',
  shipping_country: 'HK',
};

const KEYS = [
  'first_name',
  'last_name',
  'company',
  'phone',
  'line1',
  'line2',
  'city',
  'region',
  'postal',
  'country',
] as const;

export function copyInvoiceToShipping(form: AddressFields): Pick<AddressFields, `shipping_${(typeof KEYS)[number]}`> {
  return {
    shipping_first_name: form.invoice_first_name,
    shipping_last_name: form.invoice_last_name,
    shipping_company: form.invoice_company,
    shipping_phone: form.invoice_phone,
    shipping_line1: form.invoice_line1,
    shipping_line2: form.invoice_line2,
    shipping_city: form.invoice_city,
    shipping_region: form.invoice_region,
    shipping_postal: form.invoice_postal,
    shipping_country: form.invoice_country,
  };
}

export function PostalAddressFields({
  kind,
  form,
  onChange,
  showPhone = false,
  required = true,
}: {
  kind: AddressKind;
  form: AddressFields;
  onChange: (patch: Partial<AddressFields>) => void;
  showPhone?: boolean;
  required?: boolean;
}) {
  const auto = kind === 'invoice' ? 'billing' : 'shipping';
  const field = (name: (typeof KEYS)[number]) => `${kind}_${name}` as const;
  return (
    <>
      <TextInput
        label="First name"
        required={required}
        autoComplete={`${auto} given-name`}
        value={form[field('first_name')]}
        onChange={(event) => onChange({ [field('first_name')]: event.target.value })}
      />
      <TextInput
        label="Last name"
        required={required}
        autoComplete={`${auto} family-name`}
        value={form[field('last_name')]}
        onChange={(event) => onChange({ [field('last_name')]: event.target.value })}
      />
      <TextInput
        label="Company"
        autoComplete={`${auto} organization`}
        value={form[field('company')]}
        onChange={(event) => onChange({ [field('company')]: event.target.value })}
      />
      {showPhone ? (
        <TextInput
          label="Phone"
          type="tel"
          autoComplete={`${auto} tel`}
          value={form[field('phone')]}
          onChange={(event) => onChange({ [field('phone')]: event.target.value })}
        />
      ) : null}
      <TextInput
        label="Address"
        required={required}
        autoComplete={`${auto} address-line1`}
        value={form[field('line1')]}
        onChange={(event) => onChange({ [field('line1')]: event.target.value })}
      />
      <TextInput
        label="Apartment, suite"
        autoComplete={`${auto} address-line2`}
        value={form[field('line2')]}
        onChange={(event) => onChange({ [field('line2')]: event.target.value })}
      />
      <TextInput
        label="City"
        required={required}
        autoComplete={`${auto} address-level2`}
        value={form[field('city')]}
        onChange={(event) => onChange({ [field('city')]: event.target.value })}
      />
      <TextInput
        label="Region"
        autoComplete={`${auto} address-level1`}
        value={form[field('region')]}
        onChange={(event) => onChange({ [field('region')]: event.target.value })}
      />
      <TextInput
        label="Postal code"
        autoComplete={`${auto} postal-code`}
        value={form[field('postal')]}
        onChange={(event) => onChange({ [field('postal')]: event.target.value })}
      />
      <SelectField
        label="Country"
        autoComplete={`${auto} country`}
        value={form[field('country')]}
        onChange={(event) => onChange({ [field('country')]: event.target.value })}
      >
        {COUNTRIES.map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </SelectField>
    </>
  );
}
