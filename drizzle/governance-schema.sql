-- Governance Dashboard Schema
-- Audit logs, escalation queue, decision authority, and kill-switch controls

-- Audit Logs: Track all autonomous operations and decisions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  old_value JSON,
  new_value JSON,
  decision_authority VARCHAR(100),
  escalation_triggered BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (userId),
  INDEX idx_created_at (created_at),
  INDEX idx_escalation (escalation_triggered)
);

-- Escalation Queue: Decisions requiring human approval
CREATE TABLE IF NOT EXISTS escalation_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_log_id INT NOT NULL,
  decision_type VARCHAR(100) NOT NULL,
  decision_context JSON NOT NULL,
  threshold_exceeded DECIMAL(10, 2),
  threshold_limit DECIMAL(10, 2),
  authority_level VARCHAR(50),
  required_approvals INT DEFAULT 1,
  approvals_received INT DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INT,
  resolution_notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_log_id) REFERENCES audit_logs(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_authority_level (authority_level)
);

-- Decision Authority Matrix: Define approval thresholds
CREATE TABLE IF NOT EXISTS decision_authority (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  authority_level ENUM('viewer', 'operator', 'architect', 'cathedral') DEFAULT 'operator',
  approval_threshold DECIMAL(10, 2),
  can_override_decisions BOOLEAN DEFAULT FALSE,
  can_modify_governance BOOLEAN DEFAULT FALSE,
  can_access_audit_logs BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_user_authority (user_id),
  INDEX idx_authority_level (authority_level)
);

-- Kill Switch Controls: Emergency operational controls
CREATE TABLE IF NOT EXISTS kill_switches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  switch_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  triggered_by INT,
  triggered_at TIMESTAMP,
  reason TEXT,
  auto_reset_enabled BOOLEAN DEFAULT FALSE,
  auto_reset_at TIMESTAMP,
  impact_scope VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (triggered_by) REFERENCES users(id),
  INDEX idx_is_active (is_active),
  INDEX idx_triggered_at (triggered_at)
);

-- Governance Rules: Enforce decision constraints
CREATE TABLE IF NOT EXISTS governance_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type ENUM('approval_threshold', 'rate_limit', 'data_access', 'operational_constraint') NOT NULL,
  entity_type VARCHAR(100),
  condition_json JSON NOT NULL,
  action_on_violation ENUM('block', 'escalate', 'log', 'warn') DEFAULT 'escalate',
  authority_level_required VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rule_type (rule_type),
  INDEX idx_is_active (is_active)
);

-- Approval Workflows: Track multi-level approvals
CREATE TABLE IF NOT EXISTS approval_workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escalation_queue_id INT NOT NULL,
  approver_id INT NOT NULL,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approval_notes TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escalation_queue_id) REFERENCES escalation_queue(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_escalation_queue_id (escalation_queue_id),
  INDEX idx_approver_id (approver_id),
  INDEX idx_approval_status (approval_status)
);

-- Governance Metrics: Track governance health
CREATE TABLE IF NOT EXISTS governance_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_date DATE NOT NULL,
  total_operations INT DEFAULT 0,
  escalations_triggered INT DEFAULT 0,
  escalations_approved INT DEFAULT 0,
  escalations_rejected INT DEFAULT 0,
  kill_switches_activated INT DEFAULT 0,
  average_escalation_time_minutes INT,
  compliance_score DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_metric_date (metric_date)
);
