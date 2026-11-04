'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHelpTip } from '@/components/admin/HelpButton';
import Button from '@/components/ui/Button';
import { stampProductPhotoReferenceBar } from '@/lib/productPhotoReferenceStamp';
import { sameOptionTags, type OptionTag } from '@/lib/photoOptions';

const INCREASE_RESOLUTION =
  'Increase resolution of the photo. Sharpen fine details and edges. Do not change the product, composition, background, lighting, or colors.';

type Turn = { role: 'user' | 'assistant'; text: string };

async function readError(response: Response): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data.error || 'The photo could not be edited.';
}

export default function ProductPhotoAiEditDialog({
  open,
  slotLabel,
  sourceSrc,
  options,
  initialTags,
  otherClaims,
  onCancel,
  onApply,
}: {
  open: boolean;
  slotLabel: string;
  sourceSrc: string;
  options: Array<{ name: string; values: string[] }>;
  initialTags: OptionTag[];
  otherClaims: Array<OptionTag & { slotLabel: string }>;
  onCancel: () => void;
  onApply: (src: string, optionTags: OptionTag[]) => Promise<void>;
}) {
  const titleId = useId();
  const [originalSrc, setOriginalSrc] = useState('');
  const [workingSrc, setWorkingSrc] = useState('');
  const [previewSrc, setPreviewSrc] = useState('');
  const [savedSrc, setSavedSrc] = useState('');
  const [stampOn, setStampOn] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [chat, setChat] = useState<Turn[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [tags, setTags] = useState<OptionTag[]>([]);
  const optionTip = useHelpTip('admin.image.option');
  const initialKey = JSON.stringify(initialTags);

  useEffect(() => {
    if (!open) return;
    setOriginalSrc(sourceSrc);
    setWorkingSrc(sourceSrc);
    setPreviewSrc(sourceSrc);
    setSavedSrc('');
    setStampOn(false);
    setInstruction('');
    setError('');
    setBusy(false);
    setApplying(false);
    setTags(JSON.parse(initialKey) as OptionTag[]);
    setChat([
      {
        role: 'assistant',
        text: 'Describe the change you want. Reset restores the original photo.',
      },
    ]);
  }, [open, sourceSrc, initialKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !applying) onCancel();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, busy, applying, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  async function refreshPreview(nextWorking: string, keepStamp: boolean): Promise<string> {
    if (!keepStamp) {
      setPreviewSrc(nextWorking);
      return nextWorking;
    }
    const stamped = await stampProductPhotoReferenceBar(nextWorking);
    setPreviewSrc(stamped);
    return stamped;
  }

  async function runEdit(text: string) {
    const instructionText = text.trim();
    if (!instructionText || busy || applying) return;
    setBusy(true);
    setError('');
    setChat((current) => [...current, { role: 'user', text: instructionText }]);
    setInstruction('');
    try {
      const body = workingSrc.startsWith('data:')
        ? { imageDataUrl: workingSrc, instruction: instructionText, slotLabel }
        : { src: workingSrc, instruction: instructionText, slotLabel };
      const response = await fetch('/api/admin/products/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      if (!data.src) throw new Error('The edited photo could not be saved.');
      setSavedSrc(data.src);
      setWorkingSrc(data.src);
      await refreshPreview(data.src, stampOn);
      setChat((current) => [...current, { role: 'assistant', text: 'Updated the photo from your instruction.' }]);
    } catch (editError) {
      const message = editError instanceof Error ? editError.message : 'The photo could not be edited.';
      setError(message);
      setChat((current) => [...current, { role: 'assistant', text: message }]);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStamp() {
    if (busy || applying || !workingSrc) return;
    setError('');
    if (stampOn) {
      setStampOn(false);
      setPreviewSrc(workingSrc);
      setChat((current) => [...current, { role: 'assistant', text: 'Removed the “Photo for reference only” bar.' }]);
      return;
    }
    setBusy(true);
    try {
      const stamped = await stampProductPhotoReferenceBar(workingSrc);
      setPreviewSrc(stamped);
      setStampOn(true);
      setChat((current) => [
        ...current,
        { role: 'assistant', text: 'Added a “Photo for reference only” bar under this photo.' },
      ]);
    } catch (stampError) {
      setError(stampError instanceof Error ? stampError.message : 'Could not draw the reference bar.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (busy || applying) return;
    setWorkingSrc(originalSrc);
    setPreviewSrc(originalSrc);
    setSavedSrc('');
    setStampOn(false);
    setInstruction('');
    setError('');
    setChat([{ role: 'assistant', text: 'Reset to the original photo. Describe a new change below if needed.' }]);
  }

  async function apply() {
    if (busy || applying) return;
    setApplying(true);
    setError('');
    try {
      let nextSrc = savedSrc;
      let preview = previewSrc;
      const pending = instruction.trim();
      if (pending) {
        const body = workingSrc.startsWith('data:')
          ? { imageDataUrl: workingSrc, instruction: pending, slotLabel }
          : { src: workingSrc, instruction: pending, slotLabel };
        const response = await fetch('/api/admin/products/images/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json();
        if (!data.src) throw new Error('The edited photo could not be saved.');
        nextSrc = data.src;
        setWorkingSrc(data.src);
        setSavedSrc(data.src);
        preview = await refreshPreview(data.src, stampOn);
      }
      if (stampOn && preview.startsWith('data:')) {
        const response = await fetch('/api/admin/products/images/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: preview }),
        });
        if (!response.ok) throw new Error(await readError(response));
        const data = await response.json();
        if (!data.src) throw new Error('The edited photo could not be saved.');
        nextSrc = data.src;
      }
      const pictureChanged = Boolean(nextSrc && nextSrc !== originalSrc);
      const tagsChanged = !sameOptionTags(tags, JSON.parse(initialKey) as OptionTag[]);
      if (!pictureChanged && !tagsChanged) throw new Error('Describe a change first.');
      await onApply(pictureChanged ? nextSrc : originalSrc, tags);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Could not replace this photo.');
      setApplying(false);
    }
  }

  const locked = busy || applying;
  const tagsChanged = !sameOptionTags(tags, JSON.parse(initialKey) as OptionTag[]);
  const canApply = Boolean(savedSrc || stampOn || instruction.trim() || tagsChanged) && !locked;

  function toggleTag(option: string, value: string) {
    if (locked || otherClaims.some((claim) => claim.option === option && claim.value === value)) return;
    setTags((current) => {
      const has = current.some((tag) => tag.option === option && tag.value === value);
      if (has) return current.filter((tag) => !(tag.option === option && tag.value === value));
      return [...current, { option, value }];
    });
  }

  const optionGroups = options
    .map((option) => ({
      name: option.name.trim(),
      values: option.values.map((value) => value.trim()).filter(Boolean),
    }))
    .filter((option) => option.name && option.values.length);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !locked && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            Edit photo with AI
          </h2>
          <p className="mt-1 text-sm text-gray-600">Review the photo, describe a change, then apply it to this slot.</p>
          <p className="mt-1 text-sm text-gray-900">{slotLabel}</p>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_16rem]">
          <div className="flex min-h-64 items-center justify-center rounded-md border border-gray-200 bg-gray-50 p-3">
            {previewSrc ? <img src={previewSrc} alt={slotLabel} className="max-h-80 max-w-full object-contain" /> : null}
            {locked ? <span className="sr-only">{busy ? 'Editing photo' : 'Applying photo'}</span> : null}
          </div>
          <div className="flex min-h-64 flex-col">
            <div className="mb-2 flex flex-wrap gap-2">
              <Button helpKey="admin.image.ai_reset" variant="secondary" disabled={locked || !originalSrc} onClick={reset}>
                Reset
              </Button>
              <Button helpKey="admin.image.ai_upscale" variant="secondary" disabled={locked || !workingSrc} onClick={() => void runEdit(INCREASE_RESOLUTION)}>
                Increase resolution
              </Button>
              <Button helpKey="admin.image.ai_reference" variant="secondary" disabled={locked || !workingSrc} onClick={() => void toggleStamp()}>
                {stampOn ? 'Remove reference bar' : 'Photo for reference only'}
              </Button>
            </div>
            <div className="mb-3 min-h-28 flex-1 space-y-2 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              {chat.map((turn, index) => (
                <p key={`${turn.role}-${index}`} className={turn.role === 'user' ? 'text-gray-900' : 'text-gray-600'}>
                  {turn.text}
                </p>
              ))}
            </div>
            <textarea
              className="input-field"
              rows={3}
              value={instruction}
              placeholder="White background, remove glare, brighter"
              disabled={locked}
              onChange={(event) => setInstruction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void runEdit(instruction);
                }
              }}
            />
            <div className="mt-2">
              <Button helpKey="admin.image.ai_send" variant="secondary" disabled={locked || !instruction.trim()} onClick={() => void runEdit(instruction)}>
                {busy ? 'Editing…' : 'Send'}
              </Button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          </div>
          <div className="min-h-64 overflow-auto border-gray-200 lg:border-l lg:pl-4">
            <p className="admin-field-label">Options</p>
            <p className="mb-3 text-xs text-gray-500">Tick the values this photo shows. A value used by another photo stays locked.</p>
            {optionGroups.length ? (
              optionGroups.map((option) => (
                <div key={option.name} className="mb-4">
                  <p className="mb-1 text-sm font-medium text-gray-900">{option.name}</p>
                  <div className="space-y-1">
                    {option.values.map((value) => {
                      const owner = otherClaims.find((claim) => claim.option === option.name && claim.value === value);
                      const checked = tags.some((tag) => tag.option === option.name && tag.value === value);
                      return (
                        <label
                          key={value}
                          data-help-key="admin.image.option"
                          title={optionTip || undefined}
                          className={`flex items-center gap-2 text-sm ${owner ? 'text-gray-400' : 'text-gray-900'}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            disabled={locked || Boolean(owner)}
                            onChange={() => toggleTag(option.name, value)}
                          />
                          <span>{value}</span>
                          {owner ? <span className="text-xs">{owner.slotLabel}</span> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">This lamp has no options yet.</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <Button helpKey="admin.image.ai_cancel" variant="secondary" disabled={locked} onClick={onCancel}>
            Cancel
          </Button>
          <Button helpKey="admin.image.ai_apply" disabled={!canApply} onClick={() => void apply()}>
            {applying ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
