import { notFound } from 'next/navigation';
import AssistantLab from './lab';
export const dynamic = 'force-dynamic';
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <AssistantLab />;
}
