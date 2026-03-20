'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, MessageSquareReply, Paperclip, ThumbsUp, Trash2, UserRound, X } from 'lucide-react';
import { deleteFeedbackForDevelopment, saveFeedbackAdminReplyForDevelopment, submitFeedback } from './actions';
import { listPublicFeedback } from './list-public-feedback';
import { toast } from 'sonner';
import Image from 'next/image';
import type { PublicFeedbackItem } from '@/entities/feedback/public-feedback-item';

const MAX_CHARS = 500;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const DEFAULT_FEEDBACK_STATUS = 'RECEIVED';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

type FeedbackSortKey = 'hot' | 'latest';
type FeedbackAdminStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED';

function formatFeedbackDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
}

function getStatusLabel(status: string): string {
  if (status === 'COMPLETED') {
    return 'Completed';
  }
  if (status === 'PROCESSING') {
    return 'Processing';
  }
  return 'Received';
}

function getStatusClassName(status: string): string {
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  }
  if (status === 'PROCESSING') {
    return 'bg-amber-50 text-amber-600 border border-amber-100';
  }
  return 'bg-slate-100 text-slate-600 border border-slate-200';
}

function FeedbackCard(props: {
  readonly item: PublicFeedbackItem;
  readonly isDevelopmentMode: boolean;
  readonly replyDraft: string;
  readonly isSavingReply: boolean;
  readonly isDeleting: boolean;
  readonly onReplyDraftChange: (id: string, value: string) => void;
  readonly onReplySave: (id: string) => Promise<void>;
  readonly onStatusChange: (id: string, status: FeedbackAdminStatus) => void;
  readonly onDelete: (id: string) => Promise<void>;
}): ReactElement {
  const { item } = props;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-shadow hover:shadow-md sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            User Feedback
          </div>
          <h3 className="whitespace-pre-wrap break-words text-lg font-semibold leading-7 text-slate-900 sm:text-xl">{item.content || 'User Feedback'}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center self-start rounded-full px-4 py-1 text-sm font-semibold ${getStatusClassName(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">{item.content}</p>
      {item.attachment ? (
        <div className="mt-4 relative h-40 w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <Image src={item.attachment} alt="Feedback attachment" fill className="object-cover" />
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatFeedbackDate(item.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
            <UserRound className="h-4 w-4" />
            {item.displayName}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-50 px-3 py-1.5 text-slate-600 sm:self-auto">
          <ThumbsUp className="h-4 w-4" />
          {item.likeCount}
        </span>
      </div>
      {item.adminReply ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Developer Reply</div>
          <div className="mb-2 font-medium text-slate-900">
            Developer Reply {item.adminReplyAt ? formatFeedbackDate(item.adminReplyAt) : ''}
          </div>
          <p className="whitespace-pre-wrap break-words">{item.adminReply}</p>
        </div>
      ) : null}
      {props.isDevelopmentMode ? (
        <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
                <MessageSquareReply className="h-4 w-4" />
                Dev Mode Management
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 self-start rounded-2xl bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={(): void => props.onStatusChange(item.id, 'RECEIVED')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'RECEIVED' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Received
                </button>
                <button
                  type="button"
                  onClick={(): void => props.onStatusChange(item.id, 'PROCESSING')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'PROCESSING' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Processing
                </button>
                <button
                  type="button"
                  onClick={(): void => props.onStatusChange(item.id, 'COMPLETED')}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'COMPLETED' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Completed
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <textarea
                value={props.replyDraft}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => props.onReplyDraftChange(item.id, e.target.value)}
                className="min-h-[96px] w-full rounded-xl border border-violet-100 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                placeholder="Quickly simulate official reply in dev mode"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-500">Replies and status saved here are written to the database and displayed publicly. Delete operations also permanently remove database records.</p>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-slate-200 bg-white px-3 text-sm"
                    onClick={(): Promise<void> => props.onDelete(item.id)}
                    disabled={props.isDeleting}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {props.isDeleting ? 'Deleting...' : 'Delete Feedback'}
                  </Button>
                  <Button
                    type="button"
                    className="h-9 rounded-lg bg-violet-600 px-3 text-sm text-white hover:bg-violet-700"
                    onClick={(): Promise<void> => props.onReplySave(item.id)}
                    disabled={props.isSavingReply}
                  >
                    {props.isSavingReply ? 'Saving...' : 'Save Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function FeedbackPage() {
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFeedbackList, setIsLoadingFeedbackList] = useState(false);
  const [feedbackList, setFeedbackList] = useState<readonly PublicFeedbackItem[]>([]);
  const [sortKey, setSortKey] = useState<FeedbackSortKey>('latest');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, FeedbackAdminStatus>>({});
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingReplySaveId, setPendingReplySaveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFeedbackList = (items: readonly PublicFeedbackItem[]): void => {
    setFeedbackList(items);
    setReplyDrafts(() => {
      const nextDrafts: Record<string, string> = {};
      items.forEach((item: PublicFeedbackItem): void => {
        nextDrafts[item.id] = item.adminReply ?? '';
      });
      return nextDrafts;
    });
    setStatusDrafts(() => {
      const nextDrafts: Record<string, FeedbackAdminStatus> = {};
      items.forEach((item: PublicFeedbackItem): void => {
        nextDrafts[item.id] = item.status;
      });
      return nextDrafts;
    });
  };

  useEffect(() => {
    let isMounted: boolean = true;
    async function loadFeedbackList(): Promise<void> {
      setIsLoadingFeedbackList(true);
      try {
        const items: readonly PublicFeedbackItem[] = await listPublicFeedback();
        if (isMounted) {
          applyFeedbackList(items);
        }
      } catch {
        if (isMounted) {
          toast.error('Failed to load feedback. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingFeedbackList(false);
        }
      }
    }
    void loadFeedbackList();
    return (): void => {
      isMounted = false;
    };
  }, []);

  const sortedFeedbackList: readonly PublicFeedbackItem[] = useMemo(() => {
    const items: PublicFeedbackItem[] = [...feedbackList];
    if (sortKey === 'hot') {
      return items.sort((left: PublicFeedbackItem, right: PublicFeedbackItem) => right.likeCount - left.likeCount);
    }
    return items.sort((left: PublicFeedbackItem, right: PublicFeedbackItem) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [feedbackList, sortKey]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so the same file can be selected again if removed
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>): void => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const processFile = (file: File): void => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Attachment size cannot exceed ${MAX_FILE_SIZE_MB}MB`);
      return;
    }
    const objectUrl: string = URL.createObjectURL(file);
    setAttachmentFile(file);
    setAttachment((currentAttachment: string | null) => {
      if (currentAttachment?.startsWith('blob:')) {
        URL.revokeObjectURL(currentAttachment);
      }
      return objectUrl;
    });
  };

  const handleSubmit = async (): Promise<void> => {
    if (!content.trim()) {
      toast.error('Feedback content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      let attachmentUrl: string | undefined;
      if (attachmentFile) {
        const formData: FormData = new FormData();
        formData.append('file', attachmentFile);
        const uploadResponse: Response = await fetch('/api/feedback/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadPayload: { readonly url?: string; readonly error?: string } = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.url) {
          throw new Error(uploadPayload.error || 'Failed to upload attachment. Please try again later.');
        }
        attachmentUrl = uploadPayload.url;
      }
      const result = await submitFeedback({ content, contact, attachment: attachmentUrl });
      if (result.success) {
        toast.success('Feedback submitted successfully! Thank you for your support.');
        setContent('');
        setContact('');
        setAttachmentFile(null);
        if (attachment?.startsWith('blob:')) {
          URL.revokeObjectURL(attachment);
        }
        setAttachment(null);
        const items: readonly PublicFeedbackItem[] = await listPublicFeedback();
        applyFeedbackList(items);
      } else {
        toast.error(result.error || 'Submission failed. Please try again.');
      }
    } catch {
      toast.error('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyDraftChange = (id: string, value: string): void => {
    setReplyDrafts((currentDrafts: Record<string, string>) => ({
      ...currentDrafts,
      [id]: value,
    }));
  };

  const handleStatusChange = (id: string, status: FeedbackAdminStatus): void => {
    if (!IS_DEVELOPMENT) {
      return;
    }
    setStatusDrafts((currentDrafts: Record<string, FeedbackAdminStatus>) => ({
      ...currentDrafts,
      [id]: status,
    }));
    toast.success(`Status changed to ${getStatusLabel(status)}`);
  };

  const handleReplySave = async (id: string): Promise<void> => {
    if (!IS_DEVELOPMENT) {
      return;
    }
    const replyDraft: string = (replyDrafts[id] ?? '').trim();
    const statusDraft: FeedbackAdminStatus = statusDrafts[id] ?? DEFAULT_FEEDBACK_STATUS;
    setPendingReplySaveId(id);
    try {
      const result: { readonly success: boolean; readonly error?: string } = await saveFeedbackAdminReplyForDevelopment({
        id,
        status: statusDraft,
        adminReply: replyDraft,
      });
      if (!result.success) {
        toast.error(result.error || 'Failed to save reply');
        return;
      }
      const items: readonly PublicFeedbackItem[] = await listPublicFeedback();
      applyFeedbackList(items);
      toast.success(replyDraft ? 'Reply saved and publicly displayed' : 'Reply cleared and public display updated');
    } finally {
      setPendingReplySaveId(null);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!IS_DEVELOPMENT) {
      return;
    }
    const shouldDelete: boolean = window.confirm('Are you sure you want to delete this feedback? This will permanently remove the database record.');
    if (!shouldDelete) {
      return;
    }
    setPendingDeleteId(id);
    try {
      const result: { readonly success: boolean; readonly error?: string } = await deleteFeedbackForDevelopment(id);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete feedback');
        return;
      }
      setFeedbackList((currentItems: readonly PublicFeedbackItem[]) => currentItems.filter((item: PublicFeedbackItem) => item.id !== id));
      setReplyDrafts((currentDrafts: Record<string, string>) => {
        const nextDrafts: Record<string, string> = { ...currentDrafts };
        delete nextDrafts[id];
        return nextDrafts;
      });
      setStatusDrafts((currentDrafts: Record<string, FeedbackAdminStatus>) => {
        const nextDrafts: Record<string, FeedbackAdminStatus> = { ...currentDrafts };
        delete nextDrafts[id];
        return nextDrafts;
      });
      toast.success('Feedback deleted');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="w-full px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-6 max-w-4xl space-y-2">
        <div className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          Feedback Center
        </div>
        <h1 className="text-2xl font-bold text-slate-900">User Feedback</h1>
        <p className="text-sm leading-6 text-slate-600">Submit issues or suggestions. We will follow up as soon as possible.</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="mb-5 space-y-1">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Submit New Feedback</h2>
              <p className="mt-1 text-sm text-slate-500">Supports text and screenshot attachments.</p>
            </div>
          </div>
        {/* Feedback content area */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Feedback Content</span>
            <span className="text-rose-500">*</span>
            <span className="text-xs text-slate-400">Max {MAX_CHARS} characters</span>
          </div>
          <div>
            <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all bg-white">
              <textarea
                className="w-full min-h-[180px] p-4 outline-none resize-none text-slate-700 placeholder:text-slate-400 leading-relaxed"
                placeholder="Please describe the issue you encountered. The more detail, the better we can help."
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                onPaste={handlePaste}
              />
              
              {/* Character count */}
              <div className="px-4 pb-2 text-right text-xs text-slate-400">
                {content.length}/{MAX_CHARS}
              </div>

              {/* Toolbar & Attachment area */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex items-center flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Add Attachment</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Attachment Preview */}
                {attachment && (
                  <div className="relative group rounded border border-slate-200 overflow-hidden w-16 h-16 bg-white shrink-0">
                    <Image src={attachment} alt="Attachment" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        if (attachment.startsWith('blob:')) {
                          URL.revokeObjectURL(attachment);
                        }
                        setAttachmentFile(null);
                        setAttachment(null);
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove attachment"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
                
                <div className="text-xs leading-5 text-slate-400 ml-auto flex-1 min-w-[200px] text-right">
                  Supports pasting screenshots, max {MAX_FILE_SIZE_MB}MB
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-3 sm:gap-4 mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Contact Info</span>
            <span className="text-xs text-slate-400">Optional</span>
          </div>
          <div>
            <input
              type="text"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all text-slate-700 placeholder:text-slate-400 bg-white"
              placeholder="Leave your email or phone number"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">Your feedback will appear in the public feedback board.</div>
          <div className="text-center sm:text-left">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="w-full sm:w-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
        </section>

        <section className="pt-2">
          <div className="mb-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">{feedbackList.length} Feedback Items</h2>
                {IS_DEVELOPMENT ? (
                  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                    Dev Mode Management Enabled
                  </span>
                ) : null}
              </div>
              {IS_DEVELOPMENT ? (
                <p className="text-sm text-slate-500">You can test replies and status display directly in each feedback card, and perform real delete operations.</p>
              ) : null}
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={(): void => setSortKey('hot')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${sortKey === 'hot' ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Hot
                </button>
                <button
                  type="button"
                  onClick={(): void => setSortKey('latest')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${sortKey === 'latest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Latest
                </button>
            </div>
          </div>

          <div className="space-y-5">
            {isLoadingFeedbackList ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                Loading feedback...
              </div>
            ) : null}

            {!isLoadingFeedbackList && sortedFeedbackList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                No public feedback yet. Submit feedback to see it here.
              </div>
            ) : null}

            {!isLoadingFeedbackList ? sortedFeedbackList.map((item: PublicFeedbackItem) => (
              <FeedbackCard
                key={item.id}
                item={{
                  ...item,
                  status: statusDrafts[item.id] ?? item.status,
                }}
                isDevelopmentMode={IS_DEVELOPMENT}
                replyDraft={replyDrafts[item.id] ?? item.adminReply ?? ''}
                isSavingReply={pendingReplySaveId === item.id}
                isDeleting={pendingDeleteId === item.id}
                onReplyDraftChange={handleReplyDraftChange}
                onReplySave={handleReplySave}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            )) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
