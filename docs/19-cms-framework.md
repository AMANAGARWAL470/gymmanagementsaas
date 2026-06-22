# 19. CMS Module & Versioning Framework

This document designs a unified Content Management System (CMS) framework that governs content creation, versioning, drafting, and publishing workflows.

---

## 1. CMS Core Architecture

The CMS provides a unified workflow across 7 functional sub-modules:
1.  **Exercises**: Workout catalog entries.
2.  **Workouts**: Structured routines.
3.  **Diets**: Nutritional plans.
4.  **Membership Plans**: Gym subscriptions.
5.  **Notification Templates**: Communication layouts.
6.  **Forms**: CRM lead capture layouts.
7.  **Promotions**: Active discounts, campaign offers.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Create Content (v1)
    DRAFT --> DRAFT : Update Content (No Version Bump)
    DRAFT --> PUBLISHED : Publish Content (Sets Active Version)
    
    PUBLISHED --> DRAFT_REVISION : Edit Published (Creates v2 Draft)
    DRAFT_REVISION --> DRAFT_REVISION : Update Revision
    DRAFT_REVISION --> PUBLISHED : Publish Revision (v2 Active, v1 Archived)
    
    PUBLISHED --> ARCHIVED : Delete / Deprecate
    DRAFT --> ARCHIVED : Discard Draft
```

---

## 2. Versioning & Draft Database Schema

To prevent breaking existing member assignments (e.g. if a trainer edits a workout template, members currently following it must not have their active logs altered), we separate current active rows from drafts and version history.

```mermaid
erDiagram
    CMS_METADATA ||--o{ CMS_VERSIONS : "tracks history"
    
    CMS_METADATA {
        uuid id PK
        uuid tenant_id FK
        string module_type "WORKOUT | DIET | PLAN | FORM"
        uuid active_version_id FK
        boolean is_archived
    }

    CMS_VERSIONS {
        uuid id PK
        uuid metadata_id FK
        integer version_number
        string status "DRAFT | PUBLISHED | ARCHIVED"
        jsonb content_data "Holds actual module payload"
        uuid created_by FK
        timestamp created_at
    }
```

### Table Definitions

#### `public.cms_metadata`
Maintains the root pointer and mapping context for each piece of content.
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `tenant_id`: `UUID` (Not Null, References `public.tenants(id)` ON DELETE CASCADE)
*   `module_type`: `VARCHAR(30)` (Check: `IN ('EXERCISE', 'WORKOUT', 'DIET', 'PLAN', 'NOTIFICATION', 'FORM', 'PROMOTION')`)
*   `active_version_id`: `UUID` (Nullable, References `public.cms_versions(id)`)
*   `is_archived`: `BOOLEAN` (Default: `false`)

#### `public.cms_versions`
Stores the actual content payload for each revision.
*   `id`: `UUID` (Primary Key, Default: `gen_random_uuid()`)
*   `metadata_id`: `UUID` (Not Null, References `public.cms_metadata(id)` ON DELETE CASCADE)
*   `version_number`: `INTEGER` (Not Null CHECK `version_number > 0`)
*   `status`: `VARCHAR(15)` (Default: `'DRAFT'`, Check: `IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')`)
*   `content_data`: `JSONB` (Not Null) - Stores the specific module payload (e.g., exercise list, form elements, discount codes).
*   `created_by`: `UUID` (References `auth.users`)
*   `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `now()`)

---

## 3. Permissions Matrix

Editing permissions are enforced at the module layer:

| CMS Category | Platform Admin | Gym Owner | Manager | Trainer | Receptionist |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Membership Plans** | No | Owner | Write | No | No |
| **Exercises & Routines**| No | Owner | Write | Write | No |
| **Diet Plans** | No | Owner | Write | Write | No |
| **Notification Templates**| No | Owner | Write | No | No |
| **Lead Forms** | No | Owner | Write | No | No |
| **Promotions & Coupons**| No | Owner | Write | No | No |

*   **Owner**: Full write, read, publish, and delete capability.
*   **Write**: Can create/edit drafts and submit for approval, but cannot publish directly (unless auto-publish rules apply).
*   **None**: Read-only or completely hidden.

---

## 4. CMS API Mappings

All endpoints require authorization context headers.

### I. Create Draft
`POST /api/v1/cms/content`
- **Body**:
  ```json
  {
    "moduleType": "WORKOUT",
    "contentData": {
      "name": "5x5 Strength Program",
      "exercises": [...]
    }
  }
  ```
- **Response**: `{ "success": true, "metadataId": "uuid", "versionId": "uuid", "version": 1 }`

### II. Edit Content (Updates Draft or Creates New Revision)
`PUT /api/v1/cms/content/:metadataId`
- **Action**: Checks if a `DRAFT` version already exists for the target metadata.
  - If a draft exists: Updates `content_data` in place.
  - If only `PUBLISHED` exists: Inserts a new row in `cms_versions` with `status = 'DRAFT'` and `version_number = (active_version_number + 1)`.
- **Response**: `{ "success": true, "versionId": "uuid", "version": 2, "status": "DRAFT" }`

### III. Publish Content
`POST /api/v1/cms/content/:versionId/publish`
- **Action**: Executed inside a SQL transaction:
  1. Sets the previous published version's status to `ARCHIVED`.
  2. Sets the target version's status to `PUBLISHED`.
  3. Updates `cms_metadata.active_version_id` to target `versionId`.
- **Response**: `{ "success": true }`

### IV. Get Content History
`GET /api/v1/cms/content/:metadataId/history`
- **Response**: Returns lists of all version numbers, status tags, author timestamps, and content payloads.

---

## 5. Draft and Publish Active Migration Engine

When content updates (e.g. a gym modifies their "Premium Membership Plan" price or rules):

```mermaid
sequenceDiagram
    participant Admin as Gym Admin
    participant CMS as CMS Engine
    participant DB as PostgreSQL
    participant Member as Affected Members
    
    Admin->>CMS: Publish New Version (Plan v2 - Price $60)
    CMS->>DB: Set Plan v2 to active_version_id
    Note over CMS: Handle Existing Subscribers
    alt Keep Legacy Prices (Default)
        CMS->>DB: Keep existing member references bound to Plan v1
    else Force Upgrade
        CMS->>DB: Query all members on Plan v1
        DB-->>CMS: Return member lists
        CMS->>DB: Update active membership references to Plan v2
        CMS->>Member: Push payment update notification
    end
```
- **Exercise / Workout Updates**: Members currently assigned to `v1` of a workout routine continue on `v1` until their current assignment cycle ends, or the trainer manually hits "Re-sync to Latest version."
- **Membership Plan Price Changes**: New sign-ups receive `v2` (published). Existing active subscribers remain locked at `v1` pricing to prevent billing policy breaches.
