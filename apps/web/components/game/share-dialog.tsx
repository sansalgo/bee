"use client"

import { useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  FacebookLogoIcon,
  ShareNetworkIcon,
  TelegramLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

const shareText = "Join my game room!"

function buildRoomUrl(code: string) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/join?code=${code}`
}

export function ShareDialog({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const roomUrl = buildRoomUrl(code)
  const encodedUrl = encodeURIComponent(roomUrl)
  const encodedText = encodeURIComponent(shareText)

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: WhatsappLogoIcon,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      name: "X",
      icon: XLogoIcon,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: "Facebook",
      icon: FacebookLogoIcon,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Telegram",
      icon: TelegramLogoIcon,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
  ]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(roomUrl)
      setCopied(true)
      toast.success("Link copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy link")
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon-sm">
            <ShareNetworkIcon />
            <span className="sr-only">Share</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share room</DialogTitle>
          <DialogDescription>Invite others to join room {code}.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input value={roomUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="sr-only">Copy link</span>
          </Button>
        </div>
        <div className="flex justify-between gap-2">
          {socialLinks.map(({ name, icon: Icon, href }) => (
            <Button
              key={name}
              variant="outline"
              size="icon"
              className="flex-1"
              nativeButton={false}
              render={<a href={href} target="_blank" rel="noopener noreferrer" />}
            >
              <Icon />
              <span className="sr-only">Share on {name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
