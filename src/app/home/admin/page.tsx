'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { type Report } from '@/lib/types';
import { getReports, updateReportStatus } from '@/services/report-service';
import { deletePost } from '@/services/post-service';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function AdminPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<Record<string, boolean>>({});

  // A simple check to see if the current user is the admin.
  // In a real app, this should be based on a custom claim or a role in the database.
  const isAdmin = user?.email === 'admin@app.com' || user?.uid === 'oImAj9urAsZL9zkezvOd7soIrsS2';

  useEffect(() => {
    if (isAdmin) {
      getReports('pending').then((fetchedReports) => {
        setReports(fetchedReports);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const handlePostDelete = async (report: Report) => {
    if (report.reportedEntityType !== 'post') return;

    setIsActionLoading(prev => ({ ...prev, [report.id]: true }));
    try {
      // Fetch post to get imageUrls for deletion from storage
      const { firestore } = initializeFirebase();
      const { getDoc, doc } = await import('firebase/firestore');
      const postRef = doc(firestore, 'posts', report.reportedEntityId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
          const postData = postSnap.data();
          await deletePost(report.reportedEntityId, postData.imageUrls || []);
          await updateReportStatus(report.id, 'resolved');
          setReports(prev => prev.filter(r => r.id !== report.id));
          toast({ title: "تم حذف المنشور وتحديث حالة الإبلاغ." });
      } else {
         // If post doesn't exist, just resolve the report
         await updateReportStatus(report.id, 'resolved');
         setReports(prev => prev.filter(r => r.id !== report.id));
         toast({ title: "المنشور غير موجود بالفعل. تم تحديث حالة الإبلاغ.", variant: "default" });
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({ title: "خطأ", description: "لم نتمكن من حذف المنشور.", variant: "destructive" });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [report.id]: false }));
    }
  };

  const handleDismissReport = async (reportId: string) => {
    setIsActionLoading(prev => ({ ...prev, [reportId]: true }));
    try {
      await updateReportStatus(reportId, 'dismissed');
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({ title: "تم تجاهل الإبلاغ." });
    } catch (error) {
      console.error("Error dismissing report:", error);
      toast({ title: "خطأ", description: "لم نتمكن من تجاهل الإبلاغ.", variant: "destructive" });
    } finally {
      setIsActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>;
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
                لا توجد إبلاغات معلقة حاليًا.
            </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="text-lg">إبلاغ عن {report.reportedEntityType === 'post' ? 'منشور' : 'كيان'}</CardTitle>
              <CardDescription>
                معرف الكيان: {report.reportedEntityId}
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
                    {isActionLoading[report.id] ? <Loader2 className="h-4 w-4 animate-spin"/> : "حذف المنشور"}
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
        ))
      )}
    </div>
  );
}