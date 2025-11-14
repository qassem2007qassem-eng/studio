
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import { type Group } from '@/lib/types';

interface ShareGroupDialogProps {
  group: Group;
  children: React.ReactNode;
}

const SocialIcon = ({ platform }: { platform: 'whatsapp' | 'facebook' | 'telegram' }) => {
    const icons = {
        whatsapp: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        ),
        facebook: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        ),
        telegram: (
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><path d="M22 2 11 13 2 9l20-7-9 11-7 2z"></path></svg>
        ),
    }
    return icons[platform];
}

export function ShareGroupDialog({ group, children }: ShareGroupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // This ensures we only run this on the client side where window is available
    setOrigin(window.location.origin);
  }, []);

  const groupUrl = `${origin}/home/groups/${group.id}`;
  const shareText = `انضم إلى مجموعتي "${group.name}" في مجمع الطلاب السوري!\n${group.description || ''}`;

  const shareOptions = [
    { name: 'WhatsApp', icon: <SocialIcon platform="whatsapp" />, url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + groupUrl)}` },
    { name: 'Facebook', icon: <SocialIcon platform="facebook" />, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(groupUrl)}&quote=${encodeURIComponent(shareText)}` },
    { name: 'Telegram', icon: <SocialIcon platform="telegram" />, url: `https://t.me/share/url?url=${encodeURIComponent(groupUrl)}&text=${encodeURIComponent(shareText)}` },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(groupUrl);
    setIsCopied(true);
    toast({ title: 'تم نسخ الرابط!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>مشاركة المجموعة: {group.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="flex justify-around">
                {shareOptions.map(option => (
                    <a key={option.name} href={option.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        {option.icon}
                        <span className="text-xs font-medium">{option.name}</span>
                    </a>
                ))}
            </div>
            <div className="space-y-2">
                <Label htmlFor="group-url">أو انسخ الرابط</Label>
                <div className="flex gap-2">
                    <Input id="group-url" value={groupUrl} readOnly />
                    <Button size="icon" onClick={handleCopy}>
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
