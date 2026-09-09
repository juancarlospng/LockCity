"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Modal({
  children,
  onClose,
  label,
  className = "",
  testid,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
  testid?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={label}
      data-testid={testid}
      className={`lc-dialog ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
