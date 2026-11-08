-- Visitor feedback & testimonials (run once, e.g. in Hostinger phpMyAdmin on the site database).
-- Additive only: creates one new table; no existing table or data is changed. Safe to run twice.
CREATE TABLE IF NOT EXISTS visitor_feedback (
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    visit_type VARCHAR(40) NOT NULL,
    organisation VARCHAR(180) NOT NULL,
    rating INTEGER NOT NULL,
    message TEXT NOT NULL,
    consent BOOL NOT NULL,
    publish_consent BOOL NOT NULL,
    status VARCHAR(20) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    admin_notes TEXT NOT NULL,
    approved_at DATETIME,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id)
);
