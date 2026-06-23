import {
  cloneDemoRow,
  getDemoTableData,
  mutateDemoTable,
  resolveDemoRelation,
} from "@/lib/demo/demoData";

type DemoError = { message: string; code?: string; details?: string };
type DemoResult<T = unknown> = {
  data: T;
  error: DemoError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "neq"; column: string; value: unknown }
  | { kind: "in"; column: string; value: unknown[] }
  | { kind: "is"; column: string; value: unknown }
  | { kind: "not"; column: string; operator: string; value: unknown }
  | { kind: "gt" | "gte" | "lt" | "lte"; column: string; value: unknown }
  | { kind: "like" | "ilike"; column: string; value: string }
  | { kind: "or"; expression: string };

type OrderSpec = { column: string; ascending: boolean; nullsFirst?: boolean };

const PGRST116: DemoError = {
  code: "PGRST116",
  message: "JSON object requested, multiple (or no) rows returned",
};

function compareValues(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "nl");
}

function rowMatchesFilter(row: Record<string, unknown>, filter: Filter) {
  switch (filter.kind) {
    case "eq":
      return row[filter.column] === filter.value;
    case "neq":
      return row[filter.column] !== filter.value;
    case "in":
      return filter.value.includes(row[filter.column]);
    case "is":
      if (filter.value === null) return row[filter.column] == null;
      return row[filter.column] === filter.value;
    case "not": {
      if (filter.operator === "is" && filter.value === null) {
        return row[filter.column] != null;
      }
      return row[filter.column] !== filter.value;
    }
    case "gt":
      return compareValues(row[filter.column], filter.value) > 0;
    case "gte":
      return compareValues(row[filter.column], filter.value) >= 0;
    case "lt":
      return compareValues(row[filter.column], filter.value) < 0;
    case "lte":
      return compareValues(row[filter.column], filter.value) <= 0;
    case "like":
    case "ilike": {
      const raw = row[filter.column];
      if (raw == null) return false;
      const escaped = filter.value
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/%/g, ".*")
        .replace(/_/g, ".");
      const flags = filter.kind === "ilike" ? "i" : "";
      return new RegExp(`^${escaped}$`, flags).test(String(raw));
    }
    case "or": {
      const parts = filter.expression.split(",");
      return parts.some((part) => {
        const match = part.trim().match(/^(\w+)\.(eq|neq)\.(.+)$/);
        if (!match) return false;
        const [, column, op, rawValue] = match;
        const value =
          rawValue === "null"
            ? null
            : rawValue.startsWith('"') && rawValue.endsWith('"')
              ? rawValue.slice(1, -1)
              : rawValue;
        if (op === "eq") return row[column] === value;
        return row[column] !== value;
      });
    }
    default:
      return true;
  }
}

function parseSelectParts(select: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of select) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (char === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function projectRow(
  row: Record<string, unknown>,
  select: string,
): Record<string, unknown> {
  const trimmed = select.trim();
  if (trimmed === "*" || !trimmed) return cloneDemoRow(row);

  const projected: Record<string, unknown> = {};
  const parts = parseSelectParts(trimmed);

  for (const part of parts) {
    if (part === "*") {
      Object.assign(projected, cloneDemoRow(row));
      continue;
    }

    const relationMatch = part.match(/^(\w+)\((.+)\)$/);
    if (relationMatch) {
      const [, relationTable, relationSelect] = relationMatch;
      const foreignKey = `${relationTable.replace(/s$/, "")}_id`;
      const altForeignKey =
        relationTable === "merch_items" ? "merch_item_id" : foreignKey;
      const relatedId =
        row[altForeignKey] ?? row[`${relationTable.slice(0, -1)}_id`];
      const related = resolveDemoRelation(relationTable, relatedId);
      if (related) {
        projected[relationTable] = projectRow(related, relationSelect);
      } else {
        projected[relationTable] = null;
      }
      continue;
    }

    if (part in row) {
      projected[part] = row[part];
    }
  }

  return projected;
}

export class DemoQueryBuilder<T = unknown> implements PromiseLike<DemoResult<T>> {
  private table: string;
  private operation: "select" | "insert" | "update" | "delete" | "upsert" =
    "select";
  private selectClause = "*";
  private head = false;
  private countExact = false;
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private mutationPayload: Record<string, unknown> | Array<Record<string, unknown>> | null =
    null;
  private upsertConflictKey: string | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.operation === "insert" || this.operation === "upsert") {
      this.selectClause = columns;
      return this;
    }
    this.operation = "select";
    this.selectClause = columns;
    if (options?.head) this.head = true;
    if (options?.count === "exact") this.countExact = true;
    return this;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = "insert";
    this.mutationPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = "update";
    this.mutationPayload = payload;
    return this;
  }

  upsert(
    payload: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: { onConflict?: string },
  ) {
    this.operation = "upsert";
    this.mutationPayload = payload;
    this.upsertConflictKey = options?.onConflict || null;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, value: values });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.filters.push({ kind: "not", column, operator, value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ kind: "gt", column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ kind: "gte", column, value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ kind: "lt", column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ kind: "lte", column, value });
    return this;
  }

  like(column: string, value: string) {
    this.filters.push({ kind: "like", column, value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ kind: "ilike", column, value });
    return this;
  }

  match(query: Record<string, unknown>) {
    for (const [column, value] of Object.entries(query)) {
      this.filters.push({ kind: "eq", column, value });
    }
    return this;
  }

  or(expression: string) {
    this.filters.push({ kind: "or", expression });
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
      nullsFirst: options?.nullsFirst,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantMaybeSingle = true;
    return this;
  }

  then<TResult1 = DemoResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: DemoResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private applyFilters(rows: Array<Record<string, unknown>>) {
    return rows.filter((row) =>
      this.filters.every((filter) => rowMatchesFilter(row, filter)),
    );
  }

  private applySort(rows: Array<Record<string, unknown>>) {
    if (this.orders.length === 0) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      for (const order of this.orders) {
        const cmp = compareValues(a[order.column], b[order.column]);
        if (cmp !== 0) return order.ascending ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }

  private applyPagination(rows: Array<Record<string, unknown>>) {
    let next = rows;
    if (this.rangeFrom != null && this.rangeTo != null) {
      next = next.slice(this.rangeFrom, this.rangeTo + 1);
    } else if (this.limitCount != null) {
      next = next.slice(0, this.limitCount);
    }
    return next;
  }

  private formatMutationResult(rows: Array<Record<string, unknown>>): DemoResult<T> {
    const projected = rows.map((row) => projectRow(row, this.selectClause));

    if (this.wantSingle) {
      if (projected.length !== 1) {
        return { data: null as T, error: PGRST116, count: projected.length };
      }
      return { data: projected[0] as T, error: null, count: 1 };
    }

    if (this.wantMaybeSingle) {
      if (projected.length > 1) {
        return { data: null as T, error: PGRST116, count: projected.length };
      }
      return {
        data: (projected[0] ?? null) as T,
        error: null,
        count: projected.length,
      };
    }

    if (this.selectClause !== "*" && projected.length === 1) {
      return { data: projected[0] as T, error: null };
    }

    return { data: projected as T, error: null };
  }

  private executeMutation(): DemoResult<T> {
    const now = new Date().toISOString();
    const payload = Array.isArray(this.mutationPayload)
      ? this.mutationPayload[0]
      : this.mutationPayload || {};

    if (this.operation === "insert") {
      const rowsToInsert = Array.isArray(this.mutationPayload)
        ? this.mutationPayload
        : [payload];
      const inserted = rowsToInsert.map((row, index) => ({
        id: (row.id as string) || `demo-${this.table}-${Date.now()}-${index}`,
        ...row,
        created_at: (row.created_at as string) || now,
        updated_at: now,
      }));
      mutateDemoTable(this.table, (current) => [...inserted, ...current]);
      return this.formatMutationResult(inserted);
    }

    if (this.operation === "upsert") {
      const row = payload;
      const conflictKey = this.upsertConflictKey || "id";
      let upserted: Record<string, unknown>[] = [];

      mutateDemoTable(this.table, (current) => {
        const index = current.findIndex(
          (entry) => entry[conflictKey] === row[conflictKey],
        );
        if (index >= 0) {
          const next = {
            ...current[index],
            ...row,
            updated_at: now,
          };
          upserted = [next];
          const copy = [...current];
          copy[index] = next;
          return copy;
        }

        const created = {
          id: (row.id as string) || `demo-${this.table}-${Date.now()}`,
          ...row,
          created_at: now,
          updated_at: now,
        };
        upserted = [created];
        return [created, ...current];
      });

      return this.formatMutationResult(upserted);
    }

    if (this.operation === "update") {
      const updated: Record<string, unknown>[] = [];
      mutateDemoTable(this.table, (current) =>
        current.map((row) => {
          if (!this.applyFilters([row]).length) return row;
          const next = { ...row, ...payload, updated_at: now };
          updated.push(next);
          return next;
        }),
      );
      return this.formatMutationResult(updated);
    }

    mutateDemoTable(this.table, (current) =>
      current.filter((row) => !this.applyFilters([row]).length),
    );
    return { data: null as T, error: null };
  }

  private execute(): DemoResult<T> {
    if (
      this.operation === "insert" ||
      this.operation === "update" ||
      this.operation === "delete" ||
      this.operation === "upsert"
    ) {
      return this.executeMutation();
    }

    let rows = this.applyFilters(getDemoTableData(this.table));
    rows = this.applySort(rows);
    const totalCount = rows.length;
    rows = this.applyPagination(rows);
    rows = rows.map((row) => projectRow(row, this.selectClause));

    if (this.head) {
      return {
        data: null as T,
        error: null,
        count: this.countExact ? totalCount : null,
      };
    }

    if (this.wantSingle) {
      if (rows.length !== 1) {
        return { data: null as T, error: PGRST116, count: rows.length };
      }
      return { data: rows[0] as T, error: null, count: 1 };
    }

    if (this.wantMaybeSingle) {
      if (rows.length > 1) {
        return { data: null as T, error: PGRST116, count: rows.length };
      }
      return {
        data: (rows[0] ?? null) as T,
        error: null,
        count: rows.length,
      };
    }

    return {
      data: rows as T,
      error: null,
      count: this.countExact ? totalCount : rows.length,
    };
  }
}

export function demoFrom(table: string) {
  return new DemoQueryBuilder(table);
}
