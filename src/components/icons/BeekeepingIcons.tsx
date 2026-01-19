import { cn } from '@/lib/utils';
import userIcon from '/assets/user.png';
import groupIcon from '/assets/group.png';
import hiveIcon from '/assets/beehive.png';
import shopIcon from '/assets/shop.png';

type IconProps = {
  className?: string;
};

const sharedClass = 'h-5 w-5 object-contain';
const invertedClass = 'filter dark:invert';

export const UserBeeIcon = ({ className }: IconProps) => (
  <img
    src={userIcon}
    alt="Vartotojai"
    className={cn(sharedClass, className)}
    decoding="async"
  />
);

export const GroupBeeIcon = ({ className }: IconProps) => (
  <img
    src={groupIcon}
    alt="Grupes"
    className={cn(sharedClass, className)}
    decoding="async"
  />
);

export const HiveBeeIcon = ({ className }: IconProps) => (
  <img
    src={hiveIcon}
    alt="Aviliai"
    className={cn(sharedClass, invertedClass, className)}
    decoding="async"
  />
);

export const ShopBeeIcon = ({ className }: IconProps) => (
  <img
    src={shopIcon}
    alt="Parduotuve"
    className={cn(sharedClass, invertedClass, className)}
    decoding="async"
  />
);
