-- Eagles Unbound schema for an EMPTY MySQL/MariaDB database.
-- Select the intended database in phpMyAdmin before importing.
-- No DROP statements or live credentials are included.

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> a0eca4b3a9fb

CREATE TABLE activities (
    slug VARCHAR(150) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    published BOOL NOT NULL,
    display_order INTEGER NOT NULL,
    details JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE admin_users (
    email VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    active BOOL NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (email)
);

CREATE TABLE blocked_dates (
    day DATE NOT NULL,
    reason VARCHAR(200) NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (day)
);

CREATE TABLE clients (
    slug VARCHAR(150) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    published BOOL NOT NULL,
    display_order INTEGER NOT NULL,
    details JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE enquiries (
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    category VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    consent BOOL NOT NULL,
    status VARCHAR(20) NOT NULL,
    internal_notes TEXT NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE faqs (
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    published BOOL NOT NULL,
    page VARCHAR(150) NOT NULL,
    display_order INTEGER NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE gallery_albums (
    slug VARCHAR(150) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    published BOOL NOT NULL,
    display_order INTEGER NOT NULL,
    details JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE page_content (
    slug VARCHAR(100) NOT NULL,
    content JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE programmes (
    slug VARCHAR(150) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    published BOOL NOT NULL,
    display_order INTEGER NOT NULL,
    details JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE site_settings (
    `key` VARCHAR(100) NOT NULL,
    value JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (`key`)
);

CREATE TABLE admin_sessions (
    token_hash VARCHAR(64) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES admin_users (id) ON DELETE CASCADE,
    UNIQUE (token_hash)
);

CREATE TABLE audit_logs (
    actor_id VARCHAR(36) NOT NULL,
    action VARCHAR(200) NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(actor_id) REFERENCES admin_users (id)
);

CREATE TABLE availability (
    programme_id VARCHAR(36) NOT NULL,
    weekday INTEGER NOT NULL,
    enabled BOOL NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(programme_id) REFERENCES programmes (id),
    UNIQUE (programme_id, weekday)
);

CREATE TABLE bookings (
    reference VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    mobile VARCHAR(25) NOT NULL,
    programme_id VARCHAR(36) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(40) NOT NULL,
    participants INTEGER NOT NULL,
    group_type VARCHAR(80) NOT NULL,
    organisation VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    consent BOOL NOT NULL,
    status VARCHAR(20) NOT NULL,
    internal_notes TEXT NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(programme_id) REFERENCES programmes (id),
    UNIQUE (reference)
);

CREATE TABLE media_assets (
    name VARCHAR(180) NOT NULL,
    url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    album_id VARCHAR(36),
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(album_id) REFERENCES gallery_albums (id)
);

CREATE TABLE packages (
    programme_id VARCHAR(36),
    slug VARCHAR(150) NOT NULL,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    published BOOL NOT NULL,
    display_order INTEGER NOT NULL,
    details JSON NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(programme_id) REFERENCES programmes (id),
    UNIQUE (slug)
);

CREATE TABLE programme_activities (
    programme_id VARCHAR(36) NOT NULL,
    activity_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (programme_id, activity_id),
    FOREIGN KEY(activity_id) REFERENCES activities (id),
    FOREIGN KEY(programme_id) REFERENCES programmes (id)
);

CREATE TABLE testimonials (
    client_id VARCHAR(36) NOT NULL,
    quote TEXT NOT NULL,
    approved BOOL NOT NULL,
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(client_id) REFERENCES clients (id)
);

CREATE TABLE booking_status_history (
    booking_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL,
    actor_id VARCHAR(36),
    id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(actor_id) REFERENCES admin_users (id),
    FOREIGN KEY(booking_id) REFERENCES bookings (id)
);

INSERT INTO alembic_version (version_num) VALUES ('a0eca4b3a9fb');

-- Running upgrade a0eca4b3a9fb -> d4ad483574dc

ALTER TABLE bookings ADD COLUMN details JSON NOT NULL DEFAULT ('{}');

ALTER TABLE enquiries ADD COLUMN details JSON NOT NULL DEFAULT ('{}');

UPDATE alembic_version SET version_num='d4ad483574dc' WHERE alembic_version.version_num = 'a0eca4b3a9fb';

CREATE TABLE visitor_feedback (
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

CREATE INDEX ix_visitor_feedback_status ON visitor_feedback (status);
