import {
  Home,
  User,
  Archive,
  Search,
  Link2,
  Cat,
  Pencil,
  Lock,
  PanelLeftClose,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";

function GitHubIcon({ className }: { className?: string }) {
  return <Icon icon="simple-icons:github" className={className} />;
}

function BilibiliIcon({ className }: { className?: string }) {
  return <Icon icon="simple-icons:bilibili" className={className} />;
}

function QQIcon({ className }: { className?: string }) {
  return <Icon icon="simple-icons:tencentqq" className={className} />;
}

const icons: Record<string, LucideIcon | typeof GitHubIcon> = {
  home: Home,
  user: User,
  archive: Archive,
  search: Search,
  link: Link2,
  github: GitHubIcon as unknown as LucideIcon,
  cat: Cat,
  edit: Pencil,
  lock: Lock,
  "panel-left-close": PanelLeftClose,
  bilibili: BilibiliIcon as unknown as LucideIcon,
  qq: QQIcon as unknown as LucideIcon,
  sparkles: Sparkles,
  "message-circle": MessageCircle,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Home;
  return <Icon className={className} strokeWidth={1.5} />;
}
