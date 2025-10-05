# Frontend ↔ API Integrations

## Dashboard
- `GET /hives`
- `GET /assignments`
- `GET /tasks`
- `GET /assignments/:id/details`

## Hive detail
- `GET /hives/:id`
- `GET /assignments?hiveId=:id`
- `GET /tasks`
- `GET /assignments/:id/details`

## Notifications
- `GET /notifications`
- `PATCH /notifications/:id/read`

## Admin · Users
- `GET /users`
- `DELETE /users/:id`

## Admin · Tasks
- `GET /tasks`

## Admin · Steps
- `GET /tasks`
- `GET /tasks/:id/steps`
- `POST /tasks/:id/steps`
- `DELETE /tasks/:id/steps/:sid`

## Profile
- `PATCH /users/:id`
