'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Paperclip, ThumbsUp, UserRound, X } from 'lucide-react';
import { submitFeedback } from './actions';
import { listPublicFeedback } from './list-public-feedback';
import { toast } from 'sonner';
import Image from 'next/image';
import type { PublicFeedbackItem } from '@/entities/feedback/public-feedback-item';

const MAX_CHARS = 500;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type FeedbackSortKey = 'hot' | 'latest';

function formatFeedbackDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
}

function getStatusLabel(status: string): string {
  if (status === 'COMPLETED') {
    return '已完成';
  }
  if (status === 'PROCESSING') {
    return '处理中';
  }
  return '已收到';
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

function FeedbackCard(props: { readonly item: PublicFeedbackItem }): ReactElement {
  const { item } = props;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-slate-900">{item.content.slice(0, 24) || '用户反馈'}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-4 py-1 text-sm font-semibold ${getStatusClassName(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-slate-700">{item.content}</p>
      {item.attachment ? (
        <div className="mt-4 relative h-40 w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <Image src={item.attachment} alt="Feedback attachment" fill className="object-cover" />
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatFeedbackDate(item.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-4 w-4" />
            {item.displayName}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <ThumbsUp className="h-4 w-4" />
          {item.likeCount}
        </span>
      </div>
      {item.adminReply ? (
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
          <div className="mb-1 font-medium text-slate-900">
            开发者回复 {item.adminReplyAt ? formatFeedbackDate(item.adminReplyAt) : ''}
          </div>
          <p className="whitespace-pre-wrap break-words">{item.adminReply}</p>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted: boolean = true;
    async function loadFeedbackList(): Promise<void> {
      setIsLoadingFeedbackList(true);
      try {
        const items: readonly PublicFeedbackItem[] = await listPublicFeedback();
        if (isMounted) {
          setFeedbackList(items);
        }
      } catch {
        if (isMounted) {
          toast.error('反馈广场加载失败，请稍后重试');
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
      toast.error(`附件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
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
      toast.error('反馈内容不能为空');
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
          throw new Error(uploadPayload.error || '上传附件失败，请稍后重试');
        }
        attachmentUrl = uploadPayload.url;
      }
      const result = await submitFeedback({ content, contact, attachment: attachmentUrl });
      if (result.success) {
        toast.success('反馈提交成功！感谢您的支持。');
        setContent('');
        setContact('');
        setAttachmentFile(null);
        if (attachment?.startsWith('blob:')) {
          URL.revokeObjectURL(attachment);
        }
        setAttachment(null);
        const items: readonly PublicFeedbackItem[] = await listPublicFeedback();
        setFeedbackList(items);
      } else {
        toast.error(result.error || '提交失败，请重试');
      }
    } catch {
      toast.error('提交发生异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">用户反馈</h1>

      <div className="space-y-8 max-w-3xl">
        {/* 反馈内容区 */}
        <div className="flex gap-4 sm:gap-8 flex-col sm:flex-row">
          <div className="sm:w-24 shrink-0 pt-2">
            <span className="text-rose-500 mr-1">*</span>
            <span className="text-slate-600 font-medium">反馈内容</span>
          </div>
          <div className="flex-1">
            <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all bg-white">
              <textarea
                className="w-full min-h-[160px] p-4 outline-none resize-none text-slate-700 placeholder:text-slate-400 leading-relaxed"
                placeholder="请描述你在操作过程中遇到的问题。信息越详细，越有助于我们为你解决问题哦"
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
                  <span>添加附件</span>
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
                      title="移除附件"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
                
                <div className="text-xs text-slate-400 ml-auto flex-1 min-w-[200px] text-right">
                  支持粘贴截图，限制 {MAX_FILE_SIZE_MB}MB 内
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="flex gap-4 sm:gap-8 flex-col sm:flex-row">
          <div className="sm:w-24 shrink-0 pt-3">
            <span className="text-slate-600 font-medium">联系方式</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all text-slate-700 placeholder:text-slate-400 bg-white"
              placeholder="可留下您的邮箱、手机号或微信号"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              填写联系方式有利于我们快速响应意见，我们将对此保密且仅在内部团队公开内容。
            </p>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex gap-4 sm:gap-8 flex-col sm:flex-row pt-4">
          <div className="sm:w-24 shrink-0 hidden sm:block"></div>
          <div className="flex-1 text-center sm:text-left">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !content.trim()}
              className="w-full sm:w-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-11"
            >
              {isSubmitting ? '提交中...' : '提交反馈'}
            </Button>
          </div>
        </div>

        <section className="pt-6">
          <div className="mb-6 border-t border-slate-200 pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">共 {feedbackList.length} 条反馈</h2>
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={(): void => setSortKey('hot')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${sortKey === 'hot' ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  热度
                </button>
                <button
                  type="button"
                  onClick={(): void => setSortKey('latest')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${sortKey === 'latest' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  最新
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {isLoadingFeedbackList ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                正在加载反馈广场...
              </div>
            ) : null}

            {!isLoadingFeedbackList && sortedFeedbackList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
                暂无公开反馈，提交后即可在这里查看动态。
              </div>
            ) : null}

            {!isLoadingFeedbackList ? sortedFeedbackList.map((item: PublicFeedbackItem) => (
              <FeedbackCard key={item.id} item={item} />
            )) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
