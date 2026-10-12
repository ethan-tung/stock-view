import Link from "next/link";
import { CandlestickChart } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE_LABEL ?? "实时行情";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CandlestickChart className="h-5 w-5 text-primary" />
          <span>股票查看</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {dataSource}
          </Badge>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
