import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createResume } from "@/app/actions";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold mb-8">
          Resume <span className="text-blue-600">Builder</span>
        </h1>
        <p className="mt-3 text-2xl text-gray-600 mb-8">
          Build your professional resume in minutes.
        </p>
        <div className="flex gap-4">
          <form action={createResume}>
            <Button size="lg" type="submit">Create New Resume</Button>
          </form>
          <Link href="/dashboard">
             <Button variant="outline" size="lg">Dashboard</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
