-- Work Order Management Enhancement Migration
-- Adds priority, type, and enhanced status tracking to work orders

-- Create new enum types for enhanced work order management
CREATE TYPE work_order_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TYPE work_order_status_enhanced AS ENUM (
  'Planned',
  'Approved',
  'InProgress',
  'ReadyForPO',
  'POIssued',
  'Completed',
  'OnHold',
  'Cancelled'
);

-- Add new columns to work_orders table
ALTER TABLE work_orders
ADD COLUMN priority_level work_order_priority DEFAULT 'Medium',
ADD COLUMN work_order_type VARCHAR(50),
ADD COLUMN estimated_completion_date DATE,
ADD COLUMN po_count INTEGER DEFAULT 0,
ADD COLUMN total_po_amount DECIMAL(12,2) DEFAULT 0.00;

-- Add indexes for performance
CREATE INDEX idx_work_orders_priority ON work_orders(priority_level);
CREATE INDEX idx_work_orders_type ON work_orders(work_order_type);
CREATE INDEX idx_work_orders_completion_date ON work_orders(estimated_completion_date);

-- Add comments for documentation
COMMENT ON COLUMN work_orders.priority_level IS 'Business priority of the work order';
COMMENT ON COLUMN work_orders.work_order_type IS 'Type categorization (Emergency, Planned, Maintenance, etc.)';
COMMENT ON COLUMN work_orders.estimated_completion_date IS 'Estimated completion date for planning purposes';
COMMENT ON COLUMN work_orders.po_count IS 'Number of POs created for this work order';
COMMENT ON COLUMN work_orders.total_po_amount IS 'Total amount of all POs for this work order';

-- Update existing work orders to have default priority
UPDATE work_orders
SET priority_level = 'Medium'
WHERE priority_level IS NULL;

-- Create function to auto-update PO count and total when POs are created/updated
CREATE OR REPLACE FUNCTION update_work_order_po_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the work order's PO statistics
    UPDATE work_orders
    SET
        po_count = (
            SELECT COUNT(*)
            FROM po_headers
            WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
        ),
        total_po_amount = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM po_headers
            WHERE work_order_id = COALESCE(NEW.work_order_id, OLD.work_order_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.work_order_id, OLD.work_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update work order PO stats
CREATE TRIGGER trigger_update_work_order_po_stats
    AFTER INSERT OR UPDATE OR DELETE ON po_headers
    FOR EACH ROW
    EXECUTE FUNCTION update_work_order_po_stats();

-- Migration complete
SELECT 'Work Order Management Enhancement Migration Completed' as status;