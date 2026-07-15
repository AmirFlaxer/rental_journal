import { ICONS, type IconName } from "@/lib/icons";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
};

export function Icon({ name, size = 20, className, color }: IconProps) {
  const Component = ICONS[name];
  return <Component weight="duotone" size={size} className={className} color={color} />;
}
