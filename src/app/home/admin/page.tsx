'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, initializeFirebase } from '@/firebase';
import { type Report, type User } from '@/lib/types';
import { getReports, updateReportStatus } from '@/services/report-service';
import { deletePost } from '@/services/post-service';
import { deleteUserAndContent, getUserById } from '@/services/user-service';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Simple admin check
const isAdminUser = (user: User | null) => {
    if (!user) return false;
    return user.email === 'admin@app.com';
};

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({});
  const [reportedUsers, setReportedUsers] = useState<Record<string, User>>({});

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (isAdmin) {
      getReports('pending').then(async (fetchedReports) => {
        setReports(fetchedReports);
        
        // Fetch user data for reports on users
        const userReportIds = fetchedReports
            .filter(r => r.reportedEntityType === 'user' && !reportedUsers[r.reportedEntityId])
            .map(r => r.reportedEntityId);
        
        if (userReportIds.length > 0) {
            const uniqueUserIds = [...new Set(userReportIds)];
            const usersData = await Promise.all(uniqueUserIds.map(id => getUserById(id)));
            const usersMap = usersData.reduce((acc, userData) => {
                if (userData) {
                    acc[userData.id] = userData;
                }
                return acc;
            }, {} as Record<string, User>);
            setReportedUsers(prev => ({ ...prev, ...usersMap }));
        }

        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const handleAction = async (reportId: string, action: () => Promise<any>, successMessage: string) => {
    setIsActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      await action();
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({ title: successMessage });
    } catch (error: any) {
      console.error("Admin action failed:", error);
      toast({ title: "خطأ", description: error.message || "فشل الإجراء.", variant: "destructive" });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handlePostDelete = (report: Report) => {
    handleAction(report.id, async () => {
        const { firestore } = initializeFirebase();
        const { getDoc, doc } = await import('firebase/firestore');
        const postRef = doc(firestore, 'posts', report.reportedEntityId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            await deletePost(report.reportedEntityId, postSnap.data().imageUrls || [], true);
        }
        await updateReportStatus(report.id, 'resolved');
    }, "تم حذف المنشور بنجاح.");
  };

  const handleUserDelete = (report: Report) => {
      handleAction(report.id, async () => {
          await deleteUserAndContent(report.reportedEntityId);
          await updateReportStatus(report.id, 'resolved');
      }, "تم حذف المستخدم وكل محتوياته بنجاح.");
  };

  const handleDismissReport = (reportId: string) => {
    handleAction(reportId, () => updateReportStatus(reportId, 'dismissed'), "تم تجاهل الإبلاغ.");
  };

  if (isLoading || isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح به</CardTitle>
          <CardDescription>ليس لديك الصلاحية للوصول إلى هذه الصفحة.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>لوحة تحكم المشرفين</CardTitle>
          <CardDescription>مراجعة الإبلاغات المعلقة واتخاذ الإجراءات اللازمة.</CardDescription>
        </CardHeader>
      </Card>

      {reports.length === 0 ? (
        <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                <ShieldAlert className="h-10 w-10 mx-auto mb-4" />
                لا توجد إبلاغات معلقة حاليًا. عمل رائع!
            </CardContent>
        </Card>
      ) : (
        reports.map((report) => {
            const reportedUser = reportedUsers[report.reportedEntityId];
            return (
                <Card key={report.id}>
                    <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>إبلاغ عن {report.reportedEntityType === 'post' ? 'منشور' : 'مستخدم'}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            {new Date(report.createdAt.toDate()).toLocaleDateString('ar')}
                        </span>
                    </CardTitle>
                    <CardDescription>
                        {report.reportedEntityType === 'post' && `معرف المنشور: ${report.reportedEntityId}`}
                        {report.reportedEntityType === 'user' && reportedUser &&
                            <Link href={`/home/profile/${reportedUser.username}`} className="hover:underline text-primary">
                                الملف الشخصي للمستخدم: @{reportedUser.username}
                            </Link>
                        }
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <p><span className="font-semibold">السبب:</span> {report.reason}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">مقدم البلاغ:</span> {report.reporterId}</p>
                    </CardContent>
                    <CardFooter className="gap-2">
                    {report.reportedEntityType === 'post' && (
                        <Button 
                            variant="destructive" 
                            onClick={() => handlePostDelete(report)}
                            disabled={isActionLoading[report.id]}
                        >
                            {isActionLoading[report.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2/> حذف المنشور</>}
                        </Button>
                    )}
                     {report.reportedEntityType === 'user' && (
                        <Button 
                            variant="destructive" 
                            onClick={() => handleUserDelete(report)}
                            disabled={isActionLoading[report.id]}
                        >
                            {isActionLoading[report.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : <><Trash2/> حذف المستخدم</>}
                        </Button>
                    )}
                    <Button 
                        variant="secondary"
                        onClick={() => handleDismissReport(report.id)}
                        disabled={isActionLoading[report.id]}
                    >
                        {isActionLoading[report.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : "تجاهل الإبلاغ"}
                    </Button>
                    </CardFooter>
                </Card>
            );
        })
      )}
    </div>
  );
}
