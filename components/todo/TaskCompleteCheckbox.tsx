"use client";

type TaskCompleteCheckboxProps = {
  checked: boolean;
  isAnimating?: boolean;
  reducedMotion?: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export default function TaskCompleteCheckbox({
  checked,
  isAnimating = false,
  reducedMotion = false,
  onToggle,
  disabled = false,
}: TaskCompleteCheckboxProps) {
  const showChecked = checked || isAnimating;

  return (
    <button
      type="button"
      className={[
        "task-complete-checkbox",
        showChecked ? "is-checked" : "",
        isAnimating && !reducedMotion ? "is-animating" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onToggle();
      }}
      disabled={disabled}
      aria-label={showChecked ? "Taak heropenen" : "Taak afvinken"}
      aria-pressed={showChecked}
    >
      <svg
        className="task-complete-checkbox__mark"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M3.5 8.2 6.4 11.1 12.5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
