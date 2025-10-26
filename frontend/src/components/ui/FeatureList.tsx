import styles from './FeatureList.module.css';

interface FeatureListProps {
    items: string[];
}

export const FeatureList = ({items}: FeatureListProps) => (
    <ul className={styles.list}>
        {items.map((item) => (
            <li key={item} className={styles.item}>
        <span aria-hidden className={styles.icon}>
          ✓
        </span>
                <span>{item}</span>
            </li>
        ))}
    </ul>
);
