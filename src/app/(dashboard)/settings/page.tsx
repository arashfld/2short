import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <SettingsIcon className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold">در دست ساخت</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    صفحه تنظیمات در حال حاضر در دست ساخت است. لطفاً بعداً دوباره بررسی کنید.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
