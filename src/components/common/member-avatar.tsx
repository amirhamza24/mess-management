import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MemberAvatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-accent text-[0.7rem] font-semibold text-accent-foreground">
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
