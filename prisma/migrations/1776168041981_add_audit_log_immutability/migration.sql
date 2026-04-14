-- Create function to prevent UPDATE/DELETE on audit_log table
CREATE OR REPLACE FUNCTION raise_immutable_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log table is immutable - no updates or deletes allowed';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent UPDATE on audit_log
CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION raise_immutable_error();

-- Create trigger to prevent DELETE on audit_log
CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION raise_immutable_error();
