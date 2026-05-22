"use client";

import { getInitials } from "@/lib/chatUtils";

type ChatAvatarProps = {
  name?: string | null;
  imageUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  children?: React.ReactNode;
};

export default function ChatAvatar({
  name,
  imageUrl,
  className = "h-12 w-12",
  fallbackClassName = "bg-black text-white",
  children,
}: ChatAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || "Avatar"}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-sm font-semibold ${fallbackClassName} ${className}`}
    >
      {children || getInitials(name)}
    </div>
  );
}
