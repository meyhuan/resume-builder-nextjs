/**
 * Public feedback item displayed in the feedback square.
 */
export interface PublicFeedbackItem {
  readonly id: string;
  readonly content: string;
  readonly status: string;
  readonly displayName: string;
  readonly createdAt: string;
  readonly likeCount: number;
  readonly attachment: string | null;
  readonly adminReply: string | null;
  readonly adminReplyAt: string | null;
}
