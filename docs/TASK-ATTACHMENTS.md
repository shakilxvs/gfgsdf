# Task attachments (Cloudinary)

TaskXVS stores task attachment files in the connected Cloudinary product environment and stores only attachment metadata and Cloudinary identifiers in the dedicated TaskXVS PostgreSQL database.

## Supported files and limits

- Images: JPG/JPEG, PNG, GIF and WebP.
- Documents: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, CSV and TXT.
- Video and audio files are rejected by both the browser and the API.
- Maximum 10 MB per file.
- Maximum 10 attachments per task.

The API checks the filename extension, declared MIME type and file signature. Do not weaken the server-side validation based only on browser accept filters.

## User experience

- Attach from the task create/edit form using Browse or drag and drop.
- Paste a screenshot from the clipboard with Cmd+V / Ctrl+V while the task form is open.
- New tasks are saved before their files upload. If an upload fails, the task remains saved and the form lets the user retry only the failed files without creating a duplicate task.
- Attachment metadata is included in the authenticated workspace bootstrap response.
- Existing attachments remain associated with a task when it is marked Done, reopened or edited.
- Individual attachments can be downloaded or removed from the task edit form.
- Task cards and list rows show an attachment count.

## Cloudinary storage and access

- Cloudinary folder: `TaskXVS/Task Attachments`.
- Images use Cloudinary resource type `image`; office files and other documents use `raw`.
- Upload delivery type is `authenticated`, not public `upload`.
- The browser never receives Cloudinary API credentials.
- TaskXVS checks the user's session and task/business access before generating a 10-minute signed private download URL.
- Attachment upload uses the server-side Cloudinary SDK and stores the immutable Cloudinary asset ID, public ID, resource type, delivery type, file format, filename, MIME type and size.
- Attachments are uploaded with backups disabled so deleting them does not intentionally retain a backup copy.

Cloudinary docs:
- [Node.js SDK configuration](https://cloudinary.com/documentation/node_integration)
- [Upload API and private download URLs](https://cloudinary.com/documentation/image_upload_api_reference)
- [Private and authenticated assets](https://cloudinary.com/documentation/control_access_to_media)

## Delete behavior

Deleting one attachment removes the Cloudinary asset first, then deletes its database metadata row.

Deleting a task removes all its Cloudinary assets first. If Cloudinary cannot confirm the deletion of every attachment, TaskXVS keeps the task and returns an error rather than silently leaving orphaned attachment records. A retry is safe: Cloudinary's `not found` result is treated as already deleted. Once remote cleanup succeeds, deleting the task cascades its attachment metadata rows.

Marking a task Done does **not** delete or archive any attachment. Only explicit attachment removal or task deletion triggers Cloudinary cleanup.

## Required Render configuration

The Render web service `taskxvs` needs one server-side environment variable:

```
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
```

Get the value from Cloudinary Console → Settings → API Keys → API environment variable. Add it directly to Render Dashboard → `taskxvs` → Environment. Never put this value in GitHub, client-side Vite variables, issues, PRs, screenshots or chat.

After saving the environment variable, Render restarts/redeploys the service. Check:

```
https://task.shakilxvs.com/api/health
```

A correctly configured service returns `cloudinaryReady: true`. If it is false, attachment requests return a clear configuration error and no files are uploaded.

The connected Cloudinary account was observed on its Free plan with zero usage at the time this feature was prepared (2026-11-25). Cloudinary quotas and pricing may change; monitor the account usage page. A Free plan does not mean unlimited storage or bandwidth.

## Database

Migration: `db/migrations/20261125_task_attachments.sql`

Table: `public.task_attachments`

It contains the attachment metadata, not file bytes. The `task_id` foreign key cascades on task deletion. Do not add Cloudinary credentials or signed URLs to this table.
