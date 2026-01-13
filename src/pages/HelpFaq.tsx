import { MainLayout } from "@/components/Layout/MainLayout";
import termsContent from "../../docs/T&C.md?raw";

const HelpFaq = () => (
  <MainLayout>
    <main className="mx-auto max-w-4xl space-y-6 py-16 px-6">
      <div className="rounded-xl border border-border bg-card/80 p-6 text-sm leading-relaxed text-muted-foreground">
        <pre className="whitespace-pre-line break-keep text-sm text-foreground">{termsContent}</pre>
      </div>
    </main>
  </MainLayout>
);

export default HelpFaq;
