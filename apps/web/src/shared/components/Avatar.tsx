
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

export function Avatar({ name, src, size = 32 }: AvatarProps) {
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" style={style} className="shrink-0 rounded-pill object-cover" />;
  return (
    <span
      aria-hidden
      style={style}
      className="grid shrink-0 place-items-center rounded-pill bg-secondary text-sm font-semibold text-on-secondary"
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
