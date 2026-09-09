import PixelMascot from "@/components/PixelMascot";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="scanlines" aria-hidden="true" />
      {children}
      <PixelMascot />
    </>
  );
}
