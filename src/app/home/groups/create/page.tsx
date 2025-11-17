
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser, initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Globe, Lock } from 'lucide-react';
import { type Group } from '@/lib/types';

export default function CreateGroupPage() {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = initializeFirebase();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) {
            toast({ title: 'خطأ', description: 'يجب تسجيل الدخول لإنشاء مجموعة.', variant: 'destructive' });
            return;
        }
        if (!name.trim()) {
            toast({ title: 'خطأ', description: 'اسم المجموعة مطلوب.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        try {
            const groupData: Omit<Group, 'id'> = {
                name,
                description,
                creatorId: user.uid,
                privacy,
                memberIds: [user.uid], // Creator is the first member
                createdAt: serverTimestamp() as any,
                moderationRequired: false,
            };

            const groupsCollection = collection(firestore, 'groups');
            const docRef = await addDoc(groupsCollection, groupData);
            
            // Add the id to the document
            await updateDoc(doc(firestore, 'groups', docRef.id), { id: docRef.id });

            toast({ title: 'نجاح', description: `تم إنشاء مجموعة "${name}" بنجاح.` });
            router.push(`/home/groups/${docRef.id}`);
        } catch (error: any) {
            console.error("Error creating group:", error);
            toast({ title: 'خطأ في إنشاء المجموعة', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إنشاء مجموعة جديدة</CardTitle>
                <CardDescription>قم ببناء مجتمعك الخاص حول اهتماماتك.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreateGroup} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">اسم المجموعة</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: محبي البرمجة"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">الوصف</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="صف الغرض من هذه المجموعة..."
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-3">
                        <Label>خصوصية المجموعة</Label>
                        <RadioGroup
                            value={privacy}
                            onValueChange={(value: 'public' | 'private') => setPrivacy(value)}
                            className="grid grid-cols-2 gap-4"
                            disabled={isLoading}
                        >
                            <div>
                                <RadioGroupItem value="public" id="public" className="peer sr-only" />
                                <Label
                                    htmlFor="public"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    <Globe className="mb-3 h-6 w-6" />
                                    عامة
                                    <span className="text-xs text-muted-foreground text-center mt-1">يمكن لأي شخص العثور على المجموعة ورؤية منشوراتها.</span>
                                </Label>
                            </div>
                             <div>
                                <RadioGroupItem value="private" id="private" className="peer sr-only" />
                                <Label
                                    htmlFor="private"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    <Lock className="mb-3 h-6 w-6" />
                                    خاصة
                                    <span className="text-xs text-muted-foreground text-center mt-1">فقط الأعضاء يمكنهم رؤية المنشورات والمحتوى.</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" /> : 'إنشاء المجموعة'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
