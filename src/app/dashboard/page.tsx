import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

// Server Action for creating a new resume
async function createResume() {
  "use server";
  
  // Demo user ID
  const userId = "demo-user-id";
  
  const resume = await prisma.resume.create({
    data: {
      title: "Untitled Resume",
      content: {}, // Should initialize with default template data ideally
      template: "simple",
      user: {
        connectOrCreate: {
          where: { clerkId: userId },
          create: { clerkId: userId, email: "demo@example.com" },
        },
      },
    },
  });
  
  return resume.id;
}

// Server Action for deleting
async function deleteResume(id: string) {
  "use server";
  await prisma.resume.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  // Demo user fetch
  const userId = "demo-user-id";
  
  // Ensure user exists for demo purposes
  try {
     // Fetch resumes
    const resumes = await prisma.resume.findMany({
        where: { user: { clerkId: userId } },
        orderBy: { updatedAt: "desc" },
    });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
          <form action={async () => {
            "use server"
            const id = await createResume();
            // Redirect happens on client usually or via redirect() here, 
            // but we want to navigate. Since this is a server action called from form,
            // we can use redirect imported from next/navigation.
            const { redirect } = await import("next/navigation");
            redirect(`/editor/${id}`);
          }}>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Resume
            </Button>
          </form>
        </header>

        {resumes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed">
            <p className="text-gray-500 mb-4">No resumes found. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group relative"
              >
                <Link href={`/editor/${resume.id}`} className="block h-48 bg-gray-100 relative">
                  {/* Thumbnail placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                     <FileText className="w-12 h-12" />
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 truncate">{resume.title}</h3>
                  <p className="text-sm text-gray-500">
                    Updated {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">
                      {resume.template}
                    </span>
                    <form action={deleteResume.bind(null, resume.id)}>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  } catch (e) {
      return (
          <div className="p-8 text-center text-red-500">
              Error connecting to database. Please make sure DATABASE_URL is set and migrations are run.
          </div>
      )
  }
}
