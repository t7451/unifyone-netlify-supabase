-- Personal manual spending ledger. No provider data or tax eligibility is inferred.
CREATE TABLE IF NOT EXISTS work_expenses (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientReference" varchar(36) NOT NULL,
  "expenseDate" date NOT NULL,
  "amountCents" integer NOT NULL,
  category varchar(20) NOT NULL,
  merchant varchar(100),
  notes text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT work_expenses_amount_check CHECK ("amountCents" > 0 AND "amountCents" <= 99999999),
  CONSTRAINT work_expenses_category_check CHECK (category IN ('fuel','maintenance','insurance','tolls','parking','supplies','software','fees','other'))
);
CREATE UNIQUE INDEX IF NOT EXISTS work_expenses_user_reference_idx ON work_expenses ("userId", "clientReference");
CREATE INDEX IF NOT EXISTS work_expenses_user_date_idx ON work_expenses ("userId", "expenseDate");
