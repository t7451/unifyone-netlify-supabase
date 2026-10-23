-- Preserve historical rate values while allowing half-cent business rates.
-- Deduction amounts remain integer cents; the rate is never rounded to a cent.
ALTER TABLE mileage_logs
  ALTER COLUMN "irsRateCents" TYPE numeric(5,2)
  USING "irsRateCents"::numeric(5,2);
ALTER TABLE mileage_logs ALTER COLUMN "irsRateCents" SET DEFAULT 70.00;
