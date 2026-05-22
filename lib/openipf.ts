const OPENIPF_BASE = "https://www.openipf.org";

export type OpenIpfMeetResult = {
  sex: string;
  event: string;
  division: string;
  ageClass: string;
  weightClassKg: string;
  bodyweightKg: string;
  squatKg: number;
  benchKg: number;
  deadliftKg: number;
  totalKg: number;
  goodlift: number;
};

export type OpenIpfLifterData = {
  name: string;
  username: string;
  sex: string;
  meets: OpenIpfMeetResult[];
};

export type LeaderboardSortMetric =
  | "goodlift"
  | "total"
  | "squat"
  | "bench"
  | "deadlift";

export type LeaderboardFilters = {
  sex: "all" | "M" | "F";
  division: string;
  weightClassKg: string;
};

export type LeaderboardMeetFilters = {
  sex: LeaderboardFilters["sex"];
  weightClassKg: string;
};

export type LeaderboardAggregate = {
  sex: string;
  division: string;
  weightClassKg: string;
  bodyweightKg: string;
  squatKg: number;
  benchKg: number;
  deadliftKg: number;
  totalKg: number;
  goodlift: number;
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugifyName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function sanitizeSearchQuery(value: string) {
  return value.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, "_");
}

function namesMatch(expected: string, actual: string) {
  return normalizeName(expected) === normalizeName(actual);
}

function parseNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function rankingRowToMeet(
  row: Array<string | number | null>,
): OpenIpfMeetResult {
  return {
    sex: String(row[13] || ""),
    event: "SBD",
    division: String(row[16] || ""),
    ageClass: String(row[15] || ""),
    weightClassKg: String(row[18] || ""),
    bodyweightKg: String(row[17] || ""),
    squatKg: parseNumber(row[19]),
    benchKg: parseNumber(row[20]),
    deadliftKg: parseNumber(row[21]),
    totalKg: parseNumber(row[22]),
    goodlift: parseNumber(row[row.length - 1]),
  };
}

async function searchRankingsUsername(fullName: string) {
  const searchUrl = `${OPENIPF_BASE}/api/search/rankings?q=${encodeURIComponent(
    sanitizeSearchQuery(fullName),
  )}&start=0`;

  const searchResponse = await fetch(searchUrl, {
    next: { revalidate: 3600 },
  });

  if (!searchResponse.ok) {
    return null;
  }

  const searchData = (await searchResponse.json()) as {
    next_index?: number | null;
  };

  if (searchData.next_index == null) {
    return null;
  }

  const rankingsUrl = `${OPENIPF_BASE}/api/rankings?start=${searchData.next_index}&end=${
    searchData.next_index + 1
  }&lang=en&units=kg`;

  const rankingsResponse = await fetch(rankingsUrl, {
    next: { revalidate: 3600 },
  });

  if (!rankingsResponse.ok) {
    return null;
  }

  const rankingsData = (await rankingsResponse.json()) as {
    rows?: Array<Array<string | number | null>>;
  };

  const row = rankingsData.rows?.[0];
  if (!row) {
    return null;
  }

  const matchedName = String(row[2] || "");
  if (!namesMatch(fullName, matchedName)) {
    return null;
  }

  return {
    name: matchedName,
    username: String(row[3] || ""),
    meet: rankingRowToMeet(row),
  };
}

async function fetchLifterCsvData(
  username: string,
): Promise<OpenIpfLifterData | null> {
  const response = await fetch(`${OPENIPF_BASE}/api/liftercsv/${username}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return null;
  }

  const csv = await response.text();
  const lines = csv.trim().split("\n");

  if (lines.length < 2) {
    return null;
  }

  const headers = parseCsvLine(lines[0]);
  const nameIndex = headers.indexOf("Name");
  const sexIndex = headers.indexOf("Sex");
  const eventIndex = headers.indexOf("Event");
  const divisionIndex = headers.indexOf("Division");
  const ageClassIndex = headers.indexOf("AgeClass");
  const bodyweightIndex = headers.indexOf("BodyweightKg");
  const weightClassIndex = headers.indexOf("WeightClassKg");
  const squatIndex = headers.indexOf("Best3SquatKg");
  const benchIndex = headers.indexOf("Best3BenchKg");
  const deadliftIndex = headers.indexOf("Best3DeadliftKg");
  const totalIndex = headers.indexOf("TotalKg");
  const goodliftIndex = headers.indexOf("Goodlift");

  if (goodliftIndex === -1) {
    return null;
  }

  const meets: OpenIpfMeetResult[] = [];

  for (const line of lines.slice(1)) {
    const columns = parseCsvLine(line);

    meets.push({
      sex: columns[sexIndex] || "",
      event: columns[eventIndex] || "",
      division: columns[divisionIndex] || "",
      ageClass: columns[ageClassIndex] || "",
      weightClassKg: columns[weightClassIndex] || "",
      bodyweightKg: columns[bodyweightIndex] || "",
      squatKg: parseNumber(columns[squatIndex]),
      benchKg: parseNumber(columns[benchIndex]),
      deadliftKg: parseNumber(columns[deadliftIndex]),
      totalKg: parseNumber(columns[totalIndex]),
      goodlift: parseNumber(columns[goodliftIndex]),
    });
  }

  return {
    name: lines.length > 1 ? parseCsvLine(lines[1])[nameIndex] || username : username,
    username,
    sex: meets[0]?.sex || "",
    meets,
  };
}

export function filterMeets(
  meets: OpenIpfMeetResult[],
  filters: LeaderboardMeetFilters,
) {
  return meets.filter((meet) => {
    if (meet.event !== "SBD") {
      return false;
    }

    if (filters.sex !== "all" && meet.sex !== filters.sex) {
      return false;
    }

    if (
      filters.weightClassKg !== "all" &&
      meet.weightClassKg !== filters.weightClassKg
    ) {
      return false;
    }

    return meet.totalKg > 0;
  });
}

export function getBestTotalMeet(
  meets: OpenIpfMeetResult[],
  filters: LeaderboardMeetFilters,
): OpenIpfMeetResult | null {
  const filtered = filterMeets(meets, filters);

  if (filtered.length === 0) {
    return null;
  }

  return filtered.reduce((best, meet) =>
    meet.totalKg > best.totalKg ? meet : best,
  );
}

export function meetToAggregate(meet: OpenIpfMeetResult): LeaderboardAggregate {
  return {
    sex: meet.sex,
    division: meet.division,
    weightClassKg: meet.weightClassKg,
    bodyweightKg: meet.bodyweightKg,
    squatKg: meet.squatKg,
    benchKg: meet.benchKg,
    deadliftKg: meet.deadliftKg,
    totalKg: meet.totalKg,
    goodlift: meet.goodlift,
  };
}

export function getMetricValue(
  aggregate: LeaderboardAggregate,
  metric: LeaderboardSortMetric,
) {
  switch (metric) {
    case "total":
      return aggregate.totalKg;
    case "squat":
      return aggregate.squatKg;
    case "bench":
      return aggregate.benchKg;
    case "deadlift":
      return aggregate.deadliftKg;
    default:
      return aggregate.goodlift;
  }
}

export function aggregateLeaderboardMeets(
  meets: OpenIpfMeetResult[],
  filters: LeaderboardMeetFilters,
): LeaderboardAggregate | null {
  const bestMeet = getBestTotalMeet(meets, filters);

  if (!bestMeet) {
    return null;
  }

  return meetToAggregate(bestMeet);
}

export async function getLifterData(
  fullName: string,
): Promise<OpenIpfLifterData | null> {
  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return null;
  }

  try {
    const rankingMatch = await searchRankingsUsername(trimmedName);
    const username = rankingMatch?.username || slugifyName(trimmedName);

    if (!username) {
      return null;
    }

    const csvData = await fetchLifterCsvData(username);
    if (csvData) {
      if (!namesMatch(trimmedName, csvData.name)) {
        return null;
      }

      return csvData;
    }

    if (rankingMatch) {
      return {
        name: rankingMatch.name,
        username,
        sex: rankingMatch.meet.sex,
        meets: [rankingMatch.meet],
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function getLifterDataBatch(fullNames: string[], concurrency = 4) {
  const results = new Map<string, OpenIpfLifterData | null>();
  const queue = [...fullNames];

  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift();
      if (!name) {
        return;
      }

      results.set(name, await getLifterData(name));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, fullNames.length || 1) }, worker),
  );

  return results;
}

// Backwards-compatible helper for single-result lookups.
export async function getBestOpenIpfResult(fullName: string) {
  const lifter = await getLifterData(fullName);
  if (!lifter) {
    return null;
  }

  const aggregate = aggregateLeaderboardMeets(lifter.meets, {
    sex: "all",
    weightClassKg: "all",
  });

  if (!aggregate) {
    return null;
  }

  return {
    name: lifter.name,
    username: lifter.username,
    goodlift: aggregate.goodlift,
    totalKg: aggregate.totalKg ? String(aggregate.totalKg) : "",
    bodyweightKg: aggregate.bodyweightKg,
    meetName: "",
    date: "",
  };
}

export async function getBestOpenIpfResults(
  fullNames: string[],
  concurrency = 4,
) {
  const lifters = await getLifterDataBatch(fullNames, concurrency);
  const results = new Map<string, Awaited<ReturnType<typeof getBestOpenIpfResult>>>();

  for (const [name, lifter] of lifters) {
    if (!lifter) {
      results.set(name, null);
      continue;
    }

    const aggregate = aggregateLeaderboardMeets(lifter.meets, {
      sex: "all",
      weightClassKg: "all",
    });

    results.set(
      name,
      aggregate
        ? {
            name: lifter.name,
            username: lifter.username,
            goodlift: aggregate.goodlift,
            totalKg: aggregate.totalKg ? String(aggregate.totalKg) : "",
            bodyweightKg: aggregate.bodyweightKg,
            meetName: "",
            date: "",
          }
        : null,
    );
  }

  return results;
}
