# Text-to-SQL Architecture (Llama 3.1 8B + SQLCoder 7B)

This document captures the dual-model strategy for turning natural-language questions into safe SQL for the `madison_iot` database.

## 1. Overall Flow

1. **User question** →  
2. **Llama 3.1 8B (“Query Sherpa”)**  
   - Normalizes phrasing, corrects sensor/table names using the schema.  
   - Returns JSON `{ status, llm_query, issues[] }`.  
   - If `status !== "ok"`, show `issues` to the user (e.g., “Sensor ‘temp-10’ not found; did you mean ‘TEMP_01’?”).
3. **SQLCoder 7B** (only when status is `ok`)  
   - Receives the cleaned `llm_query` plus a trimmed schema context.  
   - Outputs a single SELECT statement (with optional natural-language summary).  
4. **Validator**  
   - Parses SQL to block writes, multi-statements, or unknown objects.  
   - Executes against the read-only connection (`localhost:5433 / madison_iot`).  
5. **Response**  
   - Return rows plus the generated SQL.  
   - If validation fails, route feedback back through Llama for a user-friendly clarification.

## 2. Schema Context Consumption

- `docs/db_context.md` (~6.8 KB ≈ 1.7k tokens) contains the authoritative schema summary.  
- Llama 3.1 8B has an 8k context window, so you can paste the entire file alongside the user query.  
- SQLCoder 7B has a smaller window (~4k tokens); provide only the relevant portions:
  1. Table summaries for `iot.sensors` and whichever readings/aggregate tables Llama referenced.
  2. Key views (`iot.latest_readings`, hourly aggregates) only when hinted (e.g., “latest”, “per hour”).
  3. Connection hints: timestamps are `TIMESTAMPTZ`, use UTC, units (°C, %, lux, dB, amps, mV).

Maintain machine-friendly JSON versions of the schema to dynamically assemble these snippets.

## 3. Prompts

### Llama 3.1 8B – Validation/Tuning
```
SYSTEM: You rewrite IoT analytics questions so they align with the Madison schema.
CONTEXT: <chunk from docs/db_context.md>
USER: <raw question>
TASKS:
  • Correct sensor/table names using the schema.
  • If an entity is missing, suggest closest matches and return status "needs_clarification".
  • When everything matches, return JSON:
    {
      "status": "ok",
      "llm_query": "<cleaned question>",
      "entities": { ...optional details... }
    }
```

### SQLCoder 7B – SQL Generation
```
SYSTEM: Generate a single PostgreSQL/Timescale SELECT. Use only the objects listed below.
CONTEXT: <subset of schema relevant to the llm_query>
USER PAYLOAD: {
  "question": "<llm_query>",
  "constraints": "<filters inferred by Llama>"
}
INSTRUCTIONS:
  • Prefer hourly aggregates when grouping by hour or longer.
  • Use UTC-aware comparisons (`time BETWEEN ...`).
  • Return only SQL plus a short explanation.
```

## 4. Validation Layer

- Parse SQL (e.g., `pgsql-ast-parser`) to ensure:
  - Single statement, read-only.
  - Only whitelisted schemas/tables (`iot.*`, `reports.*` as needed).
  - No functions outside the standard analytical set.  
- Reject and send a concise issue list to Llama so it can craft a human-facing correction.

## 5. Connection Profile (Read-Only)

```
Host     : localhost
Port     : 5433
Database : madison_iot
User     : postgres (read-only role recommended)
Password : postgres
SSL      : disabled
```

## 6. Immediate Next Steps

1. **Serialize Schema**  
   - Convert `docs/db_context.md` into JSON (tables → columns, views, aggregates) for easy prompt assembly.
2. **Implement Query Sherpa Service**  
   - Wrap Llama in an API that enforces the `{ status, llm_query, issues }` contract.
3. **Build SQL Stage + Validator**  
   - Wire SQLCoder, AST validation, and read-only execution flow.
4. **Surface UX Feedback**  
   - Integrate clarification responses into the UI (suggested sensors/tables, spelling fixes).
5. **Logging & Monitoring**  
   - Log all LLM inputs/outputs (scrub PII) for auditing and future fine-tuning.

Longer term, consider caching schema embeddings for fast lookup, and add automated tests covering ambiguous or malformed queries.
