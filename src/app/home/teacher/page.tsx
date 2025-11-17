
'use client';

import { useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CatLoader } from '@/components/cat-loader';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { GraduationCap, Video, ListVideo, MessageSquare, PlusCircle } from 'lucide-react';

export default function TeacherDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><CatLoader /></div>;
  }

  // A simple check to see if the user is likely a teacher
  if (!user || !user.email?.endsWith('@teacher.app.com')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح به</CardTitle>
          <CardDescription>هذه الصفحة مخصصة للمعلمين فقط. الرجاء تسجيل الدخول بحساب معلم.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => router.push('/teacher-login')}>الانتقال إلى صفحة تسجيل دخول المعلمين</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <GraduationCap className="h-10 w-10 text-primary" />
            <div>
              <CardTitle>أهلاً بك في لوحة تحكم المعلمين</CardTitle>
              <CardDescription>من هنا يمكنك إدارة دوراتك ودروسك التعليمية.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <Button>
                <PlusCircle className="me-2" />
                إضافة درس جديد
            </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الدروس</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">درسًا منشورًا</p>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قوائم التشغيل</CardTitle>
            <ListVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">قوائم تشغيل نشطة</p>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المنتدى</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+50</div>
            <p className="text-xs text-muted-foreground">مناقشة وتعليق</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>أحدث الدروس</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">سيتم عرض قائمة بأحدث الدروس المضافة هنا...</p>
        </CardContent>
      </Card>

    </div>
  );
}

    