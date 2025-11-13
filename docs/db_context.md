# Database Context for Text-to-SQL

Prepared for SQL-focused LLMs (e.g., Qwen2.5-Coder via Ollama) so natural-language queries can be translated into safe, accurate SQL against the `madison_iot` database.

## Connection Profile

```
Host      : localhost
Port      : 5433
Database  : madison_iot
User      : postgres
Password  : postgres
SSL       : disabled
Timezone  : UTC (timestamps stored as TIMESTAMPTZ)
```

Use a read-only Postgres role when executing generated SQL.

## Schemas Overview

### iot.sensors
| Column        | Type                  | Notes                                   |
|---------------|-----------------------|-----------------------------------------|
| sensor_id PK  | integer               | Surrogate id, auto-increment            |
| sensor_code   | varchar(10) UNIQUE    | Human-friendly identifier               |
| sensor_name   | varchar(100)          | Display name                            |
| sensor_type   | varchar(50)           | `current`, `environmental`, `temperature`, etc. |
| location      | varchar(200)          | Free-form location text                 |
| building      | varchar(100)          | Building name                           |
| floor         | integer               | Floor number                            |
| description   | text                  | Optional description                    |
| is_active     | boolean DEFAULT true  | Whether the device is active            |
| installed_at  | timestamptz DEFAULT now() | Installation timestamp              |
| created_at    | timestamptz DEFAULT now() | Audit field                          |
| updated_at    | timestamptz DEFAULT now() | Audit field                          |

Indexes: `sensors_pkey` on sensor_id, `sensors_sensor_code_key`.

### iot.current_readings
Time-series of clamp current measurements.

| Column      | Type                    | Notes                                    |
|-------------|-------------------------|------------------------------------------|
| time        | timestamptz             | Measurement timestamp (NOT NULL)         |
| sensor_id   | integer FK → sensors    | Must reference a sensor (NOT NULL)       |
| battery_mv  | numeric(10,2)           | Battery voltage                          |
| clamp_1_a   | numeric(10,4)           | Clamp channel currents                   |
| clamp_2_a   | numeric(10,4)           |                                          |
| clamp_3_a   | numeric(10,4)           |                                          |
| clamp_4_a   | numeric(10,4)           |                                          |
| created_at  | timestamptz DEFAULT now() | Ingestion timestamp                    |

Indexes: `current_readings_time_idx` (`time` DESC), `idx_current_readings_sensor_id` (`sensor_id`, `time` DESC).

### iot.environmental_readings
Humidity/light/noise/movement data.

| Column            | Type            |
|-------------------|-----------------|
| time (PK part)    | timestamptz     |
| sensor_id         | integer FK → sensors |
| humidity_percent  | integer         |
| light_lux         | integer         |
| movement          | integer         |
| noise_avg_db      | integer         |
| noise_peak_db     | integer         |
| temperature_c     | numeric(5,2)    |
| battery_mv        | integer         |
| created_at        | timestamptz DEFAULT now() |

Indexes: `environmental_readings_time_idx`, `idx_environmental_readings_sensor_id`.

### iot.temperature_readings
Temperature-only sensors.

| Column           | Type            |
|------------------|-----------------|
| time             | timestamptz     |
| sensor_id        | integer FK → sensors |
| humidity_percent | integer         |
| temperature_c    | numeric(5,2)    |
| battery_mv       | integer         |
| created_at       | timestamptz DEFAULT now() |

Indexes: `temperature_readings_time_idx`, `idx_temperature_readings_sensor_id`.

### reports Schema
Reserved for report metadata (templates, generation history). Not populated yet in this database snapshot but migrations create:
- `reports.templates`
- `reports.generated_reports`
- `reports.kpi_definitions`

## Relationships
- Every readings table (`current_readings`, `environmental_readings`, `temperature_readings`) references `iot.sensors(sensor_id)`.
- No other FK constraints exist in this snapshot.

## Views & Aggregates

### iot.latest_readings
Union view returning the last measurement per sensor, with columns:
- `sensor_code`, `sensor_name`, `sensor_type`, `location`
- `last_reading_time`, `battery_mv`
- Type-specific JSON `readings` payload containing latest values (clamp currents, environmental metrics, etc.)

Useful for “latest status” queries without manual joins/subqueries.

### Hourly Continuous Aggregates
Created via TimescaleDB for faster analytics:

- `iot.current_readings_hourly`: `bucket` (hour), `sensor_id`, averages/max per clamp, avg battery, `reading_count`.
- `iot.environmental_readings_hourly`: `bucket`, `sensor_id`, avg/min/max temperature, avg humidity/light/noise, peak noise, total movement, `reading_count`.
- `iot.temperature_readings_hourly`: `bucket`, `sensor_id`, avg/min/max temperature, avg humidity, `reading_count`.

Use these views when queries mention “per hour” or “trend over time” to avoid scanning raw hypertables.

## Querying Tips for LLM Prompting
1. **Time Filters:** Always constrain `time` or `bucket` columns (e.g., `WHERE time BETWEEN ...`) to keep queries efficient.
2. **Sensor Metadata:** Join `iot.sensors` for `sensor_name`, `location`, `building`, `sensor_type`.
3. **Latest Values:** Prefer `iot.latest_readings` for “current status” questions.
4. **Aggregations:** Use hourly aggregates when granularity ≤ 1 hour; use raw tables for fine-grained minutes/seconds.
5. **Units:** Temperature in °C (`temperature_c`), humidity in percent, light in lux, noise in dB, movement as counts, clamp currents in amps, battery in millivolts.
6. **Active Sensors:** Filter by `iot.sensors.is_active = true` when users ask for “active/online” devices.

## Example Prompts → SQL Hints
- “Average temperature in Building A last week”  
  → Join `iot.temperature_readings` (or `_hourly`) to `iot.sensors` filtered by `building = 'A'` and `time BETWEEN ...`.
- “Latest humidity per location”  
  → Query `iot.latest_readings` filtered where `sensor_type = 'environmental'` and select humidity fields from the JSON payload or join back to raw table by `sensor_code`.
- “Top 5 sensors by max clamp current today”  
  → Use `iot.current_readings` with `MAX(GREATEST(clamp_1_a, ... clamp_4_a))` grouped by `sensor_id`.

This file should be bundled alongside your text-to-SQL service so prompts can include accurate schema context. For large context windows, you may embed each section or convert to structured JSON. 
