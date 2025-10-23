import { HTMLAttributes } from 'react';
import clsx from 'clsx';

import styles from './Card.module.css';

type Variant = 'default' | 'subdued';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export const Card = ({ variant = 'default', className, ...rest }: CardProps) => (
  <div
    className={clsx(
      styles.card,
      variant === 'subdued' && styles.subdued,
      className
    )}
    {...rest}
  />
);
