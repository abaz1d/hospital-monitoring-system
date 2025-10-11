-- Migration script to add new columns for patient data integration
-- Run this script to add kdbagian and bagian_mapping columns to existing hospitals table

-- 1. Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add kdbagian column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospitals' AND column_name = 'kdbagian'
    ) THEN
        ALTER TABLE hospitals ADD COLUMN kdbagian VARCHAR(50);
        RAISE NOTICE 'Added kdbagian column to hospitals table';
    ELSE
        RAISE NOTICE 'kdbagian column already exists';
    END IF;

    -- Add bagian_mapping column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'hospitals' AND column_name = 'bagian_mapping'
    ) THEN
        ALTER TABLE hospitals ADD COLUMN bagian_mapping TEXT[];
        RAISE NOTICE 'Added bagian_mapping column to hospitals table';
    ELSE
        RAISE NOTICE 'bagian_mapping column already exists';
    END IF;
END $$;

-- 2. Update existing hospital data with kdbagian mapping
UPDATE hospitals SET 
    kdbagian = 'RI04',
    bagian_mapping = ARRAY['RI04']
WHERE hospital_code = 'rs-a';

UPDATE hospitals SET 
    kdbagian = 'RI02',
    bagian_mapping = ARRAY['RI02']
WHERE hospital_code = 'rs-b';

UPDATE hospitals SET 
    kdbagian = 'GIZI',
    bagian_mapping = ARRAY['RI07','RI01','RI03','RI20','RI04','RI02']
WHERE hospital_code = 'rs-c';

UPDATE hospitals SET 
    kdbagian = 'LAUNDRY',
    bagian_mapping = ARRAY['RJ04','RI07','RI01','RI03','RI20','RI04','RI02','RI13','RI18','UR38']
WHERE hospital_code = 'rs-d';

UPDATE hospitals SET 
    kdbagian = 'RJ04',
    bagian_mapping = ARRAY['RJ04']
WHERE hospital_code = 'rs-e';

-- 3. Verify the changes
SELECT 
    hospital_code,
    hospital_name,
    kdbagian,
    bagian_mapping,
    is_active
FROM hospitals
ORDER BY hospital_code;