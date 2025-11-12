#!/usr/bin/env python3
"""
Madison IoT Data Import Script
Reads Excel file and imports data into TimescaleDB
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import sys
import os
from datetime import datetime
import argparse

# Database connection parameters
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'madison_iot'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

# Excel file path
EXCEL_FILE = '/data/datos_iot_madison.xlsx'

# Sensor mapping
SENSOR_MAPPING = {
    'Sensor c1': {'sensor_code': 'c1', 'sensor_type': 'current'},
    'Sensor s1': {'sensor_code': 's1', 'sensor_type': 'environmental'},
    'Sensor s2': {'sensor_code': 's2', 'sensor_type': 'environmental'},
    'Sensor s3': {'sensor_code': 's3', 'sensor_type': 'environmental'},
    'Sensor s4': {'sensor_code': 's4', 'sensor_type': 'environmental'},
    'Sensor s5': {'sensor_code': 's5', 'sensor_type': 'environmental'},
    'Sensor t1': {'sensor_code': 't1', 'sensor_type': 'temperature'},
    'Sensor t2': {'sensor_code': 't2', 'sensor_type': 'temperature'},
    'Sensor t3': {'sensor_code': 't3', 'sensor_type': 'temperature'},
    'Sensor t4': {'sensor_code': 't4', 'sensor_type': 'temperature'},
    'Sensor t5': {'sensor_code': 't5', 'sensor_type': 'temperature'},
}


def connect_db():
    """Connect to PostgreSQL database"""
    try:
        print(f"Connecting to database at {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Database connection established")
        return conn
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        sys.exit(1)


def get_sensor_id(cursor, sensor_code):
    """Get sensor_id from sensor_code"""
    cursor.execute(
        "SELECT sensor_id FROM iot.sensors WHERE sensor_code = %s",
        (sensor_code,)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    else:
        raise ValueError(f"Sensor {sensor_code} not found in database")


def parse_timestamp(timestamp_str):
    """Parse timestamp string to datetime object"""
    try:
        # Try parsing with pandas
        return pd.to_datetime(timestamp_str)
    except Exception as e:
        print(f"Warning: Could not parse timestamp '{timestamp_str}': {e}")
        return None


def import_current_sensor(conn, sheet_name, df, sensor_code, batch_size=1000):
    """Import current sensor data (Sensor c1)"""
    cursor = conn.cursor()
    sensor_id = get_sensor_id(cursor, sensor_code)

    print(f"\n{'='*80}")
    print(f"Importing {sheet_name} ({sensor_code}) - {len(df)} rows")
    print(f"{'='*80}")

    # Prepare data
    data = []
    skipped = 0

    for idx, row in df.iterrows():
        timestamp = parse_timestamp(row['Fecha (Europe/Madrid)'])
        if timestamp is None:
            skipped += 1
            continue

        data.append((
            timestamp,
            sensor_id,
            float(row['Batería (mV)']) if pd.notna(row['Batería (mV)']) else None,
            float(row['Pinza amperimétrica 1 (A)']) if pd.notna(row['Pinza amperimétrica 1 (A)']) else None,
            float(row['Pinza amperimétrica 2 (A)']) if pd.notna(row['Pinza amperimétrica 2 (A)']) else None,
            float(row['Pinza amperimétrica 3 (A)']) if pd.notna(row['Pinza amperimétrica 3 (A)']) else None,
            float(row['Pinza amperimétrica 4 (A)']) if pd.notna(row['Pinza amperimétrica 4 (A)']) else None,
        ))

        # Insert in batches
        if len(data) >= batch_size:
            insert_query = """
                INSERT INTO iot.current_readings
                (time, sensor_id, battery_mv, clamp_1_a, clamp_2_a, clamp_3_a, clamp_4_a)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """
            execute_batch(cursor, insert_query, data, page_size=batch_size)
            conn.commit()
            print(f"  → Inserted {len(data)} rows (total: {idx + 1}/{len(df)})")
            data = []

    # Insert remaining data
    if data:
        insert_query = """
            INSERT INTO iot.current_readings
            (time, sensor_id, battery_mv, clamp_1_a, clamp_2_a, clamp_3_a, clamp_4_a)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        execute_batch(cursor, insert_query, data, page_size=batch_size)
        conn.commit()
        print(f"  → Inserted {len(data)} rows (final batch)")

    if skipped > 0:
        print(f"  ⚠ Skipped {skipped} rows due to invalid timestamps")

    print(f"✓ {sheet_name} import completed")
    cursor.close()


def import_environmental_sensor(conn, sheet_name, df, sensor_code, batch_size=1000):
    """Import environmental sensor data (Sensors s1-s5)"""
    cursor = conn.cursor()
    sensor_id = get_sensor_id(cursor, sensor_code)

    print(f"\n{'='*80}")
    print(f"Importing {sheet_name} ({sensor_code}) - {len(df)} rows")
    print(f"{'='*80}")

    # Prepare data
    data = []
    skipped = 0

    for idx, row in df.iterrows():
        timestamp = parse_timestamp(row['Fecha (Europe/Madrid)'])
        if timestamp is None:
            skipped += 1
            continue

        data.append((
            timestamp,
            sensor_id,
            int(row['Humedad relativa (%)']) if pd.notna(row['Humedad relativa (%)']) else None,
            int(row['Luz (lux)']) if pd.notna(row['Luz (lux)']) else None,
            int(row['Movimiento']) if pd.notna(row['Movimiento']) else None,
            int(row['Ruido [Media] (dB)']) if pd.notna(row['Ruido [Media] (dB)']) else None,
            int(row['Ruido [Pico Máx] (dB)']) if pd.notna(row['Ruido [Pico Máx] (dB)']) else None,
            float(row['Temperatura (ºC)']) if pd.notna(row['Temperatura (ºC)']) else None,
            int(row['Tensión batería (mV)']) if pd.notna(row['Tensión batería (mV)']) else None,
        ))

        # Insert in batches
        if len(data) >= batch_size:
            insert_query = """
                INSERT INTO iot.environmental_readings
                (time, sensor_id, humidity_percent, light_lux, movement,
                 noise_avg_db, noise_peak_db, temperature_c, battery_mv)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """
            execute_batch(cursor, insert_query, data, page_size=batch_size)
            conn.commit()
            print(f"  → Inserted {len(data)} rows (total: {idx + 1}/{len(df)})")
            data = []

    # Insert remaining data
    if data:
        insert_query = """
            INSERT INTO iot.environmental_readings
            (time, sensor_id, humidity_percent, light_lux, movement,
             noise_avg_db, noise_peak_db, temperature_c, battery_mv)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        execute_batch(cursor, insert_query, data, page_size=batch_size)
        conn.commit()
        print(f"  → Inserted {len(data)} rows (final batch)")

    if skipped > 0:
        print(f"  ⚠ Skipped {skipped} rows due to invalid timestamps")

    print(f"✓ {sheet_name} import completed")
    cursor.close()


def import_temperature_sensor(conn, sheet_name, df, sensor_code, batch_size=1000):
    """Import temperature sensor data (Sensors t1-t5)"""
    cursor = conn.cursor()
    sensor_id = get_sensor_id(cursor, sensor_code)

    print(f"\n{'='*80}")
    print(f"Importing {sheet_name} ({sensor_code}) - {len(df)} rows")
    print(f"{'='*80}")

    # Prepare data
    data = []
    skipped = 0

    for idx, row in df.iterrows():
        timestamp = parse_timestamp(row['Fecha (Europe/Madrid)'])
        if timestamp is None:
            skipped += 1
            continue

        data.append((
            timestamp,
            sensor_id,
            int(row['Humedad relativa (%)']) if pd.notna(row['Humedad relativa (%)']) else None,
            float(row['Temperatura (ºC)']) if pd.notna(row['Temperatura (ºC)']) else None,
            int(row['Tensión batería (mV)']) if pd.notna(row['Tensión batería (mV)']) else None,
        ))

        # Insert in batches
        if len(data) >= batch_size:
            insert_query = """
                INSERT INTO iot.temperature_readings
                (time, sensor_id, humidity_percent, temperature_c, battery_mv)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """
            execute_batch(cursor, insert_query, data, page_size=batch_size)
            conn.commit()
            print(f"  → Inserted {len(data)} rows (total: {idx + 1}/{len(df)})")
            data = []

    # Insert remaining data
    if data:
        insert_query = """
            INSERT INTO iot.temperature_readings
            (time, sensor_id, humidity_percent, temperature_c, battery_mv)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """
        execute_batch(cursor, insert_query, data, page_size=batch_size)
        conn.commit()
        print(f"  → Inserted {len(data)} rows (final batch)")

    if skipped > 0:
        print(f"  ⚠ Skipped {skipped} rows due to invalid timestamps")

    print(f"✓ {sheet_name} import completed")
    cursor.close()


def import_all_data(excel_file_path, batch_size=1000):
    """Import all data from Excel file"""

    if not os.path.exists(excel_file_path):
        print(f"✗ Excel file not found: {excel_file_path}")
        sys.exit(1)

    print(f"Reading Excel file: {excel_file_path}")
    xls = pd.ExcelFile(excel_file_path)
    print(f"✓ Found {len(xls.sheet_names)} sheets")

    # Connect to database
    conn = connect_db()

    start_time = datetime.now()
    total_rows = 0

    try:
        # Process each sheet
        for sheet_name in xls.sheet_names:
            if sheet_name not in SENSOR_MAPPING:
                print(f"⚠ Skipping unknown sheet: {sheet_name}")
                continue

            sensor_info = SENSOR_MAPPING[sheet_name]
            sensor_code = sensor_info['sensor_code']
            sensor_type = sensor_info['sensor_type']

            # Read sheet
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)
            total_rows += len(df)

            # Import based on sensor type
            if sensor_type == 'current':
                import_current_sensor(conn, sheet_name, df, sensor_code, batch_size)
            elif sensor_type == 'environmental':
                import_environmental_sensor(conn, sheet_name, df, sensor_code, batch_size)
            elif sensor_type == 'temperature':
                import_temperature_sensor(conn, sheet_name, df, sensor_code, batch_size)

        # Print summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print(f"\n{'='*80}")
        print(f"IMPORT SUMMARY")
        print(f"{'='*80}")
        print(f"Total rows processed: {total_rows:,}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Rows per second: {total_rows/duration:.2f}")
        print(f"{'='*80}")
        print("✓ All data imported successfully!")

    except Exception as e:
        print(f"\n✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


def verify_import(conn):
    """Verify imported data"""
    cursor = conn.cursor()

    print("\n" + "="*80)
    print("VERIFICATION")
    print("="*80)

    # Check sensors
    cursor.execute("SELECT COUNT(*) FROM iot.sensors")
    sensor_count = cursor.fetchone()[0]
    print(f"Sensors in database: {sensor_count}")

    # Check current readings
    cursor.execute("SELECT COUNT(*) FROM iot.current_readings")
    current_count = cursor.fetchone()[0]
    print(f"Current readings: {current_count:,}")

    # Check environmental readings
    cursor.execute("SELECT COUNT(*) FROM iot.environmental_readings")
    env_count = cursor.fetchone()[0]
    print(f"Environmental readings: {env_count:,}")

    # Check temperature readings
    cursor.execute("SELECT COUNT(*) FROM iot.temperature_readings")
    temp_count = cursor.fetchone()[0]
    print(f"Temperature readings: {temp_count:,}")

    print(f"Total readings: {current_count + env_count + temp_count:,}")
    print("="*80)

    cursor.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Import Madison IoT data from Excel to TimescaleDB')
    parser.add_argument('--excel-file', '-f', default=EXCEL_FILE, help='Path to Excel file')
    parser.add_argument('--batch-size', '-b', type=int, default=1000, help='Batch size for inserts')
    parser.add_argument('--verify-only', '-v', action='store_true', help='Only verify data, do not import')

    args = parser.parse_args()

    if args.verify_only:
        conn = connect_db()
        verify_import(conn)
        conn.close()
    else:
        import_all_data(args.excel_file, args.batch_size)

        # Verify after import
        conn = connect_db()
        verify_import(conn)
        conn.close()
