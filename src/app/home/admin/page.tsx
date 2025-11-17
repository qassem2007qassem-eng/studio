

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { type Report, type User } from '@/lib/types';
import { getReports, updateReportStatus } from '@/services/report-service';
import { deletePost } from '@/services/post-service';
import { deleteUserAndContent, getUserById, approveVerificationRequest } from '@/services/user-service';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Trash2, Verified, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

// Simple admin check
const isAdminUser = (user: User | null) => {
    if (!user) return false;
    // This check must match the admin user created for authentication
    return user.email === 'admin@app.com';
};

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({});
  const [reportedUsers, setReportedUsers] = useState<Record<string, User>>({});

  const isAdmin = isAdminUser(user as User);

  useEffect(() => {
    if (isUserLoading) return;

    if (isAdmin) {
      const fetchAllReports = async () => {
        setIsLoading(true);
        const allPendingReports = await getReports('pending');
        
        const contentReports = allPendingReports.filter(r => r.reportedEntityType !== 'verification_request');
        const verifReports = allPendingReports.filter(r => r.reportedEntityType === 'verification_request');
        
        setReports(contentReports);
        setVerificationRequests(verifReports);

        const userReportIds = [...allPendingReports]
            .filter(r => (r.reportedEntityType === 'user' || r.reportedEntityType === 'verification_request') && !reportedUsers[r.reportedEntityId])
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
      };
      fetchAllReports();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, isUserLoading]);

  const handleAction = async (reportId: string, action: () => Promise<any>, successMessage: string) => {
    setIsActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      await action();
      setReports(prev => prev.filter(r => r.id !== reportId));
      setVerificationRequests(prev => prev.filter(r => r.id !== reportId));
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
        await deletePost(report.reportedEntityId, true);
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
  
  const handleApproveVerification = (report: Report) => {
    handleAction(report.id, () => approveVerificationRequest(report.reportedEntityId, report.id), "تم توثيق الحساب بنجاح.");
  };

  if (isLoading || isUserLoading) {
    return <div className="flex justify-center items-center h-screen"><Skeleton className="h-48 w-full max-w-2xl" /></div>;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>غير مصرح به</CardTitle>
          <CardDescription>ليس لديك الصلاحية للوصول إلى هذه الصفحة. الرجاء تسجيل الدخول بحساب المشرف.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const renderContentReports = () => {
    if (reports.length === 0) return null;
    return (
      <div className="space-y-4">
        {reports.map((report) => {
            const reportedUser = reportedUsers[report.reportedEntityId];
            return (
                <Card key={report.id}>
                    <CardHeader>
                    <CardTitle className="text-lg flex justify-between items-center">
                        <span>إبلاغ عن {report.reportedEntityType === 'post' ? 'منشور' : 'مستخدم'}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            {report.createdAt?.toDate ? new Date(report.createdAt.toDate()).toLocaleDateString('ar') : '...'}
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
                            {isActionLoading[report.id] ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><Trash2/> حذف المنشور</>}
                        </Button>
                    )}
                     {report.reportedEntityType === 'user' && (
                        <Button 
                            variant="destructive" 
                            onClick={() => handleUserDelete(report)}
                            disabled={isActionLoading[report.id]}
                        >
                            {isActionLoading[report.id] ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><Trash2/> حذف المستخدم</>}
                        </Button>
                    )}
                    <Button 
                        variant="secondary"
                        onClick={() => handleDismissReport(report.id)}
                        disabled={isActionLoading[report.id]}
                    >
                        {isActionLoading[report.id] ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : "تجاهل الإبلاغ"}
                    </Button>
                    </CardFooter>
                </Card>
            );
        })}
      </div>
    );
  };

  const renderVerificationRequests = () => {
    if (verificationRequests.length === 0) return null;
    return (
        <div className="space-y-4">
            {verificationRequests.map(report => {
                const requestedUser = reportedUsers[report.reportedEntityId];
                if (!requestedUser) return null;
                 return (
                    <Card key={report.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">طلب توثيق حساب</CardTitle>
                            <CardDescription>
                                <Link href={`/home/profile/${requestedUser.username}`} className="hover:underline text-primary">
                                    @{requestedUser.username}
                                </Link>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p><span className="font-semibold">اسم المستخدم:</span> {requestedUser.name}</p>
                            <p><span className="font-semibold">البريد الإلكتروني:</span> {requestedUser.email}</p>
                            <p className="text-sm text-muted-foreground"><span className="font-semibold">تاريخ الطلب:</span> {report.createdAt?.toDate ? new Date(report.createdAt.toDate()).toLocaleDateString('ar') : '...'}</p>
                        </CardContent>
                        <CardFooter className="gap-2">
                             <Button
                                onClick={() => handleApproveVerification(report)}
                                disabled={isActionLoading[report.id]}
                                className="bg-green-600 hover:bg-green-700 text-white"
                             >
                                {isActionLoading[report.id] ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : <><UserCheck/> توثيق الحساب</>}
                            </Button>
                             <Button 
                                variant="secondary"
                                onClick={() => handleDismissReport(report.id)}
                                disabled={isActionLoading[report.id]}
                            >
                                {isActionLoading[report.id] ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : "تجاهل الطلب"}
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>لوحة تحكم المشرفين</CardTitle>
          <CardDescription>مراجعة الإبلاغات وطلبات التوثيق المعلقة.</CardDescription>
        </CardHeader>
      </Card>
      
      {verificationRequests.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Verified className="text-blue-500" /> طلبات التوثيق</CardTitle>
            </CardHeader>
             <CardContent>
                {renderVerificationRequests()}
            </CardContent>
        </Card>
      )}
      
      {reports.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive" /> إبلاغات المحتوى</CardTitle>
            </CardHeader>
            <CardContent>
                {renderContentReports()}
            </CardContent>
        </Card>
      )}

      {reports.length === 0 && verificationRequests.length === 0 && (
        <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                <ShieldAlert className="h-10 w-10 mx-auto mb-4" />
                لا توجد إبلاغات أو طلبات معلقة حاليًا. عمل رائع!
            </CardContent>
        </Card>
      )}
    </div>
  );
}
