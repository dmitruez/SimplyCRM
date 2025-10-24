import {ButtonHTMLAttributes} from 'react';
import clsx from 'clsx';

import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'link';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
}

export const Button = ({
                           variant = 'primary',
                           className,
                           type = 'button',
                           ...rest
                       }: ButtonProps) => (
    <button
        type={type}
        className={clsx(styles.button, styles[variant], rest.disabled && styles.disabled, className)}
        {...rest}
    />
);
