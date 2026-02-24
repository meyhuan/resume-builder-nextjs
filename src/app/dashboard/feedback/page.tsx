'use client';

import { useState, useRef, ClipboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X } from 'lucide-react';
import { submitFeedback } from './actions';
import { toast } from 'sonner';
import Image from 'next/image';

const MAX_CHARS = 500;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FeedbackPage() {
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so the same file can be selected again if removed
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
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

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`附件大小不能超过 ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAttachment(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('反馈内容不能为空');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitFeedback({ content, contact, attachment: attachment || undefined });
      if (result.success) {
        toast.success('反馈提交成功！感谢您的支持。');
        setContent('');
        setContact('');
        setAttachment(null);
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
                      onClick={() => setAttachment(null)}
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
      </div>
    </div>
  );
}
