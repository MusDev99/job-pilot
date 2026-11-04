import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <Icon name="alert" className="size-10 text-muted" />
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink href="/" variant="primary">
        Back to home
      </ButtonLink>
    </main>
  );
}
