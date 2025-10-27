import {ReactNode} from 'react';
import clsx from 'clsx';

import styles from './DataTable.module.css';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (row: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    emptyMessage?: string;
}

export const DataTable = <T, >({columns, data, emptyMessage}: DataTableProps<T>) => {
    if (!data.length) {
        return <div className={styles.emptyState}>{emptyMessage ?? 'Данные отсутствуют.'}</div>;
    }

    return (
        <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                <tr>
                    {columns.map((column) => (
                        <th key={column.key as string} className={column.className}>
                            {column.header}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, index) => (
                    <tr key={(row as { id?: string | number }).id ?? index}>
                        {columns.map((column) => (
                            <td key={column.key as string} className={column.className}>
                                {column.render ? column.render(row) : ((row as Record<string, ReactNode>)[column.key as string] ?? '—')}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export const StatusBadge = ({
                                status,
                                tone = 'neutral'
                            }: {
    status: string;
    tone?: 'neutral' | 'success' | 'warning' | 'info';
}) => (
    <span
        className={clsx(styles.badge, {
            [styles.badgeNeutral]: tone === 'neutral',
            [styles.badgeSuccess]: tone === 'success',
            [styles.badgeWarning]: tone === 'warning',
            [styles.badgeInfo]: tone === 'info'
        })}
    >
    {status}
  </span>
);
