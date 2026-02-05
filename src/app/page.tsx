export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-2xl rounded-2xl border bg-card p-6 text-center shadow-2xl">
        <h1 className="text-xl font-bold text-primary">پلیر آنلاین Aoyume</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          این اپ فقط برای پخش آنلاین است. لینک‌ها از سایت اصلی ارسال می‌شوند.
        </p>
        <p className="mt-6 text-xs text-muted-foreground/60">
          نمونه مسیر: <span className="font-mono text-accent-foreground bg-accent px-1 py-0.5 rounded">/watch/1234/example-slug</span>
        </p>
      </main>
    </div>
  );
}
