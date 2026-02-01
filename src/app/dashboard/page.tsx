import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

// Server Action for creating a new resume
async function createResume() {
  "use server";
  
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;

  if (!userId) throw new Error("Unauthorized");
  
  const resume = await prisma.resume.create({
    data: {
      title: "未命名简历",
      content: {}, 
      template: "simple",
      user: {
        connect: { wxId: userId }
      },
    },
  });
  
  return resume.id;
}

// Server Action for deleting
async function deleteResume(id: string) {
  "use server";
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");

  await prisma.resume.delete({ 
    where: { 
      id,
      user: { wxId: userId }
    } 
  });
  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;

  if (!userId) {
    redirect('/login?redirect=/dashboard');
  }
  
  try {
     // Fetch resumes for the logged-in user
    const resumes = await prisma.resume.findMany({
        where: { user: { wxId: userId } },
        orderBy: { updatedAt: "desc" },
    });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">我的简历</h1>
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
              新建简历
            </Button>
          </form>
        </header>

        {resumes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed">
            <p className="text-gray-500 mb-4">暂无简历，创建您的第一份简历吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group relative"
              >
                <Link href={`/editor/${resume.id}`} className="block h-48 bg-gray-100 relative group">
                  {resume.thumbnail ? (
                    <Image 
                      src={resume.thumbnail} 
                      alt={resume.title} 
                      fill 
                      className="object-cover object-top transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <FileText className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 truncate">{resume.title}</h3>
                  <p className="text-sm text-gray-500">
                    更新于 {new Date(resume.updatedAt).toLocaleDateString('zh-CN')}
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
  } catch {
      return (
          <div className="p-8 text-center text-red-500">
              数据库连接失败，请确保数据库配置正确并已运行迁移。
          </div>
      )
  }
}
