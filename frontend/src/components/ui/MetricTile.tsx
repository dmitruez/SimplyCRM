import styles from './MetricTile.module.css';

interface MetricTileProps {
  title: string;
  value: string;
  deltaLabel?: string;
}

export const MetricTile = ({ title, value, deltaLabel }: MetricTileProps) => (
  <div className={styles.tile}>
    <span className={styles.title}>{title}</span>
    <span className={styles.value}>{value}</span>
    {deltaLabel ? <span className={styles.delta}>{deltaLabel}</span> : null}
  </div>
);
