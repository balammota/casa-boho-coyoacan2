import { Suspense } from "react";
import { GuestLangFromQuery } from "@/components/guest/GuestLangFromQuery";
import { GuestPortalChrome } from "@/components/guest/GuestPortalChrome";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <GuestLangFromQuery />
      </Suspense>
      <GuestPortalChrome />
      {children}
    </>
  );
}
