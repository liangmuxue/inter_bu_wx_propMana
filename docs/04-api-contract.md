# API 与数据契约

与 PC 演示结构对齐，供后端与小程序联调。Base URL: `/api/v1`

## 通用响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/wx-login` | `{ code }` → token 或 needBind |
| POST | `/auth/wx-bind` | 绑定工号/手机号 |
| GET | `/auth/me` | 当前用户信息 |

## 巡检任务

### GET `/patrol/tasks`

Query: `status`, `date`, `role=executor`, `page`, `pageSize`

```json
{
  "list": [{
    "taskId": "TK-20260530-100",
    "planCode": "PL-2026-001",
    "planName": "B2 机房日检",
    "objectId": "PO-001",
    "objectName": "地下一层设备巡检",
    "scheduled": "2026-05-30 08:00",
    "completed": null,
    "executorId": "lisi",
    "executorName": "李四 · 工程部",
    "progress": { "done": 0, "total": 3 },
    "status": "待完成"
  }],
  "total": 10
}
```

### GET `/patrol/tasks/:taskId`

含 `subtasks[]`：

```json
{
  "subtasks": [{
    "code": "ST-100-02",
    "itemId": "PI-005",
    "itemName": "机房环境检查",
    "method": "现场",
    "issueHandlerId": "lisi",
    "issueHandlerName": "李四 · 工程部",
    "status": "待完成",
    "completedAt": null,
    "guardConfig": {
      "sourceMode": "points",
      "orderMode": "sequential",
      "pointIds": ["GP-002", "GP-004", "GP-005"]
    },
    "guardCheckins": {},
    "guardPointResults": {}
  }]
}
```

> **issueHandlerId** 仅来自计划 `planItemHandlers[itemId]`，不允许为空。

### POST `/patrol/tasks/:taskId/subtasks/:code/guard-checkin`

```json
{
  "pointId": "GP-002",
  "checkinType": "qrcode",
  "checkinAt": "2026-05-30 08:20:00",
  "location": { "latitude": 38.9, "longitude": 121.6 },
  "result": "正常",
  "remark": "",
  "issueDesc": "",
  "issueDescVoice": null,
  "images": ["https://..."],
  "attachments": []
}
```

响应：更新后的 subtask + 若异常则 `issueNo`。

## 问题

### GET `/patrol/issues`

Query: `status`, `role=handler|creator`, `page`

### POST `/patrol/issues/report`

临时上报 body 对齐 PC `patrolIssueReport` 表单。

### POST `/patrol/issues/:issueNo/rectify`

### POST `/patrol/issues/:issueNo/reinspect`

现场类：

```json
{
  "method": "onsite",
  "checkins": { "GP-001": "2026-05-30 10:00:00" }
}
```

## 排班

### GET `/patrol/schedules/my`

Query: `startDate`, `endDate`

```json
{
  "schedules": [{
    "scheduleId": "BZ-002",
    "scheduleName": "综合保障组",
    "mode": "week",
    "days": [
      { "date": "2026-05-30", "onDuty": true, "userId": "chenliu", "userName": "陈六" }
    ]
  }]
}
```

## 站内信

### GET `/messages`

Query: `read`, `page`

```json
{
  "list": [{
    "id": "msg-001",
    "type": "task_remind",
    "title": "巡检任务即将开始",
    "content": "B2 机房日检 将于 08:00 开始",
    "read": false,
    "createdAt": "2026-05-30 07:30:00",
    "payload": { "taskId": "TK-20260530-100" }
  }]
}
```

### POST `/messages/:id/read`

## 任务生成规则（服务端，与 PC 逻辑一致）

1. 启用计划 + 周期匹配 + 日期在有效期内
2. `holidayInspect=no` 且日期落在 `skipHolidays` 范围内 → **不生成**
3. `executorSource=schedule` → 执行人 = 当日值班人
4. 子项 `issueHandlerId` = 计划逐项配置

## 错误码

| code | 说明 |
|------|------|
| 40001 | 巡更点顺序未满足 |
| 40002 | 扫码点位与任务不匹配 |
| 40003 | 非任务执行人 |
| 40004 | 非问题处理人 |
| 40005 | 复检须全部巡更点打卡 |
