/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import * as React from "react";
import { ChevronDown, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { ModernUserIcon } from "@/components/ui/ModernUserIcon";

export interface ProfileDropdownData {
  name: string;
  avatar: string;
}

interface ProfileDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  data: ProfileDropdownData;
  onSettingsClick?: () => void;
}

function isImageAvatar(avatar: string) {
  return (
    avatar.startsWith("data:image/") ||
    avatar.startsWith("/") ||
    avatar.startsWith("http://") ||
    avatar.startsWith("https://")
  );
}

function Avatar({ avatar, name }: ProfileDropdownData) {
  const isImg = isImageAvatar(avatar);
  const isModern =
    !avatar ||
    avatar === '👤' ||
    avatar === 'default' ||
    avatar === 'user' ||
    avatar.startsWith('modern:');
  const modernVariant = avatar?.startsWith('modern:')
    ? avatar.replace('modern:', '')
    : 'zenith';

  return (
    <span
      className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg"
      style={{
        border: '1px solid rgba(0, 223, 129, 0.25)',
        background: 'rgba(0, 223, 129, 0.06)',
        boxShadow: '0 0 10px rgba(0, 223, 129, 0.12)',
      }}
    >
      {isImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : isModern ? (
        <ModernUserIcon variant={modernVariant} className="h-full w-full" />
      ) : (
        <span aria-hidden="true">{avatar}</span>
      )}
    </span>
  );
}

export default function ProfileDropdown({
  data,
  onSettingsClick,
  className,
  ...props
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="prism-btn flex h-12 min-w-0 items-center gap-3 px-2.5 pr-3 text-white shadow-sm focus:outline-none"
              title="Profile"
            />
          }
        >
          <Avatar avatar={data.avatar} name={data.name} />
          <span
            className="hidden max-w-32 truncate text-[13px] font-sans font-[700] leading-none tracking-[-0.01em] sm:block"
            style={{ color: '#ffffff' }}
          >
            {data.name}
          </span>
          <ChevronDown
            className={cn(
              "hidden h-4 w-4 sm:block transition-transform duration-200 ease-out",
              isOpen && "rotate-180"
            )}
            style={{ color: '#94a3b8' }}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={10}
          className="w-60 rounded-[10px] p-2 text-white shadow-xl"
          style={{
            background: '#090c12',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(20px)',
            transformOrigin: 'bottom right',
          }}
        >
          <div className="flex items-center gap-3 px-2 py-2.5">
            <Avatar avatar={data.avatar} name={data.name} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-sans font-[700] leading-tight text-white tracking-[-0.01em]">
                {data.name}
              </p>
              <p
                className="text-[11px] font-mono font-[500] leading-tight"
                style={{ color: '#94a3b8' }}
              >
                dashboard profile
              </p>
            </div>
          </div>

          <DropdownMenuSeparator style={{ background: 'rgba(255, 255, 255, 0.06)' }} className="my-1" />

          <DropdownMenuItem
            nativeButton
            render={
              <button
                type="button"
                onClick={onSettingsClick}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-mono font-[500] transition-colors"
                style={{ color: '#cbd5e1' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 223, 129, 0.06)';
                  e.currentTarget.style.color = '#00df81';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              />
            }
          >
            <Settings className="h-4 w-4" style={{ color: '#94a3b8' }} />
            <span>settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
