import type { ReactNode } from "react";

export function AuthPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full">
      <header className="mb-8 space-y-2 text-center md:text-start">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</div>
        ) : null}
      </header>

      {children}

      {footer ? footer : null}
    </div>
  );
}
