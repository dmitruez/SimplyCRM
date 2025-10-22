import styles from './IdeaCard.module.css';

interface IdeaCardProps {
  title: string;
  author: string;
  summary: string;
}

export const IdeaCard = ({ title, author, summary }: IdeaCardProps) => (
  <article className={styles.card}>
    <h4>{title}</h4>
    <span className={styles.author}>{author}</span>
    <p>{summary}</p>
  </article>
);
