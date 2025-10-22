import styles from './PricingCard.module.css';
import { Button } from './Button';

interface FeatureToggle {
  label: string;
  enabled: boolean;
}

interface PricingCardProps {
  planName: string;
  priceLabel: string;
  description: string;
  features: FeatureToggle[];
  ctaLabel: string;
  highlighted?: boolean;
  onCtaClick?: () => void;
}

export const PricingCard = ({
  planName,
  priceLabel,
  description,
  features,
  ctaLabel,
  highlighted,
  onCtaClick
}: PricingCardProps) => (
  <article
    className={styles.card}
    aria-label={`Тарифный план ${planName}`}
    data-highlighted={highlighted}
  >
    <header className={styles.header}>
      <span className={styles.planName}>{planName}</span>
      <span className={styles.price}>{priceLabel}</span>
      <p>{description}</p>
    </header>
    <ul className={styles.features}>
      {features.map((feature) => (
        <li
          key={feature.label}
          className={!feature.enabled ? styles.featureDisabled : undefined}
        >
          {feature.label}
        </li>
      ))}
    </ul>
    <Button onClick={onCtaClick}>{ctaLabel}</Button>
  </article>
);
