# QA Test Script

> Use the commands below to verify key API flows against a running backend (`http://localhost:3000` by default). Replace placeholder values (UUIDs, tokens) as needed.

## 1. Authentication

### Request Token Pair (Login)

**bash / zsh**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" -ContentType "application/json" -Body '{"email":"admin@example.com","password":"password"}'
```

### Request Password Reset

**bash / zsh**
```bash
curl -X POST http://localhost:3000/auth/request-reset \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/request-reset" -ContentType "application/json" -Body '{"email":"admin@example.com"}'
```

> The response includes a `token` property in non-production environments so you can complete reset flows manually.

## 2. Hives

### List Hives

**bash / zsh**
```bash
curl http://localhost:3000/hives \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/hives" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
```

### Create Hive (manager/admin only)

**bash / zsh**
```bash
curl -X POST http://localhost:3000/hives \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"QA Hive","status":"active","location":"Vilnius","ownerUserId":"<USER_UUID>","members":["<USER_UUID>"]}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/hives" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" } -ContentType "application/json" -Body '{"label":"QA Hive","status":"active","location":"Vilnius","ownerUserId":"<USER_UUID>","members":["<USER_UUID>"]}'
```

## 3. Tasks & Assignments

### Start an Assignment

**bash / zsh**
```bash
curl -X PATCH http://localhost:3000/assignments/<ASSIGNMENT_ID> \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/assignments/<ASSIGNMENT_ID>" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" } -ContentType "application/json" -Body '{"status":"in_progress"}'
```

### Toggle Step Completion

**bash / zsh**
```bash
curl -X POST http://localhost:3000/progress/step-complete \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId":"<ASSIGNMENT_ID>","taskStepId":"<STEP_ID>","note":"QA check"}'
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/progress/step-complete" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" } -ContentType "application/json" -Body '{"assignmentId":"<ASSIGNMENT_ID>","taskStepId":"<STEP_ID>","note":"QA check"}'
```

To undo a step:

```bash
curl -X DELETE http://localhost:3000/progress/<PROGRESS_ID> \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/progress/<PROGRESS_ID>" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
```

## 4. Notifications

### List Notifications

**bash / zsh**
```bash
curl http://localhost:3000/notifications \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/notifications" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
```

### Mark Notification as Read

**bash / zsh**
```bash
curl -X PATCH http://localhost:3000/notifications/<NOTIFICATION_ID>/read \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**PowerShell**
```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/notifications/<NOTIFICATION_ID>/read" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
```

## 5. Reports

### Group Assignment Report

**bash / zsh**
```bash
curl "http://localhost:3000/reports/assignments?groupId=<GROUP_ID>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/reports/assignments?groupId=<GROUP_ID>" -Headers @{ Authorization = "Bearer $ACCESS_TOKEN" }
```

> Assignments honor the `status` enum (`not_started`, `in_progress`, `done`) and include per-step completion stats.
