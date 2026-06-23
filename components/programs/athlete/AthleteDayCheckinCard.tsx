"use client";

import type { AthleteDayCheckin } from "@/lib/programWeek/types";
import {
  isEmptyCheckinBw,
  isEmptyCheckinFatigue,
  isEmptyCheckinRecovery,
} from "@/lib/programDayValidation";

const SCALE_OPTIONS = [0, 2, 4, 6];

type AthleteDayCheckinCardProps = {
  checkin: AthleteDayCheckin;
  dayIsPast: boolean;
  notesOpen: boolean;
  onBwChange: (value: string) => void;
  onBwBlur: (value: string) => void;
  onRecoverySelect: (value: number) => void;
  onFatigueSelect: (value: number) => void;
  onNotesChange: (value: string) => void;
  onNotesBlur: (value: string) => void;
};

export default function AthleteDayCheckinCard({
  checkin,
  dayIsPast,
  notesOpen,
  onBwChange,
  onBwBlur,
  onRecoverySelect,
  onFatigueSelect,
  onNotesChange,
  onNotesBlur,
}: AthleteDayCheckinCardProps) {
  const bwOverdue = dayIsPast && isEmptyCheckinBw(checkin.bw);
  const recoveryOverdue =
    dayIsPast && isEmptyCheckinRecovery(checkin.recovery);
  const fatigueOverdue = dayIsPast && isEmptyCheckinFatigue(checkin.fatigue);

  return (
    <div className="athlete-program-checkin">
      <p className="athlete-program-checkin-label">Athlete check-in</p>

      {notesOpen ? (
        <textarea
          value={checkin.notes || ""}
          onChange={(event) => onNotesChange(event.target.value)}
          onBlur={(event) => onNotesBlur(event.target.value)}
          placeholder="Notes over deze dag..."
          className="athlete-program-checkin-notes"
        />
      ) : null}

      <div className="athlete-program-checkin-grid">
        <div>
          <p className="athlete-program-checkin-field-label">BW</p>
          <input
            value={checkin.bw || ""}
            onChange={(event) => onBwChange(event.target.value)}
            onBlur={(event) => onBwBlur(event.target.value.trim())}
            placeholder="—"
            inputMode="decimal"
            className={`athlete-program-checkin-bw ${
              bwOverdue ? "is-overdue" : ""
            }`}
          />
        </div>

        <div>
          <p className="athlete-program-checkin-field-label">Herstel</p>
          <div
            className={`athlete-program-scale ${
              recoveryOverdue ? "is-overdue" : ""
            }`}
          >
            {SCALE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onRecoverySelect(option)}
                className={`athlete-program-scale-btn athlete-program-scale-btn--recovery ${
                  checkin.recovery === option ? "is-selected" : ""
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="athlete-program-checkin-field-label">Fatigue</p>
          <div
            className={`athlete-program-scale ${
              fatigueOverdue ? "is-overdue" : ""
            }`}
          >
            {SCALE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onFatigueSelect(option)}
                className={`athlete-program-scale-btn athlete-program-scale-btn--fatigue ${
                  checkin.fatigue === option ? "is-selected" : ""
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
