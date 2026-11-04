/* eslint-disable @next/next/no-img-element -- a 40px Google image: next/image would need a remote loader for no gain */
// Profile picture with an initial as the fallback. The URL was checked by `safePictureUrl` (Google's image host only).
export function Avatar({ name, picture, size = "md" }: { name: string; picture?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-12 text-lg" : "size-9 text-sm";
  return picture ? (
    // referrerPolicy: Google's image host serves less reliably when a Referer is sent.
    <img src={picture} alt="" referrerPolicy="no-referrer" className={`${box} rounded-full border border-border object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex items-center justify-center rounded-full bg-primary/15 font-semibold text-primary`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
