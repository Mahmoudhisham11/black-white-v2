"use client";
import styles from "./styles.module.css";
export default function Loader() {
  return (
    <div className={styles.loaderContainer}>
      <p className={styles.loader}>
        <span>Black & White</span>
      </p>
    </div>
  );
}
