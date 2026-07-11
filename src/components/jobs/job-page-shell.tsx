import type { ReactElement, ReactNode } from 'react'

interface JobPageShellProps {
  readonly children: ReactNode
}

export function JobPageShell({ children }: JobPageShellProps): ReactElement {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-5%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>
      <div className="relative z-10 px-6 py-8 sm:px-10 lg:px-12">{children}</div>
    </div>
  )
}

