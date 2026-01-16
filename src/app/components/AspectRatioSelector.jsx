import styles from "./AspectRatioSelector.module.css";

const RATIOS = [
    { id: "16:9", label: "16:9", desc: "标准宽屏" },
    { id: "4:3", label: "4:3", desc: "传统投影" },
    { id: "9:16", label: "9:16", desc: "手机竖屏" },
    { id: "3:4", label: "3:4", desc: "社媒文档" }
];

export default function AspectRatioSelector({ selected, onSelect, disabled }) {
    return (
        <div className={styles.container}>
            {RATIOS.map((ratio) => (
                <button
                    key={ratio.id}
                    className={`${styles.option} ${selected === ratio.id ? styles.selected : ""}`}
                    onClick={() => !disabled && onSelect(ratio.id)}
                    disabled={disabled}
                >
                    <div className={`${styles.preview} ${styles[`ratio-${ratio.id.replace(":", "-")}`]}`}></div>
                    <div className={styles.info}>
                        <span className={styles.label}>{ratio.label}</span>
                        <span className={styles.desc}>{ratio.desc}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}
