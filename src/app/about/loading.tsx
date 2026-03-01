/** Shown immediately while the About page bundle loads. Keeps nav visible, no full-page block. */
export default function AboutLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[201] h-0.5 bg-[#FFD700]/80 animate-pulse" aria-hidden />
  );
}
