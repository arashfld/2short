
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Send } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
// Decoupled from Firebase: use a minimal creator shape
interface CreatorInfo {
  id: string;
  fullName: string;
  imageUrl?: string | null;
}

interface PostComposerProps {
  onPost: (data: PostFormValues) => void;
  creator: CreatorInfo;
}

const postSchema = z.object({
  title: z.string().min(1, { message: "عنوان پست الزامی است." }),
  content: z.string().min(1, { message: "محتوای پست الزامی است." }),
  image: z.any().optional(),
  imageUrl: z
    .string()
    .url({ message: "یک لینک تصویر معتبر وارد کنید." })
    .optional(),
  requiredTier: z.enum(['3', '2', '1', '0'], { required_error: "باید سطح دسترسی را انتخاب کنید." }),
});

export type PostFormValues = z.infer<typeof postSchema>;

export function PostComposer({ onPost, creator }: PostComposerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkValid, setLinkValid] = useState<boolean | null>(null);
  const { toast } = useToast();
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      requiredTier: '0', // Default to public
      image: undefined,
      imageUrl: undefined,
    },
  });

  // Validate external image link for public accessibility
  const imageUrl = form.watch('imageUrl');
  useEffect(() => {
    if (!imageUrl) {
      setLinkValid(null);
      return;
    }
    try {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.crossOrigin = 'anonymous';
      img.onload = () => setLinkValid(true);
      img.onerror = () => setLinkValid(false);
      img.src = imageUrl;
    } catch {
      setLinkValid(false);
    }
  }, [imageUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: PostFormValues) => {
    // If a link was provided, ensure it’s publicly reachable
    if (data.imageUrl && linkValid === false) {
      toast({
        title: 'لینک تصویر نامعتبر است',
        description: 'لطفاً یک لینک عمومی معتبر برای تصویر وارد کنید یا فایل آپلود کنید.',
        variant: 'destructive',
      });
      return;
    }
    onPost(data);
    form.reset();
    setImagePreview(null);
    // Also reset file input visually
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar>
            <AvatarImage src={creator.imageUrl} alt={creator.fullName} />
            <AvatarFallback>{creator.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='w-full'>
            <p className="font-semibold">{creator.fullName}</p>
            <p className="text-sm text-muted-foreground">در حال ایجاد یک پست جدید...</p>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان پست</FormLabel>
                  <FormControl>
                    <Input placeholder="عنوان جذاب پست شما..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محتوای پست</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="در مورد چه چیزی می‌نویسید؟"
                      className="resize-y"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تصویر فایل (اختیاری)</FormLabel>
                  <FormControl>
                    <Input 
                      id="image-upload"
                      type="file" 
                      accept="image/*"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      onChange={(e) => {
                        field.onChange(e.target.files);
                        handleImageChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>لینک تصویر (اختیاری)
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/image.jpg" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">می‌توانید به‌جای آپلود، لینک مستقیم فایل تصویر (jpg/png/webp) را وارد کنید.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {imagePreview ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                <Image src={imagePreview} alt="Image preview" fill className="object-cover" />
              </div>
            ) : form.watch('imageUrl') ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                {/* Use plain img to avoid domain restrictions during preview */}
                <img src={form.watch('imageUrl')!} alt="Image preview" className="w-full h-full object-cover" />
              </div>
            ) : null}
            
            <FormField
              control={form.control}
              name="requiredTier"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>چه کسی می‌تواند این پست را ببیند؟</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                      dir="rtl"
                    >
                       <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="3" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          برای مشترکین سطح ۳ و بالاتر
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="2" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          برای مشترکین سطح ۲ و بالاتر
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="1" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          برای مشترکین سطح ۱ و بالاتر
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="0" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          عمومی - برای همه قابل مشاهده است
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button type="submit" className="gap-2">
                <Send className="h-4 w-4" />
                <span>ایجاد پست</span>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
